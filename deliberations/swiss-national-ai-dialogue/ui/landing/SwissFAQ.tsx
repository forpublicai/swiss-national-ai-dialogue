"use client";

import { useState, type ReactNode } from "react";
import { Minus, Plus } from "lucide-react";

import type { FAQProps } from "../../types";
import { fill, useSwissDict } from "../../i18n";

export function SwissFAQ({ campaignName }: FAQProps) {
  const dict = useSwissDict();
  const faqs = dict.faq.map((item, i) => ({
    id: i + 1,
    question: item.question,
    answer: fill(item.answer, { name: campaignName }),
  }));
  const [openId, setOpenId] = useState<number | null>(null);
  return (
    <section className="bg-card px-4 py-6 lg:px-8 lg:py-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
        <div className="lg:w-1/3">
          <h2 className="font-display text-foreground text-3xl font-bold tracking-[-0.02em] lg:text-4xl">
            FAQs
          </h2>
        </div>
        <div className="flex w-full flex-col items-start lg:w-2/3">
          {faqs.map((faq, index) => (
            <div
              key={faq.id}
              className={`flex w-full flex-col items-start gap-3 py-4 lg:gap-4 lg:py-6 ${index < faqs.length - 1 ? "border-border border-b" : ""}`}
            >
              <button
                type="button"
                onClick={() => setOpenId(openId === faq.id ? null : faq.id)}
                className="flex w-full cursor-pointer items-center justify-between gap-3 p-0 text-left lg:gap-4"
                aria-expanded={openId === faq.id}
              >
                <p className="text-foreground min-w-0 flex-1 whitespace-pre-wrap text-sm font-bold lg:text-base">
                  {faq.question}
                </p>
                <span className="flex flex-shrink-0 items-center justify-center">
                  {openId === faq.id ? (
                    <Minus
                      className="text-foreground size-4 lg:size-5"
                      strokeWidth={2}
                    />
                  ) : (
                    <Plus
                      className="text-foreground size-4 lg:size-5"
                      strokeWidth={2}
                    />
                  )}
                </span>
              </button>
              {openId === faq.id && (
                <div className="text-foreground w-full text-sm leading-relaxed lg:text-base">
                  {renderAnswer(faq.answer)}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const MARKDOWN_LINK = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;

function renderAnswer(value: string): ReactNode {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  for (const match of value.matchAll(MARKDOWN_LINK)) {
    const start = match.index ?? 0;
    if (start > cursor) nodes.push(value.slice(cursor, start));
    nodes.push(
      <a
        key={start}
        href={match[2]}
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2"
      >
        {match[1]}
      </a>,
    );
    cursor = start + match[0].length;
  }
  if (cursor < value.length) nodes.push(value.slice(cursor));
  return nodes.length > 0 ? nodes : value;
}
