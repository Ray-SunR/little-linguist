
import fs from 'fs';
import path from 'path';

// Matrix Definitions based on User Request
const MATRIX = [
    // Plants vs Zombies
    { theme: "pvz", level: "PreK", title: "Happy Sunflowers", concept: "Simple story about sunflowers smiling in the garden." },
    { theme: "pvz", level: "K", title: "The Peashooter", concept: "Peashooter protects the garden from a funny zombie." },
    { theme: "pvz", level: "G3-5", title: "Dr. Zomboss's Plot", concept: "Strategic battle against Zomboss's giant robot." },

    // Superheroes
    { theme: "superheroes", level: "PreK", title: "Super Baby", concept: "A baby with super strength helps mom." },
    { theme: "superheroes", level: "K", title: "Hero School", concept: "Kids learning how to use powers at school." },
    { theme: "superheroes", level: "G3-5", title: "The Dark Villain", concept: "A team of heroes stops a shadow villain." },

    // Avengers
    { theme: "avengers", level: "PreK", title: "Baby Avengers: Team Up!", concept: "Toddler versions of Iron Man and Hulk playing together." },
    { theme: "avengers", level: "K", title: "Captain's Shield", concept: "Captain America searches for his missing shield." },
    { theme: "avengers", level: "G3-5", title: "Avengers Assemble: Earth Defense", concept: "The full team defending NYC from aliens." },

    // Superman
    { theme: "superman", level: "PreK", title: "Up in the Sky", concept: "Superman flying high and waving at clouds." },
    { theme: "superman", level: "K", title: "Clark's Secret", concept: "Clark Kent hiding his cape at the Daily Planet." },
    { theme: "superman", level: "G3-5", title: "Superman vs. Lex", concept: "Lex Luthor's kryptonite trap." },

    // Batman
    { theme: "batman", level: "PreK", title: "The Batmobile", concept: "The Batmobile driving fast through a tunnel." },
    { theme: "batman", level: "K", title: "Robin's Training", concept: "Batman teaching Robin how to use the grappling hook." },
    { theme: "batman", level: "G3-5", title: "Gotham City Shadows", concept: "Detective work tracking the Joker." },

    // Frozen / Disney
    { theme: "frozen", level: "PreK", title: "Olaf's Summer", concept: "Olaf dreaming about summer fun." },
    { theme: "disney", level: "PreK", title: "Mickey's Picnic", concept: "Mickey and Minnie having a picnic in the park." },
    { theme: "frozen", level: "K", title: "Elsa's Magic Ice", concept: "Elsa making an ice skating rink for the kingdom." },
    { theme: "moana", level: "K", title: "Moana's Boat", concept: "Moana sailing on a calm ocean." },
    { theme: "frozen", level: "G3-5", title: "The North Mountain", concept: "A dangerous trek up the North Mountain." },
    { theme: "aladdin", level: "G3-5", title: "Jafar's Return", concept: "Aladdin and Genie facing Jafar's magic." },

    // Dog Man
    { theme: "dogman", level: "PreK", title: "Puppy Cop", concept: "A cute puppy wearing a police hat." },
    { theme: "dogman", level: "K", title: "Dog Man: The Cat Burglar", concept: "Dog Man chasing a cat who stole a fish." },
    { theme: "dogman", level: "G3-5", title: "Dog Man: Robot Rampage", concept: "Dog Man fighting a giant robot." },

    // Batwheels / Hotwheels
    { theme: "batwheels", level: "PreK", title: "Batwheels Go!", concept: "Bam the Batmobile racing Redbird." },
    { theme: "hotwheels", level: "PreK", title: "Zoom Zoom Cars", concept: "Colorful cars zooming on a track." },
    { theme: "hotwheels", level: "K", title: "Hotwheels: Loop Track", concept: "Cars going through a giant loop-de-loop." },
    { theme: "hotwheels", level: "G3-5", title: "Ultimate Racing Championship", concept: "A high-stakes tournament race." },

    // Daemon Hunter (Demon Slayer inspired)
    // PreK skipped as per plan/too scary, but user asked for theme. We'll map "Daemon Hunter" to G3-5 mainly, maybe a light one for K?
    { theme: "daemon_hunter", level: "K", title: "Monster Catcher", concept: "A kid catching cute little shadow monsters in a jar." },
    { theme: "daemon_hunter", level: "G3-5", title: "Daemon Hunter: Shadow Blade", concept: "A warrior with a glowing sword fighting a shadow demon." },

    // Space / Rocket
    { theme: "space", level: "PreK", title: "Twinkle Rocket", concept: "A smiling rocket ship flying past stars." },
    { theme: "space", level: "K", title: "Moon Walk", concept: "Astronauts walking on the moon." },
    { theme: "space", level: "G3-5", title: "Mission to Mars: The Red Planet", concept: "Scientist astronauts establishing a base on Mars." },

    // Universe
    { theme: "universe", level: "PreK", title: "Mr. Sun & Friends", concept: "The Sun saying hello to the planets." },
    { theme: "universe", level: "K", title: "The Solar System", concept: "A tour of all the planets." },
    { theme: "universe", level: "G3-5", title: "Black Holes & Time Warps", concept: "Scientific adventure into a black hole." },

    // Wave 2 Addition: K-Pop Daemon Hunter
    { theme: "daemon_hunter", level: "G3-5", title: "K-Pop Demon Hunter", concept: "A pop star group that fights demons with musical magic at night." },
    { theme: "daemon_hunter", level: "G3-5", title: "Rhythm Blade", concept: "A hero whose sword attacks sync with the beat of K-Pop songs." },

    // Wave 2 Addition: More History/Space/Tech
    { theme: "history", level: "G3-5", title: "The First Computer", concept: "Ada Lovelace and the first computer code." },
    { theme: "history", level: "G3-5", title: "Samurai Code", concept: "A young samurai learning honor and swordsmanship." },
    { theme: "space", level: "G3-5", title: "Interstellar Voyage", concept: "Traveling to a new galaxy to find a home." },
    { theme: "technology", level: "G3-5", title: "The AI Robot", concept: "A robot learning what it means to be a friend." },
    { theme: "technology", level: "G3-5", title: "Cyber-City Hackers", concept: "Kids saving their futuristic city from a virus." },
    { theme: "technology", level: "K", title: "My Robot Dog", concept: "A puppy made of metal that barks and plays." },
];

const OUTPUT_PATH = path.join(process.cwd(), 'data/expanded-manifesto.json');

const manifesto = MATRIX.map((entry, index) => ({
    id: `${entry.theme}-${entry.level.toLowerCase().replace(/[^a-z0-9]/g, '')}-${index}`,
    title: entry.title,
    concept_prompt: entry.concept,
    category: entry.theme, // Use theme as internal category key
    level: entry.level === "K" ? "K" : entry.level === "PreK" ? "PreK" : "G3-5",
    is_nonfiction: ["space", "universe", "nature", "history"].includes(entry.theme),
    series_id: null
}));

console.log(`Generated manifesto with ${manifesto.length} books.`);
fs.writeFileSync(OUTPUT_PATH, JSON.stringify(manifesto, null, 2));
