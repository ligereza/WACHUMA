import Link from "next/link";
import { SiteNav } from "../../components/SiteNav";
import { LineageIntakeForm } from "./LineageIntakeForm";

export default function LineageIntakePage() {
  return (
    <main className="content-shell">
      <SiteNav />
      <Link className="back-link" href="/admin/garden">
        ← Volver a operación de jardín
      </Link>
      <header className="content-hero">
        <p className="eyebrow">operación editorial · linaje</p>
        <h1>Registrar relación de linaje</h1>
        <p className="lede">
          Conecta un ejemplar o entidad con su origen documentado. La relación
          nace pendiente y sólo aparece en el árbol público después de revisar
          su procedencia.
        </p>
      </header>
      <LineageIntakeForm />
    </main>
  );
}
