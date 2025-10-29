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

export const getMessages = async (url: string): Promise<Message[]> => {
    if (!isValidUrl(url)) {
        throw new Error('Invalid URL format');
    }

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
