"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export function Bars({
  data,
  xKey,
  yKey,
  label,
  color = "#818cf8",
  height = 280,
}: {
  data: readonly unknown[];
  xKey: string;
  yKey: string;
  label: string;
  color?: string;
  height?: number;
}) {
  return (
    <div role="img" aria-label={`Bar chart: ${label}`}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data as object[]} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgb(140 140 160 / 0.12)" vertical={false} />
          <XAxis
            dataKey={xKey}
            tick={{ fontSize: 11, fill: "currentColor", opacity: 0.6 }}
            tickLine={false}
            axisLine={false}
            interval={0}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "currentColor", opacity: 0.6 }}
            tickLine={false}
            axisLine={false}
            width={48}
            tickFormatter={(v: number) =>
              Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${v}`
            }
          />
          <Tooltip
            cursor={{ fill: "rgb(140 140 160 / 0.08)" }}
            contentStyle={{
              background: "rgb(19 19 25)",
              border: "1px solid rgb(140 140 160 / 0.25)",
              borderRadius: 10,
              fontSize: 12,
              color: "white",
              boxShadow: "0 8px 24px rgb(0 0 0 / 0.35)",
            }}
          />
          <Bar dataKey={yKey} name={label} fill={color} radius={[6, 6, 0, 0]} maxBarSize={56} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
