# Deploy a Vercel

## Requisitos
1. Tener Vercel CLI: `npm i -g vercel` (ya está instalado en la máquina).
2. Tener cuenta en Vercel con sesión iniciada: `vercel login`.

## Pasos
```bash
cd "C:\Users\varga\Projects\matrimonio-mael-tamara"
vercel              # primer deploy: te pregunta equipo y nombre del proyecto
vercel --prod       # deploy a producción
```

Vercel detecta automáticamente Next.js. No hace falta configurar build.

## Variables de entorno en Vercel
- `ADMIN_TOKEN` — token para acceder a `/admin`. Default: `tamara2027`.

Configurar desde el dashboard de Vercel o con:
```bash
vercel env add ADMIN_TOKEN production
```

## Persistencia del JSON

Vercel usa filesystem **read-only en runtime**. La primera opción es:

### Opción A — Vercel KV / Postgres (recomendado)
Migrar `src/lib/storage.ts` para leer/escribir de una base de datos real.

### Opción B — Incluir datos en el bundle (sólo lectura inicial)
Si no van a confirmar invitados todavía, dejar `guests.json` en el repo
funciona para preview. **No va a guardar confirmaciones en producción
hasta migrar a una opción real.**

## Dominio personalizado

Asignar `matrimonio-mael-tamara.vercel.app` o un dominio propio desde el dashboard.