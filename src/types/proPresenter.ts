import { z } from 'zod';

const idSchema = z.object({
    uuid: z.string(),
    index: z.number(),
    name: z.string(),
});

// Only text is edited here. ProPresenter owns all other token configuration.
export const tokenSchema = z.looseObject({
    name: z.string(),
    text: z.looseObject({ text: z.string() }).optional(),
});

export const messageSchema = z.object({
    id: idSchema,
    message: z.string(),
    tokens: z.array(tokenSchema).default([]),
    visible_on_network: z.boolean(),
    is_active: z.boolean().optional(),
});

export const messageUpdateSchema = z.union([messageSchema, z.array(messageSchema)]);

export type Token = z.infer<typeof tokenSchema>;
export type Message = z.infer<typeof messageSchema>;
export type MessageUpdate = z.infer<typeof messageUpdateSchema>;
export type TriggerPayload = Token[];
