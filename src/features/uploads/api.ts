import { apiClient } from '../../api/client';

export type UploadPurpose = 'avatar' | 'sport' | 'content';
export type ImageUploadResult = {
  secureUrl: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
};

export async function uploadImage(file: File, purpose: UploadPurpose) {
  const body = new FormData();
  body.append('image', file);
  body.append('purpose', purpose);
  const { data } = await apiClient.post<ImageUploadResult>('/uploads/images', body);
  return data;
}
