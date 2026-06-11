"use client";

import { useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Subtype = "URL" | "WIFI" | "VCARD";

interface WiFiFields {
  ssid: string;
  password: string;
  encryption: "WPA" | "WEP" | "nopass";
}

interface VCardFields {
  firstName: string;
  lastName: string;
  organization: string;
  title: string;
  email: string;
  phone: string;
  website: string;
  address: string;
}

// ---------------------------------------------------------------------------
// Pure content builders (no Node.js deps — safe for client bundle)
// ---------------------------------------------------------------------------

function buildWifiContent(ssid: string, password: string, enc: string): string {
  const e = (s: string) =>
    s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,");
  return `WIFI:T:${enc};S:${e(ssid)};P:${e(password)};;`;
}

function buildVCardContent(d: VCardFields): string {
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${d.lastName};${d.firstName};;;`,
    `FN:${d.firstName} ${d.lastName}`.trim(),
  ];
  if (d.organization) lines.push(`ORG:${d.organization}`);
  if (d.title) lines.push(`TITLE:${d.title}`);
  if (d.email) lines.push(`EMAIL:${d.email}`);
  if (d.phone) lines.push(`TEL:${d.phone}`);
  if (d.website) lines.push(`URL:${d.website}`);
  if (d.address) lines.push(`ADR:;;${d.address};;;;`);
  lines.push("END:VCARD");
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Shared style
// ---------------------------------------------------------------------------

const inputCls =
  "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-white";

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
        {label}
      </span>
      {children}
    </label>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
        {label}
      </span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-9 cursor-pointer rounded-lg border border-zinc-200 p-0.5 dark:border-zinc-700"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => {
            if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value))
              onChange(e.target.value);
          }}
          className="w-24 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm font-mono outline-none focus:ring-2 focus:ring-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-white"
          maxLength={7}
        />
      </div>
    </label>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function QrGeneratorForm({ userId }: { userId?: string }) {
  const [subtype, setSubtype] = useState<Subtype>("URL");
  const [urlValue, setUrlValue] = useState("https://");
  const [wifi, setWifi] = useState<WiFiFields>({
    ssid: "",
    password: "",
    encryption: "WPA",
  });
  const [vcard, setVcard] = useState<VCardFields>({
    firstName: "",
    lastName: "",
    organization: "",
    title: "",
    email: "",
    phone: "",
    website: "",
    address: "",
  });

  const [fgColor, setFgColor] = useState("#000000");
  const [bgColor, setBgColor] = useState("#ffffff");

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoObjectUrl, setLogoObjectUrl] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [qrName, setQrName] = useState("");

  const wrapperRef = useRef<HTMLDivElement>(null);

  // Derive the QR content string
  let qrContent = "";
  if (subtype === "URL") {
    qrContent = urlValue.trim();
  } else if (subtype === "WIFI") {
    qrContent = wifi.ssid
      ? buildWifiContent(wifi.ssid, wifi.password, wifi.encryption)
      : "";
  } else {
    qrContent =
      vcard.firstName || vcard.lastName ? buildVCardContent(vcard) : "";
  }

  const hasContent = qrContent.length > 3;

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (logoObjectUrl) URL.revokeObjectURL(logoObjectUrl);
    setLogoFile(file);
    setLogoObjectUrl(file ? URL.createObjectURL(file) : null);
  }

  function handleRemoveLogo() {
    if (logoObjectUrl) URL.revokeObjectURL(logoObjectUrl);
    setLogoFile(null);
    setLogoObjectUrl(null);
  }

  function handleDownload() {
    const canvas = wrapperRef.current?.querySelector("canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "qrcode.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  async function handleSave() {
    if (!userId) return;
    setSaving(true);
    setError(null);
    setSavedId(null);

    try {
      let uploadedLogoUrl: string | undefined;

      if (logoFile) {
        const fd = new FormData();
        fd.append("file", logoFile);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        if (!res.ok) {
          const d = await res.json();
          setError(d.error ?? "Logo upload failed");
          return;
        }
        uploadedLogoUrl = (await res.json()).url;
      }

      const body: Record<string, unknown> = {
        subtype,
        foregroundColor: fgColor,
        backgroundColor: bgColor,
        ...(uploadedLogoUrl ? { logoUrl: uploadedLogoUrl } : {}),
        ...(qrName.trim() ? { name: qrName.trim() } : {}),
      };

      if (subtype === "URL") {
        body.url = urlValue.trim();
      } else if (subtype === "WIFI") {
        body.ssid = wifi.ssid;
        body.password = wifi.password;
        body.encryption = wifi.encryption;
      } else {
        Object.assign(body, vcard);
      }

      const res = await fetch("/api/qr/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to save QR code");
        return;
      }

      setSavedId(data.id ?? null);
    } catch {
      setError("Unexpected error — please try again");
    } finally {
      setSaving(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const TABS: { label: string; value: Subtype }[] = [
    { label: "URL", value: "URL" },
    { label: "WiFi", value: "WIFI" },
    { label: "vCard", value: "VCARD" },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl mx-auto py-8 px-4">
      {/* ── Left column: form ── */}
      <div className="flex flex-col gap-6">
        {/* Subtype tabs */}
        <div className="flex gap-2">
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => {
                setSubtype(t.value);
                setError(null);
                setSavedId(null);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                subtype === t.value
                  ? "bg-black text-white dark:bg-white dark:text-black"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* URL fields */}
        {subtype === "URL" && (
          <Field label="URL">
            <input
              type="url"
              value={urlValue}
              onChange={(e) => setUrlValue(e.target.value)}
              placeholder="https://example.com"
              className={inputCls}
            />
          </Field>
        )}

        {/* WiFi fields */}
        {subtype === "WIFI" && (
          <div className="flex flex-col gap-3">
            <Field label="Network name (SSID)">
              <input
                type="text"
                value={wifi.ssid}
                onChange={(e) =>
                  setWifi((w) => ({ ...w, ssid: e.target.value }))
                }
                placeholder="My Wi-Fi"
                className={inputCls}
              />
            </Field>
            <Field label="Password">
              <input
                type="password"
                value={wifi.password}
                onChange={(e) =>
                  setWifi((w) => ({ ...w, password: e.target.value }))
                }
                placeholder="••••••••"
                className={inputCls}
              />
            </Field>
            <Field label="Encryption">
              <select
                value={wifi.encryption}
                onChange={(e) =>
                  setWifi((w) => ({
                    ...w,
                    encryption: e.target.value as WiFiFields["encryption"],
                  }))
                }
                className={inputCls}
              >
                <option value="WPA">WPA / WPA2</option>
                <option value="WEP">WEP</option>
                <option value="nopass">None (open network)</option>
              </select>
            </Field>
          </div>
        )}

        {/* vCard fields */}
        {subtype === "VCARD" && (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="First name *">
                <input
                  type="text"
                  value={vcard.firstName}
                  onChange={(e) =>
                    setVcard((v) => ({ ...v, firstName: e.target.value }))
                  }
                  className={inputCls}
                />
              </Field>
              <Field label="Last name *">
                <input
                  type="text"
                  value={vcard.lastName}
                  onChange={(e) =>
                    setVcard((v) => ({ ...v, lastName: e.target.value }))
                  }
                  className={inputCls}
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Organisation">
                <input
                  type="text"
                  value={vcard.organization}
                  onChange={(e) =>
                    setVcard((v) => ({ ...v, organization: e.target.value }))
                  }
                  className={inputCls}
                />
              </Field>
              <Field label="Job title">
                <input
                  type="text"
                  value={vcard.title}
                  onChange={(e) =>
                    setVcard((v) => ({ ...v, title: e.target.value }))
                  }
                  className={inputCls}
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Email">
                <input
                  type="email"
                  value={vcard.email}
                  onChange={(e) =>
                    setVcard((v) => ({ ...v, email: e.target.value }))
                  }
                  className={inputCls}
                />
              </Field>
              <Field label="Phone">
                <input
                  type="tel"
                  value={vcard.phone}
                  onChange={(e) =>
                    setVcard((v) => ({ ...v, phone: e.target.value }))
                  }
                  className={inputCls}
                />
              </Field>
            </div>
            <Field label="Website">
              <input
                type="url"
                value={vcard.website}
                onChange={(e) =>
                  setVcard((v) => ({ ...v, website: e.target.value }))
                }
                placeholder="https://"
                className={inputCls}
              />
            </Field>
            <Field label="Address">
              <input
                type="text"
                value={vcard.address}
                onChange={(e) =>
                  setVcard((v) => ({ ...v, address: e.target.value }))
                }
                className={inputCls}
              />
            </Field>
          </div>
        )}

        {/* Customise panel */}
        <div className="rounded-xl border border-zinc-200 p-4 flex flex-col gap-4 dark:border-zinc-700">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
            Customise
          </p>
          <div className="flex gap-6">
            <ColorField
              label="Foreground"
              value={fgColor}
              onChange={setFgColor}
            />
            <ColorField
              label="Background"
              value={bgColor}
              onChange={setBgColor}
            />
          </div>
          <Field label="Logo (PNG / JPG / WebP / SVG · max 2 MB)">
            {logoObjectUrl ? (
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoObjectUrl}
                  alt="Logo preview"
                  className="h-10 w-10 rounded object-contain border border-zinc-200 dark:border-zinc-700"
                />
                <span className="text-sm text-zinc-500 truncate max-w-35">
                  {logoFile?.name}
                </span>
                <button
                  onClick={handleRemoveLogo}
                  className="ml-auto text-xs text-red-500 hover:underline"
                >
                  Remove
                </button>
              </div>
            ) : (
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={handleLogoChange}
                className="text-sm text-zinc-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-zinc-100 file:text-zinc-700 hover:file:bg-zinc-200 dark:file:bg-zinc-800 dark:file:text-zinc-300 dark:hover:file:bg-zinc-700"
              />
            )}
          </Field>
        </div>
      </div>

      {/* ── Right column: preview + actions ── */}
      <div className="flex flex-col items-center gap-5">
        <div
          ref={wrapperRef}
          className={`w-full flex items-center justify-center rounded-2xl p-6 min-h-70 ${
            !hasContent
              ? "border-2 border-dashed border-zinc-200 dark:border-zinc-700"
              : ""
          }`}
          style={{ background: hasContent ? bgColor : undefined }}
        >
          {hasContent ? (
            <QRCodeCanvas
              value={qrContent}
              size={240}
              bgColor={bgColor}
              fgColor={fgColor}
              level="H"
              imageSettings={
                logoObjectUrl
                  ? {
                      src: logoObjectUrl,
                      height: 48,
                      width: 48,
                      excavate: true,
                    }
                  : undefined
              }
            />
          ) : (
            <p className="text-zinc-400 text-sm text-center">
              Fill in the fields to preview your QR code.
            </p>
          )}
        </div>

        {error && <p className="text-sm text-red-500 text-center">{error}</p>}

        {savedId && (
          <p className="text-sm text-green-600 text-center">
            ✓ Saved to your account
          </p>
        )}

        {userId && (
          <Field label="Name (optional)">
            <input
              type="text"
              value={qrName}
              onChange={(e) => setQrName(e.target.value)}
              placeholder="e.g. Homepage Link, Office WiFi…"
              maxLength={100}
              className={inputCls}
            />
          </Field>
        )}

        <div className="flex gap-3 w-full">
          <button
            onClick={handleDownload}
            disabled={!hasContent}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-zinc-100 hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-colors"
          >
            ↓ Download PNG
          </button>

          {userId ? (
            <button
              onClick={handleSave}
              disabled={!hasContent || saving}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-black text-white hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed dark:bg-white dark:text-black dark:hover:bg-zinc-200 transition-colors"
            >
              {saving ? "Saving…" : "Save to account"}
            </button>
          ) : (
            <a
              href="/login"
              className="flex-1 py-2.5 rounded-lg text-sm font-medium text-center bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 transition-colors"
            >
              Sign in to save
            </a>
          )}
        </div>

        {!userId && (
          <p className="text-xs text-zinc-400 text-center">
            Sign in to save QR codes, track scans, and manage history.
          </p>
        )}
      </div>
    </div>
  );
}
