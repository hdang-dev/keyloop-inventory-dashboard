import { NativeSelect } from '@/components/NativeSelect';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { DaysRangeFilter, type DaysRange } from '@/features/inventory/DaysRangeFilter';
import {
  hasActiveFilters,
  inventoryNavigation,
  type InventoryParams,
} from '@/features/inventory/inventoryParams';
import { useFilterOptions } from '@/hooks/useInventoryQueries';

function applyDaysRange(range: DaysRange) {
  inventoryNavigation.setFilters(range, { replace: true });
}

function withCurrentValue(options: string[], value: string | undefined): string[] {
  // A value from a shared URL may no longer be in stock; keep showing what is being filtered on.
  return value && !options.includes(value) ? [value, ...options] : options;
}

export function FilterBar({
  dealershipId,
  params,
}: {
  dealershipId: string;
  params: InventoryParams;
}) {
  const filterOptions = useFilterOptions(dealershipId);
  const makes = filterOptions.data?.makes ?? [];
  const models = makes.find(({ make }) => make === params.make)?.models ?? [];

  return (
    <form
      aria-label="Filter vehicles"
      className="flex flex-wrap items-start gap-3"
      onSubmit={(event) => event.preventDefault()}
    >
      <div className="flex w-44 flex-col gap-1.5">
        <Label htmlFor="filter-make">Make</Label>
        <NativeSelect
          id="filter-make"
          value={params.make ?? ''}
          onChange={(event) =>
            inventoryNavigation.setFilters({
              make: event.target.value || undefined,
              model: undefined,
            })
          }
        >
          <option value="">All makes</option>
          {withCurrentValue(
            makes.map(({ make }) => make),
            params.make,
          ).map((make) => (
            <option key={make} value={make}>
              {make}
            </option>
          ))}
        </NativeSelect>
      </div>

      <div className="flex w-44 flex-col gap-1.5">
        <Label htmlFor="filter-model">Model</Label>
        <NativeSelect
          id="filter-model"
          value={params.model ?? ''}
          disabled={!params.make}
          onChange={(event) =>
            inventoryNavigation.setFilters({ model: event.target.value || undefined })
          }
        >
          <option value="">{params.make ? 'All models' : 'Select a make first'}</option>
          {withCurrentValue(models, params.model).map((model) => (
            <option key={model} value={model}>
              {model}
            </option>
          ))}
        </NativeSelect>
      </div>

      <DaysRangeFilter
        minDays={params.minDays}
        maxDays={params.maxDays}
        onChange={applyDaysRange}
      />

      <div className="flex flex-col gap-1.5">
        <span aria-hidden className="text-sm leading-none invisible">
          Reset
        </span>
        <Button
          type="button"
          variant="ghost"
          disabled={!hasActiveFilters(params)}
          onClick={() => inventoryNavigation.resetFilters()}
        >
          Reset filters
        </Button>
      </div>
    </form>
  );
}
