"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export interface SeriesConfig {
  key: string;
  label: string;
  color: string;
}

export function TimeSeries({
  data,
  series,
  height = 280,
}: {
  data: readonly unknown[];
  series: SeriesConfig[];
  height?: number;
}) {
  return (
    <div role="img" aria-label={`Time series: ${series.map((s) => s.label).join(", ")}`}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data as object[]} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgb(120 120 120 / 0.15)" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="currentColor" />
          <YAxis tick={{ fontSize: 11 }} stroke="currentColor" />
          <Tooltip
            contentStyle={{
              background: "rgb(20 20 24)",
              border: "1px solid rgb(120 120 120 / 0.3)",
              borderRadius: 8,
              fontSize: 12,
              color: "white",
            }}
          />
          {series.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
