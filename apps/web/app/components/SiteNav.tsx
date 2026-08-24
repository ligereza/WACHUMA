import Link from "next/link";

export function SiteNav() {
  return (
    <nav className="site-nav" aria-label="Navegación principal">
      <Link className="site-brand" href="/">
        WACHUMA
      </Link>
      <div className="site-links">
        <Link href="/species">Especies</Link>
        <Link href="/search">Buscar</Link>
        <Link href="/garden">Jardín</Link>
        <Link href="/cultivation">Cultivo</Link>
        <Link href="/culture">Cultura</Link>
        <Link href="/map">Mapa</Link>
        <Link href="/sources">Fuentes</Link>
        <Link href="/culture/submit">Aportar</Link>
      </div>
    </nav>
  );
}
