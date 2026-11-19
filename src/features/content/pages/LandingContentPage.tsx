import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { archiveLandingContent, createLandingContent, getLandingContent, getSiteSettings, updateLandingContent, updateSiteSettings, type ContentKind } from '../api';
import { Button } from '../../../components/ui/Button';
import { Card, PageHeader, SectionHeading } from '../../../components/ui/Card';
import { EmptyState, ErrorState, InlineAlert, ListSkeleton } from '../../../components/ui/States';
import { inputClass, textareaClass } from '../../../components/ui/styles';
import { ImageUploadField } from '../../../components/ui/ImageUploadField';

const kindLabels: Record<ContentKind, string> = { heroes: 'Hero', facilities: 'Cơ sở vật chất', partners: 'Đối tác' };

export function LandingContentPage() {
  const queryClient = useQueryClient();
  const [kind, setKind] = useState<ContentKind>('heroes');
  const [message, setMessage] = useState<string | null>(null);
  const [draft, setDraft] = useState({ title: '', description: '', assetUrl: '', websiteUrl: '', sortOrder: 0 });
  const content = useQuery({ queryKey: ['landing-content', kind], queryFn: () => getLandingContent(kind) });
  const settings = useQuery({ queryKey: ['site-settings'], queryFn: getSiteSettings });

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['landing-content'] }),
      queryClient.invalidateQueries({ queryKey: ['public-landing'] }),
    ]);
  };
  const create = useMutation({ mutationFn: (input: Record<string, unknown>) => createLandingContent(kind, input), onSuccess: async () => { setDraft({ title: '', description: '', assetUrl: '', websiteUrl: '', sortOrder: 0 }); setMessage('Đã tạo nội dung mới.'); await refresh(); } });
  const toggle = useMutation({ mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) => updateLandingContent(kind, id, { isActive }), onSuccess: refresh });
  const archive = useMutation({ mutationFn: (id: number) => archiveLandingContent(kind, id), onSuccess: refresh });
  const saveSettings = useMutation({ mutationFn: updateSiteSettings, onSuccess: async () => { setMessage('Đã cập nhật thông tin website.'); await Promise.all([queryClient.invalidateQueries({ queryKey: ['site-settings'] }), queryClient.invalidateQueries({ queryKey: ['public-landing'] })]); } });

  const submitContent = (event: FormEvent) => {
    event.preventDefault(); setMessage(null);
    if (!draft.assetUrl) { setMessage('Hãy chọn và tải ảnh lên trước khi tạo nội dung.'); return; }
    const common = { sortOrder: Number(draft.sortOrder), isActive: true };
    if (kind === 'heroes') create.mutate({ ...common, title: draft.title, subtitle: draft.description || null, imageUrl: draft.assetUrl });
    else if (kind === 'facilities') create.mutate({ ...common, name: draft.title, description: draft.description || null, imageUrl: draft.assetUrl });
    else create.mutate({ ...common, name: draft.title, logoUrl: draft.assetUrl, websiteUrl: draft.websiteUrl || null });
  };

  return <section>
    <PageHeader eyebrow="CENTER MANAGER" title="Nội dung website" description="Quản lý nội dung Landing và thông tin liên hệ được hiển thị công khai." />
    {message && <div className="mb-4"><InlineAlert tone="info">{message}</InlineAlert></div>}
    <Card className="mb-6 p-5 sm:p-6"><SectionHeading title="Thông tin Sportigo" description="Landing và trang đăng nhập dùng chung dữ liệu này." />
      {settings.isPending ? <ListSkeleton rows={2} /> : settings.isError ? <ErrorState error={settings.error} onRetry={() => settings.refetch()} /> : <form className="grid gap-4 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); const values = new FormData(event.currentTarget); saveSettings.mutate({ hotline: String(values.get('hotline')), openingHours: String(values.get('openingHours')), location: String(values.get('location')), brandDescription: String(values.get('brandDescription')), authPromotionTitle: String(values.get('authPromotionTitle') || '') || null, authPromotionDescription: String(values.get('authPromotionDescription') || '') || null }); }}>
        <label className="grid gap-1.5 text-sm font-semibold text-ink">Hotline<input name="hotline" className={inputClass} defaultValue={settings.data?.hotline} required /></label>
        <label className="grid gap-1.5 text-sm font-semibold text-ink">Giờ mở cửa<input name="openingHours" className={inputClass} defaultValue={settings.data?.openingHours} required /></label>
        <label className="grid gap-1.5 text-sm font-semibold text-ink">Địa điểm<input name="location" className={inputClass} defaultValue={settings.data?.location} required /></label>
        <label className="grid gap-1.5 text-sm font-semibold text-ink">Tiêu đề Auth<input name="authPromotionTitle" className={inputClass} defaultValue={settings.data?.authPromotionTitle ?? ''} /></label>
        <label className="grid gap-1.5 text-sm font-semibold text-ink sm:col-span-2">Mô tả thương hiệu<textarea name="brandDescription" className={textareaClass} defaultValue={settings.data?.brandDescription} required /></label>
        <label className="grid gap-1.5 text-sm font-semibold text-ink sm:col-span-2">Mô tả Auth<textarea name="authPromotionDescription" className={textareaClass} defaultValue={settings.data?.authPromotionDescription ?? ''} /></label>
        <div className="sm:col-span-2"><Button type="submit" loading={saveSettings.isPending}>Lưu thông tin website</Button></div>
      </form>}
    </Card>

    <div className="mb-4 flex flex-wrap gap-2">{(Object.keys(kindLabels) as ContentKind[]).map((value) => <Button key={value} variant={kind === value ? 'primary' : 'secondary'} onClick={() => setKind(value)}>{kindLabels[value]}</Button>)}</div>
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Card className="p-5 sm:p-6"><SectionHeading title={`Danh sách ${kindLabels[kind]}`} description="Thứ tự và trạng thái này được dùng trực tiếp trên Landing." />
        {content.isPending ? <ListSkeleton /> : content.isError ? <ErrorState error={content.error} onRetry={() => content.refetch()} /> : content.data.length === 0 ? <EmptyState compact title="Chưa có nội dung" description="Tạo bản ghi đầu tiên bằng biểu mẫu bên cạnh." /> : <div className="divide-y divide-line">{content.data.map((item) => {
          const name = 'title' in item ? item.title : item.name;
          const asset = 'imageUrl' in item ? item.imageUrl : item.logoUrl;
          return <article key={item.id} className="grid gap-3 py-4 sm:grid-cols-[64px_1fr_auto] sm:items-center"><img src={asset} alt="" className="size-16 rounded-xl border border-line bg-canvas object-cover p-1" /><div><h3 className="font-extrabold text-ink">{name}</h3><p className="mt-1 text-xs text-muted">Thứ tự {item.sortOrder} · {item.isActive ? 'Đang hiển thị' : 'Đang ẩn'}</p></div><div className="flex flex-wrap gap-2"><Button size="sm" variant="secondary" onClick={() => toggle.mutate({ id: item.id, isActive: !item.isActive })}>{item.isActive ? 'Ẩn' : 'Hiện'}</Button><Button size="sm" variant="danger" onClick={() => archive.mutate(item.id)}>Lưu trữ</Button></div></article>;
        })}</div>}
      </Card>
      <Card className="p-5 sm:p-6"><SectionHeading title={`Thêm ${kindLabels[kind]}`} /><form className="grid gap-4" onSubmit={submitContent}>
        <label className="grid gap-1.5 text-sm font-semibold text-ink">{kind === 'heroes' ? 'Tiêu đề' : 'Tên'}<input className={inputClass} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} required /></label>
        {kind !== 'partners' && <label className="grid gap-1.5 text-sm font-semibold text-ink">Mô tả<textarea className={textareaClass} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></label>}
        <ImageUploadField label={kind === 'partners' ? 'Logo đối tác' : 'Ảnh hiển thị'} value={draft.assetUrl} purpose="content" required disabled={create.isPending} previewClassName={kind === 'partners' ? '[&>img]:object-contain [&>img]:p-3' : undefined} hint="Chọn ảnh từ máy; URL Cloudinary sẽ được lưu cùng nội dung sau khi bạn bấm Tạo nội dung." onChange={(assetUrl) => setDraft((current) => ({ ...current, assetUrl }))} />
        {kind === 'partners' && <label className="grid gap-1.5 text-sm font-semibold text-ink">Website<input className={inputClass} type="url" value={draft.websiteUrl} onChange={(e) => setDraft({ ...draft, websiteUrl: e.target.value })} /></label>}
        <label className="grid gap-1.5 text-sm font-semibold text-ink">Thứ tự<input className={inputClass} type="number" min="0" value={draft.sortOrder} onChange={(e) => setDraft({ ...draft, sortOrder: Number(e.target.value) })} /></label>
        {(create.isError || toggle.isError || archive.isError) && <InlineAlert>Không thể lưu nội dung. Kiểm tra dữ liệu và thử lại.</InlineAlert>}
        <Button type="submit" loading={create.isPending}>Tạo nội dung</Button>
      </form></Card>
    </div>
  </section>;
}
