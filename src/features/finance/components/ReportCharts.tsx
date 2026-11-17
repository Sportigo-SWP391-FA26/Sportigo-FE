import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ClassReportRow, Revenue, RevenueAnalytics, RevenuePeriod } from '../api';

const palette = ['#2563eb', '#38bdf8', '#84cc16', '#f97316'];
const currency = (value: number) => `${value.toLocaleString('vi-VN')} ₫`;
const channelName: Record<string, string> = { ONLINE: 'VNPay', COUNTER: 'Tại quầy', WALLET: 'Ví Sportigo' };
const serviceName: Record<string, string> = { GROUP_CLASS: 'Lớp nhóm', PRIVATE_COURSE: 'Khóa 1–1', MEMBERSHIP: 'Gói membership' };

function trendLabel(day: string, period: RevenuePeriod) {
  const [year, month] = day.split('-').map(Number);
  return period === 'YEAR' ? String(year) : period === 'QUARTER' ? `Q${Math.ceil(month / 3)}/${year}` : `${String(month).padStart(2, '0')}/${year}`;
}

export function RevenueTrend({ data }: { data: RevenueAnalytics }) {
  const rows = data.trend.map((item) => ({ ...item, label: trendLabel(item.periodStart, data.period) }));
  const strongest = [...rows].sort((a, b) => b.net - a.net)[0];
  const weakest = [...rows].sort((a, b) => a.net - b.net)[0];
  return <section className="report-chart-panel" aria-label="Xu hướng doanh thu thuần">
    <div className="report-chart-heading"><h2>Xu hướng doanh thu thuần</h2><p>{data.period === 'MONTH' ? '12 tháng' : data.period === 'QUARTER' ? '8 quý' : '5 năm'} gần kỳ đang xem · nạp ví không tính doanh thu</p></div>
    <div className="h-[310px] w-full"><ResponsiveContainer width="100%" height="100%"><LineChart data={rows} margin={{ top: 10, right: 18, left: 4, bottom: 8 }}><CartesianGrid stroke="#e2e8f0" vertical={false} /><XAxis dataKey="label" tick={{ fontSize: 11 }} /><YAxis tickFormatter={(value: number) => `${Math.round(value / 1_000_000)}tr`} tick={{ fontSize: 11 }} /><Tooltip content={({ active, payload }) => { const row = payload?.[0]?.payload as typeof rows[number] | undefined; return active && row ? <div className="rounded-xl border border-line bg-white p-3 text-xs shadow-lg"><strong>{row.label}</strong><p>Gộp: {currency(row.gross)}</p><p>Hoàn: {currency(row.refunds)}</p><p>Thuần: {currency(row.net)}</p></div> : null; }} /><Line type="monotone" dataKey="net" name="Doanh thu thuần" stroke="#2563eb" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 6 }} /></LineChart></ResponsiveContainer></div>
    {strongest && weakest && <p className="mt-2 text-xs text-muted">Cao nhất: <strong>{strongest.label}</strong> ({currency(strongest.net)}) · Thấp nhất: <strong>{weakest.label}</strong> ({currency(weakest.net)})</p>}
    <div className="mt-5 overflow-x-auto"><table className="manager-table w-full min-w-[600px]"><thead><tr><th>Kỳ</th><th>Doanh thu gộp</th><th>Hoàn tiền</th><th>Doanh thu thuần</th><th>Giao dịch</th></tr></thead><tbody>{rows.map((row) => <tr key={row.periodStart}><td>{row.label}</td><td>{currency(row.gross)}</td><td>{currency(row.refunds)}</td><td className="font-bold">{currency(row.net)}</td><td>{row.transactions}</td></tr>)}</tbody></table></div>
  </section>;
}

