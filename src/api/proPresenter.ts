import axios from 'axios';
import { Message, TriggerPayload } from '../types/proPresenter';

  const isValidUrl = (inputUrl: string): boolean => {
    try {
      // Use URL constructor for basic format validation
      new URL(inputUrl);
      return true;
    } catch {
      return false;
    }
  };

// Detect if an error is an AbortError
const isAbortError = (err: unknown): boolean => {
    if (err instanceof DOMException && err.name === 'AbortError') {
        return true;
    }
    if ((err as { name?: string })?.name === 'AbortError') {
        return true;
    }
    return false;
};

// Stream messages using the chunked endpoint. Returns an AbortController to stop the stream.
// The function returns the controller synchronously and runs the async connection logic in the background.
export const streamMessages = (
    url: string,
    onChunk: (data: Message[] | Message) => void,
    onOpen?: () => void,
    onClose?: () => void,
    onError?: (err: unknown) => void,
): AbortController => {
    const controller = new AbortController();

    // Run connection logic asynchronously in the background without awaiting
    (async () => {
        // Validate URL synchronously before starting async work
        if (!isValidUrl(url)) {
            onError && onError(new Error('Invalid URL format'));
            return;
        }

        const resource = `${url}/v1/messages?chunked=true`;

        try {
            const response = await fetch(resource, { signal: controller.signal });
            if (!response.ok) {
                throw new Error(`Failed to stream messages: ${response.status}`);
            }

            onOpen && onOpen();

            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error('Stream reader not available');
            }

            const decoder = new TextDecoder();
            let buffer = '';

            const extractNextJson = (buf: string): { json: string; rest: string } | null => {
                // Find first non-whitespace char
                const startIdx = buf.search(/\S/);
                if (startIdx === -1) return null;
                const startChar = buf[startIdx];
                if (startChar !== '{' && startChar !== '[') return null;

                let depth = 0;
                let inString = false;
                let escape = false;
                for (let i = startIdx; i < buf.length; i++) {
                    const ch = buf[i];
                    if (inString) {
                        if (escape) {
                            escape = false;
                        } else if (ch === '\\') {
                            escape = true;
                        } else if (ch === '"') {
                            inString = false;
                        }
                        continue;
                    }

                    if (ch === '"') {
                        inString = true;
                        continue;
                    }

                    if (ch === '{' || ch === '[') {
                        depth++;
                    } else if (ch === '}' || ch === ']') {
                        depth--;
                        if (depth === 0) {
                            const json = buf.slice(startIdx, i + 1);
                            const rest = buf.slice(i + 1);
                            return { json, rest };
                        }
                    }
                }

                return null;
            };

            const pump = async () => {
                try {
                    while (true) {
                        const { value, done } = await reader.read();
                        if (done) {
                            // Try to flush any remaining JSON in buffer
                            if (buffer.trim()) {
                                const extracted = extractNextJson(buffer);
                                if (extracted) {
                                    try {
                                        const parsed = JSON.parse(extracted.json);
                                        onChunk(parsed as any);
                                    } catch (err) {
                                        console.error('Failed to parse final chunk', err);
                                    }
                                }
                            }
                            onClose && onClose();
                            break;
                        }

                        buffer += decoder.decode(value, { stream: true });

                        let extracted = extractNextJson(buffer);
                        while (extracted) {
                            try {
                                const parsed = JSON.parse(extracted.json);
                                onChunk(parsed as any);
                            } catch (err) {
                                console.error('Failed to parse chunked JSON', err);
                            }
                            buffer = extracted.rest;
                            extracted = extractNextJson(buffer);
                        }
                    }
                } catch (err) {
                    // Only call onError if this is not an abort error (user/code explicitly cancelled)
                    if (!isAbortError(err)) {
                        onError && onError(err);
                    }
                }
            };

            // Start background pump (don't await)
            void pump();
        } catch (error) {
            // Only call onError if this is not an abort error (user/code explicitly cancelled)
            if (!isAbortError(error)) {
                onError && onError(error);
            }
        }
    })();

    return controller;
};
export const triggerMessage = async (url: string, id: string, payload: TriggerPayload): Promise<void> => {
    const resource = `${url}/v1/message/${id}/trigger`;
    try {
        await axios.post(resource, payload);
    } catch (error) {
        handleApiError(error);
        throw new Error(`Failed to trigger message at ${resource} with payload: ${JSON.stringify(payload)}`);
    }
};

export const clearMessage = async (url: string, id: string): Promise<void> => {
    const resource = `${url}/v1/message/${id}/clear`;
    try {
        await axios.get(resource);
    } catch (error) {
        handleApiError(error);
        throw new Error(`Failed to clear message at ${resource}`);
    }
};

const handleApiError = (error: unknown) => {
    if (axios.isAxiosError(error)) {
        // Handle Axios-specific errors
        console.error('API Error:', error.message);
        if (error.response) {
            console.error('Response Data:', error.response.data);
        }
    } else {
        // Handle other types of errors
        console.error('Unexpected Error:', error);
    }
};
