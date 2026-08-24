import { NextResponse } from 'next/server';
import { readGuests, writeGuests } from '@/lib/storage';

export const dynamic = 'force-dynamic';

type RsvpBody = {
  id: string;
  status: 'attending' | 'declined';
  attendees?: number;
  dietary?: string;
  message?: string;
};

export async function POST(req: Request) {
  let body: RsvpBody;
  try {
    body = (await req.json()) as RsvpBody;
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  if (!body?.id || !['attending', 'declined'].includes(body.status)) {
    return NextResponse.json({ error: 'id and status required' }, { status: 400 });
  }

  const guests = await readGuests();
  const idx = guests.findIndex((g) => g.id === body.id);
  if (idx < 0) {
    return NextResponse.json({ error: 'guest not found' }, { status: 404 });
  }

  const attendees =
    body.status === 'declined'
      ? 0
      : Math.max(1, Math.min(10, Number(body.attendees ?? 1)));

  guests[idx].rsvp = {
    status: body.status,
    attendees,
    dietary: body.dietary?.trim() || undefined,
    message: body.message?.trim() || undefined,
    confirmedAt: new Date().toISOString(),
  };

  await writeGuests(guests);
  return NextResponse.json({ ok: true, guest: guests[idx] });
}