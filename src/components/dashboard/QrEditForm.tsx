"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { QRCodeCanvas } from "qrcode.react";
import Link from "next/link";

// ─── Types ───────────────────────────────────────────────────────────────────

interface HistoryEntry {
  id: string;
  targetUrl: string;
  changedAt: string;
}

interface ABTestData {
  id: string;
  variantAUrl: string;
  variantBUrl: string;
  splitPercent: number;
  scanCountA: number;
  scanCountB: number;
  active: boolean;
}

interface QRDetail {
  id: string;
  type: string;
  qrSubtype: string;
  name: string | null;
  targetUrl: string | null;
  shortCode: string | null;
  wifiSsid: string | null;
  wifiPassword: string | null;
  wifiEncryption: string | null;
  vcardData: string | null;
  foregroundColor: string;
  backgroundColor: string;
  logoUrl: string | null;
  createdAt: string;
  updatedAt: string;
  history: HistoryEntry[];
  abTest: ABTestData | null;
  _count: { scans: number };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function qrPreviewContent(qr: QRDetail, appUrl: string): string {
  if (qr.type === "SMART" && qr.shortCode) {
    return `${appUrl}/r/${qr.shortCode}`;
  }
  return qr.targetUrl ?? "";
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

// ─── Static detail card ──────────────────────────────────────────────────────

const inputCls =
  "w-full border border-zinc-300 dark:border-zinc-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500";

function StaticDetail({ qr }: { qr: QRDetail }) {
  if (qr.qrSubtype === "WIFI") {
    return (
      <div className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
        <Row label="SSID" value={qr.wifiSsid ?? "—"} />
        <Row label="Encryption" value={qr.wifiEncryption ?? "WPA"} />
        <Row label="Password" value={qr.wifiPassword ? "••••••••" : "None"} />
      </div>
    );
  }
  if (qr.qrSubtype === "VCARD") {
    let vcardParsed: Record<string, string> = {};
    try {
      vcardParsed = JSON.parse(qr.vcardData ?? "{}");
    } catch {
      /* ignore */
    }
    return (
      <div className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
        {Object.entries(vcardParsed).map(([k, v]) => (
          <Row key={k} label={k} value={v} />
        ))}
      </div>
    );
  }
  // URL
  return (
    <div className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
      <Row label="URL" value={qr.targetUrl ?? "—"} />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="w-28 shrink-0 font-medium text-zinc-500 dark:text-zinc-400 capitalize">{label}</span>
      <span className="break-all text-zinc-800 dark:text-zinc-200">{value}</span>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function QrEditForm({
  qr,
  appUrl,
}: {
  qr: QRDetail;
  appUrl: string;
}) {
  const router = useRouter();
  const isSmart = qr.type === "SMART";

  // ── Name state ────────────────────────────────────────────────────────────
  const [name, setName] = useState(qr.name ?? "");
  const [nameSaving, setNameSaving] = useState(false);
  const [nameError, setNameError] = useState("");
  const [nameSuccess, setNameSuccess] = useState(false);

  async function handleSaveName() {
    setNameSaving(true);
    setNameError("");
    setNameSuccess(false);
    try {
      const res = await fetch(`/api/qr/${qr.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() || null }),
      });
      if (!res.ok) {
        const d = await res.json();
        setNameError(d.error ?? "Failed to save name");
      } else {
        setNameSuccess(true);
        router.refresh();
      }
    } catch {
      setNameError("Network error");
    } finally {
      setNameSaving(false);
    }
  }

  // ── Smart QR redirect state ───────────────────────────────────────────────
  const [targetUrl, setTargetUrl] = useState(qr.targetUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>(qr.history);
  const [currentTarget, setCurrentTarget] = useState(qr.targetUrl ?? "");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!targetUrl.trim()) return;
    setSaving(true);
    setSaveError("");
    setSaveSuccess(false);
    try {
      const res = await fetch(`/api/qr/${qr.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUrl: targetUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveError(data.error ?? "Failed to save");
      } else {
        setCurrentTarget(data.targetUrl);
        setHistory([
          { id: data.updatedAt, targetUrl: data.targetUrl, changedAt: data.updatedAt },
          ...history,
        ]);
        setSaveSuccess(true);
        router.refresh();
      }
    } catch {
      setSaveError("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function handleRevert(entry: HistoryEntry) {
    if (!confirm(`Revert redirect to:\n${entry.targetUrl}\n\nThis will save a new history entry.`)) return;
    setSaving(true);
    setSaveError("");
    setSaveSuccess(false);
    try {
      const res = await fetch(`/api/qr/${qr.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUrl: entry.targetUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveError(data.error ?? "Failed to revert");
      } else {
        setTargetUrl(data.targetUrl);
        setCurrentTarget(data.targetUrl);
        setHistory([
          { id: data.updatedAt, targetUrl: data.targetUrl, changedAt: data.updatedAt },
          ...history,
        ]);
        setSaveSuccess(true);
        router.refresh();
      }
    } catch {
      setSaveError("Network error");
    } finally {
      setSaving(false);
    }
  }

  // ── A/B test state ────────────────────────────────────────────────────────
  const [abTest, setAbTest] = useState<ABTestData | null>(qr.abTest ?? null);
  const [abBUrl, setAbBUrl] = useState(qr.abTest?.variantBUrl ?? "");
  const [abSplit, setAbSplit] = useState(qr.abTest?.splitPercent ?? 50);
  const [abSaving, setAbSaving] = useState(false);
  const [abError, setAbError] = useState("");
  const [showAbForm, setShowAbForm] = useState(false);

  async function handleCreateAbTest(e: React.FormEvent) {
    e.preventDefault();
    setAbSaving(true);
    setAbError("");
    try {
      const res = await fetch(`/api/qr/${qr.id}/abtest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantBUrl: abBUrl.trim(), splitPercent: abSplit }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAbError(data.error ?? "Failed to create A/B test");
      } else {
        setAbTest({
          ...data,
          variantAUrl: currentTarget || qr.targetUrl || "",
        });
        setShowAbForm(false);
      }
    } catch {
      setAbError("Network error");
    } finally {
      setAbSaving(false);
    }
  }

  async function handleToggleAbActive() {
    if (!abTest) return;
    setAbSaving(true);
    try {
      const res = await fetch(`/api/qr/${qr.id}/abtest`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !abTest.active }),
      });
      const data = await res.json();
      if (res.ok) setAbTest({ ...abTest, active: data.active });
    } catch { /* ignore */ } finally {
      setAbSaving(false);
    }
  }

  async function handleDeleteAbTest() {
    if (!confirm("Delete this A/B test? All split data will be lost.")) return;
    setAbSaving(true);
    try {
      const res = await fetch(`/api/qr/${qr.id}/abtest`, { method: "DELETE" });
      if (res.ok) {
        setAbTest(null);
        setAbBUrl("");
        setAbSplit(50);
        setShowAbForm(false);
      }
    } catch { /* ignore */ } finally {
      setAbSaving(false);
    }
  }

  // ── Download QR ───────────────────────────────────────────────────────────
  function handleDownload() {
    const canvas = document.getElementById("qr-detail-canvas") as HTMLCanvasElement | null;
    if (!canvas) return;
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `qr-${qr.shortCode ?? qr.id}.png`;
    link.click();
  }

  const previewContent = isSmart
    ? `${appUrl}/r/${qr.shortCode}`
    : qr.targetUrl ?? "";

  // A/B scan totals
  const totalAbScans = (abTest?.scanCountA ?? 0) + (abTest?.scanCountB ?? 0);
  const pctA = totalAbScans > 0 ? Math.round(((abTest?.scanCountA ?? 0) / totalAbScans) * 100) : 50;
  const pctB = 100 - pctA;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/qr"
          className="p-2 rounded-lg text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
          title="Back to QR list"
        >
          ←
        </Link>
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            {qr.name ? qr.name : (isSmart ? "Edit Smart QR" : "Static QR Details")}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {isSmart
              ? `Short code: /r/${qr.shortCode}`
              : `Type: ${qr.qrSubtype}`}{" "}
            · {qr._count.scans} scan{qr._count.scans !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Name field — shown for all types */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6">
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Display name <span className="font-normal text-zinc-400">(optional)</span>
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setNameSuccess(false); }}
            placeholder="e.g. Homepage Link, Office WiFi…"
            maxLength={100}
            className={inputCls}
          />
          <button
            onClick={handleSaveName}
            disabled={nameSaving || name.trim() === (qr.name ?? "")}
            className="shrink-0 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {nameSaving ? "…" : "Save"}
          </button>
        </div>
        {nameError && <p className="text-xs text-red-600 mt-1">{nameError}</p>}
        {nameSuccess && <p className="text-xs text-green-600 mt-1">Name saved!</p>}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left — QR preview */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 flex flex-col items-center gap-4">
          <QRCodeCanvas
            id="qr-detail-canvas"
            value={previewContent || " "}
            size={200}
            fgColor={qr.foregroundColor}
            bgColor={qr.backgroundColor}
            level="M"
            includeMargin
          />
          <button
            onClick={handleDownload}
            className="text-sm px-4 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors"
          >
            Download PNG
          </button>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 text-center break-all">{previewContent}</p>
        </div>

        {/* Right — Edit / Details */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-4">
          {isSmart ? (
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Redirect URL
                </label>
                <input
                  type="url"
                  value={targetUrl}
                  onChange={(e) => { setTargetUrl(e.target.value); setSaveSuccess(false); }}
                  placeholder="https://example.com"
                  required
                  className={inputCls}
                />
              </div>
              {saveError && <p className="text-sm text-red-600">{saveError}</p>}
              {saveSuccess && <p className="text-sm text-green-600">Saved successfully!</p>}
              <button
                type="submit"
                disabled={saving || targetUrl.trim() === currentTarget}
                className="w-full py-2 px-4 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? "Saving…" : "Save Changes"}
              </button>
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 text-xs text-zinc-400 dark:text-zinc-500 space-y-1">
                <p>Created: {formatDate(qr.createdAt)}</p>
                <p>Updated: {formatDate(qr.updatedAt)}</p>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <StaticDetail qr={qr} />
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 text-xs text-zinc-400 dark:text-zinc-500 space-y-1">
                <p>Created: {formatDate(qr.createdAt)}</p>
                <p>Scans: {qr._count.scans}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* A/B Test section — Smart QR only */}
      {isSmart && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">A/B Test</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Split traffic between two destination URLs
              </p>
            </div>
            {abTest && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                abTest.active
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
              }`}>
                {abTest.active ? "● Active" : "○ Paused"}
              </span>
            )}
          </div>

          {abTest ? (
            // ── Existing A/B test ──────────────────────────────────────────
            <div className="space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-zinc-100 dark:border-zinc-700 p-3 space-y-1">
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Variant A</p>
                  <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
                    {abTest.scanCountA}
                    <span className="text-sm font-normal text-zinc-400 ml-1">scans</span>
                  </p>
                  <p className="text-xs text-zinc-400 break-all line-clamp-2" title={abTest.variantAUrl}>
                    {abTest.variantAUrl}
                  </p>
                </div>
                <div className="rounded-xl border border-zinc-100 dark:border-zinc-700 p-3 space-y-1">
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Variant B</p>
                  <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
                    {abTest.scanCountB}
                    <span className="text-sm font-normal text-zinc-400 ml-1">scans</span>
                  </p>
                  <p className="text-xs text-zinc-400 break-all line-clamp-2" title={abTest.variantBUrl}>
                    {abTest.variantBUrl}
                  </p>
                </div>
              </div>

              {/* Split bar */}
              <div>
                <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                  <span>A: {totalAbScans > 0 ? pctA : abTest.splitPercent}%</span>
                  <span>B: {totalAbScans > 0 ? pctB : 100 - abTest.splitPercent}%</span>
                </div>
                <div className="flex h-2 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-700">
                  <div
                    className="bg-indigo-500 transition-all"
                    style={{ width: `${totalAbScans > 0 ? pctA : abTest.splitPercent}%` }}
                  />
                  <div className="flex-1 bg-amber-400" />
                </div>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                  Configured split: {abTest.splitPercent}% A / {100 - abTest.splitPercent}% B
                  {totalAbScans > 0 && ` · ${totalAbScans} total scans`}
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleToggleAbActive}
                  disabled={abSaving}
                  className="flex-1 py-2 px-3 rounded-lg border border-zinc-300 dark:border-zinc-600 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 transition-colors"
                >
                  {abTest.active ? "Pause" : "Resume"}
                </button>
                <button
                  onClick={() => { setAbBUrl(abTest.variantBUrl); setAbSplit(abTest.splitPercent); setShowAbForm(true); }}
                  className="flex-1 py-2 px-3 rounded-lg border border-zinc-300 dark:border-zinc-600 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  Edit / Reset
                </button>
                <button
                  onClick={handleDeleteAbTest}
                  disabled={abSaving}
                  className="py-2 px-3 rounded-lg border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-50 transition-colors"
                >
                  Delete
                </button>
              </div>

              {/* Edit form (shown when Edit/Reset clicked) */}
              {showAbForm && (
                <form onSubmit={handleCreateAbTest} className="space-y-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    Updating will reset scan counters to zero.
                  </p>
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Variant B URL</label>
                    <input
                      type="url"
                      value={abBUrl}
                      onChange={(e) => setAbBUrl(e.target.value)}
                      placeholder="https://example.com/variant-b"
                      required
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                      Traffic to Variant A: {abSplit}%
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={99}
                      value={abSplit}
                      onChange={(e) => setAbSplit(Number(e.target.value))}
                      className="w-full accent-indigo-500"
                    />
                    <div className="flex justify-between text-xs text-zinc-400 mt-0.5">
                      <span>1% A / 99% B</span>
                      <span>50/50</span>
                      <span>99% A / 1% B</span>
                    </div>
                  </div>
                  {abError && <p className="text-xs text-red-600">{abError}</p>}
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={abSaving || !abBUrl.trim()}
                      className="flex-1 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                    >
                      {abSaving ? "Saving…" : "Update A/B Test"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAbForm(false)}
                      className="py-2 px-4 rounded-lg border border-zinc-300 dark:border-zinc-600 text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : showAbForm ? (
            // ── Create A/B test form ───────────────────────────────────────
            <form onSubmit={handleCreateAbTest} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Variant A URL <span className="text-zinc-400">(current redirect)</span>
                </label>
                <p className="text-sm text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 break-all">
                  {currentTarget || qr.targetUrl || "—"}
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Variant B URL</label>
                <input
                  type="url"
                  value={abBUrl}
                  onChange={(e) => setAbBUrl(e.target.value)}
                  placeholder="https://example.com/variant-b"
                  required
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Traffic to Variant A: {abSplit}%
                </label>
                <input
                  type="range"
                  min={1}
                  max={99}
                  value={abSplit}
                  onChange={(e) => setAbSplit(Number(e.target.value))}
                  className="w-full accent-indigo-500"
                />
                <div className="flex justify-between text-xs text-zinc-400 mt-0.5">
                  <span>1% A / 99% B</span>
                  <span>50/50</span>
                  <span>99% A / 1% B</span>
                </div>
              </div>
              {abError && <p className="text-xs text-red-600">{abError}</p>}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={abSaving || !abBUrl.trim() || !currentTarget}
                  className="flex-1 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {abSaving ? "Creating…" : "Create A/B Test"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAbForm(false)}
                  className="py-2 px-4 rounded-lg border border-zinc-300 dark:border-zinc-600 text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            // ── No test yet ────────────────────────────────────────────────
            <div className="text-center py-4">
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-3">
                No A/B test configured yet. Split traffic between two URLs to compare performance.
              </p>
              <button
                onClick={() => setShowAbForm(true)}
                disabled={!currentTarget && !qr.targetUrl}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                Set up A/B Test
              </button>
              {!currentTarget && !qr.targetUrl && (
                <p className="text-xs text-zinc-400 mt-2">Set a redirect URL first.</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* History timeline — Smart QR only */}
      {isSmart && history.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6">
          <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 mb-4">Redirect History</h2>
          <ol className="relative border-l border-zinc-200 dark:border-zinc-700 space-y-6">
            {history.map((entry, idx) => {
              const isCurrent = idx === 0;
              return (
                <li key={entry.id} className="ml-4">
                  <span
                    className={`absolute -left-1.5 mt-1 h-3 w-3 rounded-full border-2 border-white dark:border-zinc-900 ${
                      isCurrent ? "bg-indigo-500" : "bg-zinc-300 dark:bg-zinc-600"
                    }`}
                  />
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className={`text-sm break-all ${isCurrent ? "font-semibold text-zinc-900 dark:text-zinc-100" : "text-zinc-600 dark:text-zinc-400"}`}>
                        {entry.targetUrl}
                      </p>
                      <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                        {formatDate(entry.changedAt)}
                        {isCurrent && <span className="ml-2 text-indigo-500 font-medium">current</span>}
                      </p>
                    </div>
                    {!isCurrent && (
                      <button
                        onClick={() => handleRevert(entry)}
                        disabled={saving}
                        className="shrink-0 text-xs px-3 py-1 rounded-lg border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 disabled:opacity-50 transition-colors"
                      >
                        Revert
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}
