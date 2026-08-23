const apiBaseUrl = process.env.WACHUMA_API_URL?.replace(/\/$/, "");

export async function loadApi<T>(path: string, fallback: T): Promise<T> {
  if (!apiBaseUrl) return fallback;
  try {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      next: { revalidate: 60 },
    });
    if (!response.ok) return fallback;
    return (await response.json()) as T;
  } catch {
    return fallback;
  }
}

export async function loadApiOrNull<T>(path: string): Promise<T | null> {
  if (!apiBaseUrl) return null;
  try {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      next: { revalidate: 60 },
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}
