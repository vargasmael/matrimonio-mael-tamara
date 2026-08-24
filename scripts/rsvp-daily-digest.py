"""
Cron diario RSVP — detecta nuevos confirmados en últimas 24h y arma el digest.

Lee Supabase REST API con la publishable key (no necesita service_role).
Compara con el último estado guardado en data/last_seen.json (mtime local).
Si no hay nuevos confirmados en las últimas 24h, imprime "NO_NEW" y sale 0.

Output (stdout):
- Línea 1: markdown resumen para Telegram
- Línea 2 en adelante: líneas markdown para el bloque WhatsApp
- Exit 0 si hay nuevos, exit 1 si no hay nuevos (el agente decide si entrega)
"""

import json
import os
import sys
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://miroqsjtapjgwcksgofo.supabase.co")
SUPABASE_KEY = os.environ.get(
    "SUPABASE_ANON_KEY",
    "sb_publishable_6YSXjnbZjNpnmbSstUddwA_waO14_3Z",
)

LAST_SEEN_PATH = Path(__file__).resolve().parent.parent / "data" / "last_seen.json"


def fetch_guests():
    """Trae todos los guests con status attending, ordenados por confirmedAt."""
    url = f"{SUPABASE_URL}/rest/v1/guests?select=id,name,rsvp"
    req = urllib.request.Request(
        url,
        headers={
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
        },
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())


def parse_iso(s):
    if not s:
        return None
    try:
        # ISO puede venir con Z o con offset
        return datetime.fromisoformat(s.replace("Z", "+00:00"))
    except Exception:
        return None


def main():
    guests = fetch_guests()
    now = datetime.now(timezone.utc)

    # Modo --final (resumen acumulado el 26/02): todos los attending con timestamp
    final_mode = "--final" in sys.argv

    # Cargar last_seen si existe (ventana desde la última ejecución)
    last_seen_ts = None
    if LAST_SEEN_PATH.exists():
        try:
            data = json.loads(LAST_SEEN_PATH.read_text())
            last_seen_ts = parse_iso(data.get("last_run"))
        except Exception:
            pass

    # Ventana: desde la última ejecución, o últimas 24h si es la primera
    window_start = last_seen_ts if last_seen_ts else (now - timedelta(hours=24))

    # Todos los confirmados con su confirmedAt parseado
    attending = []
    for g in guests:
        rsvp = g.get("rsvp") or {}
        if rsvp.get("status") != "attending":
            continue
        ts = parse_iso(rsvp.get("confirmedAt"))
        attending.append((g["name"], ts))

    # Nuevos: confirmedAt >= window_start Y status attending
    new = [(n, t) for (n, t) in attending if t and t >= window_start]

    # En modo --final, incluimos también los 14 originales (sin timestamp) para
    # dar el acumulado completo al cierre. Estos van al final con "(pre-cargado)".
    pre_cargados = []
    if final_mode:
        for g in guests:
            rsvp = g.get("rsvp") or {}
            if rsvp.get("status") == "attending" and not rsvp.get("confirmedAt"):
                # Filtrar duplicados con `new`
                if g["name"] not in [n for n, _ in new]:
                    pre_cargados.append((g["name"], None))
        # Concatenar al final: nuevos con timestamp + pre-cargados
        new = new + pre_cargados

    total_attending = len(attending)

    if not new:
        print("NO_NEW")
        print(json.dumps({"new_count": 0, "total_attending": total_attending}))
        return 0

    # Ordenar por fecha de confirmación ascendente (los más recientes abajo)
    new.sort(key=lambda x: x[1] or window_start)

    # --- Markdown para Telegram (canal Home) ---
    lines_tg = []
    header_tg = "📋 *RSVP Mael & Tamara · RESUMEN FINAL* 🏁" if final_mode else "📋 *RSVP Mael & Tamara · nuevos hoy*"
    lines_tg.append(header_tg)
    lines_tg.append("")
    lines_tg.append(f"✅ *{len(new)} confirmación nueva*" if len(new) == 1 else f"✅ *{len(new)} confirmaciones nuevas*")
    lines_tg.append(f"Total confirmados: {total_attending}/109")
    lines_tg.append("")
    for name, ts in new:
        if ts:
            cl_ts = ts.astimezone(timezone(timedelta(hours=-4)))
            hora = cl_ts.strftime("%H:%M")
            lines_tg.append(f"• {name} ({hora} HSP)")
        else:
            lines_tg.append(f"• {name} (pre-cargado)")
    lines_tg.append("")
    lines_tg.append(f"🔗 https://matrimonio-mael-tamara.vercel.app/admin?token=tamara2027")

    # --- Markdown para WhatsApp (versión detallada con hora y restricciones) ---
    lines_wa = []
    header = "*RSVP Mael & Tamara — RESUMEN FINAL*" if final_mode else "*RSVP Mael & Tamara — nuevos hoy*"
    lines_wa.append(header)
    lines_wa.append("")
    if len(new) == 1 and not final_mode:
        name, ts = new[0]
        cl_ts = ts.astimezone(timezone(timedelta(hours=-4))) if ts else None
        hora = cl_ts.strftime("%H:%M") if cl_ts else "?"
        lines_wa.append(f"✅ {name} ({hora} HSP)")
    else:
        for name, ts in new:
            cl_ts = ts.astimezone(timezone(timedelta(hours=-4))) if ts else None
            if cl_ts:
                hora = cl_ts.strftime("%d/%m %H:%M")
                lines_wa.append(f"✅ {name} ({hora} HSP)")
            else:
                lines_wa.append(f"✅ {name} (pre-cargado)")
    lines_wa.append("")
    lines_wa.append(f"Total confirmados: {total_attending}/109")

    # --- Salida ---
    # Estructura de 3 bloques separados por \n\n---\n\n para que el agente los parta
    print("\n".join(lines_tg))
    print("---WA---")
    print("\n".join(lines_wa))

    # Actualizar last_seen (marca de agua para la próxima ejecución)
    LAST_SEEN_PATH.parent.mkdir(parents=True, exist_ok=True)
    LAST_SEEN_PATH.write_text(json.dumps({"last_run": now.isoformat(), "new_count": len(new)}, indent=2))

    return 0


if __name__ == "__main__":
    sys.exit(main())