import { NarrativeDirector } from "../lib/features/narration/narrative-director.server";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function showSSML() {
    const director = new NarrativeDirector();
    const text = "Deep beneath the waves of the Eastern Sea, where sunlight turned the water into shimmering curtains of green and gold, there lived a powerful Dragon King in his magnificent crystal palace. Sun Wukong, the Monkey King, had recently become the leader of the monkeys on Flower-Fruit Mountain, and he was very proud of his new position. However, he had one big problem that kept him awake at night. All the weapons he had tried—swords, spears, and axes—broke easily in his incredibly strong hands because he possessed magical strength far beyond ordinary creatures.";
    const level = "G3-5";

    console.log("--- GENERATING SSML WITH CLAUDE ---");
    const annotation = await director.annotate(text, level);
    console.log("\n--- RESULTING SSML ---");
    console.log(annotation.ssml);
    console.log("\n--- MOOD ---");
    console.log(annotation.metadata.mood);
}

showSSML().catch(console.error);
