import { NativeSelect } from '@/components/NativeSelect';
import { EmptyState, ErrorState } from '@/components/QueryStates';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { FilterBar } from '@/features/inventory/FilterBar';
import { inventoryNavigation, useInventoryParams } from '@/features/inventory/inventoryParams';
import { SummaryCards } from '@/features/inventory/SummaryCards';
import { VehicleListPanel } from '@/features/inventory/VehicleListPanel';
import { useDealerships } from '@/hooks/useInventoryQueries';

export function InventoryPage() {
  const params = useInventoryParams();
  const dealerships = useDealerships();
  const list = dealerships.data ?? [];
  const dealership = list.find(({ id }) => id === params.dealershipId) ?? list[0];

  return (
    <div className="min-h-screen">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <h1 className="text-xl font-semibold">Inventory Dashboard</h1>
          {dealership && (
            <div className="flex items-center gap-2">
              <Label htmlFor="dealership-picker">Dealership</Label>
              <NativeSelect
                id="dealership-picker"
                className="w-60"
                value={dealership.id}
                onChange={(event) => inventoryNavigation.selectDealership(event.target.value)}
              >
                {list.map(({ id, name }) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </NativeSelect>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6">
        {dealerships.isPending && <Skeleton data-testid="page-skeleton" className="h-64 w-full" />}
        {dealerships.isError && !dealerships.data && (
          <ErrorState
            message="Could not load dealerships."
            onRetry={() => void dealerships.refetch()}
          />
        )}
        {dealerships.data && !dealership && <EmptyState title="No dealerships available" />}
        {dealership && (
          <>
            <SummaryCards dealershipId={dealership.id} />
            <FilterBar key={dealership.id} dealershipId={dealership.id} params={params} />
            <Card className="gap-0 overflow-hidden py-0">
              <VehicleListPanel
                dealershipId={dealership.id}
                timezone={dealership.timezone}
                params={params}
              />
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
