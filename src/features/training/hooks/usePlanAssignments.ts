import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { assignPlanToEnrollment, getEnrollmentPlans } from '../api';
import { retryServerErrors } from '../errors';
import { trainingKeys } from '../queryKeys';

export function useEnrollmentPlans(enrollmentId: number) {
  return useQuery({
    queryKey: trainingKeys.enrollmentPlans(enrollmentId),
    queryFn: () => getEnrollmentPlans(enrollmentId),
    retry: retryServerErrors,
    enabled: Number.isInteger(enrollmentId) && enrollmentId > 0,
  });
}

export function useAssignPlan(enrollmentId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (workoutPlanId: number) => assignPlanToEnrollment(enrollmentId, workoutPlanId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trainingKeys.enrollmentPlans(enrollmentId) });
      // assignmentCount của giáo án thay đổi
      queryClient.invalidateQueries({ queryKey: trainingKeys.plans() });
    },
  });
}
