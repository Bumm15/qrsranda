import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import QrEditForm from "@/components/dashboard/QrEditForm";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const qr = await db.qRCode.findUnique({ where: { id }, select: { type: true, qrSubtype: true } });
  if (!qr) return { title: "Not Found" };
  return { title: qr.type === "SMART" ? "Edit Smart QR" : "QR Details" };
}

export default async function QrDetailPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;

  const qr = await db.qRCode.findUnique({
    where: { id },
    include: {
      history: { orderBy: { changedAt: "desc" } },
      abTest: true,
      _count: { select: { scans: true } },
    },
  });

  if (!qr) notFound();

  // Ownership check — admins can view any
  if (qr.userId !== session.user.id && session.user.role !== "ADMIN") {
    notFound();
  }

  const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  // Serialize dates to strings for the client component
  const serialized = {
    ...qr,
    createdAt: qr.createdAt.toISOString(),
    updatedAt: qr.updatedAt.toISOString(),
    history: qr.history.map((h) => ({
      ...h,
      changedAt: h.changedAt.toISOString(),
    })),
    abTest: qr.abTest
      ? {
          ...qr.abTest,
          createdAt: undefined,
          updatedAt: undefined,
        }
      : null,
  };

  return (
    <main className="p-6">
      <QrEditForm qr={serialized} appUrl={appUrl} />
    </main>
  );
}
