import { notFound } from 'next/navigation';
import { findGuestById, readGuests } from '@/lib/storage';
import RsvpForm from './RsvpForm';

export const dynamic = 'force-dynamic';

export default async function RsvpPage({
  params,
}: {
  params: { id: string };
}) {
  const guest = await findGuestById(params.id);
  if (!guest) {
    // Sugerimos candidatos cercanos (búsqueda por prefijo)
    const all = await readGuests();
    const candidates = all.slice(0, 8).map((g) => ({ id: g.id, name: g.name }));
    notFound();
    return null;
  }

  return (
    <main className="min-h-screen flex flex-col items-center px-6 py-16">
      <div className="w-full max-w-xl">
        <a href="/" className="text-sm text-moss-600 hover:text-moss-800">
          ← Volver
        </a>
        <div className="mt-6 rounded-2xl bg-white shadow-lg border border-sand-100 p-8 md:p-10">
          <p className="uppercase tracking-[0.3em] text-xs text-moss-500 mb-2">
            Confirmación de asistencia
          </p>
          <h1 className="font-serif text-4xl text-moss-900">Hola, {guest.name} ✨</h1>
          <p className="mt-2 text-moss-700">
            Mael &amp; Tamara · 5 de marzo de 2027 · 17:30 hrs
          </p>
          <RsvpForm guest={guest} />
        </div>
      </div>
    </main>
  );
}