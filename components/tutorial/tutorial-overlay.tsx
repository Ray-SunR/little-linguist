"use client";

import { useTutorial } from './tutorial-context';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState, useCallback, useRef } from 'react';
// import { useAuth } from '@/components/auth/auth-provider';
import { X, Sparkles, ArrowRight } from 'lucide-react';

// Use a hook to track the rect of an element with ResizeObserver
function useRect(targetId: string | undefined, dataTourTarget: string | undefined) {
    const [rect, setRect] = useState<{ top: number; left: number; width: number; height: number; bottom: number; right: number } | null>(null);

    // We use a ref to keep track of the current element we are observing
    const targetElementRef = useRef<Element | null>(null);
    const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

    const updateRect = useCallback(() => {
        // Always update window size on resize/scroll/updates
        setWindowSize({
            width: window.innerWidth,
            height: window.innerHeight
        });

        if (!targetElementRef.current) return;
        const r = targetElementRef.current.getBoundingClientRect();
        // Check if rect actually changed to avoid tight loops, though minor float diffs happens
        setRect({
            top: r.top,
            left: r.left,
            width: r.width,
            height: r.height,
            bottom: r.bottom,
            right: r.right
        });
    }, []);

    useEffect(() => {
        // Reset rect immediately when target changes to prevent stale positioning
        setRect(null);

        if (!targetId && !dataTourTarget) {
            return;
        }

        const findElement = () => {
            let el = document.getElementById(targetId || '');
            if (!el && dataTourTarget) {
                el = document.querySelector(`[data-tour-target="${dataTourTarget}"]`);
            }
            return el;
        };

        const el = findElement();
        targetElementRef.current = el;

        if (el) {
            updateRect();

            // 1. ResizeObserver: efficient size tracking
            const resizeObserver = new ResizeObserver(() => {
                updateRect();
            });
            resizeObserver.observe(el);
            resizeObserver.observe(document.body); // Also watch body for layout shifts

            // 2. Scroll listener: essential for fixed masking
            window.addEventListener('scroll', updateRect, { capture: true, passive: true });
            window.addEventListener('resize', updateRect, { passive: true });

            // 3. Animation Polling (Critical for entrance animations)
            // Poll frequently for the first 2 seconds to catch modal slides/fades
            let pollCount = 0;
            const pollInterval = setInterval(() => {
                updateRect();
                pollCount++;
                if (pollCount > 40) clearInterval(pollInterval); // Stop after ~2s (50ms * 40)
            }, 50);

            return () => {
                resizeObserver.disconnect();
                window.removeEventListener('scroll', updateRect, { capture: true });
                window.removeEventListener('resize', updateRect);
                clearInterval(pollInterval);
            };
        } else {
            // Polling fallback if element not found yet (dynamic mounting)
            const timer = setInterval(() => {
                const found = findElement();
                if (found) {
                    targetElementRef.current = found;
                    updateRect();
                    // Force re-run handled by effect cleanup/re-run when dependencies change
                    // But effectively we just start observing manually if we wanted, 
                    // simplest is to let this interval die and rely on React state if we stored 'el'
                    // For now, this fallback just grabs it once. 
                    // To be robust, we need to restart the main effect. 
                    // We can do that by setting a state or forcing update, but typically 
                    // the target appears quickly.
                }
            }, 500);
            return () => clearInterval(timer);
        }
    }, [targetId, dataTourTarget, updateRect]);

    return rect;
}

