# Ludo

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

# Ludo Project To-Do List

## 1. Game Flow, Rooms & Match Lifecycle

- [ ] **End-Screen & Post-Game Timer**:
  - Implement a 30-second post-game countdown timer when a match finishes.
  - Provide clear voting options for players to either play again (rematch) or return to the home screen.
  - Handle room cleanup on timeout: kick out inactive players, and automatically transition rematching players into a brand-new room.
- [ ] **Clear Rematch Voting UX**: Redesign the rematch prompt and UI on the end screen so it is explicitly and unmistakably clear to all participants that a rematch vote is currently taking place.
- [ ] **Public Rooms & Discovery Page**: Add a visibility toggle to rooms (public vs. private) and build a discovery page that lists active public rooms so players can easily browse and join open games.
- [ ] **Lobby Leave Notifications**: Implement real-time notifications alerting remaining players in the lobby whenever someone leaves the room.
- [ ] **Accurate Leave/Kick Notifications**: Fix inaccurate notification messages (e.g., displaying "Kicked by the Host" when it wasn't the case). Update the notification system to properly reflect the actual reason for leaving or being removed.
- [ ] **Static vs. Dynamic Rendering Optimization**: Investigate and refactor pages so they remain static where possible, preventing the entire site from switching to dynamic rendering solely due to language switching.

## 2. Core Game Logic & Rules

- [ ] **Optional "Must-Spawn-on-6" Rule**: Add a toggleable rule (disabled by default) that forces players to deploy a figure from home/spawn when rolling a 6 if any figures are still waiting there, preventing them from moving 6 tiles on the board instead.
- [ ] **Figure Color Transition Bug**: Fix the visual bug when changing a figure's color. Update it so the transition happens smoothly mid-movement or after reaching the destination rather than instantly changing beforehand.

## 3. UI / UX, Animations & Mobile Enhancements

- [ ] **Global Animations & Reveal Effects**: Add smooth fade-in and scroll-reveal animations across the home page and room page.
- [ ] **Shadcn/UI Redesign**: Overhaul the application's interface to incorporate more components from `shadcn/ui` for a cohesive and modern look.
- [ ] **Mobile Responsiveness & Touch Support**:
  - Fix touch interactions to ensure full feature parity for mobile users.
  - Adapt the movement preview to support tap/touch events on mobile devices (e.g., tap a figure once for a preview and again to confirm the move, replacing desktop `hover`).
- [ ] **Language Selector Dropdown**: Refactor the language selector into a scalable dropdown component to easily accommodate more languages in the future.
- [ ] **Lighthouse Performance Optimization**: Run Lighthouse audits and optimize the application for performance, accessibility, best practices, and SEO based on the audit results. Currently all 100 scores besides Accessibility due to color contrast issues.
- [ ] **Favicon & Metadata**: Add a favicon to the website and ensure all relevant metadata (title, description, social sharing tags) are properly configured for better SEO and user experience.

## 4. Features & Content

- [ ] **AI Opponents**: Implement computer-controlled opponents to enable single-player mode.
- [ ] **Game Description & Rules**: Add an information section or guide explaining how to play the game directly on the website. We already have a how it works section but it doesn't explain the actual game (e.g. rules, objectives).
- [ ] **English README**: Translate the `README.md` on GitHub into English.

## 5. Legal & Compliance

- [ ] **Legal Pages & Footer Links**: Create and add standard legal pages (Imprint/Impressum, Privacy Policy, Terms of Service) and include a direct link back to the [GitHub repository](https://github.com/CuteNikki/ludo).
