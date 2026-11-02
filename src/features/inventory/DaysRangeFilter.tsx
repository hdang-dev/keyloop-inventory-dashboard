import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const DEBOUNCE_MS = 300;
const ERROR_ID = 'days-range-error';

export interface DaysRange {
  minDays: number | undefined;
  maxDays: number | undefined;
}

function isWholeNumberOrBlank(draft: string): boolean {
  return draft.trim() === '' || /^\d+$/.test(draft.trim());
}

function toDays(draft: string): number | undefined {
  return draft.trim() === '' ? undefined : Number(draft);
}

function toDraft(value: number | undefined): string {
  return value === undefined ? '' : String(value);
}

function rangeError(min: string, max: string): string | null {
  if (!isWholeNumberOrBlank(min) || !isWholeNumberOrBlank(max)) {
    return 'Enter whole days, 0 or more.';
  }
  const [minDays, maxDays] = [toDays(min), toDays(max)];
  return minDays !== undefined && maxDays !== undefined && minDays > maxDays
    ? 'Min days cannot be more than max days.'
    : null;
}

interface DaysRangeFilterProps extends DaysRange {
  onChange: (range: DaysRange) => void;
}

export function DaysRangeFilter({ minDays, maxDays, onChange }: DaysRangeFilterProps) {
  const [draft, setDraft] = useState({ min: toDraft(minDays), max: toDraft(maxDays) });
  const [synced, setSynced] = useState({ minDays, maxDays });

  // Follow changes to the URL, such as Reset or the browser's back button.
  if (synced.minDays !== minDays || synced.maxDays !== maxDays) {
    setSynced({ minDays, maxDays });
    setDraft({ min: toDraft(minDays), max: toDraft(maxDays) });
  }

  const error = rangeError(draft.min, draft.max);
  const nextMin = error ? undefined : toDays(draft.min);
  const nextMax = error ? undefined : toDays(draft.max);

  useEffect(() => {
    if (error || (nextMin === minDays && nextMax === maxDays)) return;
    const timer = setTimeout(() => onChange({ minDays: nextMin, maxDays: nextMax }), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [error, nextMin, nextMax, minDays, maxDays, onChange]);

  const inputProps = {
    type: 'number',
    min: 0,
    inputMode: 'numeric',
    'aria-invalid': error !== null,
    'aria-describedby': error ? ERROR_ID : undefined,
    className: 'w-24 bg-card',
  } as const;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-end gap-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filter-min-days">Min days</Label>
          <Input
            id="filter-min-days"
            value={draft.min}
            onChange={(event) => setDraft({ ...draft, min: event.target.value })}
            {...inputProps}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filter-max-days">Max days</Label>
          <Input
            id="filter-max-days"
            value={draft.max}
            onChange={(event) => setDraft({ ...draft, max: event.target.value })}
            {...inputProps}
          />
        </div>
      </div>
      {error && (
        <p id={ERROR_ID} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
