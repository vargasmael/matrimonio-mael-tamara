import { promises as fs } from 'node:fs';
import path from 'node:path';

const DATA_DIR = path.join(process.cwd(), 'data');
const GUESTS_FILE = path.join(DATA_DIR, 'guests.json');

export type Guest = {
  id: string;
  name: string;
  normalized: string; // nombre en minúsculas sin tildes para búsqueda
  group?: string;
  rsvp: {
    status: 'pending' | 'attending' | 'declined';
    attendees: number;
    dietary?: string;
    message?: string;
    confirmedAt?: string;
  };
};

async function ensureFile(): Promise<void> {
  try {
    await fs.access(GUESTS_FILE);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(GUESTS_FILE, '[]', 'utf-8');
  }
}

export async function readGuests(): Promise<Guest[]> {
  await ensureFile();
  const raw = await fs.readFile(GUESTS_FILE, 'utf-8');
  return JSON.parse(raw) as Guest[];
}

export async function writeGuests(guests: Guest[]): Promise<void> {
  await ensureFile();
  await fs.writeFile(GUESTS_FILE, JSON.stringify(guests, null, 2), 'utf-8');
}

export async function findGuestById(id: string): Promise<Guest | undefined> {
  const guests = await readGuests();
  return guests.find((g) => g.id === id);
}