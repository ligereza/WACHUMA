import { Garden3DPreview } from "./components/Garden3DPreview";
import { SiteNav } from "./components/SiteNav";
import Link from "next/link";

const layers = [
  ["organismo", "Taxonomía, ecología y distribución"],
  ["jardín", "Ejemplares vivos, ubicaciones y eventos"],
  ["linaje", "Semillas, esquejes, clones y culturas"],
  ["memoria", "Historias, comunidades, lugares y fuentes"],
];

export default function HomePage() {
  return (
    <main className="garden-shell">
      <SiteNav />
      <section className="hero">
        <p className="eyebrow">
          atlas biológico · jardín digital · memoria viva
        </p>
        <h1>WACHUMA</h1>
        <p className="lede">
          Una base abierta para mirar una especie como organismo, cultivo,
          ecosistema y memoria cultural, sin borrar sus diferencias.
        </p>
        <div className="hero-actions">
          <Link href="/species" className="button button-primary">
            Explorar especies
          </Link>
          <a href="https://github.com/ligereza/WACHUMA" className="button">
            Ver el proyecto
          </a>
        </div>
      </section>

      <section
        id="explorar"
        className="layer-grid"
        aria-label="Capas del jardín"
      >
        {layers.map(([title, description], index) => (
          <article className="layer-card" key={title}>
            <span className="layer-index">0{index + 1}</span>
            <h2>{title}</h2>
            <p>{description}</p>
          </article>
        ))}
      </section>

      <section className="studio-section" aria-labelledby="studio-title">
        <div className="studio-copy">
          <p className="eyebrow">laboratorio espacial · escena reproducible</p>
          <h2 id="studio-title">
            Diseñar el jardín también es una forma de conocerlo.
          </h2>
          <p>
            Cada objeto visual podrá vincularse a un ejemplar, una entidad
            biológica o una interpretación procedural. La receta conserva su
            semilla, versión, fuentes y licencia; la imagen nunca reemplaza la
            procedencia.
          </p>
          <div className="studio-meta">
            <span>GLB / glTF</span>
            <span>seed 304</span>
            <span>procedural-interpretation</span>
          </div>
        </div>
        <Garden3DPreview />
      </section>

      <footer>
        Caso de prueba: <em>Echinopsis pachanoi</em> /{" "}
        <em>Trichocereus pachanoi</em>. Los nombres culturales se muestran con
        contexto y procedencia.
      </footer>
    </main>
  );
}
