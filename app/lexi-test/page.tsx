'use client';

import React, { useState, useEffect } from 'react';
import { LexiReader } from '@/components/reader/lexi-reader/LexiReader';
import { useNarrationEngine } from '@/hooks/use-narration-engine';
import { useReaderPersistence } from '@/hooks/use-reader-persistence';
import { Play, Pause, FastForward, Rewind, Save, Loader2 } from 'lucide-react';

export default function LexiTestPage() {
    const [bookId, setBookId] = useState<string | null>(null);
    const [books, setBooks] = useState<any[]>([]);
    const [bookData, setBookData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Initial load of books
    useEffect(() => {
        async function loadBooks() {
            try {
                const res = await fetch('/api/books');
                const data = await res.json();
                setBooks(data);
                if (data.length > 0) {
                    setBookId(data[0].id);
                }
            } catch (err) {
                console.error('Failed to load books:', err);
            }
        }
        loadBooks();
    }, []);

    // Load selected book data
    useEffect(() => {
        if (!bookId) return;
        async function loadBook() {
            setIsLoading(true);
            try {
                // Fetch book details (including tokens)
                const bookRes = await fetch(`/api/books/${bookId}`);
                const book = await bookRes.json();

                // Fetch narration shards
                const narrationRes = await fetch(`/api/books/${bookId}/narration`);
                const shards = await narrationRes.json();

                // Fetch progress
                const progressRes = await fetch(`/api/books/${bookId}/progress`);
                const progress = await progressRes.json();

                setBookData({
                    ...book,
                    shards,
                    initialProgress: progress
                });
            } catch (err) {
                console.error('Failed to load book data:', err);
            } finally {
                setIsLoading(false);
            }
        }
        loadBook();
    }, [bookId]);

    if (!bookId || !bookData) {
        return (
            <div className="flex h-screen items-center justify-center bg-zinc-950 text-zinc-100">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                    <p className="text-zinc-400">Loading Lexi Test Environment...</p>
                </div>
            </div>
        );
    }

    return (
        <LexiReaderContainer
            key={bookId} // Force fresh engine on book switch
            book={bookData}
            books={books}
            onBookChange={setBookId}
        />
    );
}

function LexiReaderContainer({ book, books, onBookChange }: { book: any, books: any[], onBookChange: (id: string) => void }) {
    const {
        state,
        currentShardIndex,
        currentWordIndex,
        currentTime,
        play,
        pause,
        seekToWord,
        setSpeed
    } = useNarrationEngine({
        bookId: book.id,
        shards: book.shards,
        initialTokenIndex: book.initialProgress?.last_token_index || 0,
        initialShardIndex: book.initialProgress?.last_shard_index || 0,
        initialTime: book.initialProgress?.last_playback_time || 0,
        speed: 1,
        onProgress: (progress) => {
            // Optional progress callback
        }
    });

    // Persistence Hook
    useReaderPersistence({
        bookId: book.id,
        tokenIndex: currentWordIndex,
        shardIndex: currentShardIndex,
        time: currentTime,
        playbackState: state
    });

    return (
        <div className="flex h-screen flex-col bg-zinc-950 text-zinc-100">
            {/* Header / Controls */}
            <header className="flex h-16 items-center justify-between border-b border-zinc-800 px-6 backdrop-blur-md bg-zinc-950/50 sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <select
                        value={book.id}
                        onChange={(e) => onBookChange(e.target.value)}
                        className="bg-zinc-900 border border-zinc-700 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        {books.map(b => (
                            <option key={b.id} value={b.id}>{b.title}</option>
                        ))}
                    </select>
                    <div className="h-4 w-px bg-zinc-800" />
                    <span className="text-sm font-medium text-zinc-300">{book.title}</span>
                </div>

                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 bg-zinc-900 rounded-full px-4 py-1.5 border border-zinc-800">
                        <button
                            className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-zinc-800 hover:text-indigo-400 transition-colors"
                            onClick={() => seekToWord(Math.max(0, currentWordIndex - 10))}
                        >
                            <Rewind className="h-4 w-4" />
                        </button>

                        {state === 'playing' ? (
                            <button
                                className="h-10 w-10 flex items-center justify-center rounded-md text-indigo-400 hover:text-indigo-300 transition-colors"
                                onClick={pause}
                            >
                                <Pause className="h-6 w-6 fill-current" />
                            </button>
                        ) : (
                            <button
                                className="h-10 w-10 flex items-center justify-center rounded-md text-emerald-400 hover:text-emerald-300 transition-colors"
                                onClick={play}
                            >
                                <Play className="h-6 w-6 fill-current" />
                            </button>
                        )}

                        <button
                            className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-zinc-800 hover:text-indigo-400 transition-colors"
                            onClick={() => seekToWord(currentWordIndex + 10)}
                        >
                            <FastForward className="h-4 w-4" />
                        </button>
                    </div>

                    <select
                        onChange={(e) => setSpeed(parseFloat(e.target.value))}
                        defaultValue="1"
                        className="bg-zinc-900 border border-zinc-700 rounded-md px-2 py-1 text-xs focus:outline-none"
                    >
                        <option value="0.75">0.75x</option>
                        <option value="1">1.0x</option>
                        <option value="1.25">1.25x</option>
                        <option value="1.5">1.5x</option>
                        <option value="2">2.0x</option>
                    </select>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Progress</span>
                        <span className="text-sm font-mono text-indigo-400">
                            Word {currentWordIndex} / Shard {currentShardIndex}
                        </span>
                    </div>
                </div>
            </header>

            {/* Reader Content */}
            <main className="flex-1 overflow-hidden relative">
                <LexiReader
                    tokens={book.tokens}
                    currentWordIndex={currentWordIndex}
                    onWordClick={seekToWord}
                    className="max-w-3xl mx-auto py-12 px-8 h-full overflow-y-auto"
                />

                {state === 'buffering' && (
                    <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px] flex items-center justify-center z-20">
                        <div className="bg-zinc-900 border border-zinc-800 rounded-full px-4 py-2 flex items-center gap-2 shadow-2xl">
                            <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
                            <span className="text-xs text-zinc-300 font-medium tracking-tight">Buffering audio...</span>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
