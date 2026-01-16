import { BookRepository } from '../lib/core/books/repository.server';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function verifyRepository() {
    const repo = new BookRepository();
    
    console.log('Fetching books via Repository...');
    const books = await repo.getAvailableBooksWithCovers(undefined, undefined, { limit: 5 });
    
    if (books.length > 0) {
        console.log('Success! Found books.');
        const sample = books[0];
        console.log('Sample Book Metadata:');
        console.log(`Title: ${sample.title}`);
        console.log(`Description: ${sample.description?.substring(0, 50)}...`);
        console.log(`Keywords: ${sample.keywords?.slice(0, 5)}`);
        
        if (sample.description && sample.keywords && sample.keywords.length > 0) {
            console.log('✅ New columns are being fetched correctly!');
        } else {
            console.log('⚠️ New columns missing or empty in repository result.');
            console.log('Full config:', JSON.stringify(sample, null, 2));
        }
    } else {
        console.log('No books returned.');
    }
}

verifyRepository().catch(console.error);
