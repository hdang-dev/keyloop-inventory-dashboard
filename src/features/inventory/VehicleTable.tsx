import { useMemo } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  type SortingState,
  type Updater,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ACTION_STATUS_LABELS, type VehicleListItem, type VehicleSort } from '@/domain/types';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

const SKELETON_ROWS = 8;

const columnHelper = createColumnHelper<VehicleListItem>();

function toSortingState(sort: VehicleSort): SortingState {
  const [id, direction] = sort.split(':') as [string, string];
  return [{ id, desc: direction === 'desc' }];
}

function toVehicleSort([sorting]: SortingState): VehicleSort | null {
  return sorting ? (`${sorting.id}:${sorting.desc ? 'desc' : 'asc'}` as VehicleSort) : null;
}

const ARIA_SORT = { asc: 'ascending', desc: 'descending' } as const;

function SortIcon({ direction }: { direction: false | 'asc' | 'desc' }) {
  if (direction === 'asc') return <ArrowUp aria-hidden className="size-3.5" />;
  if (direction === 'desc') return <ArrowDown aria-hidden className="size-3.5" />;
  return <ChevronsUpDown aria-hidden className="size-3.5 opacity-40" />;
}

interface VehicleTableProps {
  vehicles: VehicleListItem[] | undefined;
  timezone: string;
  sort: VehicleSort;
  isStale: boolean;
  onSortChange: (sort: VehicleSort) => void;
}

export function VehicleTable({
  vehicles,
  timezone,
  sort,
  isStale,
  onSortChange,
}: VehicleTableProps) {
  const columns = useMemo(
    () => [
      columnHelper.accessor('vin', {
        header: 'VIN',
        enableSorting: false,
        cell: (info) => <span className="font-mono text-xs">{info.getValue()}</span>,
      }),
      columnHelper.accessor('make', { header: 'Make', sortDescFirst: false }),
      columnHelper.accessor('model', { header: 'Model', sortDescFirst: false }),
      columnHelper.accessor('stockedAt', {
        header: 'Stocked',
        enableSorting: false,
        cell: (info) => formatDate(info.getValue(), timezone),
      }),
      columnHelper.accessor('daysInStock', {
        header: 'Days in stock',
        sortDescFirst: true,
        cell: (info) => <span className="tabular-nums">{info.getValue()}</span>,
      }),
      columnHelper.accessor('currentAction', {
        header: 'Status',
        enableSorting: false,
        cell: (info) => {
          const action = info.getValue();
          return action ? (
            ACTION_STATUS_LABELS[action.status]
          ) : (
            <span className="text-muted-foreground">–</span>
          );
        },
      }),
    ],
    [timezone],
  );

  const sorting = useMemo(() => toSortingState(sort), [sort]);

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table is not compiler-safe; this component opts out.
  const table = useReactTable({
    data: vehicles ?? [],
    columns,
    getRowId: (vehicle) => vehicle.id,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    manualPagination: true,
    enableSortingRemoval: false,
    state: { sorting },
    onSortingChange: (updater: Updater<SortingState>) => {
      const next = toVehicleSort(typeof updater === 'function' ? updater(sorting) : updater);
      if (next) onSortChange(next);
    },
  });

  return (
    <Table aria-label="Vehicles" aria-busy={!vehicles || isStale}>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => {
              const direction = header.column.getIsSorted();
              return (
                <TableHead
                  key={header.id}
                  aria-sort={
                    header.column.getCanSort()
                      ? direction
                        ? ARIA_SORT[direction]
                        : 'none'
                      : undefined
                  }
                >
                  {header.column.getCanSort() ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-sm hover:text-primary focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      <SortIcon direction={direction} />
                    </button>
                  ) : (
                    flexRender(header.column.columnDef.header, header.getContext())
                  )}
                </TableHead>
              );
            })}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody className={cn(isStale && 'opacity-60 transition-opacity')}>
        {vehicles
          ? table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          : Array.from({ length: SKELETON_ROWS }, (_, rowIndex) => (
              <TableRow key={rowIndex} data-testid="vehicle-skeleton">
                {columns.map((_, cellIndex) => (
                  <TableCell key={cellIndex}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
      </TableBody>
    </Table>
  );
}
