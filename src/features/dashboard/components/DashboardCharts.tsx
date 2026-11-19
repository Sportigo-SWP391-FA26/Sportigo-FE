import { Area, Bar, CartesianGrid, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type TrendPoint = { month: string; revenue: number; registrations: number };

export default function DashboardCharts({ trend, compactMoney }: { trend: TrendPoint[]; compactMoney: Intl.NumberFormat }) {
  return (
    <div className="h-72 w-full" role="img" aria-label="Biểu đồ doanh thu và lượt đăng ký trong sáu tháng">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={trend} margin={{ top: 12, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="dashboardRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity={0.32} />
              <stop offset="100%" stopColor="#2563eb" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 5" vertical={false} stroke="#dfe7f2" />
          <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
          <YAxis yAxisId="revenue" axisLine={false} tickLine={false} width={58} tickFormatter={(value) => compactMoney.format(Number(value))} tick={{ fill: '#64748b', fontSize: 11 }} />
          <YAxis yAxisId="registrations" orientation="right" axisLine={false} tickLine={false} width={32} allowDecimals={false} tick={{ fill: '#64748b', fontSize: 11 }} />
          <Tooltip
            cursor={{ fill: 'rgba(37, 99, 235, .05)' }}
            contentStyle={{ borderRadius: 14, border: '1px solid #dfe7f2', boxShadow: '0 12px 30px rgba(15, 23, 42, .08)' }}
            formatter={(value, name) => name === 'Doanh thu' ? [`${compactMoney.format(Number(value))} ₫`, name] : [Number(value).toLocaleString('vi-VN'), name]}
          />
          <Area yAxisId="revenue" type="monotone" dataKey="revenue" name="Doanh thu" stroke="#2563eb" strokeWidth={3} fill="url(#dashboardRevenue)" />
          <Bar yAxisId="registrations" dataKey="registrations" name="Lượt đăng ký" fill="#84cc16" radius={[5, 5, 0, 0]} barSize={18} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
