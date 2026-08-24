import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Mael & Tamara · 05/03/2027',
  description: 'Confirma tu asistencia a nuestra boda.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600&family=Inter:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-sand-50 text-moss-900 antialiased">{children}</body>
    </html>
  );
}