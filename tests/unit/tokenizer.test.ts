import { Tokenizer } from '../../lib/core/books/tokenizer';

function testTokenizer() {
    console.log("🚀 Testing Tokenizer...");

    const testCases = [
        {
            name: "Basic sentence",
            text: "Hello world.",
            expectedWords: ["Hello", "world"]
        },
        {
            name: "Contractions",
            text: "It's a beautiful day, isn't it?",
            expectedWords: ["It's", "a", "beautiful", "day", "isn't", "it"]
        },
        {
            name: "Hyphenated words",
            text: "The mother-in-law is here.",
            expectedWords: ["The", "mother-in-law", "is", "here"]
        },
        {
            name: "Punctuation & Spaces",
            text: "Hello...   world!!!",
            expectedWords: ["Hello", "world"]
        },
        {
            name: "Smart quotes",
            text: "She said, \u201cHello!\u201d",
            expectedWords: ["She", "said", "Hello"]
        }
    ];

    testCases.forEach(tc => {
        const tokens = Tokenizer.tokenize(tc.text);
        const words = Tokenizer.getWords(tokens).map(t => t.t);

        const success = JSON.stringify(words) === JSON.stringify(tc.expectedWords);
        if (success) {
            console.log(`✅ ${tc.name} PASSED`);
        } else {
            console.log(`❌ ${tc.name} FAILED`);
            console.log(`   Expected: ${JSON.stringify(tc.expectedWords)}`);
            console.log(`   Actual:   ${JSON.stringify(words)}`);
        }
    });

    // Test reconstruction
    const originalText = "Hello world! How are you?";
    const reconstruction = Tokenizer.join(Tokenizer.tokenize(originalText));
    if (originalText === reconstruction) {
        console.log(`✅ Reconstruction PASSED`);
    } else {
        console.log(`❌ Reconstruction FAILED`);
        console.log(`   Expected: ${originalText}`);
        console.log(`   Actual:   ${reconstruction}`);
    }
}

testTokenizer();
