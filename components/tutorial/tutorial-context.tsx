"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { TUTORIAL_STEPS, TutorialStep } from "./tutorial-data";

interface TutorialContextType {
    currentStepIndex: number;
    currentStep: TutorialStep | null;
    isActive: boolean;
    isCompleted: boolean;
    isDisplayPaused: boolean;
    startTutorial: () => void;
    endTutorial: () => void;
    nextStep: () => void;
    prevStep: () => void;
    skipTutorial: () => void;
    completeStep: (stepId: string) => void;
    resetTutorial: () => void;
    pauseDisplay: () => void;
    activeStepDetails: TutorialStep | null;
}

import { useAuth } from "@/components/auth/auth-provider";

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

const STORAGE_COMPLETED_KEY = "lumo_tutorial_completed_v2";
const STORAGE_STEP_ID_KEY = "lumo_tutorial_step_id_v2";
const LEGACY_INDEX_KEY = "lumo_tutorial_step_index_v1";

export function TutorialProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [isActive, setIsActive] = useState(false);
    // Scoped keys based on user ID
    const storageKeySuffix = user?.id ? user.id : "guest";
    const storageCompletedKey = `${STORAGE_COMPLETED_KEY}_${storageKeySuffix}`;
    const storageStepIdKey = `${STORAGE_STEP_ID_KEY}_${storageKeySuffix}`;

    const [isCompleted, setIsCompleted] = useState(false);
    const [currentStepId, setCurrentStepId] = useState<string | null>(null);
    const [isDisplayPaused, setIsDisplayPaused] = useState(false);

    // Filter steps based on auth status
    const availableSteps = useMemo(() => {
        return TUTORIAL_STEPS.filter(step => {
            if (!user && step.requiresAuth) return false;
            if (user && step.skipIfAuth) return false;
            return true;
        });
    }, [user]);

    const currentStepIndex = useMemo(() => {
        if (!currentStepId) return 0;
        const index = availableSteps.findIndex(s => s.id === currentStepId);
        return index >= 0 ? index : 0;
    }, [currentStepId, availableSteps]);

    const activeStep = useMemo(() => {
        return availableSteps[currentStepIndex] || null;
    }, [currentStepIndex, availableSteps]);

    // Validation helper
    const validateStepId = useCallback((id: string | null): string => {
        if (!id) return availableSteps[0]?.id || "";
        const exists = availableSteps.some(s => s.id === id);
        return exists ? id : availableSteps[0]?.id || "";
    }, [availableSteps]);

    // Initialize and Migrate
    useEffect(() => {
        const completed = localStorage.getItem(storageCompletedKey) === "true";
        const savedStepId = localStorage.getItem(storageStepIdKey);

        // Legacy migration (only for logged in users or if we want to migrate guest legacy data)
        // For simplicity, we only migrate if we find specific legacy keys and no new keys
        // But since we are changing keys entirely, let's just start fresh or respect legacy if present?
        // Actually, the plan implies we just switch to new keys. 
        // Let's implement robust init.

        if (completed) {
            setIsCompleted(true);
            return;
        }

        if (savedStepId) {
            const validated = validateStepId(savedStepId);
            setCurrentStepId(validated);
        } else {
            setCurrentStepId(availableSteps[0]?.id || null);
        }

        // Auto-start delay
        const timer = setTimeout(() => {
            // Only auto-activate if not completed
            if (!completed) setIsActive(true);
        }, 1000);

        return () => clearTimeout(timer);
    }, [storageCompletedKey, storageStepIdKey, validateStepId, availableSteps]);

    // Cross-tab sync
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === storageStepIdKey && e.newValue) {
                const validated = validateStepId(e.newValue);
                setCurrentStepId(validated);
            }
            if (e.key === storageCompletedKey) {
                const completed = e.newValue === "true";
                setIsCompleted(completed);
                if (completed) setIsActive(false);
            }
        };

        window.addEventListener("storage", handleStorageChange);
        return () => window.removeEventListener("storage", handleStorageChange);
    }, [storageStepIdKey, storageCompletedKey, validateStepId]);

    // Persist changes
    useEffect(() => {
        if (isActive && !isCompleted && currentStepId) {
            const existing = localStorage.getItem(storageStepIdKey);
            if (existing !== currentStepId) {
                localStorage.setItem(storageStepIdKey, currentStepId);
            }
        }
    }, [currentStepId, isActive, isCompleted, storageStepIdKey]);

    // Re-verify current step when availableSteps changes (e.g. auth login/logout)
    useEffect(() => {
        if (currentStepId) {
            const validated = validateStepId(currentStepId);
            if (validated !== currentStepId) {
                setCurrentStepId(validated);
            }
        }
    }, [availableSteps, currentStepId, validateStepId]);

    // Reset display paused state when step changes (safety mechanism)
    useEffect(() => {
        setIsDisplayPaused(false);
    }, [currentStepId]);

    const endTutorial = useCallback(() => {
        setIsActive(false);
        setIsCompleted(true);
        localStorage.setItem(storageCompletedKey, "true");
        localStorage.removeItem(storageStepIdKey);
    }, [storageCompletedKey, storageStepIdKey]);

    const nextStep = useCallback(() => {
        if (currentStepIndex < availableSteps.length - 1) {
            const nextStep = availableSteps[currentStepIndex + 1];
            setCurrentStepId(nextStep.id);
        } else {
            endTutorial();
        }
    }, [currentStepIndex, availableSteps, endTutorial]);

    const prevStep = useCallback(() => {
        if (currentStepIndex > 0) {
            const prevStep = availableSteps[currentStepIndex - 1];
            setCurrentStepId(prevStep.id);
        }
    }, [currentStepIndex, availableSteps]);

    const completeStep = useCallback((stepId: string) => {
        // Resume display when completing a step
        setIsDisplayPaused(false);
        // Only advance if the completed step is exactly the one we are on
        if (activeStep && activeStep.id === stepId) {
            nextStep();
        }
    }, [activeStep, nextStep]);

    const pauseDisplay = useCallback(() => {
        setIsDisplayPaused(true);
    }, []);

    const startTutorial = useCallback(() => {
        setIsActive(true);
        setIsCompleted(false);
        setIsDisplayPaused(false);
        const firstId = availableSteps[0]?.id;
        if (firstId) {
            setCurrentStepId(firstId);
            localStorage.removeItem(storageCompletedKey);
            localStorage.setItem(storageStepIdKey, firstId);
        }
    }, [availableSteps, storageCompletedKey, storageStepIdKey]);


    const skipTutorial = useCallback(() => {
        setIsActive(false);
        setIsCompleted(true);
        localStorage.setItem(storageCompletedKey, "true");
        localStorage.removeItem(storageStepIdKey);
    }, [storageCompletedKey, storageStepIdKey]);

    const resetTutorial = useCallback(() => {
        startTutorial();
    }, [startTutorial]);

    return (
        <TutorialContext.Provider
            value={{
                currentStepIndex,
                currentStep: isActive ? activeStep : null,
                isActive,
                isCompleted,
                isDisplayPaused,
                startTutorial,
                endTutorial,
                nextStep,
                prevStep,
                skipTutorial,
                completeStep,
                resetTutorial,
                pauseDisplay,
                activeStepDetails: isActive ? activeStep : null,
            }}
        >
            {children}
        </TutorialContext.Provider>
    );
}

export function useTutorial() {
    const context = useContext(TutorialContext);
    if (!context) {
        throw new Error("useTutorial must be used within a TutorialProvider");
    }
    return context;
}
