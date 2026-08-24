import Link from "next/link";
import { demoGrowingGuide } from "@wachuma/cultivation";
import { demoSpeciesDocument } from "@wachuma/taxonomy";
import type { PublicId, PublicSearchResult } from "@wachuma/shared";
import { SiteNav } from "../components/SiteNav";
import { loadApi } from "../lib/api";

export const dynamic = "force-dynamic";

const demoSearchResults: PublicSearchResult[] = [
  {
    kind: "species",
    publicId: demoSpeciesDocument.publicId,
    title: demoSpeciesDocument.displayName,
    summary: demoSpeciesDocument.description,
    path: `/species/${demoSpeciesDocument.publicId}`,
    subjectPublicId: demoSpeciesDocument.publicId,
    sourcePublicIds: demoSpeciesDocument.sources.map(
      (source) => source.publicId,
    ),
  },
  {
    kind: "guide",
    publicId: demoGrowingGuide.publicId,
    title: demoGrowingGuide.title,
    summary: demoGrowingGuide.summary ?? "Manual de cultivo versionado",
    path: `/cultivation/${demoGrowingGuide.publicId}`,
    ...(demoGrowingGuide.subjectPublicId
      ? { subjectPublicId: demoGrowingGuide.subjectPublicId }
      : {}),
    sourcePublicIds: ["source-wachuma-demo-editorial" as PublicId],
  },
];

const kindLabels: Record<PublicSearchResult["kind"], string> = {
  species: "especie",
  guide: "manual",
  cultural_relation: "relación cultural",
  source: "fuente",
  place: "lugar",
  specimen: "ejemplar",
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const normalizedQuery = q?.trim() ?? "";
  const fallback = demoSearchResults.filter((result) => {
    if (!normalizedQuery) return true;
    const needle = normalizedQuery.toLocaleLowerCase();
    return [result.title, result.summary, result.publicId].some((value) =>
      value.toLocaleLowerCase().includes(needle),
    );
  });
  const results = await loadApi<PublicSearchResult[]>(
    `/api/v1/search?limit=100${normalizedQuery ? `&q=${encodeURIComponent(normalizedQuery)}` : ""}`,
    fallback,
  );

  return (
    <main className="content-shell">
      <SiteNav />
      <header className="content-hero">
        <p className="eyebrow">índice público · procedencia</p>
        <h1>Buscar</h1>
        <p>
          Explora especies, manuales, fuentes, lugares, ejemplares y relaciones
          culturales publicables. Los resultados respetan visibilidad, revisión
          y sensibilidad; un registro restringido no se vuelve encontrable por
          conocer su nombre.
        </p>
      </header>
      <form className="species-search" method="get">
        <label htmlFor="knowledge-query">
          Buscar en el conocimiento público
        </label>
        <div>
          <input
            id="knowledge-query"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Echinopsis, GBIF, cultivo…"
          />
          <button type="submit">Buscar</button>
        </div>
      </form>
      <section className="content-grid" aria-label="Resultados de búsqueda">
        {results.length ? (
          results.map((result) => (
            <article
              className="species-card"
              key={`${result.kind}:${result.publicId}`}
            >
              <p className="card-kicker">{kindLabels[result.kind]}</p>
              <h2>
                <Link href={result.path}>{result.title}</Link>
              </h2>
              <p>{result.summary}</p>
              <div className="tag-row">
                {result.subjectPublicId ? (
                  <span className="tag">sujeto · {result.subjectPublicId}</span>
                ) : null}
                <span className="tag">
                  {result.sourcePublicIds.length
                    ? `fuente · ${result.sourcePublicIds.join(", ")}`
                    : "fuente asociada no visible en esta proyección"}
                </span>
              </div>
            </article>
          ))
        ) : (
          <p className="empty-note">
            No hay coincidencias publicables. La ausencia de un resultado no
            demuestra que el registro no exista: puede estar bajo revisión o
            tener una restricción de sensibilidad.
          </p>
        )}
      </section>
    </main>
  );
}
