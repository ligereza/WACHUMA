import { notFound } from "next/navigation";
import Link from "next/link";
import { demoSpeciesDocument } from "@wachuma/taxonomy";
import type { SpeciesDocument } from "@wachuma/shared";
import type { PublicLineageDocument } from "@wachuma/lineage";
import type {
  GrowingGuide,
  Claim,
  PublicCulturalRelation,
  PublicObservation,
  SpecimenRecord,
  TraitMeasurement,
} from "@wachuma/shared";
import { SiteNav } from "../../components/SiteNav";
import { isDemoMode, loadApi, loadApiOrNull } from "../../lib/api";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return [{ publicId: demoSpeciesDocument.publicId }];
}

export default async function SpeciesDetailPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const demoFallback = isDemoMode();
  const species =
    (await loadApiOrNull<SpeciesDocument>(
      `/api/v1/species/${encodeURIComponent(publicId)}`,
    )) ??
    (demoFallback && publicId === demoSpeciesDocument.publicId
      ? demoSpeciesDocument
      : null);
  if (!species) notFound();
  const [
    specimens,
    guides,
    culturalRelations,
    claims,
    speciesLineage,
    traits,
    observations,
  ] = await Promise.all([
    loadApi<SpecimenRecord[]>("/api/v1/garden/specimens?limit=100", []),
    loadApi<GrowingGuide[]>("/api/v1/guides?limit=100", []),
    loadApi<PublicCulturalRelation[]>(
      `/api/v1/culture/relations?subjectPublicId=${encodeURIComponent(publicId)}`,
      [],
    ),
    loadApi<Claim[]>(
      `/api/v1/claims?subjectPublicId=${encodeURIComponent(publicId)}&limit=100`,
      [],
    ),
    loadApiOrNull<PublicLineageDocument>(
      `/api/v1/lineage/${encodeURIComponent(publicId)}`,
    ),
    loadApi<TraitMeasurement[]>(
      `/api/v1/traits?subjectPublicId=${encodeURIComponent(publicId)}&limit=100`,
      [],
    ),
    loadApi<PublicObservation[]>(
      "/api/v1/observations?subjectPublicId=" +
        encodeURIComponent(publicId) +
        "&limit=100",
      [],
    ),
  ]);
  const speciesSpecimens = specimens.filter(
    (specimen) => specimen.biologicalEntityPublicId === publicId,
  );
  const speciesGuides = guides.filter(
    (guide) => guide.subjectPublicId === publicId,
  );
  const speciesObservations = observations.filter(
    (observation) => observation.subjectPublicId === publicId,
  );
  const specimenLineage = speciesLineage;
  const ecologyClaims = claims.filter((claim) =>
    ["nativeRange", "ecologicalContext", "biome"].includes(claim.predicate),
  );
  const cultivationClaims = speciesGuides.flatMap((guide) =>
    guide.claims.map((claim) => ({ guide, claim })),
  );
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
                  ? "No hay distribución pública cargada todavía."
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
          {species.ecology.length || ecologyClaims.length ? (
            <>
              {species.ecology.map((item) => (
                <p key={item}>{item}</p>
              ))}
              {ecologyClaims.map((claim) => (
                <p key={claim.publicId}>
                  {claim.objectText}
                  <br />
                  <small>
                    {claim.predicate} · {claim.sourcePublicId ?? claim.sourceId}
                  </small>
                </p>
              ))}
            </>
          ) : (
            <p>No hay información ecológica publicable todavía.</p>
          )}
          <p className="card-kicker">Cultivo</p>
          {species.cultivation.length ? (
            species.cultivation.map((item) => <p key={item}>{item}</p>)
          ) : (
            <p>
              La orientación de cultivo se conserva en manuales versionados y
              claims con bibliografía, no como una regla taxonómica automática.
            </p>
          )}
          <p>
            {speciesGuides.length
              ? `${speciesGuides.length} guía(s) de cultivo publicadas.`
              : "No hay una guía de cultivo publicada para esta entidad."}
          </p>
          {cultivationClaims.map(({ guide, claim }) => (
            <p key={claim.id}>
              <strong>{claim.sectionKey}:</strong> {claim.statement}
              <br />
              <small>
                {guide.publicId} · {claim.sourcePublicId ?? claim.sourceId}
              </small>
            </p>
          ))}
          <p className="detail-actions">
            <Link href="/cultivation">
              Abrir manuales versionados y claims →
            </Link>
          </p>
        </section>

        <section className="detail-card">
          <p className="card-kicker">Afirmaciones verificables</p>
          {claims.length ? (
            <div className="claim-list">
              {claims.map((claim) => (
                <article key={claim.publicId}>
                  <p className="card-kicker">{claim.predicate}</p>
                  <p>{claim.objectText ?? "Valor estructurado"}</p>
                  <small>
                    {claim.assertionType} · evidencia {claim.evidenceLevel} ·
                    fuente {claim.sourcePublicId ?? claim.sourceId}
                  </small>
                </article>
              ))}
            </div>
          ) : (
            <p>
              Todavía no hay afirmaciones publicables asociadas a esta entidad.
              La ausencia de un claim no se interpreta como ausencia del hecho.
            </p>
          )}
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
          <p className="card-kicker">Observaciones públicas</p>
          {speciesObservations.length ? (
            speciesObservations.map((observation) => {
              const countryCode = observation.environment.countryCode;
              const stateProvince = observation.environment.stateProvince;
              const locationLabel =
                observation.placeName ??
                (typeof stateProvince === "string" ? stateProvince : null) ??
                (typeof countryCode === "string" ? countryCode : null) ??
                "Registro externo";
              return (
                <article className="source-row" key={observation.publicId}>
                  <h2>{locationLabel}</h2>
                  <p>
                    {observation.observationBasis} ·{" "}
                    {observation.observedAt.slice(0, 10)}
                  </p>
                  <small>
                    registro {observation.publicId} · fuente{" "}
                    {observation.sourcePublicId ?? "sin fuente publicada"}
                    {observation.sourceRecordId
                      ? " · " + observation.sourceRecordId
                      : ""}
                    {observation.geometryPublic
                      ? " · geometría pública aproximada"
                      : ""}
                  </small>
                </article>
              );
            })
          ) : (
            <p className="empty-note">
              No hay observaciones públicas asociadas. Esto no implica ausencia
              del organismo; sólo indica que no hay registros publicados para
              esta entidad.
            </p>
          )}
        </section>

        <section className="detail-card">
          <p className="card-kicker">Rasgos y mediciones</p>
          {traits.length ? (
            traits.map((trait) => (
              <article className="source-row" key={trait.publicId}>
                <h2>{trait.traitLabel}</h2>
                <p>
                  {trait.valueNumeric ??
                    trait.valueText ??
                    (trait.value
                      ? JSON.stringify(trait.value)
                      : "Valor estructurado")}
                  {trait.unit ? ` ${trait.unit}` : ""}
                </p>
                <small>
                  {trait.traitNamespace}:{trait.traitIdentifier} · método{" "}
                  {trait.method ?? "no indicado"}
                  <br />
                  medido {trait.measuredAt} · fuente {trait.sourceId}
                </small>
              </article>
            ))
          ) : (
            <p>
              No hay rasgos públicos asociados. Las mediciones pendientes o sin
              resolución taxonómica no se presentan como hechos de esta especie.
            </p>
          )}
        </section>

        <section className="detail-card">
          <p className="card-kicker">Linajes</p>
          <p>
            {speciesLineage
              ? `${speciesLineage.relationships.length} relaciones públicas registradas.`
              : "No hay linaje público registrado para esta entidad."}
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
          {species.history.length ? (
            species.history.map((item) => <p key={item}>{item}</p>)
          ) : (
            <p className="empty-note">
              No hay un relato histórico publicable asociado todavía.
            </p>
          )}
        </section>

        <section className="detail-card">
          <p className="card-kicker">Especies relacionadas</p>
          {species.relatedSpecies.length ? (
            species.relatedSpecies.map((related) => (
              <p key={related.publicId}>{related.scientificName}</p>
            ))
          ) : (
            <p className="empty-note">
              No hay especies relacionadas publicadas para esta entidad.
            </p>
          )}
        </section>

        <section className="detail-card">
          <p className="card-kicker">Galería y medios</p>
          {species.media.length ? (
            species.media.map((media) => (
              <article className="source-row" key={media.uri}>
                <h2>{media.title ?? "Medio asociado"}</h2>
                {media.mediaType === "image" ? (
                  <img
                    className="species-media"
                    src={media.uri}
                    alt={media.title ?? "Observación multimedia asociada"}
                    loading="lazy"
                  />
                ) : (
                  <p>
                    Medio asociado; se conserva el descriptor del proveedor.
                  </p>
                )}
                <small>
                  {media.mediaType ?? "media"} · {media.license} ·{" "}
                  {media.attribution}
                </small>
                <a href={media.uri} target="_blank" rel="noreferrer">
                  Abrir medio
                </a>
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
                {source.sourceType} · {source.license} · {source.attribution}
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
