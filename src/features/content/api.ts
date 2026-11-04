import { apiClient } from '../../api/client';
import type { LandingFacility, LandingHeroSlide, LandingPartner, ManagerDashboardData, MemberHomeData, PublicLandingData, SiteSetting } from './types';

type DataResponse<T> = { success: true; data: T };

const LANDING_STORAGE_KEY = 'sportigo:public-landing:v1';

export function readCachedPublicLanding(): PublicLandingData | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const cached = window.sessionStorage.getItem(LANDING_STORAGE_KEY);
    return cached ? JSON.parse(cached) as PublicLandingData : undefined;
  } catch {
    return undefined;
  }
}

export async function getPublicLanding() {
  const landing = (await apiClient.get<DataResponse<PublicLandingData>>('/public/landing')).data.data;
  try {
    window.sessionStorage.setItem(LANDING_STORAGE_KEY, JSON.stringify(landing));
  } catch {
    // Storage có thể bị chặn ở chế độ riêng tư; dữ liệu mạng vẫn dùng bình thường.
  }
  return landing;
}

export async function subscribeNewsletter(email: string) {
  return (await apiClient.post('/public/newsletter', { email })).data;
}

export async function getMemberHome() {
  return (await apiClient.get<DataResponse<MemberHomeData>>('/members/me/home')).data.data;
}

export async function getManagerDashboard() {
  return (await apiClient.get<DataResponse<ManagerDashboardData>>('/reports/dashboard')).data.data;
}

export type ContentKind = 'heroes' | 'facilities' | 'partners';
export type ContentRecord = LandingHeroSlide | LandingFacility | LandingPartner;

export async function getLandingContent(kind: ContentKind) {
  return (await apiClient.get<DataResponse<ContentRecord[]>>(`/landing-content/${kind}`)).data.data;
}

export async function createLandingContent(kind: ContentKind, input: Record<string, unknown>) {
  return (await apiClient.post<DataResponse<ContentRecord>>(`/landing-content/${kind}`, input)).data.data;
}

export async function updateLandingContent(kind: ContentKind, id: number, input: Record<string, unknown>) {
  return (await apiClient.patch<DataResponse<ContentRecord>>(`/landing-content/${kind}/${id}`, input)).data.data;
}

export async function archiveLandingContent(kind: ContentKind, id: number) {
  return (await apiClient.delete<DataResponse<ContentRecord>>(`/landing-content/${kind}/${id}`)).data.data;
}

export async function getSiteSettings() {
  return (await apiClient.get<DataResponse<SiteSetting | null>>('/landing-content/settings')).data.data;
}

export async function updateSiteSettings(input: Pick<SiteSetting, 'hotline' | 'openingHours' | 'location' | 'brandDescription' | 'authPromotionTitle' | 'authPromotionDescription'>) {
  return (await apiClient.put<DataResponse<SiteSetting>>('/landing-content/settings', input)).data.data;
}
