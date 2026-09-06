import { describe, expect, it } from 'vitest';

import { deriveStarterPrompts } from '@/features/conversation/lib/deriveStarterPrompts';

describe('deriveStarterPrompts', () => {
  it('trả về fallback khi không có description lẫn tool', () => {
    expect(deriveStarterPrompts(null, [])).toEqual(['Hỏi tôi bất cứ điều gì']);
  });

  it('lấy gợi ý từ description khi có', () => {
    const prompts = deriveStarterPrompts('trả lời câu hỏi về thời tiết', []);
    expect(prompts).toContain('Giúp tôi: trả lời câu hỏi về thời tiết');
  });

  it('thêm gợi ý theo tool đã gán, biết slug', () => {
    const prompts = deriveStarterPrompts(null, ['github-search-code']);
    expect(prompts.some((p) => p.toLowerCase().includes('github'))).toBe(true);
  });

  it('bỏ qua tool không có gợi ý sẵn, không throw', () => {
    const prompts = deriveStarterPrompts(null, ['unknown-tool-slug']);
    expect(prompts).toEqual(['Hỏi tôi bất cứ điều gì']);
  });

  it('giới hạn tối đa 4 gợi ý', () => {
    const prompts = deriveStarterPrompts('mô tả agent', [
      'github-search-code',
      'github-read-file',
      'write-file',
      'run-command',
      'ssh-execute',
    ]);
    expect(prompts.length).toBeLessThanOrEqual(4);
  });
});
