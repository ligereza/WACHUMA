import type { PublicMapFeature } from "@wachuma/maps";

function pointFromGeometry(
  geometry: Record<string, unknown>,
): [number, number] | undefined {
  if (geometry.type !== "Point" || !Array.isArray(geometry.coordinates)) {
    return undefined;
  }
  const [longitude, latitude] = geometry.coordinates;
  return typeof longitude === "number" && typeof latitude === "number"
    ? [longitude, latitude]
    : undefined;
}

export function PublicMap({ features }: { features: PublicMapFeature[] }) {
  const points = features.flatMap((feature) => {
    const point = pointFromGeometry(feature.geometry);
    return point ? [{ feature, point }] : [];
  });
  const xFor = (longitude: number) => ((longitude + 180) / 360) * 760 + 20;
  const yFor = (latitude: number) => ((90 - latitude) / 180) * 360 + 20;

  return (
    <div className="public-map-shell">
      <svg
        className="public-map"
        viewBox="0 0 800 400"
        role="img"
        aria-label="Mapa público con geometrías aproximadas"
      >
        <defs>
          <pattern
            id="map-grid"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke="currentColor"
              strokeOpacity="0.14"
            />
          </pattern>
          <radialGradient id="map-glow" cx="50%" cy="45%" r="70%">
            <stop offset="0%" stopColor="#e2e9cb" />
            <stop offset="100%" stopColor="#b7c9a0" />
          </radialGradient>
        </defs>
        <rect width="800" height="400" rx="24" fill="url(#map-glow)" />
        <rect
          x="20"
          y="20"
          width="760"
          height="360"
          rx="18"
          fill="url(#map-grid)"
        />
        <path
          d="M 90 90 C 180 42, 265 120, 350 78 S 540 55, 700 112 L 742 262 C 640 315, 530 288, 440 334 S 220 346, 74 278 Z"
          fill="#f9f8ee"
          fillOpacity="0.6"
          stroke="#6d8e62"
          strokeOpacity="0.35"
        />
        {points.map(({ feature, point }) => (
          <g key={feature.publicId} id={feature.publicId}>
            <circle
              cx={xFor(point[0])}
              cy={yFor(point[1])}
              r="12"
              fill="#426c49"
              fillOpacity="0.18"
            />
            <circle
              cx={xFor(point[0])}
              cy={yFor(point[1])}
              r="5"
              fill="#315f43"
            />
            <text
              x={xFor(point[0]) + 12}
              y={yFor(point[1]) + 4}
              className="map-label"
            >
              {feature.label}
            </text>
          </g>
        ))}
        {points.length === 0 ? (
          <text x="400" y="205" textAnchor="middle" className="map-empty-label">
            Sin geometrías públicas disponibles
          </text>
        ) : null}
      </svg>
      <div className="public-map-legend">
        <span className="map-dot" aria-hidden="true" />
        <span>
          Geometría pública aproximada · precisión reducida por privacidad
        </span>
      </div>
    </div>
  );
}
