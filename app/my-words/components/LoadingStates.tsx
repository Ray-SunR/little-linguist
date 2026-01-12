export function LoadingStates() {
    return (
        <div className="min-h-screen p-6 md:p-10 mx-auto max-w-6xl">
            {/* Header Skeleton */}
            <div className="flex flex-col md:flex-row gap-8 mb-16 animate-pulse">
                <div className="w-32 h-32 rounded-full bg-slate-200" />
                <div className="flex-1 space-y-4 pt-10">
                    <div className="h-12 w-64 bg-slate-200 rounded-2xl" />
                    <div className="h-6 w-40 bg-slate-100 rounded-full" />
                </div>
            </div>

            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                    <div
                        key={i}
                        className="h-[28rem] rounded-[2.5rem] bg-white/50 backdrop-blur-sm animate-pulse border-4 border-white shadow-clay-inset relative overflow-hidden"
                    >
                        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-slate-50/50 to-transparent" />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-slate-100 rounded-3xl" />
                    </div>
                ))}
            </div>
        </div>
    );
}
