import { notFound } from "next/navigation";
import Link from "next/link";
import { demoSpeciesDocument } from "@wachuma/taxonomy";
import type { SpeciesDocument } from "@wachuma/shared";
import { demoGrowingGuide } from "@wachuma/cultivation";
import { demoPublicSpecimen } from "@wachuma/garden";
import {
  demoPublicLineage,
  type PublicLineageDocument,
} from "@wachuma/lineage";
import type {
  GrowingGuide,
  PublicCulturalRelation,
  SpecimenRecord,
} from "@wachuma/shared";
import { SiteNav } from "../../components/SiteNav";
import { loadApi, loadApiOrNull } from "../../lib/api";

export function generateStaticParams() {
  return [{ publicId: demoSpeciesDocument.publicId }];
}

export default async function SpeciesDetailPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const species =
    (await loadApiOrNull<SpeciesDocument>(
      `/api/v1/species/${encodeURIComponent(publicId)}`,
    )) ??
    (publicId === demoSpeciesDocument.publicId ? demoSpeciesDocument : null);
  if (!species) notFound();
  const [specimens, guides, culturalRelations, speciesLineage] =
    await Promise.all([
      loadApi<SpecimenRecord[]>("/api/v1/garden/specimens?limit=100", [
        demoPublicSpecimen,
      ]),
      loadApi<GrowingGuide[]>("/api/v1/guides?limit=100", [demoGrowingGuide]),
      loadApi<PublicCulturalRelation[]>(
        `/api/v1/culture/relations?subjectPublicId=${encodeURIComponent(publicId)}`,
        [],
      ),
      loadApiOrNull<PublicLineageDocument>(
        `/api/v1/lineage/${encodeURIComponent(publicId)}`,
      ),
    ]);
  const speciesSpecimens = specimens.filter(
    (specimen) =>
      specimen.biologicalEntityPublicId === publicId ||
      (publicId === demoSpeciesDocument.publicId &&
        specimen.publicId === demoPublicSpecimen.publicId),
  );
  const speciesGuides = guides.filter(
    (guide) =>
      guide.subjectPublicId === publicId ||
      (publicId === demoSpeciesDocument.publicId &&
        guide.publicId === demoGrowingGuide.publicId),
  );
  const specimenLineage =
    speciesLineage ?? demoPublicLineage(demoPublicSpecimen.publicId);
  return (
    <main className="content-shell">
      <SiteNav />
      <Link className="back-link" href="/species">
        ← Volver al explorador
      </Link>
      <header className="species-header">
        <p className="eyebrow">ficha de especie · {species.rank}</p>
        <h1>
          <em>{species.scientificName}</em>
        </h1>
        <p className="species-summary">{species.description}</p>
        <div className="tag-row">
          <span className="tag">estado · {species.taxonomicStatus}</span>
          <span className="tag">entidad · {species.entityType}</span>
          <span className="tag">visibilidad · {species.visibility}</span>
        </div>
      </header>

      <div className="detail-layout">
        <section className="detail-card">
          <p className="card-kicker">Nombres culturales relacionados</p>
          <div className="name-list">
            {species.vernacularNames.map((name) => (
              <article key={name.term}>
                <h2>{name.term}</h2>
                <p>{name.context}</p>
                <small>
                  Fuente: {name.sourcePublicId} · revisión {name.reviewStatus}
                </small>
              </article>
            ))}
          </div>
        </section>

        <section className="detail-card">
          <p className="card-kicker">Taxonomía y distribución</p>
          <dl className="fact-list">
            <div>
              <dt>Nombre científico</dt>
              <dd>{species.scientificName}</dd>
            </div>
            <div>
              <dt>Identificadores externos</dt>
              <dd>
                {species.externalIdentifiers.length === 0
                  ? "Pendiente de sincronización verificada"
                  : species.externalIdentifiers
                      .map((item) => `${item.namespace}:${item.identifier}`)
                      .join(", ")}
              </dd>
            </div>
            <div>
              <dt>Distribución pública</dt>
              <dd>
                {species.distribution.length === 0
                  ? "Sin datos externos cargados en este fixture"
                  : species.distribution.map((item) => item.label).join(", ")}
              </dd>
            </div>
          </dl>
          {species.taxonomicVariants?.length ? (
            <div className="name-list compact-name-list">
              <p className="card-kicker">Variantes taxonómicas</p>
              {species.taxonomicVariants.map((variant) => (
                <article key={variant.name}>
                  <h2>{variant.name}</h2>
                  <p>{variant.context}</p>
                  <small>
                    {variant.relationType} · fuente {variant.sourcePublicId} ·
                    revisión {variant.reviewStatus}
                  </small>
                </article>
              ))}
            </div>
          ) : null}
          <div className="name-list compact-name-list">
            <p className="card-kicker">Distribución registrada</p>
            {species.distribution.map((place) => (
              <article key={place.placePublicId ?? place.label}>
                <h2>{place.label}</h2>
                <small>
                  {place.sourcePublicId
                    ? `Fuente: ${place.sourcePublicId}`
                    : "Sin fuente publicada"}
                </small>
              </article>
            ))}
          </div>
        </section>

        <section className="detail-card">
          <p className="card-kicker">Ecología</p>
          {species.ecology.map((item) => (
            <p key={item}>{item}</p>
          ))}
          <p className="card-kicker">Cultivo</p>
          {species.cultivation.map((item) => (
            <p key={item}>{item}</p>
          ))}
          <p>
            {speciesGuides.length
              ? `${speciesGuides.length} guía(s) de cultivo publicadas.`
              : "No hay una guía de cultivo publicada para esta entidad."}
          </p>
          <p className="detail-actions">
            <Link href="/cultivation">
              Abrir manuales versionados y claims →
            </Link>
          </p>
        </section>

        <section className="detail-card">
          <p className="card-kicker">Ejemplares del jardín</p>
          {speciesSpecimens.length ? (
            speciesSpecimens.map((specimen) => (
              <p className="detail-actions" key={specimen.publicId}>
                <Link href={`/specimens/${specimen.publicId}`}>
                  {specimen.publicId} · {specimen.specimenType} →
                </Link>
              </p>
            ))
          ) : (
            <p>No hay ejemplares públicos asociados.</p>
          )}
          <p>La ubicación exacta no forma parte de esta ficha pública.</p>
        </section>

        <section className="detail-card">
          <p className="card-kicker">Linajes</p>
          <p>
            {speciesLineage
              ? `${speciesLineage.relationships.length} relaciones públicas registradas.`
              : "No hay linaje público para este fixture."}
          </p>
          <p className="detail-actions">
            <Link href={`/lineage/${publicId}`}>Ver árbol de linaje →</Link>
          </p>
        </section>

        <section className="detail-card">
          <p className="card-kicker">Relaciones culturales</p>
          <p>
            {culturalRelations.length
              ? `${culturalRelations.length} relaciones publicables.`
              : "No hay relaciones culturales aceptadas y publicables; los registros restringidos permanecen fuera de la ficha."}
          </p>
          <p className="detail-actions">
            <Link href="/culture">Consultar sección cultural →</Link>
          </p>
        </section>

        <section className="detail-card">
          <p className="card-kicker">Historia</p>
          {species.history.map((item) => (
            <p key={item}>{item}</p>
          ))}
        </section>

        <section className="detail-card">
          <p className="card-kicker">Especies relacionadas</p>
          {species.relatedSpecies.length ? (
            species.relatedSpecies.map((related) => (
              <p key={related.publicId}>{related.scientificName}</p>
            ))
          ) : (
            <p className="empty-note">
              No hay relaciones taxonómicas publicables en este fixture.
            </p>
          )}
        </section>

        <section className="detail-card">
          <p className="card-kicker">Galería y medios</p>
          {species.media.length ? (
            species.media.map((media) => (
              <article className="source-row" key={media.uri}>
                <h2>{media.title ?? "Medio asociado"}</h2>
                <p>
                  Representación procedural; no es fotografía ni reconstrucción
                  científica de un ejemplar.
                </p>
                <small>
                  {media.license} · {media.attribution}
                </small>
                <a href={media.uri}>Abrir medio</a>
              </article>
            ))
          ) : (
            <p className="empty-note">No hay medios publicables.</p>
          )}
        </section>

        <section className="detail-card">
          <p className="card-kicker">Fuentes</p>
          {species.sources.map((source) => (
            <article key={source.publicId} className="source-row">
              <h2>{source.title}</h2>
              <p>{source.citation}</p>
              <small>
                {source.assertionType} · {source.license} · {source.attribution}
              </small>
              {source.url ? (
                <a href={source.url} target="_blank" rel="noreferrer">
                  Abrir fuente
                </a>
              ) : null}
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
