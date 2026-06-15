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
  color = "#6366f1",
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
        <BarChart data={data as object[]} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgb(120 120 120 / 0.15)" />
          <XAxis dataKey={xKey} tick={{ fontSize: 11 }} stroke="currentColor" />
          <YAxis tick={{ fontSize: 11 }} stroke="currentColor" />
          <Tooltip
            cursor={{ fill: "rgb(120 120 120 / 0.1)" }}
            contentStyle={{
              background: "rgb(20 20 24)",
              border: "1px solid rgb(120 120 120 / 0.3)",
              borderRadius: 8,
              fontSize: 12,
              color: "white",
            }}
          />
          <Bar dataKey={yKey} name={label} fill={color} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
