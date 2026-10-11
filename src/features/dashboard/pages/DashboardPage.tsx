const cards = [
  ['Hội viên đang hoạt động', '12.4K'],
  ['Lớp hôm nay', '18'],
  ['Phòng đang sử dụng', '7/10'],
  ['Doanh thu tháng', '428M'],
];

export function DashboardPage() {
  return (
    <section>
      <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
      <p className="mt-1 text-slate-500">Tổng quan hoạt động trung tâm.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value]) => (
          <article
            key={label}
            className="rounded-xl border border-slate-200 bg-white p-5"
          >
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
