import "./globals.css";

export const metadata = {
  title: "Planejamento Financeiro Família Louzada",
  description: "Rumo ao primeiro imóvel, um lançamento por vez.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body className="font-sans min-h-screen">{children}</body>
    </html>
  );
}
