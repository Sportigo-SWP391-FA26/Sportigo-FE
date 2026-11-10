import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ClassReportRow, Revenue } from '../api';

const palette = ['#2563eb', '#38bdf8', '#84cc16', '#f97316'];
const currency = (value: number) => `${value.toLocaleString('vi-VN')} ₫`;
const channelName: Record<string, string> = { ONLINE: 'VNPay', COUNTER: 'Tại quầy', WALLET: 'Ví Sportigo' };
const serviceName: Record<string, string> = { GROUP_CLASS: 'Lớp nhóm', PRIVATE_COURSE: 'Khóa 1–1', MEMBERSHIP: 'Gói membership' };

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
