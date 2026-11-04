type BookingWindow = {
  status?: string;
  registrationOpenAt: string;
  registrationCloseAt: string;
  startDate: string;
};

export function isClassBookable(item: BookingWindow, now = Date.now()) {
  return item.status === 'OPEN' &&
    now >= new Date(item.registrationOpenAt).getTime() &&
    now < new Date(item.registrationCloseAt).getTime() &&
    now < new Date(item.startDate).getTime();
}
