import { NovaStoryService } from "../lib/features/nova/nova-service.server";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

// Load env vars
dotenv.config({ path: ".env.local" });

async function main() {
    const service = new NovaStoryService();
    const artifactDir = "/Users/renchen/.gemini/antigravity/brain/5ce899df-ec37-4616-a13c-2c284d816f9f";
    const theme = "a brave little penguin named Pip who learns to whistle";

    console.log(`Generating story for theme: "${theme}"...`);
    const pages = await service.generateStory(theme);
    console.log(`Generated ${pages.length} pages.`);

    for (let i = 0; i < pages.length; i++) {
        console.log(`Generating image for page ${i + 1}...`);
        const base64Image = await service.generateImage(pages[i].imagePrompt);
        const imagePath = path.join(artifactDir, `pip_page_${i + 1}.png`);
        fs.writeFileSync(imagePath, Buffer.from(base64Image, "base64"));
        pages[i].imageBase64 = base64Image;
        console.log(`Saved image to ${imagePath}`);
    }

    // Generate markdown
    let markdown = `# The Brave Little Penguin: Pip's Whistle\n\nGenerated using AWS Bedrock Nova models.\n\n`;
    pages.forEach((page, i) => {
        markdown += `## Page ${i + 1}\n\n`;
        markdown += `![Page ${i + 1}](pip_page_${i + 1}.png)\n\n`;
        markdown += `> ${page.text}\n\n`;
        markdown += `*Prompt: ${page.imagePrompt}*\n\n---\n\n`;
    });

    fs.writeFileSync(path.join(artifactDir, "nova_storybook.md"), markdown);
    console.log("Created nova_storybook.md");
}

main().catch(console.error);
