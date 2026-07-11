'use client';

import { useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './event-datepicker.css';
import { Label } from '@/components/ui/label';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const DATE_INPUT_CLASS =
  'h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50';

interface DateTimeFieldProps {
  selected: Date | null;
  onChange: (date: Date | null) => void;
  minDate?: Date;
  filterTime?: (date: Date) => boolean;
  placeholder?: string;
  disabled?: boolean;
}

function DateTimeField({
  selected,
  onChange,
  minDate,
  filterTime,
  placeholder,
  disabled,
}: DateTimeFieldProps) {
  return (
    <DatePicker
      selected={selected}
      onChange={onChange}
      showTimeSelect
      timeIntervals={5}
      dateFormat="dd/MM/yyyy HH:mm"
      minDate={minDate}
      filterTime={filterTime}
      placeholderText={placeholder}
      disabled={disabled}
      className={DATE_INPUT_CLASS}
      wrapperClassName="w-full"
      popperClassName="event-datepicker-popper"
      calendarClassName="event-datepicker"
      autoComplete="off"
    />
  );
}

type EndMode = 'DEFAULT' | 'PLUS_2H' | 'PLUS_3H' | 'CUSTOM';

const RELATIVE_HOURS: Record<Exclude<EndMode, 'CUSTOM'>, number> = {
  DEFAULT: 1,
  PLUS_2H: 2,
  PLUS_3H: 3,
};

const END_MODES: EndMode[] = ['DEFAULT', 'PLUS_2H', 'PLUS_3H', 'CUSTOM'];

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

// Matches the DateTimeField's own dateFormat="dd/MM/yyyy HH:mm" exactly. Deliberately not
// Date.toLocaleString(), since combined date+time locale formatting isn't consistently
// ordered across environments (it rendered time-before-date instead of date-before-time here).
function formatDateTime(date: Date): string {
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

interface EventDateTimeFieldsProps {
  startTime: string;
  endTime: string;
  onChange: (patch: { startTime: string; endTime: string }) => void;
}

export function EventDateTimeFields({ startTime, endTime, onChange }: EventDateTimeFieldsProps) {
  const t = useT();
  const [endMode, setEndMode] = useState<EndMode>('DEFAULT');

  const startDate = startTime ? new Date(startTime) : null;
  const endDate = endTime ? new Date(endTime) : null;
  const now = new Date();

  const handleStartChange = (date: Date | null) => {
    if (!date) {
      onChange({ startTime: '', endTime: '' });
      return;
    }
    if (endMode === 'CUSTOM') {
      const stillValid = endDate !== null && endDate.getTime() > date.getTime();
      onChange({ startTime: date.toISOString(), endTime: stillValid ? endTime : '' });
    } else {
      const computed = addHours(date, RELATIVE_HOURS[endMode]);
      onChange({ startTime: date.toISOString(), endTime: computed.toISOString() });
    }
  };

  const handleEndModeChange = (mode: EndMode) => {
    setEndMode(mode);
    if (mode !== 'CUSTOM' && startDate) {
      onChange({ startTime, endTime: addHours(startDate, RELATIVE_HOURS[mode]).toISOString() });
    }
  };

  const handleEndChange = (date: Date | null) => {
    onChange({ startTime, endTime: date ? date.toISOString() : '' });
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">{t('createPost.event.startTime')}</Label>
          <DateTimeField
            selected={startDate}
            onChange={handleStartChange}
            minDate={now}
            filterTime={(time) => time.getTime() > now.getTime()}
            placeholder={t('createPost.event.startTime')}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">{t('createPost.event.endTime')}</Label>
          {endMode === 'CUSTOM' ? (
            <DateTimeField
              selected={endDate}
              onChange={handleEndChange}
              minDate={startDate ?? now}
              filterTime={(time) => (startDate ? time.getTime() > startDate.getTime() : true)}
              placeholder={t('createPost.event.endTime')}
              disabled={!startDate}
            />
          ) : (
            <div className={cn(DATE_INPUT_CLASS, 'flex items-center bg-muted/40')}>
              {endDate ? formatDateTime(endDate) : t('createPost.event.endTimeAuto')}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {END_MODES.map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => handleEndModeChange(mode)}
            className={cn(
              'text-xs rounded-full px-2.5 py-1 border transition-colors cursor-pointer',
              endMode === mode
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-input text-muted-foreground hover:bg-accent'
            )}
          >
            {t(`createPost.event.endMode.${mode}`)}
          </button>
        ))}
      </div>
    </div>
  );
}
