import { describe, expect, it } from 'vitest';

import { EmptyState } from '@/components/shared/EmptyState';

import { renderWithProviders, screen } from '../setup/render';

describe('EmptyState', () => {
  it('hiện title + description', () => {
    renderWithProviders(<EmptyState title="Chưa có dữ liệu" description="Thêm mới để bắt đầu." />);

    expect(screen.getByText('Chưa có dữ liệu')).toBeInTheDocument();
    expect(screen.getByText('Thêm mới để bắt đầu.')).toBeInTheDocument();
  });

  it('tone destructive đổi màu border', () => {
    const { container } = renderWithProviders(<EmptyState title="Lỗi" tone="destructive" />);

    expect(container.firstChild).toHaveClass('border-destructive/30');
  });
});
