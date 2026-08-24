import {
  demoCulturalRelations,
  isPubliclyPublishableRelation,
} from "@wachuma/culture";
import type { PublicCulturalRelation } from "@wachuma/shared";
import { SiteNav } from "../components/SiteNav";
import { loadApi } from "../lib/api";

export const dynamic = "force-dynamic";

export default async function CulturePage({
  searchParams,
}: {
  searchParams: Promise<{ subjectPublicId?: string }>;
}) {
  const { subjectPublicId } = await searchParams;
  const query = subjectPublicId
    ? `?subjectPublicId=${encodeURIComponent(subjectPublicId)}`
    : "";
  const relations = await loadApi<PublicCulturalRelation[]>(
    `/api/v1/culture/relations${query}`,
    demoCulturalRelations
      .filter(isPubliclyPublishableRelation)
      .filter(
        (relation) =>
          !subjectPublicId || relation.subjectPublicId === subjectPublicId,
      )
      .map((relation) => ({
        ...relation,
        accessLevel: "public" as const,
        reviewStatus: "accepted" as const,
      })) as unknown as PublicCulturalRelation[],
  );
  return (
    <main className="content-shell">
      <SiteNav />
      <header className="content-hero">
        <p className="eyebrow">memoria · contexto · responsabilidad</p>
        <h1>Cultura</h1>
        <p>
          Las relaciones culturales son registros con comunidad, perspectiva,
          territorio, periodo, fuente, licencia y revisión. No son un dataset
          anónimo ni una equivalencia taxonómica.
        </p>
      </header>
      <section className="detail-layout">
        {relations.map((relation) => (
          <article className="detail-card" key={relation.publicId}>
            <p className="card-kicker">
              {relation.relationType} · {relation.reviewStatus}
            </p>
            <h2>{relation.valueText}</h2>
            <p>{relation.description}</p>
            <dl className="fact-list">
              <div>
                <dt>Contexto cultural o biológico</dt>
                <dd>
                  {relation.communityPublicId ??
                    relation.culturePublicId ??
                    "No publicado"}
                </dd>
              </div>
              {relation.historicalPeriod ? (
                <div>
                  <dt>Periodo histórico</dt>
                  <dd>{relation.historicalPeriod}</dd>
                </div>
              ) : null}
              {relation.documentedByName ? (
                <div>
                  <dt>Documentó</dt>
                  <dd>{relation.documentedByName}</dd>
                </div>
              ) : null}
              {relation.recordedOn ? (
                <div>
                  <dt>Registrado</dt>
                  <dd>{relation.recordedOn}</dd>
                </div>
              ) : null}
              <div>
                <dt>Fuente</dt>
                <dd>{relation.sourcePublicId}</dd>
              </div>
              <div>
                <dt>Perspectiva y acceso</dt>
                <dd>
                  {relation.authorPerspective} · {relation.accessLevel}
                </dd>
              </div>
            </dl>
          </article>
        ))}
      </section>
      <p className="empty-note page-note">
        {relations.length === 0
          ? "No hay relaciones culturales aceptadas y públicas en esta release. Existen registros restringidos y bajo revisión que no se serializan en esta página, el mapa ni las fichas públicas."
          : "Solo se muestran relaciones aceptadas, públicas y no sensibles. Los registros bajo revisión permanecen fuera de esta vista aunque tengan fuente y provenance."}
      </p>
    </main>
  );
}
