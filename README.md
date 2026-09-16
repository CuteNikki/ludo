# Ludo Live

Echtzeit-Multiplayer-Grundgerüst für „Mensch ärgere Dich nicht“ mit Bun, nativen WebSockets und Next.js.

## Struktur

- `apps/web`: Next.js App Router, Tailwind CSS und Shadcn/UI-Konfiguration
- `apps/server`: Autoritativer Bun-WebSocket-Server und Raumverwaltung
- `packages/shared`: Gemeinsames, strikt typisiertes Event-Protokoll und Spielmodell

## Start

```bash
bun install
bun run dev
```

Danach läuft das Frontend auf `http://localhost:3000` und der WebSocket-Server auf `ws://localhost:3001/ws`. Für abweichende Hosts kann im Frontend `NEXT_PUBLIC_WS_URL` gesetzt werden.

## Protokoll

Clients senden ausschließlich Aktionen wie `room:create`, `room:join`, `player:ready` und `game:move`. Der Server würfelt und ändert den Zustand, erhöht dessen `revision` und verteilt anschließend den vollständigen `GameState` an alle Verbindungen im Raum.

Der Server würfelt zu Beginn jedes Zugs automatisch und synchronisiert die Animation sowie das Ergebnis mit allen Clients. Gibt es keinen gültigen Zug, wird dies kurz angezeigt und der nächste Spieler ist automatisch an der Reihe. Andernfalls bleiben 30 Sekunden zur Auswahl einer hervorgehobenen Figur. Der Server prüft alle Bewegungen, führt Schläge aus und wechselt bei Zeitablauf automatisch zum nächsten verbundenen Spieler. Ein Tab kann seinen Sitz nach einem Reload bis zu fünf Minuten lang wieder übernehmen.

Für ausgeglichenere Partien verwendet jeder Spieler einen eigenen, kryptografisch gemischten Würfelbeutel. Innerhalb von jeweils sechs persönlichen Würfen kommt jede Augenzahl genau einmal vor; dadurch bleiben Reihenfolge und einzelne Würfe unvorhersehbar, lange einseitige Pechsträhnen werden aber vermieden.
