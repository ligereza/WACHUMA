import { CulturalRelationForm } from "./CulturalRelationForm";
import { SiteNav } from "../../components/SiteNav";

export default function CulturalRelationSubmitPage() {
  return (
    <main className="content-shell">
      <SiteNav />
      <header className="content-hero">
        <p className="eyebrow">editorial · procedencia · revisión</p>
        <h1>Aportar contexto</h1>
        <p>
          Este formulario crea borradores protegidos. No publica una relación
          cultural automáticamente: cada registro debe conservar comunidad,
          fuente, perspectiva, licencia, sensibilidad y estado de revisión.
        </p>
      </header>
      <section className="detail-card editor-card">
        <CulturalRelationForm />
      </section>
    </main>
  );
}
