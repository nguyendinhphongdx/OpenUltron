'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MultiSelectAssignDialogProps<T> {
  triggerLabel: string;
  dialogTitle: string;
  items: T[];
  getId: (item: T) => number;
  getLabel: (item: T) => string;
  onConfirm: (ids: number[]) => Promise<void>;
  isPending?: boolean;
  emptyMessage?: string;
  error?: string;
}

export function MultiSelectAssignDialog<T>({
  triggerLabel,
  dialogTitle,
  items,
  getId,
  getLabel,
  onConfirm,
  isPending = false,
  emptyMessage = 'Không còn mục nào để gán.',
  error,
}: MultiSelectAssignDialogProps<T>) {
  const [open, setOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setSelectedIds(new Set());
    }
  };

  const toggle = (id: number, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const handleConfirm = async () => {
    try {
      await onConfirm([...selectedIds]);
    } catch {
      // Giữ dialog mở để user thấy `error` prop (đã set qua state của caller) — không đóng nhầm
      // khi 1 trong nhiều request gán thất bại, và tránh unhandled promise rejection.
      return;
    }
    setOpen(false);
    setSelectedIds(new Set());
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button size="sm" />}>{triggerLabel}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>

        {items.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          <ScrollArea className="max-h-72">
            <ul className="flex flex-col gap-1 pr-3">
              {items.map((item) => {
                const id = getId(item);
                const checked = selectedIds.has(id);
                return (
                  <li key={id}>
                    <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground hover:bg-muted/50">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(next) => toggle(id, next === true)}
                      />
                      <span>{getLabel(item)}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isPending}>
            Huỷ
          </Button>
          <Button onClick={handleConfirm} disabled={selectedIds.size === 0 || isPending}>
            {isPending ? 'Đang gán…' : `Gán ${selectedIds.size} mục đã chọn`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
