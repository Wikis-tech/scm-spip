import React, { useMemo } from 'react';

type Period = 'AM' | 'PM';

interface TimeSelectorProps {
  value?: string;
  onChange: (value: string) => void;
  idPrefix: string;
  disabled?: boolean;
}

const HOURS = Array.from({ length: 12 }, (_, index) => String(index + 1));
const MINUTES = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, '0'));

export function normaliseDisplayTime(value?: string): { hour: string; minute: string; period: Period } {
  const input = String(value || '').trim().toUpperCase();
  const twelveHour = input.match(/^(0?[1-9]|1[0-2]):([0-5]\d)\s*(AM|PM)$/);
  if (twelveHour) return { hour: String(Number(twelveHour[1])), minute: twelveHour[2], period: twelveHour[3] as Period };

  const twentyFourHour = input.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (twentyFourHour) {
    const hour24 = Number(twentyFourHour[1]);
    return {
      hour: String(hour24 % 12 || 12),
      minute: twentyFourHour[2],
      period: hour24 >= 12 ? 'PM' : 'AM',
    };
  }

  return { hour: '10', minute: '00', period: 'AM' };
}

export function TimeSelector({ value, onChange, idPrefix, disabled = false }: TimeSelectorProps) {
  const parsed = useMemo(() => normaliseDisplayTime(value), [value]);
  const update = (part: Partial<typeof parsed>) => {
    const next = { ...parsed, ...part };
    onChange(`${next.hour}:${next.minute} ${next.period}`);
  };
  const inputClass = 'min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-2 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-[#b1191f] focus:bg-white focus:ring-1 focus:ring-[#b1191f] disabled:cursor-not-allowed disabled:opacity-60';

  return (
    <fieldset className="min-w-0">
      <legend className="sr-only">Meeting time</legend>
      <div className="grid grid-cols-[1fr_1fr_1.15fr] gap-1.5" aria-label="Meeting time">
        <div className="min-w-0">
          <label htmlFor={`${idPrefix}-hour`} className="mb-1 block text-[9px] font-bold uppercase tracking-wide text-slate-400">Hour</label>
          <select id={`${idPrefix}-hour`} aria-label="Hour" value={parsed.hour} disabled={disabled} onChange={(event) => update({ hour: event.target.value })} className={`w-full ${inputClass}`}>
            {HOURS.map((hour) => <option key={hour} value={hour}>{hour}</option>)}
          </select>
        </div>
        <div className="min-w-0">
          <label htmlFor={`${idPrefix}-minute`} className="mb-1 block text-[9px] font-bold uppercase tracking-wide text-slate-400">Minute</label>
          <select id={`${idPrefix}-minute`} aria-label="Minute" value={parsed.minute} disabled={disabled} onChange={(event) => update({ minute: event.target.value })} className={`w-full ${inputClass}`}>
            {MINUTES.map((minute) => <option key={minute} value={minute}>{minute}</option>)}
          </select>
        </div>
        <div className="min-w-0">
          <label htmlFor={`${idPrefix}-period`} className="mb-1 block text-[9px] font-bold uppercase tracking-wide text-slate-400">AM / PM</label>
          <select id={`${idPrefix}-period`} aria-label="AM or PM" value={parsed.period} disabled={disabled} onChange={(event) => update({ period: event.target.value as Period })} className={`w-full ${inputClass}`}>
            <option value="AM">AM</option>
            <option value="PM">PM</option>
          </select>
        </div>
      </div>
    </fieldset>
  );
}