export function RevenueCharts({ data }: { data: Revenue }) {
  const channels = Object.entries(data.byChannel).map(([key, value]) => ({ name: channelName[key] ?? key, value }));
  const services = Object.entries(data.byService).map(([key, value]) => ({ name: serviceName[key] ?? key, gross: value.gross, refunds: value.refunds, net: value.net }));
  const sports = data.bySport ?? [];
  return <div className="report-chart-grid">
    <section className="report-chart-panel" aria-label="Biểu đồ doanh thu theo kênh">
      <div className="report-chart-heading"><h2>Dòng tiền theo kênh</h2><p>Thanh toán dịch vụ đã thành công</p></div>
      {channels.length ? <><div className="report-chart-canvas"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={channels} dataKey="value" nameKey="name" innerRadius={67} outerRadius={100} paddingAngle={3}>{channels.map((item, index) => <Cell key={item.name} fill={palette[index % palette.length]} />)}</Pie><Tooltip formatter={(value) => currency(Number(value))} /></PieChart></ResponsiveContainer></div><div className="report-chart-legend">{channels.map((item, index) => <div key={item.name}><i style={{ backgroundColor: palette[index % palette.length] }} /><span>{item.name}</span><strong>{currency(item.value)}</strong></div>)}</div></> : <p className="report-chart-empty">Chưa có giao dịch trong kỳ này.</p>}
    </section>
    <section className="report-chart-panel" aria-label="Biểu đồ doanh thu theo dịch vụ">
      <div className="report-chart-heading"><h2>Doanh thu theo dịch vụ</h2><p>So sánh doanh thu gộp, hoàn tiền và thuần</p></div>
      {services.length ? <div className="report-chart-canvas report-chart-canvas--wide"><ResponsiveContainer width="100%" height="100%"><BarChart data={services} layout="vertical" margin={{ top: 8, right: 8, left: 10, bottom: 8 }}><CartesianGrid stroke="#e2e8f0" horizontal={false} /><XAxis type="number" tickFormatter={(value: number) => `${Math.round(value / 1_000_000)}tr`} /><YAxis type="category" dataKey="name" width={80} /><Tooltip formatter={(value) => currency(Number(value))} /><Legend /><Bar dataKey="gross" name="Gộp" fill="#2563eb" radius={[0, 4, 4, 0]} /><Bar dataKey="refunds" name="Hoàn" fill="#f97316" radius={[0, 4, 4, 0]} /><Bar dataKey="net" name="Thuần" fill="#84cc16" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer></div> : <p className="report-chart-empty">Chưa có doanh thu theo dịch vụ trong kỳ này.</p>}
    </section>
    <section className="report-chart-panel" aria-label="Biểu đồ doanh thu theo môn">
      <div className="report-chart-heading"><h2>Doanh thu theo môn</h2><p>Gói membership không gắn môn nên được tách riêng</p></div>
      {sports.length ? <div className="report-chart-canvas report-chart-canvas--wide"><ResponsiveContainer width="100%" height="100%"><BarChart data={sports} layout="vertical" margin={{ top: 8, right: 8, left: 10, bottom: 8 }}><CartesianGrid stroke="#e2e8f0" horizontal={false} /><XAxis type="number" tickFormatter={(value: number) => `${Math.round(value / 1_000_000)}tr`} /><YAxis type="category" dataKey="name" width={105} tick={{ fontSize: 11 }} /><Tooltip formatter={(value) => currency(Number(value))} /><Legend /><Bar dataKey="gross" name="Gộp" fill="#2563eb" radius={[0, 4, 4, 0]} /><Bar dataKey="refunds" name="Hoàn" fill="#f97316" radius={[0, 4, 4, 0]} /><Bar dataKey="net" name="Thuần" fill="#84cc16" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer></div> : <p className="report-chart-empty">Chưa có doanh thu theo môn trong kỳ này.</p>}
    </section>
  </div>;
}

export function OperationsCharts({ rows }: { rows: ClassReportRow[] }) {
  const ranked = [...rows].sort((a, b) => b.occupancyRate - a.occupancyRate).slice(0, 8).map((item) => ({ ...item, rate: Math.round(item.occupancyRate * 100) }));
  const attendance = [...rows].sort((a, b) => b.attendanceRate - a.attendanceRate).slice(0, 8);
  return <div className="report-chart-grid">
    <section className="report-chart-panel"><div className="report-chart-heading"><h2>Tỷ lệ lấp đầy</h2><p>8 lớp có tỷ lệ cao nhất</p></div><div className="report-chart-canvas report-chart-canvas--wide"><ResponsiveContainer width="100%" height="100%"><BarChart data={ranked} layout="vertical" margin={{ top: 8, right: 12, left: 10, bottom: 8 }}><CartesianGrid stroke="#e2e8f0" horizontal={false} /><XAxis type="number" domain={[0, 100]} unit="%" /><YAxis type="category" dataKey="name" width={105} tick={{ fontSize: 11 }} /><Tooltip formatter={(value) => `${value}%`} /><Bar dataKey="rate" name="Lấp đầy" fill="#2563eb" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer></div></section>
    <section className="report-chart-panel"><div className="report-chart-heading"><h2>Tỷ lệ tham dự</h2><p>8 lớp có tỷ lệ cao nhất</p></div><div className="report-chart-canvas report-chart-canvas--wide"><ResponsiveContainer width="100%" height="100%"><BarChart data={attendance.map((item) => ({ ...item, rate: Math.round(item.attendanceRate * 100) }))} layout="vertical" margin={{ top: 8, right: 12, left: 10, bottom: 8 }}><CartesianGrid stroke="#e2e8f0" horizontal={false} /><XAxis type="number" domain={[0, 100]} unit="%" /><YAxis type="category" dataKey="name" width={105} tick={{ fontSize: 11 }} /><Tooltip formatter={(value) => `${value}%`} /><Bar dataKey="rate" name="Tham dự" fill="#84cc16" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer></div></section>
  </div>;
}
