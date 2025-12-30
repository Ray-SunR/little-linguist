import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(req: Request) {
    console.log("Mock Mode: Returning Ginger the Giraffe story from dedicated mock endpoint");

    try {
        const mockPath = path.join(process.cwd(), 'data', 'mock', 'response.json');

        if (!fs.existsSync(mockPath)) {
            return NextResponse.json({ error: "Mock data file not found" }, { status: 404 });
        }

        const rawText = fs.readFileSync(mockPath, 'utf8').trim();
        const storyData = JSON.parse(rawText);

        return NextResponse.json(storyData);
    } catch (error: any) {
        console.error("Mock Story API error:", error);
        return NextResponse.json({ error: "Failed to load mock story: " + error.message }, { status: 500 });
    }
}
