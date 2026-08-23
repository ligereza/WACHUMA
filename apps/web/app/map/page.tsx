import { demoPublicMapFeatures, type PublicMapFeature } from "@wachuma/maps";
import { PublicMap } from "../components/PublicMap";
import { SiteNav } from "../components/SiteNav";

async function loadPublicMapFeatures(): Promise<PublicMapFeature[]> {
  const apiUrl = process.env.WACHUMA_API_URL;
  if (!apiUrl) return demoPublicMapFeatures;

  try {
    const response = await fetch(`${apiUrl}/api/v1/map/places`, {
      next: { revalidate: 60 },
    });
    if (!response.ok) return demoPublicMapFeatures;
    const features = (await response.json()) as PublicMapFeature[];
    return features.length > 0 ? features : demoPublicMapFeatures;
  } catch {
    return demoPublicMapFeatures;
  }
}

export default async function MapPage() {
  const features = await loadPublicMapFeatures();
  return (
    <main className="content-shell">
      <SiteNav />
      <header className="content-hero">
        <p className="eyebrow">geografía pública · postgis</p>
        <h1>Mapa</h1>
        <p>
          El mapa solo recibe `geometry_public`, nunca `geometry_exact`. Las
          coordenadas se redondean y los lugares sensibles pueden omitirse.
        </p>
      </header>
      <section aria-label="Mapa público">
        <PublicMap features={features} />
      </section>
      <p className="empty-note page-note">
        Las ubicaciones son aproximaciones deliberadas. El mapa no permite
        reconstruir la posición exacta de ejemplares privados ni de lugares
        culturalmente sensibles.
      </p>
    </main>
  );
}
