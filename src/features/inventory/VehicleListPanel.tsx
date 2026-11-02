import { useEffect } from 'react';
import { EmptyState, ErrorState } from '@/components/QueryStates';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/features/inventory/Pagination';
import { VehicleTable } from '@/features/inventory/VehicleTable';
import {
  hasActiveFilters,
  inventoryNavigation,
  PAGE_SIZE,
  toVehicleQuery,
  type InventoryParams,
} from '@/features/inventory/inventoryParams';
import { useVehicles } from '@/hooks/useInventoryQueries';

interface VehicleListPanelProps {
  dealershipId: string;
  timezone: string;
  params: InventoryParams;
}

export function VehicleListPanel({ dealershipId, timezone, params }: VehicleListPanelProps) {
  const vehicles = useVehicles(toVehicleQuery(params, dealershipId));
  const total = vehicles.data?.total;
  const lastPage = Math.max(Math.ceil((total ?? 0) / PAGE_SIZE), 1);
  const isPageSettled = !vehicles.isPlaceholderData && total !== undefined;

  // Stock can shrink while a page is open, or the URL can point past the end.
  useEffect(() => {
    if (isPageSettled && params.page > lastPage) {
      inventoryNavigation.setPage(lastPage, { replace: true });
    }
  }, [isPageSettled, lastPage, params.page]);

  if (vehicles.isError && !vehicles.data) {
    return (
      <ErrorState message="Could not load vehicles." onRetry={() => void vehicles.refetch()} />
    );
  }

  if (vehicles.data?.total === 0) {
    const noStockTitle = params.tab === 'aging' ? 'No aging stock' : 'No vehicles to show';
    return (
      <EmptyState
        title={hasActiveFilters(params) ? 'No vehicles match these filters' : noStockTitle}
      >
        {hasActiveFilters(params) && (
          <Button variant="outline" size="sm" onClick={() => inventoryNavigation.resetFilters()}>
            Reset filters
          </Button>
        )}
      </EmptyState>
    );
  }

  return (
    <>
      {vehicles.isRefetchError && (
        <p role="status" className="border-b bg-muted px-4 py-2 text-sm text-muted-foreground">
          Could not refresh. Showing the last loaded data.
        </p>
      )}
      <VehicleTable
        vehicles={vehicles.data?.items}
        timezone={timezone}
        sort={params.sort}
        isStale={vehicles.isPlaceholderData}
        onSortChange={inventoryNavigation.setSort}
      />
      {vehicles.data && (
        <Pagination
          page={vehicles.data.page}
          pageSize={vehicles.data.pageSize}
          total={vehicles.data.total}
          onPageChange={(page) => inventoryNavigation.setPage(page)}
        />
      )}
    </>
  );
}
