// Word Insight Feature Barrel
// Exports types, services, and providers

// Re-export types (includes core types for convenience)
export * from "./types";

// Export React context/provider
export * from "./provider";

// Export services
export { AIWordInsightService } from "./ai-service";
export { LocalStorageWordService } from "./implementations/local-storage-word-service";
