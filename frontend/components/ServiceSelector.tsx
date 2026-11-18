// frontend/components/ServiceSelector.tsx
'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

export const SERVICES = [
  { id: 'whatsapp', name: 'WhatsApp' },
  { id: 'telegram', name: 'Telegram' },
  { id: 'instagram', name: 'Instagram' },
  { id: 'tiktok', name: 'TikTok' },
  { id: 'signal', name: 'Signal' },
  { id: 'facebook', name: 'Facebook' },
  { id: 'snapchat', name: 'Snapchat' },
  { id: 'linkedin', name: 'LinkedIn' },
  { id: 'google', name: 'Google/Gmail' },
  { id: 'googlevoice', name: 'GoogleVoice' },
  { id: '1688', name: '1688' },
] as const;

export type ServiceId = (typeof SERVICES)[number]['id'];

interface ServiceSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export function ServiceSelector({ value, onChange }: ServiceSelectorProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="service">Service</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id="service" className="w-full md:w-64">
          <SelectValue placeholder="Select a service" />
        </SelectTrigger>
        <SelectContent>
          {SERVICES.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}