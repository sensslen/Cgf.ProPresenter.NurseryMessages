import axios from 'axios';
import { Message, TriggerPayload } from '../types/proPresenter';

export const getMessages = async (url: string): Promise<Message[]> => {
    const resource = `${url}/v1/messages`;
    try {
        const response = await axios.get<Message[]>(resource);
        return response.data;
    } catch (error) {
        handleApiError(error);
        throw new Error(`Failed to fetch messages from ${resource}`);
    }
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
