export interface PublicMapFeature {
  publicId: string;
  label: string;
  geometry: Record<string, unknown>;
  source?: string;
}

export const demoPublicMapFeatures: PublicMapFeature[] = [
  {
    publicId: "place-demo-public",
    label: "Jardín demo · área aproximada",
    geometry: {
      type: "Point",
      coordinates: [-70.65, -33.45],
    },
    source: "source-wachuma-demo-editorial",
  },
];

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function roundPublicGeometry(
  geometry: Record<string, unknown>,
  decimals = 2,
): Record<string, unknown> {
  const visit = (value: unknown): unknown => {
    if (typeof value === "number") return round(value, decimals);
    if (Array.isArray(value)) return value.map(visit);
    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value).map(([key, child]) => [key, visit(child)]),
      );
    }
    return value;
  };
  return visit(geometry) as Record<string, unknown>;
}
