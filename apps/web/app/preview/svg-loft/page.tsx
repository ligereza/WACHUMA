import Link from "next/link";

import { GeometryNodesPachanoiPreview } from "../../components/GeometryNodesPachanoiPreview";

export default function SvgLoftPreviewPage() {
  return (
    <main className="svg-loft-page">
      <nav className="svg-loft-nav">
        <Link href="/">WACHUMA</Link>
        <Link href="/species/biological-entity-echinopsis-pachanoi">
          ficha de especie →
        </Link>
      </nav>
      <GeometryNodesPachanoiPreview />
    </main>
  );
}
