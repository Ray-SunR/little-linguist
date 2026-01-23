import type { INarrationService, NarrationResponse } from "../server-types";

export class MockNarrationService implements INarrationService {
    async synthesize(text: string): Promise<NarrationResponse> {
        console.log("[MockNarrationService] Synthesizing mock audio for text length:", text.length);

        const audioBuffer = Buffer.from([
            0xff, 0xfb, 0x90, 0x44, 0x00, 0x00, 0x00, 0x03, 0x48, 0x00, 0x00, 0x00, 0x00, 0x4c, 0x41, 0x4d, 0x45, 0x33, 0x2e, 0x39, 0x38, 0x2e, 0x32, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
        ]);

        const words = text.split(/(\s+)/);
        let currentOffset = 0;
        const speechMarks = [];

        for (const part of words) {
            if (part && !/^\s+$/.test(part)) {
                speechMarks.push({
                    time: speechMarks.length * 400, // Roughly 150wpm
                    type: "word",
                    start: currentOffset,
                    end: currentOffset + part.length,
                    value: part
                });
            }
            currentOffset += part.length;
        }

        return {
            audioBuffer,
            speechMarks
        };
    }
}
