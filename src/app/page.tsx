'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = query.trim();
    if (q.length < 2) {
      setError('Ingresa al menos 2 caracteres');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/guests/search?q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error('Error al buscar');
      const data = (await res.json()) as { results: Array<{ id: string; name: string }> };
      if (data.results.length === 0) {
        setError('No encontramos tu nombre. Si crees que es un error, avísanos.');
        return;
      }
      if (data.results.length === 1) {
        router.push(`/rsvp/${data.results[0].id}`);
        return;
      }
      // Múltiples: dejo el más probable primero
      router.push(`/rsvp/${data.results[0].id}?q=${encodeURIComponent(q)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col">
      {/* Hero */}
      <section className="relative w-full">
        <div className="relative h-[60vh] min-h-[420px] w-full overflow-hidden bg-moss-700">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/foto.jpg"
            alt="Mael &amp; Tamara"
            className="absolute inset-0 h-full w-full object-cover object-center opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-moss-900/40 via-moss-900/10 to-sand-50" />
        </div>
        <div className="relative -mt-32 z-10 px-6">
          <div className="mx-auto max-w-2xl rounded-2xl bg-sand-50/95 backdrop-blur shadow-xl border border-sand-100 p-8 md:p-12 text-center">
            <p className="uppercase tracking-[0.3em] text-xs text-moss-500 mb-3">
              Nos casamos
            </p>
            <h1 className="font-serif text-5xl md:text-6xl text-moss-900 leading-tight">
              Mael &amp; Tamara
            </h1>
            <p className="mt-4 font-serif text-xl text-moss-700 italic">
              5 de marzo de 2027 · 17:30 hrs
            </p>
            <div className="my-8 h-px w-24 bg-sand-300 mx-auto" />
            <p className="text-moss-700">
              Busca tu nombre y confirma tu asistencia.
            </p>

            <form onSubmit={onSubmit} className="mt-6 flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tu nombre y apellido"
                className="flex-1 rounded-full border border-sand-300 bg-white px-5 py-3 text-moss-900 placeholder:text-moss-400 focus:outline-none focus:ring-2 focus:ring-moss-400"
                aria-label="Buscar invitado"
                autoComplete="off"
              />
              <button
                type="submit"
                disabled={loading}
                className="rounded-full bg-moss-600 px-6 py-3 font-medium text-sand-50 hover:bg-moss-700 transition disabled:opacity-50"
              >
                {loading ? 'Buscando…' : 'Buscar'}
              </button>
            </form>
            {error && (
              <p className="mt-4 text-sm text-red-700" role="alert">
                {error}
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-2xl px-6 py-16 text-center text-moss-700">
        <p className="font-serif text-2xl italic">
          &ldquo;El amor no se trata de encontrar a la persona perfecta, sino de
          ver perfecta a la persona que encuentras.&rdquo;
        </p>
      </section>

      <footer className="mt-auto py-8 text-center text-xs text-moss-500">
        Hecho con ♥ por Heisenberg Agent
      </footer>
    </main>
  );
}