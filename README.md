# Matrimonio Mael & Tamara — RSVP

Sitio de confirmación de asistencia para la boda del 5 de marzo de 2027, 17:30 hrs.

## Stack
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Vitest para tests
- Almacenamiento: archivo JSON en `data/guests.json` (migrable a Supabase)

## Desarrollo local
```bash
npm install
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

## Estructura

- `/` — Home con foto, título, fecha y buscador de invitados
- `/rsvp/[id]` — Formulario de confirmación por invitado
- `/admin?token=…` — Panel de administración con tabla de respuestas
- `/api/guests/search?q=…` — API de búsqueda (normalización, scoring)
- `/api/rsvp` — API de confirmación (POST)

## Datos

Lista de invitados en `data/guests.json`. Estructura por invitado:

```json
{
  "id": "mael-vargas",
  "name": "Mael Vargas",
  "normalized": "mael vargas",
  "rsvp": {
    "status": "attending | declined | pending",
    "attendees": 1,
    "dietary": "...",
    "message": "...",
    "confirmedAt": "2026-08-24T..."
  }
}
```

## Admin token

Por defecto el token es `tamara2027` (variable `ADMIN_TOKEN`).

URL: `/admin?token=tamara2027`

## Tests
```bash
npm test
```

Cubren:
- Normalización de nombres (tildes, mayúsculas, espacios)
- Generación de IDs a partir del nombre
- Scoring de búsqueda (exacto / prefijo / substring / word-prefix)

## Deploy

Ver instrucciones en `DEPLOY.md`.