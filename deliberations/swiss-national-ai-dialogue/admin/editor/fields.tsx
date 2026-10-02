"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

import type { LocalizedText, SnadLocale } from "../../types";

export const EDITOR_LOCALES: SnadLocale[] = ["en", "de", "fr", "it", "rm"];

const LOCALE_NAMES: Record<SnadLocale, string> = {
  en: "English",
  de: "Deutsch",
  fr: "Français",
  it: "Italiano",
  rm: "Rumantsch",
};

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">
        {label}
      </span>
      {hint && <span className="text-muted-foreground ml-2 text-[11px]">{hint}</span>}
      <div className="mt-1">{children}</div>
    </label>
  );
}

const inputClass =
  "border-border bg-background w-full rounded-md border px-2 py-1.5 text-sm";

export function TextInput({
  value,
  onChange,
  ariaLabel,
  mono,
}: {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  mono?: boolean;
}) {
  return (
    <input
      type="text"
      className={`${inputClass}${mono ? " font-mono text-xs" : ""}`}
      value={value}
      aria-label={ariaLabel}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

export function TextArea({
  value,
  onChange,
  ariaLabel,
  rows = 4,
}: {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  rows?: number;
}) {
  return (
    <textarea
      className={`${inputClass} font-mono text-xs leading-relaxed`}
      value={value}
      rows={rows}
      aria-label={ariaLabel}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

export function NumberInput({
  value,
  onChange,
  ariaLabel,
  min,
  max,
}: {
  value: number;
  onChange: (value: number) => void;
  ariaLabel: string;
  min?: number;
  max?: number;
}) {
  return (
    <input
      type="number"
      className={`${inputClass} max-w-28`}
      value={Number.isFinite(value) ? value : ""}
      min={min}
      max={max}
      aria-label={ariaLabel}
      onChange={(event) => onChange(Number(event.target.value))}
    />
  );
}

export function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

const EditorLocaleContext = createContext<{
  locale: SnadLocale;
  setLocale: (locale: SnadLocale) => void;
}>({ locale: "en", setLocale: () => {} });

export function EditorLocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<SnadLocale>("en");
  return (
    <EditorLocaleContext.Provider value={{ locale, setLocale }}>
      {children}
    </EditorLocaleContext.Provider>
  );
}

function useEditorLocale() {
  return useContext(EditorLocaleContext);
}

export function LocaleTabs() {
  const { locale: active, setLocale } = useEditorLocale();
  return (
    <div className="grid gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">
          Editing language
        </span>
        <div className="border-border flex flex-wrap overflow-hidden rounded-md border">
          {EDITOR_LOCALES.map((locale) => (
            <button
              key={locale}
              type="button"
              aria-pressed={locale === active}
              className={`border-border border-l px-3 py-1.5 text-xs font-medium first:border-l-0 ${
                locale === active
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              }`}
              onClick={() => setLocale(locale)}
            >
              {LOCALE_NAMES[locale]}
            </button>
          ))}
        </div>
      </div>
      <p className="text-muted-foreground text-[11px]">
        {active === "en"
          ? "English is the source language — leave a translation blank in another language and it publishes as the English text."
          : `Every question below shows its ${LOCALE_NAMES[active]} copy, with the English source above each field.`}
      </p>
    </div>
  );
}

export function LocalizedTextField({
  label,
  value,
  onChange,
  multiline,
}: {
  label: string;
  value: LocalizedText;
  onChange: (locale: SnadLocale, text: string) => void;
  multiline?: boolean;
}) {
  const { locale } = useEditorLocale();
  const english = (value.en ?? "").trim();
  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">
          {label}
        </span>
        <span className="text-muted-foreground font-mono text-[11px] uppercase">
          {locale}
        </span>
      </div>
      {locale !== "en" && english && (
        <p className="text-muted-foreground mt-1 text-[11px] italic">EN: {english}</p>
      )}
      <div className="mt-1">
        {multiline ? (
          <textarea
            className={`${inputClass} text-xs`}
            rows={2}
            value={value[locale] ?? ""}
            aria-label={`${label} (${locale})`}
            onChange={(event) => onChange(locale, event.target.value)}
          />
        ) : (
          <input
            type="text"
            className={`${inputClass} text-xs`}
            value={value[locale] ?? ""}
            aria-label={`${label} (${locale})`}
            onChange={(event) => onChange(locale, event.target.value)}
          />
        )}
      </div>
    </div>
  );
}

export function ReadOnlyField({
  label,
  hint,
  value,
  tag = "code · read-only",
}: {
  label: string;
  hint?: string;
  value: string;
  tag?: string;
}) {
  return (
    <div className="block">
      <span className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">
        {label}
      </span>
      <span className="bg-muted text-muted-foreground ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
        {tag}
      </span>
      {hint && <span className="text-muted-foreground ml-2 text-[11px]">{hint}</span>}
      <pre className="border-border bg-muted/40 text-muted-foreground mt-1 max-h-64 overflow-auto whitespace-pre-wrap rounded-md border px-2 py-1.5 font-mono text-xs leading-relaxed">
        {value}
      </pre>
    </div>
  );
}

export function Badge({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "info";
}) {
  const toneClass =
    tone === "info"
      ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
      : "bg-muted text-muted-foreground";
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${toneClass}`}
    >
      {children}
    </span>
  );
}

export function SmallButton({
  children,
  onClick,
  tone = "default",
  disabled,
  ariaLabel,
}: {
  children: ReactNode;
  onClick: () => void;
  tone?: "default" | "danger" | "primary";
  disabled?: boolean;
  ariaLabel?: string;
}) {
  const toneClass =
    tone === "danger"
      ? "border-destructive/40 text-destructive hover:bg-destructive/10"
      : tone === "primary"
        ? "border-primary bg-primary text-primary-foreground hover:opacity-90"
        : "border-border hover:bg-muted";
  return (
    <button
      type="button"
      className={`rounded-md border px-2 py-1 text-xs font-medium disabled:opacity-40 ${toneClass}`}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClick();
      }}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}

export function RowActions({
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onRemove,
}: {
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onDuplicate?: () => void;
  onRemove?: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      {onMoveUp && <SmallButton onClick={onMoveUp} ariaLabel="Move up">↑</SmallButton>}
      {onMoveDown && (
        <SmallButton onClick={onMoveDown} ariaLabel="Move down">↓</SmallButton>
      )}
      {onDuplicate && <SmallButton onClick={onDuplicate}>Duplicate</SmallButton>}
      {onRemove && (
        <SmallButton onClick={onRemove} tone="danger">
          Remove
        </SmallButton>
      )}
    </div>
  );
}

export function SectionCard({
  title,
  subtitle,
  children,
  actions,
  defaultOpen = true,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details className="border-border bg-card rounded-md border" open={defaultOpen}>
      <summary className="flex cursor-pointer flex-wrap items-baseline justify-between gap-2 p-4">
        <div>
          <h3 className="inline text-sm font-bold">{title}</h3>
          {subtitle && (
            <p className="text-muted-foreground mt-0.5 text-xs">{subtitle}</p>
          )}
        </div>
        {actions}
      </summary>
      <div className="grid gap-3 border-t p-4">{children}</div>
    </details>
  );
}
