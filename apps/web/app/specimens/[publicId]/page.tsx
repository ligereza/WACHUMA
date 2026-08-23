import { notFound } from "next/navigation";
import Link from "next/link";
import { demoPublicSpecimen } from "@wachuma/garden";
import { demoCultivationEvents } from "@wachuma/cultivation";
import type { PublicCultivationEvent, SpecimenRecord } from "@wachuma/shared";
import { SiteNav } from "../../components/SiteNav";
import { loadApi, loadApiOrNull } from "../../lib/api";

export function generateStaticParams() {
  return [{ publicId: demoPublicSpecimen.publicId }];
}

export default async function SpecimenDetailPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const specimen =
    (await loadApiOrNull<SpecimenRecord>(
      `/api/v1/specimens/${encodeURIComponent(publicId)}`,
    )) ??
    (publicId === demoPublicSpecimen.publicId ? demoPublicSpecimen : null);
  if (!specimen) notFound();
  const events = await loadApi<PublicCultivationEvent[]>(
    `/api/v1/cultivation/events?specimenPublicId=${encodeURIComponent(publicId)}`,
    publicId === demoPublicSpecimen.publicId ? demoCultivationEvents : [],
  );

  return (
    <main className="content-shell">
      <SiteNav />
      <Link className="back-link" href="/garden">
        ← Volver al jardín
      </Link>
      <header className="content-hero">
        <p className="eyebrow">ficha de ejemplar · registro público</p>
        <h1>{specimen.publicId}</h1>
        <p>
          Este registro es sintético. Sirve para probar identificación,
          procedencia y linaje sin describir una ubicación privada real.
        </p>
      </header>
      <section className="detail-layout">
        <article className="detail-card">
          <p className="card-kicker">Identidad pública</p>
          <dl className="fact-list">
            <div>
              <dt>ID</dt>
              <dd>{specimen.publicId}</dd>
            </div>
            <div>
              <dt>Material</dt>
              <dd>{specimen.specimenType}</dd>
            </div>
            <div>
              <dt>Estado</dt>
              <dd>{specimen.status}</dd>
            </div>
            <div>
              <dt>Ubicación</dt>
              <dd>{specimen.currentLocation?.name ?? "No publicada"}</dd>
            </div>
          </dl>
        </article>
        <article className="detail-card">
          <p className="card-kicker">QR y relaciones</p>
          <p>
            El QR identifica este registro público; no funciona como permiso de
            acceso ni revela coordenadas exactas.
          </p>
          <p>
            <a href={specimen.qrUrl}>{specimen.qrUrl}</a>
          </p>
          <p className="detail-actions">
            <Link href={`/lineage/${specimen.publicId}`}>
              Ver árbol de linaje →
            </Link>
          </p>
        </article>
      </section>
      <section className="claim-list" aria-label="Eventos del ejemplar">
        <article className="detail-card">
          <p className="card-kicker">Observaciones del registro</p>
          {events.map((event) => (
            <div className="event-row" key={event.id}>
              <strong>{event.eventType}</strong>
              <span>{event.occurredAt.slice(0, 10)}</span>
              <p>{event.notes}</p>
            </div>
          ))}
        </article>
      </section>
    </main>
  );
}
