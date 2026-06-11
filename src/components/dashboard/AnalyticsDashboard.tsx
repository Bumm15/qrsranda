"use client";

import { useEffect, useState, useCallback } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AnalyticsData {
  total: number;
  scansOverTime: { date: string; count: number }[];
  byCountry: { country: string; count: number }[];
  byDevice: { device: string; count: number }[];
  byBrowser: { browser: string; count: number }[];
}

interface QROption {
  id: string;
  label: string;
}

// ─── Colour palette ───────────────────────────────────────────────────────────

const DEVICE_COLORS: Record<string, string> = {
  mobile: "#6366f1",
  desktop: "#10b981",
  tablet: "#f59e0b",
  Unknown: "#94a3b8",
};

const BROWSER_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
      <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
      <p className="text-sm font-medium">No scan data yet</p>
      <p className="text-xs mt-1">Scans will appear here once people use your QR codes.</p>
    </div>
  );
}

// ─── Breakdown table ──────────────────────────────────────────────────────────

function BreakdownTable({
  title,
  rows,
  labelKey,
}: {
  title: string;
  rows: { label: string; count: number }[];
  labelKey?: string;
}) {
  const total = rows.reduce((s, r) => s + r.count, 0);
  if (rows.length === 0) return null;

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-700/60 p-5">
      <h3 className="text-sm font-semibold text-gray-800 dark:text-zinc-100 mb-3">{title}</h3>
      <ul className="space-y-2">
        {rows.map((row) => {
          const pct = total > 0 ? Math.round((row.count / total) * 100) : 0;
          return (
            <li key={row.label} className="text-sm">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-gray-700 dark:text-zinc-300 capitalize">{row.label}</span>
                <span className="text-gray-500 dark:text-zinc-400 text-xs">{row.count} ({pct}%)</span>
              </div>
              <div className="h-1.5 bg-gray-100 dark:bg-zinc-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AnalyticsDashboard({ qrOptions }: { qrOptions: QROption[] }) {
  const [days, setDays] = useState(30);
  const [qrId, setQrId] = useState<string>("all");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ days: String(days) });
      if (qrId !== "all") params.set("qrId", qrId);
      const res = await fetch(`/api/analytics?${params}`);
      if (res.ok) {
        setData(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }, [days, qrId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const hasData = data && data.total > 0;

  // Format x-axis tick: "May 29"
  function formatTick(dateStr: string) {
    const d = new Date(dateStr + "T00:00:00Z");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  }

  // Decide how many ticks to show based on range
  const tickInterval = days <= 14 ? 0 : days <= 60 ? 6 : 14;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* QR filter */}
        {qrOptions.length > 0 && (
          <select
            value={qrId}
            onChange={(e) => setQrId(e.target.value)}
            className="text-sm border border-gray-300 dark:border-zinc-600 rounded-lg px-3 py-1.5 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All QR codes</option>
            {qrOptions.map((q) => (
              <option key={q.id} value={q.id}>
                {q.label}
              </option>
            ))}
          </select>
        )}

        {/* Day range */}
        <div className="flex rounded-lg border border-gray-300 dark:border-zinc-600 overflow-hidden text-sm">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 ${
                days === d
                  ? "bg-indigo-600 text-white"
                  : "bg-white dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-700"
              } transition-colors`}
            >
              {d}d
            </button>
          ))}
        </div>

        {loading && (
          <span className="text-xs text-gray-400 animate-pulse">Loading…</span>
        )}
      </div>

      {/* Total stat */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-700/60 p-5">
        <p className="text-xs text-gray-500 dark:text-zinc-400 uppercase tracking-wide mb-1">Total Scans</p>
        <p className="text-3xl font-bold text-gray-900 dark:text-zinc-100">{data?.total ?? 0}</p>
        <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1">
          Last {days} day{days !== 1 ? "s" : ""}
          {qrId !== "all" ? " · filtered to one QR code" : ""}
        </p>
      </div>

      {/* Area chart */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-700/60 p-5">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-zinc-100 mb-4">Scans over time</h3>
        {hasData ? (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data.scansOverTime} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="scanGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="date"
                tickFormatter={formatTick}
                interval={tickInterval}
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(v) => [v, "Scans"]}
                labelFormatter={(label) =>
                  typeof label === "string"
                    ? new Date(label + "T00:00:00Z").toLocaleDateString("en-US", {
                        weekday: "short", month: "short", day: "numeric", timeZone: "UTC",
                      })
                    : String(label)
                }
                contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: 12 }}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#6366f1"
                strokeWidth={2}
                fill="url(#scanGradient)"
                dot={false}
                activeDot={{ r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          !loading && <EmptyState />
        )}
      </div>

      {/* Breakdown row */}
      {hasData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Device donut */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-700/60 p-5">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-zinc-100 mb-3">By device</h3>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={data.byDevice}
                  dataKey="count"
                  nameKey="device"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={2}
                >
                  {data.byDevice.map((entry) => (
                    <Cell
                      key={entry.device}
                      fill={DEVICE_COLORS[entry.device.toLowerCase()] ?? "#94a3b8"}
                    />
                  ))}
                </Pie>
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(v: string) => (
                    <span style={{ fontSize: 11, color: "#64748b", textTransform: "capitalize" }}>{v}</span>
                  )}
                />
                <Tooltip
                  formatter={(v) => [v, "Scans"]}
                  contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Country */}
          <BreakdownTable
            title="By country"
            rows={data.byCountry.map((r) => ({ label: r.country, count: r.count }))}
          />

          {/* Browser */}
          <BreakdownTable
            title="By browser"
            rows={data.byBrowser.map((r) => ({ label: r.browser, count: r.count }))}
          />
        </div>
      )}

      {!hasData && !loading && data && (
        <EmptyState />
      )}
    </div>
  );
}
