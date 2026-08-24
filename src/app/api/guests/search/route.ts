import { NextResponse } from 'next/server';
import { readGuests } from '@/lib/storage';
import { normalize, searchScore } from '@/lib/guests';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = normalize(url.searchParams.get('q') ?? '');
  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }
  const guests = await readGuests();
  const ranked = guests
    .map((g) => ({ guest: g, score: searchScore(q, g.normalized) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((r) => ({ id: r.guest.id, name: r.guest.name }));
  return NextResponse.json({ results: ranked });
}