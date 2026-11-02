import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AGING_THRESHOLD_DAYS } from '@/domain/aging';
import { useSummary } from '@/hooks/useInventoryQueries';

function SummaryCard({
  label,
  value,
  isLoading,
  highlighted = false,
}: {
  label: string;
  value: number | undefined;
  isLoading: boolean;
  highlighted?: boolean;
}) {
  return (
    <Card className={highlighted ? 'border-aging-border bg-aging-surface text-aging' : undefined}>
      <CardContent>
        <p className={highlighted ? 'text-sm' : 'text-sm text-muted-foreground'}>{label}</p>
        <div className="mt-1 text-3xl font-semibold tabular-nums">
          {isLoading ? <Skeleton className="h-9 w-20" /> : (value ?? '–')}
        </div>
      </CardContent>
    </Card>
  );
}

export function SummaryCards({ dealershipId }: { dealershipId: string }) {
  const summary = useSummary(dealershipId);

  return (
    <section aria-label="Stock summary">
      <div className="grid gap-4 sm:grid-cols-2">
        <SummaryCard
          label="Total vehicles"
          value={summary.data?.total}
          isLoading={summary.isPending}
        />
        <SummaryCard
          label={`Aging vehicles (over ${AGING_THRESHOLD_DAYS} days)`}
          value={summary.data?.aging}
          isLoading={summary.isPending}
          highlighted
        />
      </div>
      {summary.isError && !summary.data && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          Could not load the stock summary.{' '}
          <Button variant="link" className="h-auto p-0" onClick={() => void summary.refetch()}>
            Try again
          </Button>
        </p>
      )}
    </section>
  );
}
