import { Camera, CameraSlash } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { InlineAlert } from '../../../components/ui/States';

const REPEAT_IGNORE_MS = 4000;

export function QrScannerPanel({ onScan }: { onScan: (code: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onScanRef = useRef(onScan);
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { onScanRef.current = onScan; }, [onScan]);

  useEffect(() => {
    if (!enabled || !videoRef.current) return;
    const video = videoRef.current;
    let cancelled = false;
    let stop = () => {};
    let last = { code: '', at: 0 };

    void (async () => {
      try {
        // Thư viện có worker khá nặng, chỉ tải khi lễ tân thật sự bật camera
        const { default: QrScanner } = await import('qr-scanner');
        if (cancelled) return;
        const scanner = new QrScanner(video, (result) => {
          const code = result.data.trim();
          const now = Date.now();
          if (!code || (code === last.code && now - last.at < REPEAT_IGNORE_MS)) return;
          last = { code, at: now };
          onScanRef.current(code);
        }, { returnDetailedScanResult: true, highlightScanRegion: true, highlightCodeOutline: true });
        stop = () => scanner.destroy();
        await scanner.start();
      } catch {
        if (cancelled) return;
        setError('Không mở được camera. Hãy cấp quyền camera cho trang này, hoặc nhập mã thành viên.');
        setEnabled(false);
      }
    })();

    return () => { cancelled = true; stop(); };
  }, [enabled]);

  return (
    <div>
      <div className="relative grid aspect-video place-items-center overflow-hidden rounded-2xl bg-ink">
        <video ref={videoRef} className={enabled ? 'size-full object-cover' : 'hidden'} muted playsInline aria-label="Hình ảnh camera quét mã QR" />
        {!enabled && <p className="px-6 text-center text-sm text-white/75">Bật camera rồi đưa mã QR trong hồ sơ hội viên vào khung hình.</p>}
      </div>
      {error && <div className="mt-3"><InlineAlert>{error}</InlineAlert></div>}
      <div className="mt-3 flex justify-center">
        <Button variant="secondary" icon={enabled ? <CameraSlash aria-hidden="true" /> : <Camera aria-hidden="true" />} onClick={() => { setError(''); setEnabled((value) => !value); }}>
          {enabled ? 'Tắt camera' : 'Bật camera'}
        </Button>
      </div>
    </div>
  );
}
