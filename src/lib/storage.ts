import { promises as fs } from 'node:fs';
import path from 'node:path';

export type RsvpStatus = 'pending' | 'attending' | 'declined';

export type Rsvp = {
  status: RsvpStatus;
  attendees: number;
  dietary?: string;
  message?: string;
  confirmedAt?: string | null;
};

export type Guest = {
  id: string;
  name: string;
  normalized: string;
  rsvp: Rsvp;
};

const DATA_DIR = path.join(process.cwd(), 'data');
const GUESTS_FILE = path.join(DATA_DIR, 'guests.json');

// Supabase opcional: si están las env vars, usamos Supabase.
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

async function readJson(): Promise<Guest[]> {
  try {
    const raw = await fs.readFile(GUESTS_FILE, 'utf-8');
    return JSON.parse(raw) as Guest[];
  } catch {
    return [];
  }
}

async function writeJson(guests: Guest[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(GUESTS_FILE, JSON.stringify(guests, null, 2), 'utf-8');
}

type SupabaseRow = {
  id: string;
  name: string;
  normalized: string;
  rsvp: Rsvp;
  updated_at?: string;
};

async function sbFetch(pathname: string, init?: RequestInit): Promise<any> {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('Supabase no configurado');
  }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${pathname}`, {
    ...init,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Supabase ${res.status}: ${text}`);
  }
  const ct = res.headers.get('content-type') ?? '';
  return ct.includes('json') ? res.json() : null;
}

const usingSupabase = Boolean(SUPABASE_URL && SUPABASE_KEY);

function rowToGuest(row: SupabaseRow): Guest {
  return {
    id: row.id,
    name: row.name,
    normalized: row.normalized,
    rsvp: row.rsvp,
  };
}

export async function readGuests(): Promise<Guest[]> {
  if (usingSupabase) {
    const rows = (await sbFetch('guests?select=*')) as SupabaseRow[];
    return rows.map(rowToGuest);
  }
  return readJson();
}

export async function findGuestById(id: string): Promise<Guest | undefined> {
  if (usingSupabase) {
    const rows = (await sbFetch(
      `guests?id=eq.${encodeURIComponent(id)}&select=*&limit=1`,
    )) as SupabaseRow[];
    return rows[0] ? rowToGuest(rows[0]) : undefined;
  }
  const guests = await readJson();
  return guests.find((g) => g.id === id);
}

export async function updateRsvp(
  id: string,
  patch: Partial<Rsvp>,
): Promise<Guest | undefined> {
  const merged: Rsvp = {
    status: patch.status ?? 'pending',
    attendees: patch.attendees ?? 1,
    dietary: patch.dietary,
    message: patch.message,
    confirmedAt: new Date().toISOString(),
  };
  if (usingSupabase) {
    await sbFetch(`guests?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ rsvp: merged }),
    });
    return findGuestById(id);
  }
  const guests = await readJson();
  const idx = guests.findIndex((g) => g.id === id);
  if (idx === -1) return undefined;
  guests[idx] = { ...guests[idx], rsvp: merged };
  await writeJson(guests);
  return guests[idx];
}

export async function insertMany(guests: Guest[]): Promise<void> {
  if (usingSupabase) {
    const rows = guests.map((g) => ({
      id: g.id,
      name: g.name,
      normalized: g.normalized,
      rsvp: g.rsvp,
    }));
    await sbFetch('guests?on_conflict=id', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify(rows),
    });
    return;
  }
  await writeJson(guests);
}