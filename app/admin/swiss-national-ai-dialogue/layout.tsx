import type { ReactNode } from "react";

// Hosts the @modal parallel slot so a soft navigation to
// participants/[id] renders the intercepted modal over the dashboard, while
// a direct load / refresh falls back to the standalone participants page.
export default function SnadAdminLayout({
  children,
  modal,
}: {
  children: ReactNode;
  modal: ReactNode;
}) {
  return (
    <>
      {children}
      {modal}
    </>
  );
}
