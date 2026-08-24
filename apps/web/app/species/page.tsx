import Link from "next/link";
import { demoSpeciesDocument } from "@wachuma/taxonomy";
import type { SpeciesSummary } from "@wachuma/shared";
import { SiteNav } from "../components/SiteNav";
import { loadApi } from "../lib/api";

type SpeciesCard = SpeciesSummary & { description?: string };

export default async function SpeciesExplorerPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim().toLocaleLowerCase() ?? "";
  const fallbackMatches = [demoSpeciesDocument].filter((species) => {
    if (!query) return true;
    return [
      species.scientificName,
      species.displayName,
      ...(species.taxonomicVariants ?? []).map((variant) => variant.name),
      ...species.vernacularNames.map((name) => name.term),
    ].some((value) => value.toLocaleLowerCase().includes(query));
  });
  const matches = await loadApi<SpeciesCard[]>(
    `/api/v1/species?limit=100${q ? `&search=${encodeURIComponent(q)}` : ""}`,
    fallbackMatches,
  );

  return (
    <main className="content-shell">
      <SiteNav />
      <header className="content-hero">
        <p className="eyebrow">atlas biológico · explorador</p>
        <h1>Especies</h1>
        <p>
          Busca organismos por nombre científico, entidad biológica o nombre
          contextualizado. Las fichas separan taxonomía, cultivo, observación y
          cultura.
        </p>
      </header>
      <form className="species-search" method="get">
        <label htmlFor="species-query">Buscar en el catálogo público</label>
        <div>
          <input
            id="species-query"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Echinopsis, pachanoi, wachuma…"
          />
          <button type="submit">Buscar</button>
        </div>
      </form>
      <section className="content-grid" aria-label="Especies disponibles">
        {matches.length > 0 ? (
          matches.map((species) => (
            <article className="species-card" key={species.publicId}>
              <p className="card-kicker">{species.rank}</p>
              <h2>
                <Link href={`/species/${species.publicId}`}>
                  {species.scientificName}
                </Link>
              </h2>
              <p>{species.description}</p>
              <div className="tag-row">
                <span className="tag">taxon · {species.taxonomicStatus}</span>
                <span className="tag">registro publicable</span>
              </div>
            </article>
          ))
        ) : (
          <p className="empty-note">No hay coincidencias publicables.</p>
        )}
      </section>
    </main>
  );
}
