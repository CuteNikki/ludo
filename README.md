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

Der Server würfelt zu Beginn jedes Zugs automatisch und synchronisiert die Animation sowie das Ergebnis mit allen Clients. Gibt es keinen gültigen Zug, wird dies kurz angezeigt und der nächste Spieler ist automatisch an der Reihe. Gibt es keinen anderen möglichen Zug, wird die Figur nach einer kurzen Anzeige automatisch bewegt. Nur bei mehreren Möglichkeiten bleibt die eingestellte Zeit zur Auswahl einer hervorgehobenen Figur. Der Server prüft alle Bewegungen, führt Schläge aus und wechselt bei Zeitablauf automatisch zum nächsten verbundenen Spieler. Ein Tab kann seinen Sitz nach einem Reload bis zu fünf Minuten lang wieder übernehmen.

Die Option „Fairer Würfel“ sorgt dafür, dass alle Zahlen regelmäßig gewürfelt werden und niemand lange auf eine Sechs warten muss. Die Reihenfolge der Würfe bleibt dabei zufällig.

## Raumeinstellungen

Der Ersteller eines Raums ist der Host und kann in der Lobby die Zugzeit (15, 30, 45 oder 60 Sekunden), automatische Züge und den fairen Würfel konfigurieren. Die Einstellungen werden an alle Spieler synchronisiert und nach Spielstart gesperrt. Eine Änderung in der Lobby setzt die Bereitschaft aller Spieler zurück.

Jeder Spieler kann in der Lobby seinen Namen ändern und eine noch freie Spielfarbe auswählen. Namen dürfen doppelt vorkommen, belegte Farben sind gesperrt und das gewählte Profil bleibt bei einem Reload erhalten. Ohne Eingabe wird der Name "Gast" verwendet.

Der Host kann andere Spieler in der Lobby aus dem Raum entfernen. Nach Spielende können Spieler ins Hauptmenü zurückkehren oder für eine weitere Runde stimmen. Die erste Rematch-Stimme startet einen 10-Sekunden-Countdown; Nichtantworter werden danach entfernt und alle Zustimmer kehren mit zurückgesetzten Figuren und unveränderten Raumeinstellungen in die Lobby zurück.
