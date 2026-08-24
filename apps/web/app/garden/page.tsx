import { Garden3DPreview } from "../components/Garden3DPreview";
import { SiteNav } from "../components/SiteNav";
import Link from "next/link";
import { demoPublicSpecimen } from "@wachuma/garden";
import type { SpecimenRecord } from "@wachuma/shared";
import { loadApi } from "../lib/api";

export const dynamic = "force-dynamic";

export default async function GardenPage() {
  const specimens = await loadApi<SpecimenRecord[]>(
    "/api/v1/garden/specimens?limit=100",
    [demoPublicSpecimen],
  );
  return (
    <main className="content-shell">
      <SiteNav />
      <header className="content-hero">
        <p className="eyebrow">colección · escenas · linaje</p>
        <h1>Jardín</h1>
        <p>
          La escena demo usa ejemplares ficticios privados. El modelo visual
          público puede existir sin revelar sus ubicaciones ni identidades.
        </p>
      </header>
      <section className="studio-section garden-page-studio">
        <div className="studio-copy">
          <p className="eyebrow">estudio 3D</p>
          <h2>Componer, observar y conservar una versión.</h2>
          <p>
            Mueve los objetos localmente, cambia escala y exporta un snapshot.
            La persistencia colaborativa requiere autenticación y queda separada
            de la vista pública.
          </p>
        </div>
        <Garden3DPreview />
      </section>
      <section className="detail-layout garden-notes">
        <article className="detail-card">
          <p className="card-kicker">Ejemplares públicos</p>
          <p>Los registros públicos no exponen ubicaciones exactas privadas.</p>
          {specimens.map((specimen) => (
            <p className="detail-actions" key={specimen.publicId}>
              <Link href={`/specimens/${specimen.publicId}`}>
                {specimen.publicId} · {specimen.specimenType} →
              </Link>
            </p>
          ))}
        </article>
        <article className="detail-card">
          <p className="card-kicker">QR y linaje</p>
          <p>
            Los identificadores públicos y relaciones de linaje se mostrarán
            cuando exista autorización para publicar el material concreto.
          </p>
          <p className="detail-actions">
            <Link href="/admin/garden">
              Incorporar un ejemplar con procedencia →
            </Link>
          </p>
        </article>
      </section>
    </main>
  );
}
