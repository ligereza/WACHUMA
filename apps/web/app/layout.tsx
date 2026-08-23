import "./globals.css";

export const metadata = {
  title: "WACHUMA — jardín digital",
  description: "Atlas biológico y base de conocimiento biocultural abierta.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
