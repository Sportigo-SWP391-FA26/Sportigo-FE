import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createAssessment, getAssessments } from '../api';
import { retryServerErrors } from '../errors';
import { trainingKeys } from '../queryKeys';
import type { AssessmentInput, AssessmentQuery } from '../types';

export function useAssessments(query: AssessmentQuery) {
  return useQuery({
    queryKey: trainingKeys.assessmentList(query),
    queryFn: () => getAssessments(query),
    placeholderData: keepPreviousData,
    retry: retryServerErrors,
  });
}

export function useCreateAssessment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AssessmentInput) => createAssessment(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: trainingKeys.assessments() }),
  });
}
