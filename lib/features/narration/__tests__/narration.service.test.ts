import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PollyNarrationService } from '../polly-service.server';
import { PollyClient, SynthesizeSpeechCommand } from '@aws-sdk/client-polly';
import { Readable } from 'stream';

// Mock the AWS SDK
vi.mock('@aws-sdk/client-polly', () => {
  const sendMock = vi.fn();
  const PollyClientMock = vi.fn(() => ({
    send: sendMock
  }));
  return {
    PollyClient: PollyClientMock,
    SynthesizeSpeechCommand: vi.fn(),
  };
});

describe('PollyNarrationService', () => {
  let service: PollyNarrationService;
  let mockSend: any;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.POLLY_ACCESS_KEY_ID = 'test-key';
    process.env.POLLY_SECRET_ACCESS_KEY = 'test-secret';
    process.env.POLLY_REGION = 'us-west-2';
    
    service = new PollyNarrationService();
    // Get the mock instance from the constructor call
    mockSend = (new PollyClient({})).send; 
  });

  const createMockStream = (data: string | Buffer) => {
    const stream = new Readable();
    stream.push(data);
    stream.push(null);
    return stream;
  };

  it('should synthesize audio successfully', async () => {
    const mockAudioBuffer = Buffer.from('audio-data');
    const mockMarksString = '{"time":0,"type":"word","start":0,"end":5,"value":"Hello"}\n{"time":500,"type":"word","start":6,"end":11,"value":"World"}';

    // Mock responses for audio and speech marks
    mockSend
      .mockResolvedValueOnce({ // Audio response
        AudioStream: createMockStream(mockAudioBuffer),
      })
      .mockResolvedValueOnce({ // Marks response
        AudioStream: createMockStream(mockMarksString),
      });

    const result = await service.synthesize('Hello World');

    expect(result.audioBuffer).toEqual(mockAudioBuffer);
    expect(result.speechMarks).toHaveLength(2);
    expect(result.speechMarks[0].value).toBe('Hello');
    
    // Verify commands were called with correct params
    expect(SynthesizeSpeechCommand).toHaveBeenCalledTimes(2);
  });

  it('should skip speech marks for generative engine', async () => {
    const mockAudioBuffer = Buffer.from('audio-data');

    mockSend.mockResolvedValueOnce({
      AudioStream: createMockStream(mockAudioBuffer),
    });

    const result = await service.synthesize('Hello World', { engine: 'generative' });

    expect(result.audioBuffer).toEqual(mockAudioBuffer);
    expect(result.speechMarks).toEqual([]);
    expect(SynthesizeSpeechCommand).toHaveBeenCalledTimes(1);
  });

  it('should throw error if audio stream is missing', async () => {
    mockSend.mockResolvedValueOnce({
      AudioStream: null
    });

    await expect(service.synthesize('Hello')).rejects.toThrow('Failed to generate audio stream');
  });
});
