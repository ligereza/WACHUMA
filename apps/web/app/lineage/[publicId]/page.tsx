import { notFound } from "next/navigation";
import Link from "next/link";
import { demoPublicSpecimen } from "@wachuma/garden";
import { demoSpeciesDocument } from "@wachuma/taxonomy";
import { demoLineageSubjects, demoPublicLineage } from "@wachuma/lineage";
import { SiteNav } from "../../components/SiteNav";
import type { PublicLineageDocument } from "@wachuma/lineage";
import { isDemoMode, loadApiOrNull } from "../../lib/api";

export const dynamic = "force-dynamic";

const subjects = [String(demoSpeciesDocument.publicId), ...demoLineageSubjects];

export default async function LineagePage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const demoFallback = isDemoMode();
  const lineage =
    (await loadApiOrNull<PublicLineageDocument>(
      `/api/v1/lineage/${encodeURIComponent(publicId)}`,
    )) ??
    (demoFallback && subjects.includes(publicId)
      ? demoPublicLineage(publicId)
      : null);
  if (!lineage) notFound();

  const label =
    publicId === demoSpeciesDocument.publicId
      ? demoSpeciesDocument.scientificName
      : "Ejemplar sintético público";
  return (
    <main className="content-shell">
      <SiteNav />
      <header className="content-hero">
        <p className="eyebrow">procedencia · linaje · trazabilidad</p>
        <h1>Linaje</h1>
        <p>
          Árbol público para <em>{label}</em>. Las relaciones de ejemplares
          privados solo aparecen después de pasar el filtro de visibilidad.
        </p>
      </header>
      <section className="lineage-tree" aria-label="Árbol de linaje">
        {lineage?.tree.nodes.map((node) => (
          <div className="lineage-node" key={node.id}>
            <span className="card-kicker">
              {node.parents.length === 0 ? "raíz" : "nodo"}
            </span>
            <strong>{node.id}</strong>
            <small>
              padres: {node.parents.length} · descendientes:{" "}
              {node.children.length}
            </small>
          </div>
        )) ?? (
          <div className="lineage-node lineage-node-root">
            <span className="card-kicker">sujeto</span>
            <strong>{publicId}</strong>
            <small>Sin relaciones publicables para este registro.</small>
          </div>
        )}
      </section>
      {lineage?.relationships.length ? (
        <section className="claim-list" aria-label="Relaciones de linaje">
          {lineage.relationships.map((relationship) => (
            <article
              className="detail-card"
              key={`${relationship.parentId}-${relationship.childId}-${relationship.relationshipType}`}
            >
              <p className="card-kicker">{relationship.relationshipType}</p>
              <p>
                {relationship.parentId} → {relationship.childId}
              </p>
              <small>Fuente: {relationship.sourcePublicId}</small>
            </article>
          ))}
        </section>
      ) : null}
      <p className="empty-note page-note">
        El grafo está preparado para parent_of, cutting_of, clone_of, seed_from,
        culture_from, isolate_from y cross_of. Cada arista podrá conservar su
        fuente y generación sin convertir genealogía en taxonomía.
      </p>
      {publicId === demoPublicSpecimen.publicId ? (
        <Link className="back-link" href={`/specimens/${publicId}`}>
          ← Volver a la ficha del ejemplar
        </Link>
      ) : null}
    </main>
  );
}
