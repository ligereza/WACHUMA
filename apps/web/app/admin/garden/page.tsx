import Link from "next/link";
import { SiteNav } from "../../components/SiteNav";
import { GardenIntakeForm } from "./GardenIntakeForm";

export default function GardenIntakePage() {
  return (
    <main className="content-shell">
      <SiteNav />
      <Link className="back-link" href="/garden">
        ← Volver al jardín
      </Link>
      <header className="content-hero">
        <p className="eyebrow">operación editorial · jardín</p>
        <h1>Incorporar ejemplar</h1>
        <p className="lede">
          Registra material biológico real con su procedencia. La entrada queda
          restringida, sensible o bajo control comunitario hasta que un revisor
          confirme licencia, atribución y privacidad.
        </p>
      </header>
      <GardenIntakeForm />
      <p className="detail-actions">
        <Link href="/admin/lineage">
          Registrar una relación de linaje con procedencia →
        </Link>
      </p>
    </main>
  );
}
