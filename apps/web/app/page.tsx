import Link from "next/link";

import { echinopsisScrollExperience } from "@wachuma/shared";

import { EchinopsisScrollExperience } from "./components/EchinopsisScrollExperience";
import { SiteNav } from "./components/SiteNav";

export default function HomePage() {
  return (
    <main className="experience-shell">
      <SiteNav />
      <header className="experience-intro">
        <p className="eyebrow">atlas monográfico · experiencia móvil</p>
        <h1>WACHUMA</h1>
        <p>
          Una especie, muchas capas. Baja para girar una interpretación visual
          de <em>Echinopsis pachanoi</em> y abrir su taxonomía, cultivo,
          territorio, historia, cultura y preguntas científicas.
        </p>
        <div className="experience-intro-actions">
          <span>WebGL · scroll nativo · fuentes visibles</span>
          <Link href="/species/biological-entity-echinopsis-pachanoi">
            abrir ficha completa →
          </Link>
        </div>
      </header>

      <EchinopsisScrollExperience experience={echinopsisScrollExperience} />

      <section className="experience-after" aria-labelledby="after-title">
        <p className="eyebrow">después de la escena</p>
        <h2 id="after-title">La investigación continúa fuera del canvas.</h2>
        <p>
          El atlas separa lo observado, lo publicado, lo cultural y lo
          interpretado. Los parientes, nombres de comercio y organismos
          asociados al cultivo tendrán categorías propias cuando exista una
          fuente suficiente para sostenerlos.
        </p>
        <div className="experience-after-links">
          <Link href="/cultivation">manuales de cultivo</Link>
          <Link href="/culture">cultura y procedencia</Link>
          <Link href="/sources">bibliografía y fuentes</Link>
        </div>
      </section>
    </main>
  );
}
