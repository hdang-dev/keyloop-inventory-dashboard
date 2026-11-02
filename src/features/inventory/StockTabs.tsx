import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ReactNode } from 'react';
import { inventoryNavigation, type StockTab } from '@/features/inventory/inventoryParams';
import { useSummary } from '@/hooks/useInventoryQueries';

interface StockTabsProps {
  dealershipId: string;
  tab: StockTab;
  filters: ReactNode;
  children: ReactNode;
}

export function StockTabs({ dealershipId, tab, filters, children }: StockTabsProps) {
  const { data: summary } = useSummary(dealershipId);

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => inventoryNavigation.selectTab(value as StockTab)}
      className="gap-4"
    >
      <TabsList>
        <TabsTrigger value="all">All Stock</TabsTrigger>
        <TabsTrigger value="aging">
          Aging Stock
          {summary && (
            <span className="ml-1.5 rounded-full bg-aging-surface px-1.5 text-xs font-semibold text-aging tabular-nums">
              {summary.aging}
            </span>
          )}
        </TabsTrigger>
      </TabsList>
      {filters}
      <TabsContent value={tab}>{children}</TabsContent>
    </Tabs>
  );
}
