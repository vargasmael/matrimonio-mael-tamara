import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm, chmod } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';

let tempDir: string;

const guests = [
  {
    id: 'mauricio-severino',
    name: 'Mauricio Severino',
    normalized: 'mauricio severino',
    rsvp: { status: 'pending' as const, attendees: 1, confirmedAt: null },
  },
];

async function seedGuests(dir: string) {
  await mkdir(path.join(dir, 'data'), { recursive: true });
  await writeFile(
    path.join(dir, 'data', 'guests.json'),
    JSON.stringify(guests, null, 2),
    'utf-8',
  );
}

async function importStorage() {
  vi.resetModules();
  return import('@/lib/storage');
}

beforeEach(async () => {
  tempDir = await mkdtemp(path.join(tmpdir(), 'rsvp-storage-'));
  await seedGuests(tempDir);
  vi.stubEnv('RSVP_DATA_DIR', path.join(tempDir, 'data'));
  vi.stubEnv('SUPABASE_URL', 'https://dead-project.supabase.co');
  vi.stubEnv('SUPABASE_ANON_KEY', 'anon-test-key');
  vi.stubGlobal('fetch', vi.fn(async () => {
    throw new TypeError('fetch failed');
  }));
});

afterEach(async () => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  await rm(tempDir, { recursive: true, force: true });
});

describe('storage Supabase fallback', () => {
  it('falls back to bundled JSON for reads when Supabase DNS/fetch fails', async () => {
    const { readGuests } = await importStorage();

    const result = await readGuests();

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('mauricio-severino');
  });

  it('returns a successful RSVP object instead of throwing when Supabase and JSON writes fail on Vercel', async () => {
    vi.stubEnv('VERCEL', '1');
    const guestsFile = path.join(tempDir, 'data', 'guests.json');
    await chmod(guestsFile, 0o444);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { updateRsvp } = await importStorage();

    const result = await updateRsvp('mauricio-severino', {
      status: 'attending',
      attendees: 1,
      dietary: 'Vegetariano',
      message: 'Nos vemos',
    });

    expect(result?.id).toBe('mauricio-severino');
    expect(result?.rsvp.status).toBe('attending');
    expect(result?.rsvp.dietary).toBe('Vegetariano');
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('RSVP_FALLBACK_CAPTURE'),
    );
  });
});
