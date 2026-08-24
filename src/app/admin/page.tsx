import { readGuests } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export default async function AdminPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const expected = process.env.ADMIN_TOKEN ?? 'tamara2027';
  if (searchParams.token !== expected) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <form
          action="/admin"
          className="rounded-xl bg-white shadow p-8 max-w-sm w-full space-y-3"
        >
          <h1 className="font-serif text-2xl text-moss-900">Acceso admin</h1>
          <input
            type="password"
            name="token"
            placeholder="Token"
            className="w-full rounded border border-sand-300 px-3 py-2"
          />
          <button className="w-full rounded bg-moss-600 text-sand-50 py-2">
            Entrar
          </button>
        </form>
      </main>
    );
  }

  const guests = await readGuests();
  const attending = guests.filter((g) => g.rsvp.status === 'attending');
  const declined = guests.filter((g) => g.rsvp.status === 'declined');
  const pending = guests.filter((g) => g.rsvp.status === 'pending');

  const table = guests.map((g) => {
    const statusColor =
      g.rsvp.status === 'attending'
        ? 'bg-emerald-100 text-emerald-900'
        : g.rsvp.status === 'declined'
        ? 'bg-rose-100 text-rose-900'
        : 'bg-amber-100 text-amber-900';
    const statusLabel =
      g.rsvp.status === 'attending'
        ? 'Confirmó'
        : g.rsvp.status === 'declined'
        ? 'No va'
        : 'Pendiente';
    return { ...g, statusColor, statusLabel };
  });

  return (
    <main className="min-h-screen px-6 py-10 bg-sand-50">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="flex items-center justify-between">
          <h1 className="font-serif text-4xl text-moss-900">RSVP · Mael & Tamara</h1>
          <span className="text-sm text-moss-600">
            {guests.length} invitados ·{' '}
            {attending.length} confirmaron
          </span>
        </header>

        <div className="grid grid-cols-3 gap-4">
          <Stat label="Confirmaron" value={attending.length} accent="emerald" />
          <Stat label="No pueden" value={declined.length} accent="rose" />
          <Stat label="Pendientes" value={pending.length} accent="amber" />
        </div>

        <section className="rounded-xl bg-white shadow border border-sand-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-sand-100 text-moss-700 text-left">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Restricciones</th>
                <th className="px-4 py-3">Mensaje</th>
                <th className="px-4 py-3">Confirmado</th>
              </tr>
            </thead>
            <tbody>
              {table.map((g) => (
                <tr key={g.id} className="border-t border-sand-100">
                  <td className="px-4 py-3 font-medium text-moss-900">{g.name}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-3 py-1 text-xs ${g.statusColor}`}>
                      {g.statusLabel}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-moss-700">
                    {g.rsvp.dietary ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-moss-700">
                    {g.rsvp.message ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-moss-500">
                    {g.rsvp.confirmedAt
                      ? new Date(g.rsvp.confirmedAt).toLocaleString('es-CL')
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: 'emerald' | 'rose' | 'amber';
}) {
  const colors = {
    emerald: 'bg-emerald-50 text-emerald-900 border-emerald-200',
    rose: 'bg-rose-50 text-rose-900 border-rose-200',
    amber: 'bg-amber-50 text-amber-900 border-amber-200',
  } as const;
  return (
    <div
      className={`rounded-xl border px-4 py-5 ${colors[accent]}`}
    >
      <div className="text-3xl font-serif">{value}</div>
      <div className="text-xs uppercase tracking-widest mt-1">{label}</div>
    </div>
  );
}