import type { ReactNode } from 'react';
import { CircleAlert, SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <CircleAlert aria-hidden className="size-6 text-destructive" />
      <p className="text-sm">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <SearchX aria-hidden className="size-6 text-muted-foreground" />
      <p className="text-sm font-medium">{title}</p>
      {children}
    </div>
  );
}
