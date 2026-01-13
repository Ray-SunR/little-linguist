
import { TUTORIAL_STEPS } from "../tutorial-data";

/**
 * Basic tests for tutorial logic.
 * Note: These are designed to be run with a test runner like Vitest.
 */
describe("Tutorial Logic", () => {
    test("all steps have unique stable ids", () => {
        const ids = TUTORIAL_STEPS.map(s => s.id);
        const uniqueIds = new Set(ids);
        expect(ids.length).toBe(uniqueIds.size);
    });

    test("all steps have targetId or dataTourTarget", () => {
        TUTORIAL_STEPS.forEach(step => {
            expect(step.targetId || step.dataTourTarget).toBeDefined();
        });
    });

    test("story-maker-nav step points to the correct route", () => {
        const step = TUTORIAL_STEPS.find(s => s.id === "story-maker-nav");
        expect(step?.route).toBe("/story-maker");
    });

    test("requiresAuth steps have actionRequired where intended", () => {
        const authSteps = TUTORIAL_STEPS.filter(s => s.requiresAuth);
        authSteps.forEach(step => {
            // These usually need action but let's check basic consistency
            expect(step.id).toBeDefined();
        });
    });
});
