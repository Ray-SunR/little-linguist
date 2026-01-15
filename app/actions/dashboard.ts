'use server';

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export interface DashboardStats {
  completedBooks: number;
  masteredWords: number;
  storiesCreated: number;
  magicSentencesCreated: number;
  badges: any[];
  weeklyActivity: { date: string; minutes: number }[];
  totalXp: number;
  level: number;
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

    // Fetch stats in parallel
    const [
      booksCount,
      vocabCount,
      storiesCount,
      sentencesCount,
      badgesData,
      childData,
      auditLogs
    ] = await Promise.all([
      supabase.from('child_books').select('*', { count: 'exact', head: true }).eq('child_id', targetChildId).eq('is_completed', true),
      supabase.from('child_vocab').select('*', { count: 'exact', head: true }).eq('child_id', targetChildId).eq('status', 'mastered'),
      supabase.from('stories').select('*', { count: 'exact', head: true }).eq('child_id', targetChildId),
      supabase.from('child_magic_sentences').select('*', { count: 'exact', head: true }).eq('child_id', targetChildId),
      supabase.from('child_badges').select('earned_at, badges(*)').eq('child_id', targetChildId),
      supabase.from('children').select('total_xp, level').eq('id', targetChildId).single(),
      supabase.from('audit_logs').select('created_at, details').eq('child_id', targetChildId).gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    ]);

    // Process weekly activity
    const activityMap = new Map<string, number>();
    // Pre-fill last 7 days
    for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        activityMap.set(d.toISOString().split('T')[0], 0);
    }

    auditLogs.data?.forEach(log => {
        const date = new Date(log.created_at).toISOString().split('T')[0];
        if (activityMap.has(date)) {
            // If the log detail has reading_time or similar, we use it, otherwise increment by a small amount or just count
            const mins = (log.details as any)?.reading_time || 5; // default 5 mins for an activity
            activityMap.set(date, (activityMap.get(date) || 0) + mins);
        }
    });

    const weeklyActivity = Array.from(activityMap.entries())
        .map(([date, minutes]) => ({ date, minutes }))
        .sort((a, b) => a.date.localeCompare(b.date));

    return {
      success: true,
      data: {
        completedBooks: booksCount.count || 0,
        masteredWords: vocabCount.count || 0,
        storiesCreated: storiesCount.count || 0,
        magicSentencesCreated: sentencesCount.count || 0,
        badges: badgesData.data || [],
        totalXp: childData.data?.total_xp || 0,
        level: childData.data?.level || 1,
        weeklyActivity
      } as DashboardStats
    };
  } catch (err: any) {
    console.error('[dashboard:getDashboardStats] Unexpected error:', err);
    return { error: err.message || 'Failed to fetch dashboard stats' };
  }
}
