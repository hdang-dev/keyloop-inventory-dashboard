import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError } from '@/api/client';
import { inventoryApi, queryKeys } from '@/api/inventory';
import type {
  ActionHistoryEntry,
  ActionSummary,
  Page,
  SaveActionInput,
  VehicleDetail,
  VehicleListItem,
} from '@/domain/types';

const OPTIMISTIC_USER = 'You';

/**
 * Saves an action optimistically: the table, panel and history change straight away and roll back
 * if the save fails. On a version conflict the panel moves to the latest action from the server.
 */
export function useSaveAction(vehicleId: string) {
  const queryClient = useQueryClient();
  const detailKey = queryKeys.vehicle(vehicleId);

  return useMutation({
    mutationFn: (input: SaveActionInput) => inventoryApi.saveAction(vehicleId, input),

    onMutate: async (input) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: detailKey }),
        queryClient.cancelQueries({ queryKey: queryKeys.vehicleLists }),
      ]);
      const previousDetail = queryClient.getQueryData<VehicleDetail>(detailKey);
      const previousLists = queryClient.getQueriesData<Page<VehicleListItem>>({
        queryKey: queryKeys.vehicleLists,
      });

      const summary: ActionSummary = {
        status: input.status,
        updatedAt: new Date().toISOString(),
        updatedBy: OPTIMISTIC_USER,
      };
      const note = input.note?.trim() || null;
      const entry: ActionHistoryEntry = { ...summary, note, id: 'optimistic' };

      queryClient.setQueryData<VehicleDetail>(
        detailKey,
        (detail) =>
          detail && {
            ...detail,
            currentAction: { ...summary, note, version: input.version + 1 },
            history: [entry, ...detail.history],
          },
      );
      queryClient.setQueriesData<Page<VehicleListItem>>(
        { queryKey: queryKeys.vehicleLists },
        (page) =>
          page && {
            ...page,
            items: page.items.map((item) =>
              item.id === vehicleId ? { ...item, currentAction: summary } : item,
            ),
          },
      );

      return { previousDetail, previousLists };
    },

    onError: (error, _input, context) => {
      queryClient.setQueryData(detailKey, context?.previousDetail);
      context?.previousLists.forEach(([key, page]) => queryClient.setQueryData(key, page));

      if (error instanceof ApiError && error.code === 'VERSION_CONFLICT') {
        queryClient.setQueryData<VehicleDetail>(
          detailKey,
          (detail) => detail && { ...detail, currentAction: error.currentAction ?? null },
        );
      } else {
        toast.error('Could not save the action', { description: error.message });
      }
    },

    onSuccess: () => {
      toast.success('Action saved');
    },

    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: detailKey }),
        queryClient.invalidateQueries({ queryKey: queryKeys.vehicleLists }),
      ]),
  });
}
