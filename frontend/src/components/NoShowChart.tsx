import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { NoShowRow } from "../types";

const barColor = (rate: number) => (rate >= 20 ? "#dc2626" : rate >= 10 ? "#d97706" : "#16a34a");

export default function NoShowChart({ rows }: { rows: NoShowRow[] }) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={rows} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="programArea" tick={{ fontSize: 12 }} interval={0} angle={-15} textAnchor="end" height={60} />
        <YAxis tick={{ fontSize: 12 }} unit="%" />
        <Tooltip formatter={(value: number) => `${value}%`} />
        <Bar dataKey="noShowRate" radius={[4, 4, 0, 0]}>
          {rows.map((row) => (
            <Cell key={row.programArea} fill={barColor(row.noShowRate)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
