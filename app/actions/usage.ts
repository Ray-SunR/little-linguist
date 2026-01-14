"use server";

export interface UsageEvent {
    id: string;
    action: string;
    description: string;
    timestamp: string;
    amount: number;
    type: "credit" | "debit";
}

export async function getUsageHistory(limit: number = 10): Promise<UsageEvent[]> {
    // Mock data for now as requested
    const actions = [
        { action: "Story Generation", desc: "The Brave Little Toaster", baseAmount: 5 },
        { action: "Image Generation", desc: "Magical Forest Background", baseAmount: 1 },
        { action: "Word Insight", desc: "Definition of 'Serendipity'", baseAmount: 1 },
        { action: "Story Generation", desc: "Dragon's First Flight", baseAmount: 5 },
        { action: "Bonus", desc: "Weekly Allowance", baseAmount: 10, type: "credit" as const },
    ];

    const history: UsageEvent[] = [];
    const now = new Date();

    for (let i = 0; i < limit; i++) {
        const randomAction = actions[Math.floor(Math.random() * actions.length)];
        const timeOffset = Math.floor(Math.random() * 1000 * 60 * 60 * 24 * 7); // Random time within last week
        
        history.push({
            id: `evt_${Math.random().toString(36).substr(2, 9)}`,
            action: randomAction.action,
            description: randomAction.desc,
            timestamp: new Date(now.getTime() - timeOffset).toISOString(),
            amount: randomAction.baseAmount,
            type: randomAction.type || "debit"
        });
    }

    // Sort by most recent
    return history.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}
