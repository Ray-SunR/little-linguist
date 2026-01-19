"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface FeedbackSubmission {
    name: string;
    email: string;
    message: string;
    type?: string;
    metadata?: any;
}

export async function submitFeedback(data: FeedbackSubmission) {
    const supabase = createClient();
    
    // Get current user if logged in
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
        .from("feedbacks")
        .insert({
            user_id: user?.id || null,
            name: data.name,
            email: data.email,
            message: data.message,
            type: data.type || 'feedback',
            metadata: data.metadata || {}
        });

    if (error) {
        console.error("Failed to submit feedback:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/support/contact");
    return { success: true };
}
