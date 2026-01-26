import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createAuthClient } from "@/lib/supabase/server";
import { StoryService } from "@/lib/features/story/story-service.server";
import { cookies } from "next/headers";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    const authClient = createAuthClient();
    let { data: { user } } = await authClient.auth.getUser();

    // We'll need the service role client ONLY for background operations 
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceKey || !supabaseUrl.startsWith('http')) {
        console.error("Missing or malformed Supabase env vars for service role client");
        return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }
    const serviceRoleClient = createClient(supabaseUrl, supabaseServiceKey);

    // [TEST MODE] Bypassing auth for integration tests in development
    if (!user && (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test')) {
        const testUserId = req.headers.get('x-test-user-id');
        if (testUserId) {
            console.warn(`[TEST MODE] Bypassing auth for user: ${testUserId}`);
            const { data: adminUser } = await serviceRoleClient.auth.admin.getUserById(testUserId);
            if (adminUser?.user) user = adminUser.user;
        }
    }

    if (!user) {
        return NextResponse.json({ error: "Unauthorized. Please sign in to create stories." }, { status: 401 });
    }

    try {
        const body = await req.json();
        const guestId = cookies().get('guest_id')?.value;
        const timezone = req.headers.get('x-timezone') || 'UTC';

        // Use user-scoped client for most operations to respect RLS
        const isTestBypass = !!req.headers.get('x-test-user-id') && (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test');
        const supabase = isTestBypass ? serviceRoleClient : authClient;

        const storyService = new StoryService(supabase, serviceRoleClient, user.id);
        const result = await storyService.createStory({
            ...body,
            guestId,
            timezone
        }, waitUntil);

        return NextResponse.json(result);
    } catch (error: any) {
        console.error("Story API error:", error);

        const message = error.message || "Failed to generate story";
        
        // Map service errors to specific HTTP responses
        if (message === "IMAGE_LIMIT_REACHED") {
            return NextResponse.json({
                error: "IMAGE_LIMIT_REACHED",
                message: `You don't have enough energy to generate images!`,
            }, { status: 403 });
        }

        if (message === "LIMIT_REACHED") {
            return NextResponse.json({
                error: "LIMIT_REACHED",
                message: "You have reached your daily story limit!",
            }, { status: 403 });
        }

        if (message === "Child profile not found") {
            return NextResponse.json({ error: message }, { status: 404 });
        }

        const badRequestErrors = [
            "Valid childId is required",
            "Provide up to 10 words",
            "Each word must be a string under 30 characters",
            "Invalid storyLength"
        ];

        if (badRequestErrors.some(e => message.includes(e))) {
            return NextResponse.json({ error: message }, { status: 400 });
        }

        return NextResponse.json({ error: message }, { status: error.status || 500 });
    }
}
