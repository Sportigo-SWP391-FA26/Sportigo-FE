import { useQuery } from '@tanstack/react-query';
import { getMyTraining } from '../api';
import { retryServerErrors } from '../errors';
import { trainingKeys } from '../queryKeys';

// FR-53: giáo án được gán và đánh giá của chính Member đang đăng nhập
export function useMyTraining() {
  return useQuery({
    queryKey: trainingKeys.myTraining(),
    queryFn: getMyTraining,
    retry: retryServerErrors,
  });
}
