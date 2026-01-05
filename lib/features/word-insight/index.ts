// Word Insight Feature Barrel
// Exports types, services, and providers

// Re-export types (includes core types for convenience)
export * from "./types";

// Export React context/provider
export * from "./provider";

// Export services / factories
export { AIWordInsightService } from "./ai-service";
export { getWordInsightProvider } from "./factory";
