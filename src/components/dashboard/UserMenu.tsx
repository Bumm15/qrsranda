"use client";

import { useState, useRef, useEffect } from "react";
import { signOut } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";

interface Props {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: string;
}

export default function UserMenu({ name, email, image, role }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const initials = (name ?? email ?? "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        aria-haspopup="true"
        aria-expanded={open}
      >
        {image ? (
          <Image
            src={image}
            alt={name ?? "User avatar"}
            width={32}
            height={32}
            className="rounded-full object-cover"
          />
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200 text-xs font-semibold text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200">
            {initials}
          </span>
        )}
        <div className="hidden sm:flex flex-col items-start leading-tight">
          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 max-w-36 truncate">
            {name ?? email}
          </span>
          {role && (
            <span className={`text-xs font-medium ${role === "PAID" ? "text-amber-500" : "text-zinc-400"}`}>
              {role === "PAID" ? "Pro" : role === "ADMIN" ? "Admin" : "Free"}
            </span>
          )}
        </div>
        <svg className="w-4 h-4 text-zinc-400 hidden sm:block" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-56 rounded-xl border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900 z-50">
          <div className="px-4 py-2.5 border-b border-zinc-100 dark:border-zinc-800">
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{name}</p>
            <p className="text-xs text-zinc-500 truncate">{email}</p>
          </div>
          <Link
            href="/dashboard"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Overview
          </Link>
          <Link
            href="/dashboard/billing"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Billing
          </Link>
          <div className="border-t border-zinc-100 dark:border-zinc-800 mt-1 pt-1">
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
