import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import SidebarNav from "@/components/dashboard/SidebarNav";
import UserMenu from "@/components/dashboard/UserMenu";
import Link from "next/link";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Auth guard — middleware handles the redirect but this is a second layer
  if (!session?.user) {
    redirect("/login?callbackUrl=/dashboard");
  }

  const { name, email, image, role } = session.user;

  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950 overflow-hidden">
      {/* ── Sidebar ── */}
      <aside className="hidden md:flex flex-col w-60 shrink-0 border-r border-zinc-200 bg-white dark:bg-zinc-900 dark:border-zinc-800">
        {/* Logo */}
        <div className="flex items-center gap-2 px-5 py-5 border-b border-zinc-100 dark:border-zinc-800">
          <Link href="/" className="flex items-center gap-2 font-bold text-base tracking-tight text-zinc-900 dark:text-zinc-100">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <path strokeLinecap="round" d="M14 14h2m3 0h2M14 17h2m3 3h2M17 14v2m0 3v2" />
            </svg>
            Smart QR
          </Link>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto">
          <SidebarNav />
        </div>

        {/* User menu at bottom of sidebar */}
        <div className="border-t border-zinc-100 dark:border-zinc-800 p-3">
          <UserMenu name={name} email={email} image={image} role={role} />
        </div>
      </aside>

      {/* ── Mobile top bar ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <header className="flex md:hidden items-center justify-between px-4 py-3 border-b border-zinc-200 bg-white dark:bg-zinc-900 dark:border-zinc-800 shrink-0">
          <Link href="/" className="font-bold text-base tracking-tight">
            Smart QR
          </Link>
          <UserMenu name={name} email={email} image={image} role={role} />
        </header>

        {/* Mobile nav strip */}
        <div className="flex md:hidden overflow-x-auto border-b border-zinc-200 bg-white dark:bg-zinc-900 dark:border-zinc-800 px-2 shrink-0">
          <MobileNav />
        </div>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

// Lightweight inline mobile nav (avoids extra client component file)
function MobileNav() {
  return (
    <nav className="flex gap-1 py-2">
      {[
        { label: "Overview", href: "/dashboard" },
        { label: "QR Codes", href: "/dashboard/qr" },
        { label: "Analytics", href: "/dashboard/analytics" },
        { label: "Billing", href: "/dashboard/billing" },
      ].map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-colors"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
