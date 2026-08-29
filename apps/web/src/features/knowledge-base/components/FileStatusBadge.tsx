import { Badge } from '@/components/ui/badge';
import type { FileStatus } from '../types/knowledge-base.types';

const STATUS_LABEL: Record<FileStatus, string> = {
  pending: 'Chưa chunk',
  chunking: 'Đang chunk…',
  done: 'Đã chunk',
  error: 'Lỗi',
};

const STATUS_VARIANT: Record<FileStatus, 'secondary' | 'default' | 'destructive' | 'outline'> = {
  pending: 'outline',
  chunking: 'secondary',
  done: 'default',
  error: 'destructive',
};

/** Nguồn duy nhất cho label/màu trạng thái file — dùng ở drive list, file detail, filter. */
export function FileStatusBadge({ status }: { status: FileStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>;
}

export function fileStatusLabel(status: FileStatus): string {
  return STATUS_LABEL[status];
}
