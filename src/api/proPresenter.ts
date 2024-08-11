// src/api/proPresenter.ts

import axios from 'axios';
import { Message, TriggerPayload } from '../types/proPresenter';

export const getMessages = async (url: string): Promise<Message[]> => {
    try {
        const response = await axios.get<Message[]>(`${url}/v1/messages`);
        return response.data;
    } catch (error) {
        handleApiError(error);
        throw new Error('Failed to fetch messages');
    }
};

export const triggerMessage = async (url: string, id: string, payload: TriggerPayload): Promise<void> => {
    try {
        await axios.post(`${url}/v1/message/${id}/trigger`, payload);
    } catch (error) {
        handleApiError(error);
        throw new Error('Failed to trigger message');
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
