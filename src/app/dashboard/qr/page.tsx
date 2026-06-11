import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import QrTable from "@/components/dashboard/QrTable";

export const metadata = { title: "My QR Codes — Smart QR" };

export default async function QrListPage() {
  const session = await auth();
  const userId = session!.user.id;

  const qrCodes = await db.qRCode.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { scans: true } } },
  });

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">My QR Codes</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {qrCodes.length} code{qrCodes.length !== 1 ? "s" : ""} total
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

      <QrTable initialItems={qrCodes as Parameters<typeof QrTable>[0]["initialItems"]} />
    </div>
  );
}
