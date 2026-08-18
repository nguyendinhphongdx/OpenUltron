/** Service layer — gọi `apiClient` thuần, không chứa React. */
import { apiClient, endpoints } from '@/lib/api';
import type {
  Conversation,
  ConversationCreateInput,
  Message,
  Paginated,
} from '../types/conversation.types';

export const conversationService = {
  list: async (params?: { channel?: string; page?: number; page_size?: number }) => {
    const res = await apiClient.get<Paginated<Conversation>>(endpoints.conversations.list, {
      params,
    });
    return res.data;
  },

  get: async (id: number): Promise<Conversation> => {
    const res = await apiClient.get<Conversation>(endpoints.conversations.byId(id));
    return res.data;
  },

  create: async (input: ConversationCreateInput): Promise<Conversation> => {
    const res = await apiClient.post<Conversation>(endpoints.conversations.create, input);
    return res.data;
  },

  listMessages: async (
    conversationId: number,
    params?: { page?: number; page_size?: number },
  ): Promise<Paginated<Message>> => {
    const res = await apiClient.get<Paginated<Message>>(
      endpoints.conversations.messages(conversationId),
      { params },
    );
    return res.data;
  },
};
