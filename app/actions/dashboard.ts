'use server';
 
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { BookRepository } from '@/lib/core/books/repository.server';
import { LibraryBookCard } from '@/lib/core/books/library-types';
import { GamificationRepository } from '@/lib/core/gamification/repository.server';
 
export interface XpTransaction {
  id: string;
  amount: number;
  reason: string;
  transaction_type: 'lumo_coin' | 'credit';
  entity_type: string | null;
  entity_id: string | null;
  metadata: any;
  created_at: string;
  book_title?: string;
  book_cover_path?: string;
  book_id?: string;
}

export interface DashboardStats {
  completedBooks: number;
  masteredWords: number;
  storiesCreated: number;
  magicSentencesCreated: number;
  badges: { 
    id: string; 
    name: string; 
    description: string | null; 
    rarity: string | null; 
    icon_path: string | null; 
    criteria: string | null;
    is_earned: boolean;
    earned_at?: string;
  }[];
  totalXp: number;
  level: number;
  streakCount: number;
  maxStreak: number;
  recommendations: LibraryBookCard[];
  xpHistory: XpTransaction[];
}

export async function getDashboardStats(childId?: string) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: 'Not authenticated' };
    }

    const targetChildId = childId || cookies().get('activeChildId')?.value;

    if (!targetChildId) {
      return { error: 'No active child profile' };
    }

    // --- STEP 1: VALIDATE OWNERSHIP & GET CORE DATA ---
    const { data: childData, error: childError } = await supabase
        .from('children')
        .select('total_xp, level, streak_count, max_streak, earned_badges')
        .match({ id: targetChildId, owner_user_id: user.id })
        .single();
    
    if (childError || !childData) {
        return { error: 'Child profile not found or access denied' };
    }

    // --- STEP 2: PARALLEL EVERYTHING ELSE ---
    const repo = new BookRepository();
    const gamificationRepo = new GamificationRepository();
    const [
      booksCount,
      vocabCount,
      storiesCount,
      sentencesCount,
      recommendations,
      xpTransactions
    ] = await Promise.all([
      supabase.from('child_books').select('*', { count: 'exact', head: true }).eq('child_id', targetChildId).eq('is_completed', true),
      supabase.from('child_vocab').select('*', { count: 'exact', head: true }).eq('child_id', targetChildId).eq('status', 'mastered'),
      supabase.from('stories').select('*', { count: 'exact', head: true }).eq('child_id', targetChildId),
      supabase.from('child_magic_sentences').select('*', { count: 'exact', head: true }).eq('child_id', targetChildId),
      repo.getRecommendedBooksWithCovers(user.id, targetChildId, 3).catch(err => {
        console.error('[dashboard:getDashboardStats] Recommendations failed:', err);
        return [] as LibraryBookCard[];
      }),
      gamificationRepo.getRecentAchievements(targetChildId, 10).catch(err => {
        console.error('[dashboard:getDashboardStats] XP history failed:', err);
        return [] as any[];
      })
    ]);

    // Log warnings for partial failures
    if (booksCount.error || vocabCount.error || storiesCount.error || sentencesCount.error) {
        console.warn('[dashboard:getDashboardStats] One or more sub-queries failed:', {
            books: booksCount.error,
            vocab: vocabCount.error,
            stories: storiesCount.error,
            sentences: sentencesCount.error
        });
    }

    // Enrich XP history with book titles
    const xpHistoryRaw = Array.isArray(xpTransactions) ? xpTransactions : [];
    const bookIds = xpHistoryRaw
      .filter((t: any) => t.entity_type === 'book' && t.entity_id)
      .map((t: any) => t.entity_id as string);
    
    let bookData: Record<string, { title: string; cover_image_path: string | null }> = {};
    if (bookIds.length > 0) {
      const { data: books } = await supabase
        .from('books')
        .select('id, title, cover_image_path')
        .in('id', bookIds)
        .or(`owner_user_id.eq.${user.id},owner_user_id.is.null`);
      books?.forEach(b => {
        bookData[b.id] = { title: b.title, cover_image_path: b.cover_image_path };
      });
    }

    // Process badges
    const earnedBadgesMap = (childData?.earned_badges as Record<string, string>) || {};
    
    // Fetch ALL available badges to show potential ones
    const { data: allBadges, error: badgesError } = await supabase
        .from('badges')
        .select('*')
        .order('rarity', { ascending: true }); // basic -> legendary
    
    if (badgesError) {
        console.error('[dashboard:getDashboardStats] Failed to fetch badges metadata:', badgesError);
    }

    const badges = (allBadges || []).map(b => ({
        ...b,
        is_earned: !!earnedBadgesMap[b.id],
        earned_at: earnedBadgesMap[b.id]
    }));

    // Sign URLs for book covers
    const coversToSign = Object.values(bookData)
      .map(b => b.cover_image_path)
      .filter((path): path is string => !!path && !path.startsWith('http'));

    const signedUrlMap = new Map<string, string>();
    if (coversToSign.length > 0) {
      const { data: signedData } = await supabase.storage.from('book-assets').createSignedUrls(coversToSign, 3600);
      signedData?.forEach(item => { if (item.path && item.signedUrl) signedUrlMap.set(item.path, item.signedUrl); });
    }

    const xpHistory: XpTransaction[] = xpHistoryRaw.map((t: any) => {
      const isBook = t.entity_type === 'book' && t.entity_id;
      const bData = isBook ? bookData[t.entity_id] : null;
      let coverUrl = bData?.cover_image_path || undefined;
      if (coverUrl && !coverUrl.startsWith('http')) {
        coverUrl = signedUrlMap.get(coverUrl);
      }

      return {
        ...t,
        book_title: bData?.title,
        book_cover_path: coverUrl,
        book_id: t.entity_id
      };
    });

    const stats: DashboardStats = {
      completedBooks: booksCount.count || 0,
      masteredWords: vocabCount.count || 0,
      storiesCreated: storiesCount.count || 0,
      magicSentencesCreated: sentencesCount.count || 0,
      badges,
      totalXp: childData?.total_xp || 0,
      level: childData?.level || 1,
      streakCount: childData?.streak_count || 0,
      maxStreak: childData?.max_streak || 0,
      recommendations: (Array.isArray(recommendations) ? recommendations : []).map(b => ({
          id: b.id,
          title: b.title,
          coverImageUrl: b.coverImageUrl,
          coverPath: b.coverPath,
          updated_at: b.updated_at,
          createdAt: b.createdAt,
          voice_id: b.voice_id,
          owner_user_id: b.owner_user_id,
          totalTokens: b.totalTokens,
          estimatedReadingTime: b.estimatedReadingTime,
          isRead: b.isRead,
          lastOpenedAt: b.lastOpenedAt,
          isFavorite: b.isFavorite,
          level: b.level,
          isNonFiction: b.isNonFiction,
          origin: b.origin,
          description: b.description
      })),
      xpHistory
    };

    return {
      success: true,
      data: stats
    };
  } catch (err: any) {
    console.error('[dashboard:getDashboardStats] Unexpected error:', err);
    return { error: err.message || 'Failed to fetch dashboard stats' };
  }
}
