import type { ReactNode } from "react";

import { SnadThemedRoot } from "@/deliberations/swiss-national-ai-dialogue/ThemedRoot";

export default function SwissNationalAiDialogueLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <SnadThemedRoot>{children}</SnadThemedRoot>;
}
