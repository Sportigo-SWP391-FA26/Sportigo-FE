import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  changeWorkoutPlanStatus,
  createPlanItem,
  createWorkoutPlan,
  deletePlanItem,
  getWorkoutPlan,
  getWorkoutPlans,
  reorderPlanItems,
  updatePlanItem,
  updateWorkoutPlan,
} from '../api';
import { retryServerErrors } from '../errors';
import { compareItems } from '../planStructure';
import { trainingKeys } from '../queryKeys';
import type {
  EditablePlanStatus,
  PlanItemInput,
  ReorderItemsInput,
  WorkoutPlanDetail,
  WorkoutPlanInput,
  WorkoutPlanQuery,
} from '../types';

export function useWorkoutPlans(query: WorkoutPlanQuery, enabled = true) {
  return useQuery({
    queryKey: trainingKeys.planList(query),
    queryFn: () => getWorkoutPlans(query),
    placeholderData: keepPreviousData,
    retry: retryServerErrors,
    enabled,
  });
}

export function useWorkoutPlan(planId: number) {
  return useQuery({
    queryKey: trainingKeys.planDetail(planId),
    queryFn: () => getWorkoutPlan(planId),
    retry: retryServerErrors,
    enabled: Number.isInteger(planId) && planId > 0,
  });
}

function useInvalidatePlans() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: trainingKeys.plans() });
}

export function useCreateWorkoutPlan() {
  const invalidate = useInvalidatePlans();
  return useMutation({
    mutationFn: (input: WorkoutPlanInput) => createWorkoutPlan(input),
    onSuccess: invalidate,
  });
}

export function useUpdateWorkoutPlan(planId: number) {
  const invalidate = useInvalidatePlans();
  return useMutation({
    mutationFn: (input: Partial<WorkoutPlanInput>) => updateWorkoutPlan(planId, input),
    onSuccess: invalidate,
  });
}

export function useChangePlanStatus() {
  const invalidate = useInvalidatePlans();
  return useMutation({
    mutationFn: ({ planId, status }: { planId: number; status: EditablePlanStatus }) =>
      changeWorkoutPlanStatus(planId, status),
    onSuccess: invalidate,
  });
}

// ---------- Mục giáo án (FR-50) ----------

export function useCreatePlanItem(planId: number) {
  const invalidate = useInvalidatePlans();
  return useMutation({
    mutationFn: (input: PlanItemInput) => createPlanItem(planId, input),
    onSuccess: invalidate,
  });
}

export function useUpdatePlanItem(planId: number) {
  const invalidate = useInvalidatePlans();
  return useMutation({
    mutationFn: ({ itemId, input }: { itemId: number; input: Partial<PlanItemInput> }) =>
      updatePlanItem(planId, itemId, input),
    onSuccess: invalidate,
  });
}

export function useDeletePlanItem(planId: number) {
  const invalidate = useInvalidatePlans();
  return useMutation({
    mutationFn: (itemId: number) => deletePlanItem(planId, itemId),
    onSuccess: invalidate,
  });
}

// Đổi thứ tự hiển thị ngay (optimistic), lỗi thì khôi phục danh sách cũ
export function useReorderPlanItems(planId: number) {
  const queryClient = useQueryClient();
  const detailKey = trainingKeys.planDetail(planId);

  return useMutation({
    mutationFn: (input: ReorderItemsInput) => reorderPlanItems(planId, input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: detailKey });
      const previous = queryClient.getQueryData<WorkoutPlanDetail>(detailKey);
      if (previous) {
        const orders = new Map(input.items.map((item) => [item.itemId, item.itemOrder]));
        const items = previous.items
          .map((item) => ({ ...item, itemOrder: orders.get(item.id) ?? item.itemOrder }))
          .sort(compareItems);
        queryClient.setQueryData<WorkoutPlanDetail>(detailKey, { ...previous, items });
      }
      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) queryClient.setQueryData(detailKey, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: detailKey }),
  });
}
