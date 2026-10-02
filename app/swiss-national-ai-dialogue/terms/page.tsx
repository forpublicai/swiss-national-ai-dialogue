import type { Metadata } from "next";

import { SwissTerms } from "@/deliberations/swiss-national-ai-dialogue/ui/legal/SwissTerms";

export const metadata: Metadata = {
  title: { absolute: "Terms of Use & Privacy Notice — Swiss National AI Dialogue" },
  description:
    "Terms of Use and Privacy Notice for the Swiss National AI Dialogue.",
};

export default function SwissTermsPage() {
  return <SwissTerms />;
}
