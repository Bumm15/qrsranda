"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface DayData {
  date: string;
  count: number;
}

export default function ScanSparkline() {
  const [data, setData] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics?days=7")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) setData(d.scansOverTime);
      })
      .finally(() => setLoading(false));
  }, []);

  const total = data.reduce((s, d) => s + d.count, 0);
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  function formatDay(dateStr: string) {
    const d = new Date(dateStr + "T00:00:00Z");
    return d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Scans — last 7 days</p>
          {loading ? (
            <div className="h-8 w-16 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse mt-1" />
          ) : (
            <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">{total}</p>
          )}
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
      </div>

      {!loading && data.length > 0 && (
        <ResponsiveContainer width="100%" height={64}>
          <BarChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }} barSize={14}>
            <XAxis
              dataKey="date"
              tickFormatter={formatDay}
              tick={{ fontSize: 10, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: "rgba(99,102,241,0.08)" }}
              formatter={(v) => [v, "Scans"]}
              labelFormatter={(l) =>
                typeof l === "string"
                  ? new Date(l + "T00:00:00Z").toLocaleDateString("en-US", {
                      weekday: "long", month: "short", day: "numeric", timeZone: "UTC",
                    })
                  : String(l)
              }
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                fontSize: 12,
                padding: "4px 10px",
              }}
            />
            <Bar dataKey="count" radius={[3, 3, 0, 0]}>
              {data.map((entry) => (
                <Cell
                  key={entry.date}
                  fill={entry.count === maxCount ? "#6366f1" : "#c7d2fe"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}

      {!loading && total === 0 && (
        <p className="text-xs text-zinc-400 text-center py-4">No scans in the last 7 days</p>
      )}
    </div>
  );
}
