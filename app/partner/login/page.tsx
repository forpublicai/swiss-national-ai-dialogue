import { redirect } from "next/navigation";

import { hasActivePartnerSession } from "../_lib/session";

import { LoginForm } from "./_components/LoginForm";

export const dynamic = "force-dynamic";

export default async function PartnerLoginPage() {
  // Already signed in with a live session → straight to the dashboard. A
  // revoked-key session falls through to the form (no redirect loop).
  if (await hasActivePartnerSession()) redirect("/partner");

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center p-8">
      <h1 className="text-2xl font-bold">Partner sign-in</h1>
      <p className="text-muted-foreground mt-1 mb-6 text-sm">
        Enter the access key you were given to access your deliberation
        dashboard.
      </p>
      <LoginForm />
    </main>
  );
}
