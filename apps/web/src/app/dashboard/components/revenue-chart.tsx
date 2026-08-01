'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface RevenueChartProps {
  data: {
    data: Array<{
      date: string;
      revenue: string;
      count: number;
    }>;
    days: number;
  };
  days: 30 | 90;
  onDaysChange: (days: 30 | 90) => void;
}

export function RevenueChart({ data, days, onDaysChange }: RevenueChartProps) {
  const chartData = data.data.map((item) => ({
    date: new Date(item.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
    revenue: Number(item.revenue) / 1e8, // Convert to MBITE
    count: item.count,
  }));

  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold">Revenue</h2>
          <p className="text-sm text-muted-foreground">Last {days} days</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onDaysChange(30)}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              days === 30
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}
          >
            30d
          </button>
          <button
            onClick={() => onDaysChange(90)}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              days === 90
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}
          >
            90d
          </button>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="date"
            stroke="var(--muted-foreground)"
            style={{ fontSize: '12px' }}
          />
          <YAxis stroke="var(--muted-foreground)" style={{ fontSize: '12px' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--background)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
            }}
            formatter={(value: number) => [`${value.toFixed(2)} MBITE`, 'Revenue']}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="var(--primary)"
            strokeWidth={2}
            dot={{ fill: 'var(--primary)', r: 4 }}
            activeDot={{ r: 6 }}
            name="Revenue (MBITE)"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
