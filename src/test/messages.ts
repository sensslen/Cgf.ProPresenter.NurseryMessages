import type { Message, Token } from '../types/proPresenter';

export const timer: Token = {
    name: 'Timer',
    timer: {
        configuration: { allows_overrun: false, countdown: { duration: 60 } },
        format: { hour: 'none', minute: 'two_digit', second: 'two_digit', millisecond: 'none' },
    },
};

export const clock: Token = {
    name: 'Clock',
    clock: { date: 'none', is_24_hours: true, time: 'short' },
};

export const message: Message = {
    id: { uuid: 'message-1', index: 0, name: 'Nursery' },
    message: 'Please collect {Child}.',
    tokens: [{ name: 'Child', text: { text: '' } }],
    visible_on_network: true,
    is_active: false,
};