export default function TutorialOverlay() {
    const { currentStep, isActive, isCompleted, isDisplayPaused, nextStep, prevStep, skipTutorial, activeStepDetails, currentStepIndex } = useTutorial();
    // const { user } = useAuth();
    const [isClient, setIsClient] = useState(false);
    const lastScrolledStepId = useRef<string | null>(null);

    useEffect(() => {
        setIsClient(true);
    }, []);

    const targetRect = useRect(activeStepDetails?.targetId, activeStepDetails?.dataTourTarget);

    // Auto-scroll logic (Only fire once per step or when target appears)
    useEffect(() => {
        if (isActive && targetRect && activeStepDetails) {
            // Only scroll if we haven't scrolled for this step yet
            if (lastScrolledStepId.current === activeStepDetails.id) return;

            // Check if element is in viewport
            const isInViewport = (
                targetRect.top >= 0 &&
                targetRect.left >= 0 &&
                targetRect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
                targetRect.right <= (window.innerWidth || document.documentElement.clientWidth)
            );

            if (!isInViewport) {
                const el = document.getElementById(activeStepDetails.targetId) ||
                    document.querySelector(`[data-tour-target="${activeStepDetails.dataTourTarget}"]`);

                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
                    lastScrolledStepId.current = activeStepDetails.id;
                }
            } else {
                // If it's already in viewport, still mark as handled so we don't fight user scroll later
                lastScrolledStepId.current = activeStepDetails.id;
            }
        }
    }, [isActive, activeStepDetails, targetRect]);


    if (!isClient || !isActive || !activeStepDetails || isCompleted || isDisplayPaused) return null;

    // Prevent rendering until we have the target rect if a target is specified.
    // This avoids the "pop too early" issue where it shows up centered while the page is loading.
    const hasTarget = !!(activeStepDetails?.targetId || activeStepDetails?.dataTourTarget);
    if (hasTarget && !targetRect) return null;

    const { position = 'bottom', title, content, actionRequired } = activeStepDetails;

    // Radius for the spotlight hole
    const radius = 16;
    // Padding around the element
    const padding = 8;

    // Safe rect for SVG
    const hole = targetRect ? {
        x: targetRect.left - padding,
        y: targetRect.top - padding,
        width: targetRect.width + (padding * 2),
        height: targetRect.height + (padding * 2)
    } : { x: 0, y: 0, width: 0, height: 0 };

    const tooltipPos = getTooltipPosition(hole, position);


    return (
        <div className="fixed inset-0 z-[300] pointer-events-none flex flex-col">
            {/* 1. Backdrop with Hole (SVG Mask) */}
            {/* 1. Backdrop with Hole (SVG Mask) */}
            {/* 1. Backdrop with Hole (Path with evenodd rule) */}
            <div className="absolute inset-0 w-full h-full pointer-events-none">
                <svg className="w-full h-full pointer-events-none" width="100%" height="100%" viewBox={`0 0 ${window.innerWidth} ${window.innerHeight}`}>
                    {/* The dimming overlay as a path with a hole. 
                        Outer rect: 0,0 to w,h
                        Inner rect: hole.x,hole.y to hole.x+w, hole.y+h
                    */}
                    <path
                        d={`
                            M 0 0 
                            H ${window.innerWidth} 
                            V ${window.innerHeight} 
                            H 0 
                            Z 
                            M ${hole.x} ${hole.y} 
                            H ${hole.x + hole.width} 
                            V ${hole.y + hole.height} 
                            H ${hole.x} 
                            Z
                        `}
                        fillRule="evenodd"
                        fill="rgba(0, 0, 0, 0.4)"
                        className="pointer-events-auto"
                        onClick={() => {
                            if (!actionRequired) nextStep();
                        }}
                    />

                    {/* Optional: Ring around the hole */}
                    {targetRect && (
                        <rect
                            x={hole.x}
                            y={hole.y}
                            width={hole.width}
                            height={hole.height}
                            rx={radius}
                            fill="transparent"
                            stroke="rgba(255, 255, 255, 0.5)"
                            strokeWidth={2}
                            style={{ filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.3))' }}
                            className="pointer-events-none"
                        />
                    )}
                </svg>
            </div>


            {/* 2. Tooltip Card (Positioned absolutely over the overlay) */}
            <div
                className="absolute pointer-events-auto"
                style={{
                    zIndex: 101, // Above backdrop
                    top: tooltipPos.top,
                    left: tooltipPos.left,
                    transform: tooltipPos.transform
                }}
            >
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeStepDetails.id}
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        className="w-80" // Move width here or keep in inner div
                    >
                        <div
                            className="w-80 bg-white/95 backdrop-blur-xl rounded-[2rem] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-white/50 ring-1 ring-purple-100/50 overflow-y-auto custom-scrollbar"
                            style={{ maxHeight: tooltipPos.maxHeight }}
                        >
                            {/* Decorative background element */}
                            <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-purple-200/30 to-blue-200/30 rounded-full blur-2xl pointer-events-none" />

                            <div className="relative">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20 text-white">
                                            <Sparkles className="w-5 h-5" />
                                        </div>
                                        <h3 className="font-fredoka font-bold text-lg text-slate-800 leading-tight">
                                            {title}
                                        </h3>
                                    </div>
                                    <button
                                        onClick={skipTutorial}
                                        className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                                        title="Close Tutorial"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                <p className="text-slate-600 font-nunito text-base leading-relaxed mb-6 font-medium">
                                    {content}
                                </p>

                                <div className="flex items-center justify-between">
                                    <div className="flex gap-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-purple-600" />
                                        <div className="w-1.5 h-1.5 rounded-full bg-purple-200" />
                                        <div className="w-1.5 h-1.5 rounded-full bg-purple-200" />
                                    </div>

                                    <div className="flex items-center gap-3">
                                        {(
                                            <button
                                                onClick={prevStep}
                                                className="px-4 py-2 rounded-xl text-slate-500 font-fredoka font-bold text-sm hover:bg-slate-50 transition-colors disabled:opacity-50"
                                                disabled={currentStepIndex === 0}
                                            >
                                                Back
                                            </button>
                                        )}

                                        {actionRequired ? (
                                            <div className="px-5 py-2.5 rounded-xl bg-slate-100 text-slate-400 font-fredoka font-bold text-sm border border-slate-200 flex items-center gap-2 cursor-not-allowed">
                                                <span>Interact to Continue</span>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={nextStep}
                                                className="px-6 py-2.5 rounded-xl bg-purple-600 text-white font-fredoka font-bold text-sm shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:-translate-y-0.5 transition-all flex items-center gap-2 group"
                                            >
                                                <span>Next</span>
                                                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>
        </div >
    );
}

