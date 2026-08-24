'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Guest } from '@/lib/storage';

type Props = { guest: Guest };

export default function RsvpForm({ guest }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<'attending' | 'declined'>(
    guest.rsvp.status === 'declined' ? 'declined' : 'attending'
  );
  const [attendees, setAttendees] = useState<number>(guest.rsvp.attendees || 1);
  const [dietary, setDietary] = useState<string>(guest.rsvp.dietary ?? '');
  const [message, setMessage] = useState<string>(guest.rsvp.message ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<null | 'attending' | 'declined' | 'updated'>(null);
  const [error, setError] = useState<string | null>(null);

  const alreadyConfirmed = guest.rsvp.status !== 'pending';

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/rsvp', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          id: guest.id,
          status,
          attendees: status === 'attending' ? attendees : 0,
          dietary: dietary || undefined,
          message: message || undefined,
        }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error ?? 'No se pudo guardar');
      }
      setDone(alreadyConfirmed ? 'updated' : status);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    const messages = {
      attending: {
        title: '¡Gracias por confirmar! 🎉',
        body: 'Nos vemos el 5 de marzo. ¡Ya estamos contando los días!',
      },
      declined: {
        title: 'Gracias por avisarnos 💛',
        body: 'Te vamos a tener en mente ese día. ¡Un abrazo!',
      },
      updated: {
        title: 'Listo, actualizamos tu respuesta ✨',
        body: 'Tu confirmación quedó guardada.',
      },
    } as const;
    const m = messages[done];
    return (
      <div className="mt-8 text-center">
        <h2 className="font-serif text-3xl text-moss-800">{m.title}</h2>
        <p className="mt-3 text-moss-700">{m.body}</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-6">
      {alreadyConfirmed && (
        <div className="rounded-md bg-sand-100 px-4 py-3 text-sm text-moss-700">
          Tu respuesta anterior está guardada. Podes modificarla acá abajo.
        </div>
      )}

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-moss-800 mb-2">
          ¿Vas a venir?
        </legend>
        <label className="flex items-start gap-3 rounded-lg border border-sand-200 bg-white px-4 py-3 cursor-pointer hover:bg-sand-50">
          <input
            type="radio"
            name="status"
            value="attending"
            checked={status === 'attending'}
            onChange={() => setStatus('attending')}
            className="mt-1 accent-moss-600"
          />
          <span>
            <span className="block font-medium text-moss-900">Sí, asisto ✨</span>
            <span className="block text-sm text-moss-600">
              ¡Qué emoción contar con vos!
            </span>
          </span>
        </label>
        <label className="flex items-start gap-3 rounded-lg border border-sand-200 bg-white px-4 py-3 cursor-pointer hover:bg-sand-50">
          <input
            type="radio"
            name="status"
            value="declined"
            checked={status === 'declined'}
            onChange={() => setStatus('declined')}
            className="mt-1 accent-moss-600"
          />
          <span>
            <span className="block font-medium text-moss-900">No puedo ir</span>
            <span className="block text-sm text-moss-600">
              Te vamos a extrañar. Avisanos si cambiás de parecer.
            </span>
          </span>
        </label>
      </fieldset>

      {status === 'attending' && (
        <>
          <div>
            <label htmlFor="attendees" className="block text-sm font-medium text-moss-800 mb-1">
              ¿Cuántas personas asisten? (incluyéndote)
            </label>
            <input
              id="attendees"
              type="number"
              min={1}
              max={10}
              value={attendees}
              onChange={(e) => setAttendees(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
              className="w-24 rounded-md border border-sand-300 px-3 py-2"
            />
          </div>

          <div>
            <label htmlFor="dietary" className="block text-sm font-medium text-moss-800 mb-1">
              Restricciones alimentarias (opcional)
            </label>
            <input
              id="dietary"
              type="text"
              maxLength={200}
              value={dietary}
              onChange={(e) => setDietary(e.target.value)}
              placeholder="Ej: vegetariano, sin gluten, sin nueces…"
              className="w-full rounded-md border border-sand-300 px-3 py-2"
            />
          </div>
        </>
      )}

      <div>
        <label htmlFor="message" className="block text-sm font-medium text-moss-800 mb-1">
          Mensaje para los novios (opcional)
        </label>
        <textarea
          id="message"
          maxLength={500}
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Algo que quieran decirnos…"
          className="w-full rounded-md border border-sand-300 px-3 py-2"
        />
      </div>

      {error && (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-full bg-moss-600 px-6 py-3 font-medium text-sand-50 hover:bg-moss-700 transition disabled:opacity-50"
      >
        {submitting ? 'Enviando…' : alreadyConfirmed ? 'Actualizar respuesta' : 'Confirmar'}
      </button>

      <p className="text-center text-xs text-moss-500">
        Esta información es confidencial. Solo la verán Mael y Tamara.
      </p>
    </form>
  );
}