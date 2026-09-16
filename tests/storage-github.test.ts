import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const initialGuests = [
  {
    id: 'mauricio-severino',
    name: 'Mauricio Severino',
    normalized: 'mauricio severino',
    rsvp: { status: 'pending' as const, attendees: 1, confirmedAt: null },
  },
];

function contentFor(guests = initialGuests) {
  return Buffer.from(JSON.stringify(guests, null, 2), 'utf-8').toString('base64');
}

async function importStorage() {
  vi.resetModules();
  return import('@/lib/storage');
}

beforeEach(() => {
  vi.stubEnv('GITHUB_TOKEN', 'github-token');
  vi.stubEnv('GITHUB_REPO', 'vargasmael/matrimonio-mael-tamara');
  vi.stubEnv('GITHUB_BRANCH', 'main');
  vi.stubEnv('SUPABASE_URL', 'https://dead-project.supabase.co');
  vi.stubEnv('SUPABASE_ANON_KEY', 'anon-test-key');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('GitHub RSVP storage', () => {
  it('reads guests from the repository contents API', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('api.github.com')) {
        return Response.json({ content: contentFor(), sha: 'sha-1' });
      }
      throw new Error('unexpected fetch');
    });
    vi.stubGlobal('fetch', fetchMock);
    const { readGuests } = await importStorage();

    const guests = await readGuests();

    expect(guests).toHaveLength(1);
    expect(guests[0].id).toBe('mauricio-severino');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain(
      'api.github.com/repos/vargasmael/matrimonio-mael-tamara/contents/data/guests.json',
    );
  });

  it('updates an RSVP by committing data/guests.json through GitHub', async () => {
    let putBody: any = null;
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (!String(url).includes('api.github.com')) {
        throw new Error('unexpected fetch');
      }
      if (!init?.method || init.method === 'GET') {
        return Response.json({ content: contentFor(), sha: 'sha-1' });
      }
      putBody = JSON.parse(String(init.body));
      return Response.json({ content: { sha: 'sha-2' } });
    });
    vi.stubGlobal('fetch', fetchMock);
    const { updateRsvp } = await importStorage();

    const updated = await updateRsvp('mauricio-severino', {
      status: 'attending',
      attendees: 1,
      dietary: 'Vegetariano',
      message: 'Nos vemos',
    });

    expect(updated?.rsvp.status).toBe('attending');
    expect(putBody.message).toBe('chore(rsvp): update mauricio-severino');
    expect(putBody.sha).toBe('sha-1');
    expect(putBody.branch).toBe('main');
    const committedGuests = JSON.parse(
      Buffer.from(putBody.content, 'base64').toString('utf-8'),
    );
    expect(committedGuests[0].rsvp.status).toBe('attending');
    expect(committedGuests[0].rsvp.dietary).toBe('Vegetariano');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
