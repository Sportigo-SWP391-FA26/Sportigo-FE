import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { Card } from '../../../components/ui/Card';

export function MemberQrCard({ memberCode }: { memberCode: string }) {
  const [src, setSrc] = useState('');

  useEffect(() => {
    let active = true;
    void QRCode.toDataURL(memberCode, { width: 220, margin: 1, errorCorrectionLevel: 'M' }).then((url) => {
      if (active) setSrc(url);
    });
    return () => { active = false; };
  }, [memberCode]);

  return (
    <Card className="mb-5 flex flex-col items-center gap-5 p-5 sm:flex-row sm:p-6">
      <div className="grid size-[172px] shrink-0 place-items-center rounded-2xl bg-white p-2 ring-1 ring-line">
        {src && <img src={src} alt={`Mã QR của mã thành viên ${memberCode}`} className="size-full" />}
      </div>
      <div className="text-center sm:text-left">
        <h2 className="text-lg font-extrabold text-ink">Mã check-in phòng tập</h2>
        <p className="mt-1 text-sm text-muted">Đưa mã này cho lễ tân khi đến trung tâm, hoặc đọc mã thành viên bên dưới.</p>
        <p className="mt-3 font-mono text-2xl font-extrabold tracking-widest text-primary-deep">{memberCode}</p>
      </div>
    </Card>
  );
}
