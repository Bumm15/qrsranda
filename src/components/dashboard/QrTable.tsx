"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { QRCodeCanvas } from "qrcode.react";

interface QRItem {
  id: string;
  type: string;
  qrSubtype: string;
  name: string | null;
  targetUrl: string | null;
  wifiSsid: string | null;
  shortCode: string | null;
  foregroundColor: string;
  backgroundColor: string;
  createdAt: string;
  _count: { scans: number };
}

export default function QrTable({ initialItems }: { initialItems: QRItem[] }) {
  const router = useRouter();
  const [items, setItems] = useState<QRItem[]>(initialItems);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("Delete this QR code? This cannot be undone.")) return;
    setDeleting(id);
    const res = await fetch(`/api/qr/${id}`, { method: "DELETE" });
    if (res.ok) {
      setItems((prev) => prev.filter((q) => q.id !== id));
    }
    setDeleting(null);
  }

  function handleDownload(qr: QRItem) {
    // Render an off-screen canvas via a hidden container, then download
    const content = qrContent(qr);
    if (!content) return;

    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 400;

    // Use the qrcode library directly to draw to a real canvas
    import("qrcode").then((QRCode) => {
      QRCode.toCanvas(canvas, content, {
        width: 400,
        margin: 2,
        color: { dark: qr.foregroundColor, light: qr.backgroundColor },
        errorCorrectionLevel: "H",
      }).then(() => {
        const link = document.createElement("a");
        link.download = `qr-${qr.id.slice(0, 8)}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
      });
    });
  }

  function qrContent(qr: QRItem): string {
    if (qr.type === "SMART" && qr.shortCode) {
      return `${window.location.origin}/r/${qr.shortCode}`;
    }
    return qr.targetUrl ?? qr.wifiSsid ?? "";
  }

  function label(qr: QRItem) {
    if (qr.name) return qr.name;
    if (qr.type === "SMART") return qr.targetUrl ?? "—";
    if (qr.qrSubtype === "WIFI") return `WiFi: ${qr.wifiSsid ?? "—"}`;
    return qr.targetUrl ?? "—";
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-200 dark:border-zinc-700 py-16 flex flex-col items-center gap-3 text-center">
        <p className="text-zinc-400 text-sm">No QR codes yet.</p>
        <Link
          href="/dashboard/qr/new"
          className="text-sm font-medium text-zinc-900 dark:text-zinc-100 underline underline-offset-2"
        >
          Create your first QR →
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-x-auto">
      <table className="w-full text-sm min-w-160">
        <thead className="bg-zinc-50 dark:bg-zinc-800/50">
          <tr>
            <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 w-10">Preview</th>
            <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Type</th>
            <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Target</th>
            <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Scans</th>
            <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Created</th>
            <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {items.map((qr) => {
            const content = qrContent(qr);
            return (
              <tr key={qr.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                {/* Mini QR preview */}
                <td className="px-4 py-3">
                  {content ? (
                    <div className="rounded-md overflow-hidden w-10 h-10 shrink-0 border border-zinc-100 dark:border-zinc-700">
                      <QRCodeCanvas
                        value={content}
                        size={40}
                        bgColor={qr.backgroundColor}
                        fgColor={qr.foregroundColor}
                        level="M"
                      />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-md bg-zinc-100 dark:bg-zinc-800" />
                  )}
                </td>

                {/* Type badge */}
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold w-fit ${
                      qr.type === "SMART"
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                        : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                    }`}>
                      {qr.type === "SMART" ? "Smart" : qr.qrSubtype}
                    </span>
                    {qr.shortCode && (
                      <span className="text-xs text-zinc-400 font-mono">/r/{qr.shortCode}</span>
                    )}
                  </div>
                </td>

                {/* Target */}
                <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300 max-w-xs">
                  <div className="flex flex-col gap-0.5">
                    <span className={`truncate block max-w-65 ${qr.name ? "font-medium text-zinc-900 dark:text-zinc-100" : ""}`} title={label(qr)}>
                      {label(qr)}
                    </span>
                    {qr.name && qr.targetUrl && (
                      <span className="truncate block max-w-65 text-xs text-zinc-400 dark:text-zinc-500" title={qr.targetUrl}>
                        {qr.targetUrl}
                      </span>
                    )}
                  </div>
                </td>

                {/* Scans */}
                <td className="px-4 py-3 text-right tabular-nums font-medium text-zinc-700 dark:text-zinc-300">
                  {qr._count.scans}
                </td>

                {/* Date */}
                <td className="px-4 py-3 text-right text-zinc-400 tabular-nums whitespace-nowrap text-xs">
                  {new Date(qr.createdAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </td>

                {/* Actions */}
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    {/* Download */}
                    <button
                      onClick={() => handleDownload(qr)}
                      title="Download PNG"
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 dark:hover:text-zinc-200 dark:hover:bg-zinc-800 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </button>

                    {/* Edit */}
                    <Link
                      href={`/dashboard/qr/${qr.id}`}
                      title="Edit"
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 dark:hover:text-zinc-200 dark:hover:bg-zinc-800 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </Link>

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(qr.id)}
                      disabled={deleting === qr.id}
                      title="Delete"
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-40 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
