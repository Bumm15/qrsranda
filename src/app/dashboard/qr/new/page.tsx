import { auth } from "@/lib/auth";
import QrGeneratorForm from "@/components/QrGeneratorForm";
import Link from "next/link";

export const metadata = { title: "New QR Code — Smart QR" };

export default async function NewQrPage() {
  const session = await auth();

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/qr"
          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 dark:hover:text-zinc-200 dark:hover:bg-zinc-800 transition-colors"
          title="Back to QR list"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">New QR Code</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Generate a static QR and save it to your account.</p>
        </div>
      </div>

      <QrGeneratorForm userId={session!.user.id} />
    </div>
  );
}
