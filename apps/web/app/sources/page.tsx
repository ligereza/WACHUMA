import { demoSpeciesDocument } from "@wachuma/taxonomy";
import type { Source } from "@wachuma/shared";
import { SiteNav } from "../components/SiteNav";
import { loadApi } from "../lib/api";

export const dynamic = "force-dynamic";

export default async function SourcesPage() {
  const sources = await loadApi<Source[]>(
    "/api/v1/sources",
    demoSpeciesDocument.sources as unknown as Source[],
  );
  return (
    <main className="content-shell">
      <SiteNav />
      <header className="content-hero">
        <p className="eyebrow">bibliografía · atribución · trazabilidad</p>
        <h1>Fuentes</h1>
        <p>
          Cada afirmación importante debe poder volver a una fuente, un registro
          recuperado, una licencia y una atribución visible.
        </p>
      </header>
      <section className="content-grid">
        {sources.map((source) => (
          <article
            className="species-card"
            key={source.publicId}
            id={source.publicId}
          >
            <p className="card-kicker">{source.sourceType ?? "editorial"}</p>
            <h2>{source.title}</h2>
            <p>{source.citation}</p>
            {source.url ? (
              <p className="detail-actions">
                <a href={source.url} target="_blank" rel="noreferrer">
                  Abrir fuente ↗
                </a>
              </p>
            ) : null}
            <div className="tag-row">
              <span className="tag">{source.license}</span>
              <span className="tag">{source.attribution}</span>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
