import { NextResponse } from 'next/server';
import { BookRepository } from '@/lib/core/books/repository.server';

export async function GET() {
    try {
        const repo = new BookRepository();
        const books = await repo.getSystemBooks();
        return NextResponse.json(books);
    } catch (error: any) {
        console.error('API Error in /api/books:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
