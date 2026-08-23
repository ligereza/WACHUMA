import Link from "next/link";

export function SiteNav() {
  return (
    <nav className="site-nav" aria-label="Navegación principal">
      <Link className="site-brand" href="/">
        WACHUMA
      </Link>
      <div className="site-links">
        <Link href="/species">Especies</Link>
        <Link href="/garden">Jardín</Link>
        <Link href="/specimens/specimen-public-demo-01">Ejemplar</Link>
        <Link href="/cultivation">Cultivo</Link>
        <Link href="/culture">Cultura</Link>
        <Link href="/culture/submit">Aportar</Link>
        <Link href="/map">Mapa</Link>
        <Link href="/sources">Fuentes</Link>
      </div>
    </nav>
  );
}
