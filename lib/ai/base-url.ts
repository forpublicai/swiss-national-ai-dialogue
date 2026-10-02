let validatedBaseUrl: string | null | undefined;

// The OpenAI-compatible endpoint the Apertus model is served from, without the
// trailing /v1 (callers append /v1/chat/completions).
export function getLlmBaseUrl(): string | undefined {
  if (validatedBaseUrl !== undefined) {
    return validatedBaseUrl ?? undefined;
  }
  const raw = process.env.LLM_BASE_URL;
  if (!raw) {
    validatedBaseUrl = null;
    return undefined;
  }
  try {
    new URL(raw);
  } catch {
    throw new Error(`LLM_BASE_URL is not a valid URL: '${raw}'`);
  }
  validatedBaseUrl = raw.replace(/\/+$/, "");
  return validatedBaseUrl;
}
