const apiBaseUrl = (
  process.env.WACHUMA_API_URL ?? process.env.NEXT_PUBLIC_WACHUMA_API_URL
)?.replace(/\/$/, "");
export const demoMode = process.env.WACHUMA_DEMO_MODE === "true";

export function isDemoMode(): boolean {
  return demoMode;
}

export async function loadApi<T>(path: string, fallback: T): Promise<T> {
  if (demoMode) return fallback;
  if (!apiBaseUrl) return [] as T;
  try {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      ...(process.env.WACHUMA_DISABLE_API_CACHE === "true"
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
  if (demoMode || !apiBaseUrl) return null;
  try {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      ...(process.env.WACHUMA_DISABLE_API_CACHE === "true"
        ? { cache: "no-store" as const }
        : { next: { revalidate: 60 } }),
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}
