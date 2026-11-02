import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ApiError } from '@/api/client';
import { inventoryApi, queryKeys } from '@/api/inventory';
import { AgingBadge } from '@/components/AgingBadge';
import { ErrorState } from '@/components/QueryStates';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { AGING_THRESHOLD_DAYS } from '@/domain/aging';
import type { VehicleDetail } from '@/domain/types';
import { ActionForm } from '@/features/vehicle/ActionForm';
import { ActionHistory } from '@/features/vehicle/ActionHistory';
import { formatDate } from '@/lib/format';

function VehicleDetails({ vehicle, timezone }: { vehicle: VehicleDetail; timezone: string }) {
  return (
    <div className="flex flex-col gap-6 px-4 pb-6">
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="text-muted-foreground">VIN</dt>
        <dd className="font-mono text-xs leading-5 break-all">{vehicle.vin}</dd>
        <dt className="text-muted-foreground">Stocked</dt>
        <dd>{formatDate(vehicle.stockedAt, timezone)}</dd>
        <dt className="text-muted-foreground">Days in stock</dt>
        <dd className="flex items-center gap-2 tabular-nums">
          {vehicle.daysInStock}
          {vehicle.isAging && <AgingBadge />}
        </dd>
        <dt className="text-muted-foreground">Time zone</dt>
        <dd>{timezone}</dd>
      </dl>

      <section aria-labelledby="action-heading" className="flex flex-col gap-3">
        <h3 id="action-heading" className="text-sm font-semibold">
          Action
        </h3>
        {vehicle.isAging ? (
          <ActionForm
            key={vehicle.id}
            vehicleId={vehicle.id}
            currentAction={vehicle.currentAction}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            Actions can be logged once a vehicle has been in stock for more than{' '}
            {AGING_THRESHOLD_DAYS} days.
          </p>
        )}
      </section>

      <section aria-labelledby="history-heading" className="flex flex-col gap-3">
        <h3 id="history-heading" className="text-sm font-semibold">
          History
        </h3>
        <ActionHistory history={vehicle.history} timezone={timezone} />
      </section>
    </div>
  );
}

function focusVehicleRow(vehicleId: string | undefined) {
  const buttons = document.querySelectorAll<HTMLElement>('[data-vehicle-id]');
  [...buttons].find((button) => button.dataset.vehicleId === vehicleId)?.focus();
}

interface VehiclePanelProps {
  vehicleId: string | undefined;
  timezone: string;
  onClose: () => void;
}

export function VehiclePanel({ vehicleId, timezone, onClose }: VehiclePanelProps) {
  const vehicle = useQuery({
    queryKey: queryKeys.vehicle(vehicleId ?? ''),
    queryFn: () => inventoryApi.getVehicle(vehicleId ?? ''),
    enabled: vehicleId !== undefined,
  });
  const lastVehicleId = useRef(vehicleId);

  useEffect(() => {
    if (vehicleId !== undefined) lastVehicleId.current = vehicleId;
  }, [vehicleId]);

  const isNotFound = vehicle.error instanceof ApiError && vehicle.error.status === 404;

  return (
    <Sheet open={vehicleId !== undefined} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        className="w-full overflow-y-auto sm:max-w-md"
        // The panel opens from the URL, not a dialog trigger, so tell it where focus goes back to.
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          focusVehicleRow(lastVehicleId.current);
        }}
      >
        <SheetHeader>
          <SheetTitle>
            {vehicle.data ? `${vehicle.data.make} ${vehicle.data.model}` : 'Vehicle details'}
          </SheetTitle>
          <SheetDescription>Details, current action and history for this vehicle.</SheetDescription>
        </SheetHeader>

        {vehicle.data && <VehicleDetails vehicle={vehicle.data} timezone={timezone} />}
        {vehicle.isPending && vehicleId !== undefined && (
          <div data-testid="panel-skeleton" className="flex flex-col gap-3 px-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        )}
        {vehicle.isError && !vehicle.data && isNotFound && (
          <p role="alert" className="px-4 text-sm">
            This vehicle is no longer in stock.
          </p>
        )}
        {vehicle.isError && !vehicle.data && !isNotFound && (
          <ErrorState
            message="Could not load this vehicle."
            onRetry={() => void vehicle.refetch()}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
