// src/types/proPresenter.ts

export interface TokenText {
    text: string;
}

export interface TokenTimerConfiguration {
    allows_overrun: boolean;
    countdown?: {
        duration: number;
    };
    count_down_to_time?: {
        period: string;
        time_of_day: string;
    };
    elapsed?: {
        start_time: number;
        end_time?: number;
    };
}

export interface TokenTimerFormat {
    hour: string;
    millisecond: string;
    minute: string;
    second: string;
}

export interface TokenTimer {
    configuration: TokenTimerConfiguration;
    format: TokenTimerFormat;
}

export interface TokenClock {
    date: string;
    is_24_hours: boolean;
    time: string;
}

export interface Token {
    name: string;
    text?: TokenText;
    timer?: TokenTimer;
    clock?: TokenClock;
}

export interface MessageId {
    index: number;
    name: string;
    uuid: string;
}

export interface Message {
    id: MessageId;
    message: string;
    tokens: Token[];
    visible_on_network: boolean;
}

export interface TriggerPayloadToken {
    name: string;
    text?: TokenText;
    timer?: {
        configuration: TokenTimerConfiguration;
        format: TokenTimerFormat;
    };
    clock?: {
        date: string;
        is_24_hours: boolean;
        time: string;
    };
}

export type TriggerPayload = TriggerPayloadToken[];
