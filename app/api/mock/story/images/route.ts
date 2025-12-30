import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
    try {
        const { prompt } = await req.json();
        console.log(`Mock Mode: Returning Rain illustration for prompt: "${prompt}"`);

        // Simulate network/latency for AI generation (2-5 seconds)
        const delay = Math.floor(Math.random() * 3000) + 2000;
        await new Promise(resolve => setTimeout(resolve, delay));

        // Map prompts to images 1-5
        // Since the prompts in response.txt start with [1], or are in sequence,
        // we'll try to guess the scene number or just cycle 1-5 for variety if unknown.
        let imageNumber = 1;
        const match = prompt.match(/scene (\d+)/i);
        if (match) {
            imageNumber = parseInt(match[1], 10);
        } else if (prompt.includes("backpack")) {
            imageNumber = 1;
        } else if (prompt.includes("packing")) {
            imageNumber = 2;
        } else if (prompt.includes("magnifying glass")) {
            imageNumber = 3;
        } else if (prompt.includes("fox")) {
            imageNumber = 4;
        } else if (prompt.includes("waterfall")) {
            imageNumber = 5;
        }

        // Clamp to 1-5
        imageNumber = Math.max(1, Math.min(5, imageNumber));

        const filename = `${imageNumber}.png`;
        const imagePath = path.join(process.cwd(), 'data', 'mock', filename);

        if (fs.existsSync(imagePath)) {
            const buffer = fs.readFileSync(imagePath);
            const base64 = buffer.toString('base64');
            return NextResponse.json({
                imageUrl: `data:image/png;base64,${base64}`,
                thought: `Mock image ${imageNumber} returned after ${delay}ms delay.`
            });
        } else {
            return NextResponse.json({ error: "Mock image not found", path: imagePath }, { status: 404 });
        }
    } catch (error: any) {
        console.error("Mock Image API error:", error);
        return NextResponse.json({ error: "Failed to return mock image" }, { status: 500 });
    }
}
