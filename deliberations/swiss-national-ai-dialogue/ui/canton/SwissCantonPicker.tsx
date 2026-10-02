"use client";

import { ChevronDown } from "lucide-react";
import { useMemo } from "react";

import CantonMap, { getCantonById } from "./CantonMap";
import { NON_CH_CANTON, cantonData, cantonName } from "./cantons";
import { SwissCard } from "../cards/SwissCardChrome";
import { fill, useSwissDict, useSwissLocale } from "../../i18n";
import type { CardRenderProps } from "../../types";

export const SwissCantonPicker = ({
  event,
  answer,
  onAnswer,
  readOnly,
  large = false,
  previewSelect = false,
}: CardRenderProps<"awaiting_canton_selection"> & {
  large?: boolean;
  previewSelect?: boolean;
}) => {
  const locale = useSwissLocale();
  const dict = useSwissDict();
  const selected = typeof answer?.canton === "string" ? answer.canton : null;
  const selectedCanton = selected ? getCantonById(selected) : undefined;
  const selectedName = selectedCanton
    ? cantonName(selectedCanton, locale)
    : null;

  const participantCounts = useMemo(() => {
    if (!selected) return null;
    const counts: Record<string, number> = {};
    for (const { canton, count } of event.counts) {
      counts[canton] = count;
    }
    counts[selected] = (counts[selected] ?? 0) + 1;
    return counts;
  }, [event.counts, selected]);

  const total = useMemo(() => {
    if (!participantCounts) return 0;
    return Object.values(participantCounts).reduce((sum, c) => sum + c, 0);
  }, [participantCounts]);

  const commit = (cantonId: string) => {
    if (readOnly) return;
    if (!previewSelect && selected !== null) return;
    onAnswer({ canton: cantonId });
  };

  const showDensity = !previewSelect && !!participantCounts;

  return (
    <SwissCard
      large={large}
      eyebrow={showDensity ? dict.canton.eyebrow : undefined}
      question={
        showDensity
          ? fill(dict.canton.thanks, {
              name: selectedName ?? dict.canton.thanksFallback,
            })
          : undefined
      }
    >
      {showDensity && (
        <p className="-mt-3 text-[13px] text-[#71717a]">
          {fill(dict.canton.participants, { count: total })}
        </p>
      )}

      {!showDensity && !readOnly && (
        <CantonDropdown
          selected={selected}
          onSelect={commit}
          placeholder={dict.canton.selectPlaceholder}
          notInSwitzerlandLabel={dict.canton.notInSwitzerland}
          nameFor={(canton) => cantonName(canton, locale)}
        />
      )}

      <CantonMap
        onSelect={commit}
        selectedCanton={selected}
        disabled={readOnly || (!previewSelect && selected !== null)}
        participantCounts={showDensity ? (participantCounts ?? undefined) : undefined}
        large={large}
        notInSwitzerland={
          !showDensity && !readOnly
            ? {
                label: dict.canton.notInSwitzerlandShort,
                active: selected === NON_CH_CANTON,
                onSelect: () => commit(NON_CH_CANTON),
              }
            : undefined
        }
      />
    </SwissCard>
  );
};

function CantonDropdown({
  selected,
  onSelect,
  placeholder,
  notInSwitzerlandLabel,
  nameFor,
}: {
  selected: string | null;
  onSelect: (cantonId: string) => void;
  placeholder: string;
  notInSwitzerlandLabel: string;
  nameFor: (canton: (typeof cantonData)[number]) => string;
}) {
  const options = useMemo(
    () =>
      [...cantonData].sort((a, b) => nameFor(a).localeCompare(nameFor(b))),
    [nameFor],
  );

  return (
    <div className="relative">
      <select
        value={selected ?? ""}
        onChange={(e) => onSelect(e.target.value)}
        aria-label={placeholder}
        className="border-border bg-card text-foreground focus-visible:ring-primary/40 w-full cursor-pointer appearance-none rounded-lg border px-4 py-3 pr-10 text-[15px] font-medium leading-snug focus-visible:outline-none focus-visible:ring-2"
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((canton) => (
          <option key={canton.id} value={canton.id}>
            {nameFor(canton)}
          </option>
        ))}
        <option value={NON_CH_CANTON}>{notInSwitzerlandLabel}</option>
      </select>
      <ChevronDown
        aria-hidden
        className="text-muted-foreground pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2"
      />
    </div>
  );
}
