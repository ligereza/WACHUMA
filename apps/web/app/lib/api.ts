function runtimeEnv(name: string): string | undefined {
  return process.env[name];
}

function getApiBaseUrl(): string | undefined {
  return (
    runtimeEnv("WACHUMA_API_URL") ?? runtimeEnv("NEXT_PUBLIC_WACHUMA_API_URL")
  )?.replace(/\/$/, "");
}

export function isDemoMode(): boolean {
  return runtimeEnv("WACHUMA_DEMO_MODE") === "true";
}

export async function loadApi<T>(path: string, fallback: T): Promise<T> {
  if (isDemoMode()) return fallback;
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) return [] as T;
  try {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      ...(runtimeEnv("WACHUMA_DISABLE_API_CACHE") === "true"
        ? { cache: "no-store" as const }
        : { next: { revalidate: 60 } }),
    });
    if (!response.ok) return [] as T;
    return (await response.json()) as T;
  } catch {
    return [] as T;
  }
}

export async function loadApiOrNull<T>(path: string): Promise<T | null> {
  if (isDemoMode()) return null;
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) return null;
  try {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      ...(runtimeEnv("WACHUMA_DISABLE_API_CACHE") === "true"
        ? { cache: "no-store" as const }
        : { next: { revalidate: 60 } }),
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}
