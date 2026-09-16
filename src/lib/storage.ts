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

const DATA_DIR = process.env.RSVP_DATA_DIR ?? path.join(process.cwd(), 'data');
const GUESTS_FILE = path.join(DATA_DIR, 'guests.json');

// GitHub opcional: almacenamiento durable para producción serverless.
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO;
const GITHUB_BRANCH = process.env.GITHUB_BRANCH ?? 'main';
const GITHUB_GUESTS_PATH = process.env.GITHUB_GUESTS_PATH ?? 'data/guests.json';

// Supabase opcional: si están las env vars, usamos Supabase.
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;
const IS_VERCEL = Boolean(process.env.VERCEL);

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

const usingGithub = Boolean(GITHUB_TOKEN && GITHUB_REPO);
const usingSupabase = Boolean(SUPABASE_URL && SUPABASE_KEY);

type GithubFile = {
  guests: Guest[];
  sha: string;
};

async function githubFetch(pathname: string, init?: RequestInit): Promise<any> {
  if (!GITHUB_TOKEN || !GITHUB_REPO) {
    throw new Error('GitHub no configurado');
  }
  const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/${pathname}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`GitHub ${res.status}: ${text}`);
  }
  return res.json();
}

function githubGuestsPath(): string {
  return encodeURIComponent(GITHUB_GUESTS_PATH).replace(/%2F/g, '/');
}

function decodeGithubContent(content: string): string {
  return Buffer.from(content.replace(/\n/g, ''), 'base64').toString('utf-8');
}

function encodeGithubContent(content: string): string {
  return Buffer.from(content, 'utf-8').toString('base64');
}

async function readGithubFile(): Promise<GithubFile> {
  const file = await githubFetch(
    `contents/${githubGuestsPath()}?ref=${encodeURIComponent(GITHUB_BRANCH)}`,
  );
  const guests = JSON.parse(decodeGithubContent(file.content)) as Guest[];
  return { guests, sha: file.sha };
}

async function writeGithubFile(
  guests: Guest[],
  sha: string,
  guestId: string,
): Promise<void> {
  await githubFetch(`contents/${githubGuestsPath()}`, {
    method: 'PUT',
    body: JSON.stringify({
      message: `chore(rsvp): update ${guestId}`,
      content: encodeGithubContent(`${JSON.stringify(guests, null, 2)}\n`),
      sha,
      branch: GITHUB_BRANCH,
    }),
  });
}

function rowToGuest(row: SupabaseRow): Guest {
  return {
    id: row.id,
    name: row.name,
    normalized: row.normalized,
    rsvp: row.rsvp,
  };
}

function logSupabaseFallback(operation: string, error: unknown): void {
  console.error(
    `RSVP_STORAGE_FALLBACK ${operation}`,
    error instanceof Error ? error.message : String(error),
  );
}

function logGithubFallback(operation: string, error: unknown): void {
  console.error(
    `RSVP_GITHUB_FALLBACK ${operation}`,
    error instanceof Error ? error.message : String(error),
  );
}

export async function readGuests(): Promise<Guest[]> {
  if (usingGithub) {
    try {
      const file = await readGithubFile();
      return file.guests;
    } catch (error) {
      logGithubFallback('readGuests', error);
    }
  }
  if (usingSupabase) {
    try {
      const rows = (await sbFetch('guests?select=*')) as SupabaseRow[];
      return rows.map(rowToGuest);
    } catch (error) {
      logSupabaseFallback('readGuests', error);
    }
  }
  return readJson();
}

export async function findGuestById(id: string): Promise<Guest | undefined> {
  if (usingGithub) {
    try {
      const file = await readGithubFile();
      return file.guests.find((g) => g.id === id);
    } catch (error) {
      logGithubFallback('findGuestById', error);
    }
  }
  if (usingSupabase) {
    try {
      const rows = (await sbFetch(
        `guests?id=eq.${encodeURIComponent(id)}&select=*&limit=1`,
      )) as SupabaseRow[];
      return rows[0] ? rowToGuest(rows[0]) : undefined;
    } catch (error) {
      logSupabaseFallback('findGuestById', error);
    }
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
  if (usingGithub) {
    try {
      const file = await readGithubFile();
      const idx = file.guests.findIndex((g) => g.id === id);
      if (idx === -1) return undefined;
      const updatedGuest = { ...file.guests[idx], rsvp: merged };
      const nextGuests = [...file.guests];
      nextGuests[idx] = updatedGuest;
      await writeGithubFile(nextGuests, file.sha, id);
      return updatedGuest;
    } catch (error) {
      logGithubFallback('updateRsvp', error);
    }
  }
  if (usingSupabase) {
    try {
      await sbFetch(`guests?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ rsvp: merged }),
      });
      return findGuestById(id);
    } catch (error) {
      logSupabaseFallback('updateRsvp', error);
    }
  }
  const guests = await readJson();
  const idx = guests.findIndex((g) => g.id === id);
  if (idx === -1) return undefined;
  const updatedGuest = { ...guests[idx], rsvp: merged };
  guests[idx] = updatedGuest;
  try {
    await writeJson(guests);
  } catch (error) {
    console.warn(
      `RSVP_FALLBACK_CAPTURE ${JSON.stringify({
        id,
        status: merged.status,
        attendees: merged.attendees,
        dietary: merged.dietary ?? null,
        message: merged.message ?? null,
        confirmedAt: merged.confirmedAt,
        storageError: error instanceof Error ? error.message : String(error),
        vercel: IS_VERCEL,
      })}`,
    );
  }
  return updatedGuest;
}

export async function insertMany(guests: Guest[]): Promise<void> {
  if (usingGithub) {
    const existing = await readGithubFile().catch(() => ({ guests: [], sha: '' }));
    if (existing.sha) {
      await writeGithubFile(guests, existing.sha, 'bulk-import');
      return;
    }
  }
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