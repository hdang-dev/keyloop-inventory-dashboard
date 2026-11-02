import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AGING_THRESHOLD_DAYS } from '@/domain/aging';
import { useSummary } from '@/hooks/useInventoryQueries';

function SummaryCard({
  label,
  value,
  isLoading,
  className,
}: {
  label: string;
  value: number | undefined;
  isLoading: boolean;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardContent>
        <dt className="text-sm text-muted-foreground">{label}</dt>
        <dd className="mt-1 text-3xl font-semibold tabular-nums">
          {isLoading ? <Skeleton className="h-9 w-20" /> : (value ?? '–')}
        </dd>
      </CardContent>
    </Card>
  );
}

export function SummaryCards({ dealershipId }: { dealershipId: string }) {
  const summary = useSummary(dealershipId);

  return (
    <section aria-label="Stock summary">
      <dl className="grid gap-4 sm:grid-cols-2">
        <SummaryCard
          label="Total vehicles"
          value={summary.data?.total}
          isLoading={summary.isPending}
        />
        <SummaryCard
          label={`Aging vehicles (over ${AGING_THRESHOLD_DAYS} days)`}
          value={summary.data?.aging}
          isLoading={summary.isPending}
          className="border-aging-border bg-aging-surface [&_dd]:text-aging [&_dt]:text-aging"
        />
      </dl>
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
