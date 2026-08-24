'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

import type { HttpKeyValue, HttpToolRequest } from '../types/tool.types';

const METHODS: HttpToolRequest['method'][] = ['GET', 'POST', 'PUT', 'DELETE'];

function stringifyBody(body: Record<string, unknown> | null): string {
  if (!body) return '';
  return JSON.stringify(body, null, 2);
}

interface HttpRequestFieldsProps {
  value: HttpToolRequest;
  onChange: (v: HttpToolRequest) => void;
}

function KeyValueList({
  label,
  items,
  onChange,
}: {
  label: string;
  items: HttpKeyValue[];
  onChange: (items: HttpKeyValue[]) => void;
}) {
  const updateItem = (index: number, patch: Partial<HttpKeyValue>) => {
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };
  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };
  const addItem = () => {
    onChange([...items, { name: '', value: '' }]);
  };

  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      {items.length === 0 && (
        <p className="text-xs text-muted-foreground">Chưa có dòng nào.</p>
      )}
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <Input
            value={item.name}
            onChange={(e) => updateItem(index, { name: e.target.value })}
            placeholder="name"
            className="flex-1"
          />
          <Input
            value={item.value}
            onChange={(e) => updateItem(index, { value: e.target.value })}
            placeholder="value, ví dụ: {{ten_tham_so}}"
            className="flex-1"
          />
          <Button type="button" variant="outline" size="sm" onClick={() => removeItem(index)}>
            Xoá
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" className="self-start" onClick={addItem}>
        + Thêm dòng
      </Button>
    </div>
  );
}

export function HttpRequestFields({ value, onChange }: HttpRequestFieldsProps) {
  const [bodyText, setBodyText] = useState(stringifyBody(value.body));
  const [bodyError, setBodyError] = useState<string | null>(null);

  const handleMethodChange = (method: HttpToolRequest['method']) => {
    onChange({ ...value, method });
  };

  const handleBodyChange = (text: string) => {
    setBodyText(text);
    const trimmed = text.trim();
    if (!trimmed) {
      setBodyError(null);
      onChange({ ...value, body: null });
      return;
    }
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        setBodyError('Body phải là một JSON object.');
        return;
      }
      setBodyError(null);
      onChange({ ...value, body: parsed as Record<string, unknown> });
    } catch {
      setBodyError('Body không phải JSON hợp lệ.');
    }
  };

  const isGet = value.method === 'GET';

  return (
    <div className="flex flex-col gap-4 rounded-md border border-border p-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="http-method">Method</Label>
        <Select value={value.method} onValueChange={(v) => handleMethodChange(v as HttpToolRequest['method'])}>
          <SelectTrigger id="http-method" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {METHODS.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="http-url">URL</Label>
        <Input
          id="http-url"
          value={value.url}
          onChange={(e) => onChange({ ...value, url: e.target.value })}
          placeholder="https://api.example.com/resource"
          required
        />
        <p className="text-xs text-muted-foreground">
          URL cố định — không dùng placeholder <code>{'{{...}}'}</code> ở đây.
        </p>
      </div>

      <KeyValueList label="Headers" items={value.headers} onChange={(headers) => onChange({ ...value, headers })} />
      <KeyValueList label="Query params" items={value.query} onChange={(query) => onChange({ ...value, query })} />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="http-body">Body (JSON)</Label>
        <Textarea
          id="http-body"
          rows={6}
          className="font-mono text-xs"
          value={bodyText}
          onChange={(e) => handleBodyChange(e.target.value)}
          disabled={isGet}
          placeholder={isGet ? 'GET không có body' : '{}'}
        />
        {bodyError && <p className="text-xs text-destructive">{bodyError}</p>}
      </div>
    </div>
  );
}
