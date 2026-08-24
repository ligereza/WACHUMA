import Link from "next/link";
import { SiteNav } from "../../components/SiteNav";
import { ReviewInbox } from "./ReviewInbox";

export default function EditorialReviewPage() {
  return (
    <main className="content-shell">
      <SiteNav />
      <header className="content-hero">
        <p className="eyebrow">Operación editorial · acceso protegido</p>
        <h1>Revisión de fuentes</h1>
        <p className="lede">
          Una bandeja para decidir qué registros externos pueden pasar de
          staging a publicación, conservando licencia, atribución, privacidad y
          notas de revisión.
        </p>
        <p className="detail-actions">
          <Link href="/admin/culture">
            Abrir bandeja de revisión cultural →
          </Link>
        </p>
      </header>
      <ReviewInbox />
    </main>
  );
}
