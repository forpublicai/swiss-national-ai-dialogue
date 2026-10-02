"use client";

import Link from "next/link";

import { requestConsentReopen } from "@/lib/analytics/cookies";

import type { LandingFooterProps } from "../../types";
import { fill, useSwissDict } from "../../i18n";

const PARTNERS = [
  { name: "Public AI", href: "https://publicai.co" },
  { name: "Public AI Switzerland", href: "https://publicai.ch" },
  { name: "Change.org", href: "https://www.change.org" },
  { name: "Swiss National AI Initiative", href: "https://www.swiss-ai.org" },
  { name: "Collective Intelligence Project", href: "https://www.cip.org" },
  { name: "Swiss {ai} Weeks", href: "https://ai-weeks.ch" },
  { name: "Metagov", href: "https://metagov.org" },
];

export function SwissFooter({ name }: LandingFooterProps) {
  const dict = useSwissDict();
  return (
    <footer className="bg-card">
      <div className="mx-auto max-w-[600px] lg:max-w-[1280px]">
        <div className="px-4 py-12 lg:max-w-[820px] lg:px-8">
          <div className="flex flex-col gap-6">
            <h3 className="text-xl font-bold text-foreground lg:text-2xl">
              {dict.footer.heading}
            </h3>

            <div className="space-y-4 text-sm font-normal text-muted-foreground lg:text-base">
              <p>{fill(dict.footer.intro, { name })}</p>
              <p>{dict.footer.collaboration}</p>
              <ul className="flex flex-wrap gap-x-6 gap-y-2">
                {PARTNERS.map((p) => (
                  <li key={p.name}>
                    <a
                      href={p.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground"
                    >
                      {p.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t border-border pt-6 text-sm font-normal text-muted-foreground">
              <p>
                <Link
                  href="/swiss-national-ai-dialogue/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2"
                >
                  {dict.footer.terms}
                </Link>
                {" · "}
                <button
                  type="button"
                  onClick={requestConsentReopen}
                  className="underline underline-offset-2 hover:text-foreground"
                >
                  {dict.cookieConsent.manage}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
