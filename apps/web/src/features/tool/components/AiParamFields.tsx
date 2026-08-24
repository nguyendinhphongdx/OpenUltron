'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import type { HttpToolAiParam } from '../types/tool.types';

const PARAM_TYPES: HttpToolAiParam['type'][] = ['string', 'number', 'boolean', 'json'];

interface AiParamFieldsProps {
  value: HttpToolAiParam[];
  onChange: (v: HttpToolAiParam[]) => void;
}

export function AiParamFields({ value, onChange }: AiParamFieldsProps) {
  const updateParam = (index: number, patch: Partial<HttpToolAiParam>) => {
    onChange(value.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  };
  const removeParam = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };
  const addParam = () => {
    onChange([...value, { name: '', description: '', type: 'string' }]);
  };

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border p-4">
      <Label>Tham số AI điền</Label>
      <p className="text-xs text-muted-foreground">
        Model sẽ tự điền giá trị cho các tham số này khi gọi tool. Tham chiếu bằng{' '}
        <code>{'{{ten_tham_so}}'}</code> trong header/query/body value ở trên.
      </p>

      {value.length === 0 && (
        <p className="text-xs text-muted-foreground">Chưa có tham số nào.</p>
      )}

      {value.map((param, index) => (
        <div key={index} className="flex items-center gap-2">
          <Input
            value={param.name}
            onChange={(e) => updateParam(index, { name: e.target.value })}
            placeholder="tên tham số"
            className="flex-1"
          />
          <Input
            value={param.description}
            onChange={(e) => updateParam(index, { description: e.target.value })}
            placeholder="mô tả để model hiểu"
            className="flex-1"
          />
          <Select
            value={param.type}
            onValueChange={(v) => updateParam(index, { type: v as HttpToolAiParam['type'] })}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PARAM_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" size="sm" onClick={() => removeParam(index)}>
            Xoá
          </Button>
        </div>
      ))}

      <Button type="button" variant="outline" size="sm" className="self-start" onClick={addParam}>
        + Thêm tham số AI điền
      </Button>
    </div>
  );
}
