import { auth } from "@/lib/auth";
import QrGeneratorForm from "@/components/QrGeneratorForm";

export default async function Home() {
  const session = await auth();

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Nav */}
      <header className="border-b bg-white dark:bg-zinc-900 dark:border-zinc-800">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <span className="font-bold text-lg tracking-tight">Smart QR</span>
          {session?.user ? (
            <div className="flex items-center gap-4">
              <span className="text-sm text-zinc-500">{session.user.email}</span>
              <a href="/dashboard" className="text-sm font-medium hover:underline">
                Dashboard
              </a>
            </div>
          ) : (
            <a href="/login" className="text-sm font-medium hover:underline">
              Sign in
            </a>
          )}
        </div>
      </header>

      {/* Hero */}
      <div className="max-w-4xl mx-auto px-4 pt-12 pb-2 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Free QR Code Generator
        </h1>
        <p className="mt-3 text-zinc-500 text-base max-w-md mx-auto">
          Create URL, Wi-Fi, or vCard QR codes instantly. Customise colours and
          add a logo. Sign in to save and track scans.
        </p>
      </div>

      <QrGeneratorForm userId={session?.user?.id} />
    </main>
  );
}
