import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { Card, SectionHeading } from '../../../components/ui/Card';
import { Pagination } from '../../../components/ui/Pagination';
import { membershipApi } from '../api';

const PAGE_SIZE = 10;
const vietnamDateTime = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
});

export function CheckInHistoryPanel({ memberOnly = false }: { memberOnly?: boolean }) {
  const [page, setPage] = useState(1);
  const history = useQuery({
    queryKey: [memberOnly ? 'my-check-ins' : 'check-ins', page],
    queryFn: () => memberOnly ? membershipApi.myCheckInHistory(page, PAGE_SIZE) : membershipApi.checkInHistory(page, PAGE_SIZE),
  });

  return (
    <Card className="p-5 sm:p-6">
      <SectionHeading title={memberOnly ? 'Lịch sử vào phòng tập' : 'Lịch sử check-in'} />
      {history.isPending && <p className="text-sm text-muted" role="status">Đang tải lịch sử check-in…</p>}
      {history.isError && (
        <div className="flex flex-wrap items-center gap-3 text-sm text-danger" role="alert">
          <span>Không tải được lịch sử check-in.</span>
          <Button size="sm" variant="secondary" onClick={() => void history.refetch()}>Thử lại</Button>
        </div>
      )}
      {history.data && (history.data.items.length ? (
        <>
          <ul className="divide-y divide-line">
            {history.data.items.map((item) => (
              <li key={item.id} className="flex flex-wrap items-start justify-between gap-2 py-3 text-sm">
                <div>
                  {!memberOnly && <p className="font-bold text-ink">{item.member.displayName} <span className="font-mono font-normal text-muted">{item.member.memberCode}</span></p>}
                  <p className="text-muted">{item.planName} · {item.method === 'QR' ? 'Quét QR' : 'Nhập mã'}{!memberOnly && ` · ${item.checkedInBy}`}</p>
                </div>
                <time className="shrink-0 font-semibold text-ink" dateTime={item.checkedInAt}>{vietnamDateTime.format(new Date(item.checkedInAt))}</time>
              </li>
            ))}
          </ul>
          <Pagination page={history.data.page} pageSize={history.data.limit} total={history.data.total} disabled={history.isFetching} onChange={setPage} />
        </>
      ) : <p className="text-sm text-muted">Chưa có lượt check-in nào.</p>)}
    </Card>
  );
}
