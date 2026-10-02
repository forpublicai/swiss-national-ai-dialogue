import type { ReactNode } from "react";

// Hosts the @modal parallel slot for the /partner surface — mirror of the
// /admin layout. A soft navigation to participants/[id] renders the
// intercepted modal over the dashboard; a direct load falls back to the
// standalone participants page.
export default function PartnerAuthedLayout({
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
