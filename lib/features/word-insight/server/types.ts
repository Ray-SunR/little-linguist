export interface WordAnalysisResult {
    word: string;
    definition: string;
    pronunciation: string;
    examples: string[];
}

export interface WordAnalysisProvider {
    analyzeWord(word: string): Promise<WordAnalysisResult>;
}
