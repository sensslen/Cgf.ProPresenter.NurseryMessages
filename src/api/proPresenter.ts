import { z } from 'zod';
import { Message, TriggerPayload } from '../types/proPresenter';

// Custom error class for stream failures with typed status code
export class StreamError extends Error {
    readonly statusCode: number;
    readonly name = 'StreamError';

    constructor(message: string, statusCode: number) {
        super(message);
        this.statusCode = statusCode;
        Object.setPrototypeOf(this, StreamError.prototype);
    }
}

// Zod schema for Message validation
const messageIdSchema = z.object({
    uuid: z.string(),
    index: z.number(),
    name: z.string()
});

const messageObjectSchema = z.object({
    id: messageIdSchema,
    message: z.string(),
    tokens: z.array(z.any()), // tokens have complex optional structure, validate as array of any
    visible_on_network: z.boolean()
});

// Accept either a single message or an array of messages
const messageSchema = z.union([
    messageObjectSchema,
    z.array(messageObjectSchema)
]);

const validateMessage = (data: unknown) => {
    const result = messageSchema.safeParse(data);
    // Cast to proper Message type since we've validated the structure
    return {
        success: result.success,
        data: result.success ? (result.data as Message | Message[]) : undefined,
        error: result.error
    };
};

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
            // Defer error/close callbacks to after controller is returned to caller
            queueMicrotask(() => {
                onError && onError(new Error('Invalid URL format'));
                onClose && onClose();
            });
            return;
        }

        const resource = `${url}/v1/messages?chunked=true`;

        try {
            const response = await fetch(resource, { signal: controller.signal });
            if (!response.ok) {
                throw new StreamError(`Failed to stream messages: ${response.status}`, response.status);
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

            // Helper to process an extracted JSON chunk
            const processChunkBuffer = (
                extracted: { json: string; rest: string } | null,
                errorContext: string
            ): { parsedData: Message | Message[] | undefined; rest: string } => {
                let parsedData: Message | Message[] | undefined;
                
                if (!extracted) {
                    return { parsedData: undefined, rest: '' };
                }

                try {
                    const parsed = JSON.parse(extracted.json);
                    const validation = validateMessage(parsed);
                    if (validation.success && validation.data) {
                        parsedData = validation.data;
                    } else {
                        console.error(`Invalid message format in ${errorContext}`, validation.error);
                    }
                } catch (err) {
                    console.error(`Failed to parse ${errorContext}`, err);
                }

                // Call onChunk outside try/catch to handle callback errors separately
                if (parsedData !== undefined) {
                    try {
                        onChunk(parsedData);
                    } catch (err) {
                        onError && onError(err);
                    }
                }

                return { parsedData, rest: extracted.rest };
            };

            const pump = async () => {
                try {
                    while (true) {
                        const { value, done } = await reader.read();
                        if (done) {
                            // Flush the TextDecoder to get any remaining bytes
                            buffer += decoder.decode();
                            
                            // Drain the entire buffer using the same while-loop as streaming
                            let extracted = extractNextJson(buffer);
                            while (extracted) {
                                const { rest } = processChunkBuffer(extracted, 'chunk');
                                buffer = rest;
                                extracted = extractNextJson(buffer);
                            }
                            onClose && onClose();
                            break;
                        }

                        buffer += decoder.decode(value, { stream: true });

                        let extracted = extractNextJson(buffer);
                        while (extracted) {
                            const { rest } = processChunkBuffer(extracted, 'stream');
                            buffer = rest;
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
        const response = await fetch(resource, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            throw new StreamError(`Failed to trigger message: ${response.status}`, response.status);
        }
    } catch (error) {
        if (error instanceof StreamError) {
            throw error;
        }
        console.error('Error triggering message:', error);
        throw new Error(`Failed to trigger message at ${resource} with payload: ${JSON.stringify(payload)}`);
    }
};

export const clearMessage = async (url: string, id: string): Promise<void> => {
    const resource = `${url}/v1/message/${id}/clear`;
    try {
        const response = await fetch(resource, { method: 'GET' });
        if (!response.ok) {
            throw new StreamError(`Failed to clear message: ${response.status}`, response.status);
        }
    } catch (error) {
        if (error instanceof StreamError) {
            throw error;
        }
        console.error('Error clearing message:', error);
        throw new Error(`Failed to clear message at ${resource}`);
    }
};
