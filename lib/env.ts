export type RuntimeEnv = {
  AMPLITUDE_ID: string;
};

export function getServerEnv(): RuntimeEnv {
  return {
    AMPLITUDE_ID: process.env.NEXT_PUBLIC_AMPLITUDE_ID ?? "",
  };
}

export function getClientEnv(): RuntimeEnv {
  if (typeof window !== "undefined" && window.__ENV__) {
    return window.__ENV__;
  }
  return getServerEnv();
}
