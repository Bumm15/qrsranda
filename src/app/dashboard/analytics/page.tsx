import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import AnalyticsDashboard from "@/components/dashboard/AnalyticsDashboard";

export const metadata = {
  title: "Analytics — Smart QR",
};

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;

  // Fetch all QR codes owned by user (for the filter dropdown)
  const qrCodes = await db.qRCode.findMany({
    where: { userId },
    select: {
      id: true,
      type: true,
      qrSubtype: true,
      name: true,
      targetUrl: true,
      wifiSsid: true,
      shortCode: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Build readable labels for the dropdown
  const qrOptions = qrCodes.map((qr) => {
    let label = "";
    if (qr.name) {
      label = qr.name;
    } else if (qr.type === "SMART") {
      label = `/r/${qr.shortCode}` + (qr.targetUrl ? ` → ${qr.targetUrl.slice(0, 30)}` : "");
    } else if (qr.qrSubtype === "WIFI") {
      label = `WiFi: ${qr.wifiSsid ?? "—"}`;
    } else if (qr.qrSubtype === "VCARD") {
      label = "vCard";
    } else {
      label = qr.targetUrl?.slice(0, 45) ?? "—";
    }
    return { id: qr.id, label };
  });

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Analytics</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Scan counts, device breakdown, and geographic data for your QR codes.
        </p>
      </div>

      <AnalyticsDashboard qrOptions={qrOptions} />
    </div>
  );
}
