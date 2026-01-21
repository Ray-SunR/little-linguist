import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GeminiNarrationProvider } from '../gemini-provider';
import { WebSpeechNarrationProvider } from '../web-speech-provider';

// Mock the WebSpeechNarrationProvider class
vi.mock('../web-speech-provider', () => {
  const MockWebSpeechProvider = vi.fn(() => ({
    prepare: vi.fn(),
    play: vi.fn(),
    pause: vi.fn(),
    stop: vi.fn(),
    setPlaybackRate: vi.fn(),
    getCurrentTimeSec: vi.fn(),
    seekToTime: vi.fn(),
    on: vi.fn(),
  }));
  
  return {
    WebSpeechNarrationProvider: MockWebSpeechProvider
  };
});

describe('GeminiNarrationProvider', () => {
  let provider: GeminiNarrationProvider;
  let mockDelegateInstance: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // When we create the provider, it will internally create a new WebSpeechNarrationProvider
    provider = new GeminiNarrationProvider();
    
    // Get the instance of the mock that was created
    // We cast to any to access the mock properties on the class
    const MockWebSpeechClass = WebSpeechNarrationProvider as unknown as any;
    
    // Check if the constructor was called
    if (MockWebSpeechClass.mock.instances.length === 0) {
      throw new Error('WebSpeechNarrationProvider constructor was not called');
    }

    // Access the return value of the constructor (the instance with methods)
    // mock.instances[0] might be the `this` context which is empty if we returned an object
    mockDelegateInstance = MockWebSpeechClass.mock.results[0].value;
  });

  it('should initialize with type "gemini"', () => {
    expect(provider.type).toBe('gemini');
  });

  it('should have correct capabilities', () => {
    expect(provider.capabilities).toEqual({
      supportsStreaming: false,
      supportsWordTimings: false,
      supportsVoices: false,
    });
  });

  it('should delegate prepare call', async () => {
    const input = { text: 'Hello world', voice: 'test-voice' };
    await provider.prepare(input as any);
    expect(mockDelegateInstance.prepare).toHaveBeenCalledWith(input);
  });

  it('should delegate play call', async () => {
    await provider.play();
    expect(mockDelegateInstance.play).toHaveBeenCalled();
  });

  it('should delegate pause call', async () => {
    await provider.pause();
    expect(mockDelegateInstance.pause).toHaveBeenCalled();
  });

  it('should delegate stop call', async () => {
    await provider.stop();
    expect(mockDelegateInstance.stop).toHaveBeenCalled();
  });

  it('should delegate setPlaybackRate call', () => {
    const rate = 1.5;
    provider.setPlaybackRate(rate);
    expect(mockDelegateInstance.setPlaybackRate).toHaveBeenCalledWith(rate);
  });

  it('should delegate getCurrentTimeSec call', () => {
    mockDelegateInstance.getCurrentTimeSec.mockReturnValue(10.5);
    const result = provider.getCurrentTimeSec();
    expect(mockDelegateInstance.getCurrentTimeSec).toHaveBeenCalled();
    expect(result).toBe(10.5);
  });

  it('should delegate seekToTime call', () => {
    const time = 30;
    provider.seekToTime(time);
    expect(mockDelegateInstance.seekToTime).toHaveBeenCalledWith(time);
  });

  it('should delegate on event subscription', () => {
    const callback = vi.fn();
    const event = 'start';
    const unsubscribe = vi.fn();
    mockDelegateInstance.on.mockReturnValue(unsubscribe);

    const result = provider.on(event as any, callback);
    
    expect(mockDelegateInstance.on).toHaveBeenCalledWith(event, callback);
    expect(result).toBe(unsubscribe);
  });
});
