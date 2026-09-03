import { describe, expect, it } from 'vitest';

import { cn } from '@/lib/utils';

describe('cn', () => {
  it('nối class names, bỏ qua falsy', () => {
    expect(cn('a', false, undefined, 'b')).toBe('a b');
  });

  it('merge tailwind class trùng nhóm — class sau thắng', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
  });
});
