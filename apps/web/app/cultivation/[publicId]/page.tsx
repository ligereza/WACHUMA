import Link from "next/link";
import { notFound } from "next/navigation";
import { demoGrowingGuide } from "@wachuma/cultivation";
import type {
  GrowingGuide,
  GrowingGuideSectionStatus,
  Source,
} from "@wachuma/shared";
import { SiteNav } from "../../components/SiteNav";
import { isDemoMode, loadApi, loadApiOrNull } from "../../lib/api";

export const dynamic = "force-dynamic";

const sectionLabels: Record<string, string> = {
  propagation: "Propagación",
  substrate: "Sustrato",
  watering: "Riego",
  light: "Luz",
  temperature: "Temperatura",
  humidity: "Humedad",
  nutrition: "Nutrición",
  calendar: "Calendario",
  pests: "Plagas",
  diseases: "Enfermedades",
  transplant: "Trasplante",
  fruiting: "Fructificación",
  harvest: "Cosecha",
  observations: "Observaciones",
  bibliography: "Bibliografía",
};

const statusLabels: Record<GrowingGuideSectionStatus, string> = {
  documented: "documentado",
  in_review: "en revisión",
  not_documented: "sin documentar",
  not_applicable: "no aplica",
};

export default async function GrowingGuideDetailPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const demoFallback = isDemoMode();
  const guide =
    (await loadApiOrNull<GrowingGuide>(
      `/api/v1/guides/${encodeURIComponent(publicId)}`,
    )) ??
    (demoFallback && publicId === demoGrowingGuide.publicId
      ? demoGrowingGuide
      : null);
  if (!guide) notFound();

  const sources = await loadApi<Source[]>("/api/v1/sources", []);
  const sourceByPublicId = new Map(
    sources.map((source) => [source.publicId, source]),
  );
  const guideSourceIds = Array.from(
    new Set(
      guide.claims.flatMap((claim) =>
        claim.sourcePublicId ? [claim.sourcePublicId] : [],
      ),
    ),
  );

  return (
    <main className="content-shell">
      <SiteNav />
      <Link className="back-link" href="/cultivation">
        ← Volver a manuales
      </Link>
      <header className="content-hero">
        <p className="eyebrow">
          manual versionado · v{guide.version} · {guide.status}
        </p>
        <h1>{guide.title}</h1>
        <p className="lede">{guide.summary}</p>
        <div className="tag-row">
          {guide.subjectPublicId ? (
            <Link className="tag" href={`/species/${guide.subjectPublicId}`}>
              Abrir ficha de especie
            </Link>
          ) : null}
          {guide.climateContext ? (
            <span className="tag">{guide.climateContext}</span>
          ) : null}
          {guide.techniqueContext ? (
            <span className="tag">{guide.techniqueContext}</span>
          ) : null}
          {guide.regionContext ? (
            <span className="tag">{guide.regionContext}</span>
          ) : null}
        </div>
      </header>

      <section className="detail-card guide-coverage">
        <p className="card-kicker">Mapa de cobertura</p>
        <p>
          Cada sección declara si tiene afirmaciones publicadas, si permanece en
          revisión o si todavía no fue documentada. Un vacío no equivale a
          ausencia del fenómeno.
        </p>
        <div className="guide-section-grid">
          {guide.sections.map((section) => (
            <article
              className={`guide-section ${section.status}`}
              key={section.sectionKey}
            >
              <strong>
                {sectionLabels[section.sectionKey] ?? section.sectionKey}
              </strong>
              <span>{statusLabels[section.status]}</span>
              <small>
                {section.claimCount} claim{section.claimCount === 1 ? "" : "s"}
                {section.note ? ` · ${section.note}` : ""}
              </small>
            </article>
          ))}
        </div>
      </section>

      <section className="claim-list" aria-label={`Claims de ${guide.title}`}>
        {guide.claims.map((claim) => {
          const source = claim.sourcePublicId
            ? sourceByPublicId.get(claim.sourcePublicId)
            : undefined;
          return (
            <article className="detail-card" key={claim.id}>
              <p className="card-kicker">{claim.sectionKey}</p>
              <h2>{claim.statement}</h2>
              <p>
                Evidencia: {claim.evidenceLevel} · {claim.assertionType}
              </p>
              <small>
                Fuente: {claim.sourcePublicId ?? claim.sourceId}
                {source?.title ? ` · ${source.title}` : ""}
              </small>
              {source?.url ? (
                <p className="detail-actions">
                  <a href={source.url} target="_blank" rel="noreferrer">
                    Abrir fuente ↗
                  </a>
                </p>
              ) : null}
            </article>
          );
        })}
      </section>
      <section className="detail-card guide-bibliography">
        <p className="card-kicker">Bibliografía del manual</p>
        {guideSourceIds.length ? (
          guideSourceIds.map((sourcePublicId) => {
            const source = sourceByPublicId.get(sourcePublicId);
            return (
              <article className="source-row" key={sourcePublicId}>
                <h2>{source?.title ?? sourcePublicId}</h2>
                {source?.citation ? <p>{source.citation}</p> : null}
                <small>
                  {sourcePublicId} · {source?.license ?? "licencia no indicada"}
                </small>
                {source?.url ? (
                  <p className="detail-actions">
                    <a href={source.url} target="_blank" rel="noreferrer">
                      Abrir fuente ↗
                    </a>
                  </p>
                ) : null}
              </article>
            );
          })
        ) : (
          <p className="empty-note">
            Este manual no tiene bibliografía publicable todavía.
          </p>
        )}
      </section>
      <p className="empty-note page-note">
        Los claims de este manual no sustituyen una observación de ejemplar ni
        una recomendación adaptada a una región. La versión, el alcance y la
        fuente forman parte del dato.
      </p>
    </main>
  );
}
