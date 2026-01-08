
import fs from 'fs';
import path from 'path';

const CATEGORIES = [
    { id: "animals", label: "Animals & Pets", count: 22, distribution: [8, 6, 5, 3] },
    { id: "dinosaurs", label: "Dinosaurs", count: 12, distribution: [4, 3, 3, 2] },
    { id: "vehicles", label: "Vehicles & Things That Go", count: 12, distribution: [5, 3, 3, 1] },
    { id: "superheroes", label: "Superheroes & Everyday Heroes", count: 16, distribution: [4, 4, 5, 3], brands: ["Avengers", "Spidey", "Justice League"] },
    { id: "friendship", label: "Friendship & Feelings (SEL)", count: 16, distribution: [6, 4, 4, 2] },
    { id: "fantasy", label: "Fantasy & Fairy Tales", count: 16, distribution: [4, 4, 4, 4], brands: ["Disney Princess"] },
    { id: "mystery", label: "Mystery & Puzzles", count: 12, distribution: [2, 3, 4, 3] },
    { id: "science", label: "Science & Experiments", count: 16, distribution: [3, 3, 5, 5], nf_ratio: 0.6 },
    { id: "space", label: "Space", count: 12, distribution: [2, 3, 3, 4] },
    { id: "nature", label: "Nature & Earth", count: 12, distribution: [3, 3, 3, 3] },
    { id: "history", label: "History & Biographies", count: 10, distribution: [1, 2, 3, 4] },
    { id: "sports", label: "Sports & Games", count: 12, distribution: [2, 2, 4, 4] },
    { id: "seasonal", label: "Seasonal & Holidays", count: 6, distribution: [3, 2, 1, 0] },
    { id: "mythology", label: "Mythology & Legends", count: 6, distribution: [0, 0, 1, 5] },
    { id: "minecraft", label: "Minecraft & Building", count: 8, distribution: [2, 2, 2, 2], brands: ["Minecraft"] } // Extra for the Minecraft request
];

const LEVELS = ["PreK", "K", "G1-2", "G3-5"];

const manifesto: any[] = [];

CATEGORIES.forEach(cat => {
    cat.distribution.forEach((target, levelIdx) => {
        const level = LEVELS[levelIdx];
        for (let i = 0; i < target; i++) {
            const isNF = Math.random() < (cat.nf_ratio || 0.35); // Default 35% NF
            const brand = cat.brands ? cat.brands[Math.floor(Math.random() * cat.brands.length)] : null;

            manifesto.push({
                id: `${cat.id}-${level.toLowerCase().replace('-', '')}-${i}`,
                title: `[TBD] ${cat.label} for ${level} ${i + 1}`, // To be refined by AI
                category: cat.id,
                level: level,
                is_nonfiction: isNF,
                brand_theme: brand,
                series_id: i < 8 ? `series-${cat.id}-${Math.floor(i / 8)}` : null // Simple series mapping
            });
        }
    });
});

console.log(`Generated manifesto with ${manifesto.length} books.`);
fs.writeFileSync(path.join(process.cwd(), 'data/seed-manifesto.json'), JSON.stringify(manifesto, null, 2));