function getTooltipPosition(targetRect: { x: number, y: number, width: number, height: number, bottom?: number, right?: number } | null, position: string): { top: number, left: number, transform: string, maxHeight: number } {
    if (!targetRect || targetRect.width === 0) {
        // Fallback checks
        const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
        const vw = typeof window !== 'undefined' ? window.innerWidth : 1000;
        return {
            top: vh / 2,
            left: vw / 2,
            transform: 'translate(-50%, -50%)', // Centered
            maxHeight: vh - 32
        };
    }

    const spacing = 16;
    const margin = 16;

    // Safe clamping logic
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1000;
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
    const tooltipWidth = 320; // w-80 is 20rem = 320px
    const estimatedHeight = 400; // Increased estimate to be safer for flipping

    // Ensure left position doesn't overflow
    const clampHorizontal = (left: number) => {
        const halfWidth = tooltipWidth / 2;
        if (left - halfWidth < margin) {
            return margin + halfWidth;
        }
        if (left + halfWidth > viewportWidth - margin) {
            return viewportWidth - margin - halfWidth;
        }
        return left;
    };

    // Calculate available space
    const spaceAbove = targetRect.y - margin;
    const spaceBelow = viewportHeight - (targetRect.y + targetRect.height) - margin;

    let effectivePosition = position;

    // Vertical Flipping Logic - prefer the direction with MORE space
    if (position === 'top' || position === 'bottom') {
        const neededSpace = estimatedHeight + spacing;

        if (position === 'top' && spaceAbove < neededSpace) {
            // Not enough space above, check if bottom is better
            effectivePosition = spaceBelow > spaceAbove ? 'bottom' : 'top';
        } else if (position === 'bottom' && spaceBelow < neededSpace) {
            // Not enough space below, check if top is better
            effectivePosition = spaceAbove > spaceBelow ? 'top' : 'bottom';
        }
    }

    // Horizontal Flipping Logic
    if (position === 'left' && targetRect.x - spacing - tooltipWidth < margin) {
        effectivePosition = 'right';
    } else if (position === 'right' && targetRect.x + targetRect.width + spacing + tooltipWidth > viewportWidth - margin) {
        effectivePosition = 'left';
    }

    // Calculate base position
    let top: number;
    let left: number;
    let transform: string;

    switch (effectivePosition) {
        case 'top':
            top = targetRect.y - spacing;
            left = clampHorizontal(targetRect.x + (targetRect.width / 2));
            transform = 'translate(-50%, -100%)';
            break;
        case 'bottom':
            top = targetRect.y + targetRect.height + spacing;
            left = clampHorizontal(targetRect.x + (targetRect.width / 2));
            transform = 'translate(-50%, 0)';
            break;
        case 'left':
            top = targetRect.y + (targetRect.height / 2);
            left = targetRect.x - spacing;
            transform = 'translate(-100%, -50%)';
            break;
        case 'right':
            top = targetRect.y + (targetRect.height / 2);
            left = targetRect.x + targetRect.width + spacing;
            transform = 'translate(0, -50%)';
            break;
        default:
            top = targetRect.y + targetRect.height + spacing;
            left = clampHorizontal(targetRect.x + (targetRect.width / 2));
            transform = 'translate(-50%, 0)';
    }

    // Calculate Max Height based on available space in the effective direction
    let maxHeight = viewportHeight - (margin * 2);
    if (effectivePosition === 'top') {
        maxHeight = Math.max(0, spaceAbove - spacing);
    } else if (effectivePosition === 'bottom') {
        maxHeight = Math.max(0, spaceBelow - spacing);
    } else if (effectivePosition === 'left' || effectivePosition === 'right') {
        // For side tooltips, we still want to ensure they don't exceed viewport height
        maxHeight = viewportHeight - (margin * 2);

        // Horizontal clamping for side tooltips (ensure they don't go off-screen)
        if (effectivePosition === 'left') {
            if (left - tooltipWidth < margin) {
                left = margin + tooltipWidth;
            }
        } else if (effectivePosition === 'right') {
            if (left + tooltipWidth > viewportWidth - margin) {
                left = viewportWidth - margin - tooltipWidth;
            }
        }
    }

    // Horizontal and vertical clamping for safety (keeping the transform logic simple)
    // Horizontal check for top/bottom
    if (effectivePosition === 'top' || effectivePosition === 'bottom') {
        // Already handled by clampHorizontal
    }

    // Vertical clamping for side tooltips (centered)
    if (effectivePosition === 'left' || effectivePosition === 'right') {
        // Logic for keeping the horizontally-centered card within the vertical viewport
        // (already partially handled by margin check if needed, but let's be explicit)
        const estimatedCardHeight = Math.min(estimatedHeight, maxHeight);
        const halfHeight = estimatedCardHeight / 2;
        if (top - halfHeight < margin) {
            top = margin + halfHeight;
        }
        if (top + halfHeight > viewportHeight - margin) {
            top = viewportHeight - margin - halfHeight;
        }
    }

    return { top, left, transform, maxHeight };
}
