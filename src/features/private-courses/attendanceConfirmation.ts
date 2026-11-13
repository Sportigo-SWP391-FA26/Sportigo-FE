import { apiClient } from '../../api/client';

export type PendingSessionConfirmation = {
  id: number;
  sessionDate: string;
  startsAt: string;
  endsAt: string;
  courseName: string;
  coachName: string;
  autoConfirmAt: string;
};

export type SessionDispute = {
  id: number;
  sessionDate: string;
  startsAt: string;
  endsAt: string;
  courseName: string;
  coachName: string;
  memberName: string;
  memberCode: string;
  disputeReason: string | null;
  recordedAt: string;
};

export const attendanceConfirmationApi = {
  pending: () => apiClient.get<PendingSessionConfirmation[]>('/private-courses/attendances/pending').then((r) => r.data),
  confirm: (id: number) => apiClient.post(`/private-courses/attendances/${id}/confirm`).then((r) => r.data),
  dispute: (id: number, reason: string) => apiClient.post(`/private-courses/attendances/${id}/dispute`, { reason }).then((r) => r.data),
  disputes: () => apiClient.get<SessionDispute[]>('/private-courses/attendances/disputes').then((r) => r.data),
  resolve: (id: number, decision: 'CONFIRM' | 'REJECT', note: string) => apiClient.post(`/private-courses/attendances/${id}/resolve`, { decision, note }).then((r) => r.data),
};

export const formatSessionTime = (startsAt: string, endsAt: string) => {
  const time = (value: string) => new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' });
  const day = new Date(startsAt).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
  return `${day} · ${time(startsAt)}–${time(endsAt)}`;
};
