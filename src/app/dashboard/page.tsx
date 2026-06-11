import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import ScanSparkline from "@/components/dashboard/ScanSparkline";

export const metadata = {
  title: "Dashboard — Smart QR",
};

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user.id;

  // Load overview stats in parallel
  const [totalQr, totalScans, smartQrCount] = await Promise.all([
    db.qRCode.count({ where: { userId } }),
    db.scan.count({
      where: { qrCode: { userId } },
    }),
    db.qRCode.count({ where: { userId, type: "SMART" } }),
  ]);

  // Recent 5 QR codes
  const recentQr = await db.qRCode.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { _count: { select: { scans: true } } },
  });

  const stats = [
    {
      label: "Total QR Codes",
      value: totalQr,
      href: "/dashboard/qr",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
        </svg>
      ),
    },
    {
      label: "Total Scans",
      value: totalScans,
      href: "/dashboard/analytics",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      label: "Smart QR Slots",
      value: smartQrCount,
      href: "/dashboard/qr",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-8 w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Welcome back{session?.user?.name ? `, ${session.user.name.split(" ")[0]}` : ""}
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Here&apos;s an overview of your QR codes and scans.
          </p>
        </div>
        <Link
          href="/dashboard/qr/new"
          className="flex items-center gap-2 rounded-lg bg-black text-white px-4 py-2.5 text-sm font-medium hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-100 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New QR
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-5 hover:shadow-sm transition-shadow dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 shrink-0">
              {s.icon}
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{s.value}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{s.label}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Sparkline + Quick actions row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <ScanSparkline />
        </div>
        {/* Quick actions */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 flex flex-col gap-3">
          <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Quick actions</p>
          <Link
            href="/dashboard/qr/new"
            className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors group"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 group-hover:border-indigo-300 transition-colors shrink-0">
              <svg className="w-4 h-4 text-zinc-600 dark:text-zinc-300" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            </span>
            <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Create new QR</span>
          </Link>
          <Link
            href="/dashboard/analytics"
            className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors group"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 group-hover:border-indigo-300 transition-colors shrink-0">
              <svg className="w-4 h-4 text-zinc-600 dark:text-zinc-300" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            </span>
            <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">View analytics</span>
          </Link>
          <Link
            href="/dashboard/qr"
            className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors group"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 group-hover:border-indigo-300 transition-colors shrink-0">
              <svg className="w-4 h-4 text-zinc-600 dark:text-zinc-300" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
            </span>
            <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Manage QR codes</span>
          </Link>
        </div>
      </div>

      {/* Recent QR codes */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Recent QR Codes
          </h2>
          <Link
            href="/dashboard/qr"
            className="text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            View all →
          </Link>
        </div>

        {recentQr.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-200 dark:border-zinc-700 py-12 flex flex-col items-center gap-3 text-center">
            <p className="text-zinc-400 text-sm">No QR codes yet.</p>
            <Link
              href="/dashboard/qr/new"
              className="text-sm font-medium text-zinc-900 dark:text-zinc-100 underline underline-offset-2"
            >
              Create your first QR →
            </Link>
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Target</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Scans</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {recentQr.map((qr) => (
                  <tr
                    key={qr.id}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                          qr.type === "SMART"
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                            : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                        }`}
                      >
                        {qr.type === "SMART" ? "Smart" : qr.qrSubtype}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300 max-w-52 truncate">
                      {qr.targetUrl ?? qr.wifiSsid ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                      {qr._count.scans}
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-400 tabular-nums whitespace-nowrap">
                      {new Date(qr.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
