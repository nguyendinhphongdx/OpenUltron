import { describe, expect, it } from 'vitest';

import { groupConversations } from '@/features/conversation/lib/groupConversations';
import type { Conversation } from '@/features/conversation/types/conversation.types';

function makeConversation(overrides: Partial<Conversation>): Conversation {
  return {
    id: 1,
    channel: 'web',
    external_user_id: null,
    agent_id: null,
    title: null,
    pinned: false,
    archived_at: null,
    metadata: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('groupConversations', () => {
  it('nhóm theo recency: hôm nay/hôm qua/7 ngày qua/cũ hơn', () => {
    const now = Date.now();
    const conversations = [
      makeConversation({ id: 1, updated_at: new Date(now).toISOString() }),
      makeConversation({ id: 2, updated_at: new Date(now - 86_400_000).toISOString() }),
      makeConversation({ id: 3, updated_at: new Date(now - 3 * 86_400_000).toISOString() }),
      makeConversation({ id: 4, updated_at: new Date(now - 30 * 86_400_000).toISOString() }),
    ];

    const groups = groupConversations(conversations, 'recency', new Map());

    expect(groups.map((g) => g.label)).toEqual(['Hôm nay', 'Hôm qua', '7 ngày qua', 'Cũ hơn']);
    expect(groups[0].items.map((c) => c.id)).toEqual([1]);
  });

  it('nhóm theo agent — conversation không gán agent rơi vào "Mặc định"', () => {
    const conversations = [
      makeConversation({ id: 1, agent_id: 5 }),
      makeConversation({ id: 2, agent_id: null }),
    ];
    const agentNamesById = new Map([[5, 'Trợ lý chính']]);

    const groups = groupConversations(conversations, 'agent', agentNamesById);

    expect(groups.find((g) => g.label === 'Trợ lý chính')?.items.map((c) => c.id)).toEqual([1]);
    expect(groups.find((g) => g.label === 'Mặc định')?.items.map((c) => c.id)).toEqual([2]);
  });

  it('bỏ qua nhóm rỗng — không hiện nhóm không có item nào', () => {
    const conversations = [makeConversation({ id: 1, updated_at: new Date().toISOString() })];
    const groups = groupConversations(conversations, 'recency', new Map());
    expect(groups).toHaveLength(1);
  });
});
