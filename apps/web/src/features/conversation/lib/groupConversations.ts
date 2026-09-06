import type { Conversation } from '../types/conversation.types';

export type ConversationGroupBy = 'recency' | 'agent';

export interface ConversationGroup {
  label: string;
  items: Conversation[];
}

function recencyLabel(updatedAt: string, now: number): string {
  const date = new Date(updatedAt);
  const startOfDay = (ms: number) => {
    const d = new Date(ms);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };
  const daysAgo = Math.floor((startOfDay(now) - startOfDay(date.getTime())) / 86_400_000);
  if (daysAgo <= 0) return 'Hôm nay';
  if (daysAgo === 1) return 'Hôm qua';
  if (daysAgo <= 7) return '7 ngày qua';
  return 'Cũ hơn';
}

const RECENCY_ORDER = ['Hôm nay', 'Hôm qua', '7 ngày qua', 'Cũ hơn'];

/** `agentNamesById` chỉ cần cho `groupBy: 'agent'` — conversation không gán agent (`agent_id:
 * null`, dùng agent mặc định qua `AppSettings`) rơi vào nhóm "Mặc định". */
export function groupConversations(
  conversations: Conversation[],
  groupBy: ConversationGroupBy,
  agentNamesById: Map<number, string>,
): ConversationGroup[] {
  const buckets = new Map<string, Conversation[]>();
  const now = Date.now();

  for (const conversation of conversations) {
    const label =
      groupBy === 'recency'
        ? recencyLabel(conversation.updated_at, now)
        : (conversation.agent_id !== null && agentNamesById.get(conversation.agent_id)) ||
          'Mặc định';
    const bucket = buckets.get(label);
    if (bucket) {
      bucket.push(conversation);
    } else {
      buckets.set(label, [conversation]);
    }
  }

  const labels =
    groupBy === 'recency'
      ? RECENCY_ORDER.filter((label) => buckets.has(label))
      : [...buckets.keys()].sort((a, b) => a.localeCompare(b));

  return labels.map((label) => ({ label, items: buckets.get(label) ?? [] }));
}
