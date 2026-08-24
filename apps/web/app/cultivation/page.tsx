import Link from "next/link";
import { demoGrowingGuide } from "@wachuma/cultivation";
import type { GrowingGuide } from "@wachuma/shared";
import { SiteNav } from "../components/SiteNav";
import { loadApi } from "../lib/api";

export const dynamic = "force-dynamic";

export default async function CultivationPage() {
  const guides = await loadApi<GrowingGuide[]>("/api/v1/guides?limit=100", [
    demoGrowingGuide,
  ]);
  return (
    <main className="content-shell">
      <SiteNav />
      <header className="content-hero">
        <p className="eyebrow">cultivo · documentos versionados</p>
        <h1>Manuales</h1>
        <p>
          Una guía es una colección de claims por sección, clima, técnica,
          región y autor. Los borradores no se presentan como recomendaciones
          publicadas.
        </p>
      </header>
      {guides.map((guide) => (
        <section className="detail-layout" key={guide.publicId}>
          <article className="detail-card">
            <p className="card-kicker">
              versión {guide.version} · {guide.status}
            </p>
            <h2>{guide.title}</h2>
            <p>{guide.summary}</p>
            <p className="detail-actions">
              <Link href={`/cultivation/${guide.publicId}`}>
                Abrir manual y claims →
              </Link>
            </p>
            <div className="tag-row">
              <span className="tag">{guide.climateContext}</span>
              <span className="tag">{guide.regionContext}</span>
            </div>
          </article>
          <article className="detail-card">
            <p className="card-kicker">Regla editorial</p>
            <p>
              Cada afirmación conserva nivel de evidencia, tipo de assertion y
              fuente. Una guía puede estar completa en estructura y seguir en
              revisión editorial.
            </p>
          </article>
          <section
            className="claim-list"
            aria-label={`Claims de ${guide.title}`}
          >
            {guide.claims.map((claim) => (
              <article className="detail-card" key={claim.id}>
                <p className="card-kicker">{claim.sectionKey}</p>
                <h2>{claim.statement}</h2>
                <p>
                  Evidencia: {claim.evidenceLevel} · {claim.assertionType} ·
                  fuente: {claim.sourcePublicId ?? claim.sourceId}
                </p>
              </article>
            ))}
          </section>
        </section>
      ))}
    </main>
  );
}
