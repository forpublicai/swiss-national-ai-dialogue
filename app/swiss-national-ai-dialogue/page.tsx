import type { Metadata } from "next";

import { SnadPage } from "@/deliberations/swiss-national-ai-dialogue/Page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "Swiss National AI Dialogue" },
  description:
    "An open civic-policy dialogue about what people in Switzerland want from artificial intelligence.",
};

export default function SwissNationalAiDialoguePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  return <SnadPage searchParams={searchParams} />;
}
