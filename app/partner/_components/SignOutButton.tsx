"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const signOut = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await fetch("/api/partner/logout", { method: "POST" });
    } finally {
      router.push("/partner/login");
      router.refresh();
    }
  };

  return (
    <button
      type="button"
      className="text-secondary text-sm underline"
      onClick={signOut}
      disabled={busy}
    >
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
