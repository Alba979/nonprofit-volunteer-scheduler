import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { RetentionSeries } from "../types";

const COLORS = ["#2563eb", "#16a34a", "#d97706", "#dc2626", "#7c3aed"];

export default function RetentionChart({ series }: { series: RetentionSeries[] }) {
  if (series.length === 0) return null;
  const months = series[0].monthly.map((m) => m.month);
  const merged = months.map((month, i) => {
    const row: Record<string, string | number> = { month };
    series.forEach((s) => {
      row[s.programArea] = s.monthly[i]?.retentionRate ?? 0;
    });
    return row;
  });

  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={merged} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} unit="%" />
        <Tooltip formatter={(value: number) => `${value}%`} />
        <Legend />
        {series.map((s, i) => (
          <Line
            key={s.programArea}
            type="monotone"
            dataKey={s.programArea}
            stroke={COLORS[i % COLORS.length]}
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
