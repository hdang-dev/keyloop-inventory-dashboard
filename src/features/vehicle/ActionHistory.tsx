import { ACTION_STATUS_LABELS, type ActionHistoryEntry } from '@/domain/types';
import { formatDateTime } from '@/lib/format';

interface ActionHistoryProps {
  history: ActionHistoryEntry[];
  timezone: string;
}

export function ActionHistory({ history, timezone }: ActionHistoryProps) {
  if (history.length === 0) {
    return <p className="text-sm text-muted-foreground">No actions logged yet.</p>;
  }

  return (
    <ol aria-label="Action history" className="flex flex-col gap-3">
      {history.map((entry) => (
        <li key={entry.id} className="rounded-md border bg-card p-3 text-sm">
          <p className="font-medium">{ACTION_STATUS_LABELS[entry.status]}</p>
          {entry.note && <p className="mt-1 break-words whitespace-pre-wrap">{entry.note}</p>}
          <p className="mt-1 text-xs text-muted-foreground">
            {entry.updatedBy} · {formatDateTime(entry.updatedAt, timezone)}
          </p>
        </li>
      ))}
    </ol>
  );
}
