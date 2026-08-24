// Normaliza nombres para búsqueda: minúsculas, sin tildes, sin espacios extra.
export function normalize(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Genera un id estable para el invitado a partir del nombre normalizado.
// Suficiente para URLs tipo /rsvp/mael-vargas (case stable, sin colisiones obvias).
export function guestIdFromName(name: string): string {
  return normalize(name).replace(/\s+/g, '-');
}

export function searchScore(query: string, candidate: string): number {
  // 0 = sin match, 1 = match exacto, 0.x = match parcial
  if (query === candidate) return 1;
  if (candidate.startsWith(query)) return 0.9;
  if (candidate.includes(query)) return 0.7;
  // Match por palabras iniciales (ej: "juan perez lopez" matchea query "juan perez")
  const queryTokens = query.split(' ');
  const candTokens = candidate.split(' ');
  const matched = queryTokens.every((qt) =>
    candTokens.some((ct) => ct.startsWith(qt))
  );
  if (matched) return 0.6;
  return 0;
}