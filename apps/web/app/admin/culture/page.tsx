import Link from "next/link";
import { SiteNav } from "../../components/SiteNav";
import { CultureReviewInbox } from "./CultureReviewInbox";

export default function CulturalReviewPage() {
  return (
    <main className="content-shell">
      <SiteNav />
      <Link className="back-link" href="/admin/review">
        ← Volver a revisión de fuentes
      </Link>
      <header className="content-hero">
        <p className="eyebrow">Operación editorial · conocimiento cultural</p>
        <h1>Revisión cultural</h1>
        <p className="lede">
          Revisa relaciones con contexto, perspectiva, fuente y sensibilidad.
          Una relación no se vuelve una equivalencia taxonómica por aparecer en
          esta bandeja; la publicación pública requiere una decisión explícita.
        </p>
      </header>
      <CultureReviewInbox />
    </main>
  );
}
