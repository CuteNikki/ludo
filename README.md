# Ludo

The classic board game "Mensch ärgere Dich nicht" (Ludo) in the browser: real-time multiplayer for two to four players, with computer opponents, no accounts and nothing to install. Live at [ludo.niso.moe](https://ludo.niso.moe).

## Features

- **Real-time multiplayer:** the server is authoritative. Clients only send actions, and the server rolls the dice, validates every move and broadcasts the state to the room.
- **Rooms:** create a room, share the six-character code or the link, and play. Rooms can be listed publicly on a discovery page so anyone can join, or watch a game that is full or already running.
- **The full game:** captures, the home column, a move timer, automatic single moves, optional "must spawn on six", "extra turn on capture", "safe start squares", "three tries" and "must capture" rules and a fair dice option, so no one waits forever for a six.
- **Computer opponents:** the host can fill free seats with bots, so a game against them starts with just one human player.
- **Host controls:** room settings, removing inactive players (even mid-game), automatic host handover and a rematch vote at the end of every game.
- **Animation and sound:** pieces walk along the track, captured pieces fly home and the dice roll. The sound effects are synthesized with the Web Audio API, so there are no audio files.
- **A live demo on the landing page:** four bots play each other in the browser, using the same rules and bot strategy as the real game.
- **English and German**, light, dark and system themes, and a layout that works on phones with touch support.
- **Privacy-minded:** no accounts, ads or analytics. Game state lives in the server's memory only.

## Tech Stack

- **Web:** Next.js (App Router, React 19), Tailwind CSS v4, Radix UI / shadcn/ui, i18next and Lucide icons
- **Server:** Bun with native WebSockets, written in TypeScript
- **Shared:** `@ludo/shared`, a package with the typed event protocol, the game model and the bot strategy, used by both the server and the web app so they can't drift apart
- **Tooling:** Bun workspaces, `bun test`, Prettier and Docker Compose

## Structure

- `apps/web`: Next.js App Router, Tailwind CSS and Shadcn/UI configuration
- `apps/server`: Authoritative Bun WebSocket server and room management
- `packages/shared`: Shared, strictly typed event protocol and game model

## Getting Started

```bash
bun install
bun run dev
```

The frontend then runs on `http://localhost:3000` and the WebSocket server on `ws://localhost:3001/ws`. For different hosts, `NEXT_PUBLIC_WS_URL` can be set in the frontend. For a real deployment, also set `NEXT_PUBLIC_SITE_URL` to the site's public URL so social sharing previews (Open Graph/Twitter cards) link to the right images.

`bun run typecheck` and `bun run test` check every workspace.

### Legal pages

The site has an Imprint (`/imprint`), Privacy Policy (`/privacy`) and Terms of Service (`/terms`), in English and German, linked from the footer of every page. The operator's name, address and contact details are not stored in this public repository: set `NEXT_PUBLIC_LEGAL_NAME`, `NEXT_PUBLIC_LEGAL_ADDRESS` (lines separated by `;`), `NEXT_PUBLIC_LEGAL_EMAIL` and optionally `NEXT_PUBLIC_LEGAL_PHONE` when building the frontend. Alternatively, copy `.env.example` to `.env` in the repo root and fill in `LEGAL_NAME`, `LEGAL_ADDRESS`, `LEGAL_EMAIL` and `LEGAL_PHONE`: Docker Compose passes them on as build args, and `apps/web/next.config.ts` reads the same file for `next dev` and `next build` (restart the dev server after changing it). Without them the imprint shows a "not configured" notice. The policy text describes what the app actually stores, so update it (`legal.*` in the locale files) whenever that changes.

## Protocol

Clients only ever send actions such as `room:create`, `room:join`, `player:ready` and `game:move`. The server rolls the dice, mutates the state, increments its `revision`, and then broadcasts the full `GameState` to every connection in the room.

The server automatically rolls the dice at the start of every turn and synchronizes the roll animation and result with all clients. If there is no valid move, this is briefly displayed and the next player automatically takes their turn. If there is no other possible move, the figure is moved automatically after a short display. Only when there are multiple options does the configured time remain to select a highlighted figure. The server validates every move, resolves captures, and automatically advances to the next connected player when time runs out. A tab can reclaim its seat for up to five minutes after a reload.

The "Fair Dice" option ensures that every number is rolled regularly so no one has to wait long for a six. The order of the rolls themselves stays random.

## Spectating

Anyone can watch a public room without a seat: the `/discover` page offers **Watch** (`/watch/<code>`) on rooms that are full or already running, along with how many people are watching; the players see that count in their room too. A spectator (`room:spectate`) receives the room's state updates but can't act in it, since the server only accepts actions from a joined player. Private rooms can't be watched and look exactly like a missing room. Spectators don't keep a room alive: when the players leave or a rematch starts, they are told the room has closed.

## Bots

The host can fill free lobby seats with computer opponents (`room:addBot`) and remove them again like any other player. Bots are always connected and ready, so a game with a single human player starts as soon as that player is ready. Adding a bot resets the humans' ready status like any other lobby change.

Bots run entirely on the server. They roll like everyone else (including the fair dice option) and pick their piece after a short delay, with no move timer. The choice is a simple heuristic in `packages/shared/src/bot-strategy.ts` (shared so the landing-page demo, four bots playing each other in the browser, plays by the same rules): capture an opponent, enter the home stretch, leave the yard, step out of danger, and avoid landing within reach of an opponent, with a little randomness. Bots don't vote in the rematch; they follow the humans who do. A room whose humans have all left is torn down like an empty one.

## Room Settings

The creator of a room is the host and can configure the turn timer (15, 30, 45 or 60 seconds), automatic moves, the fair dice option, the optional "must spawn on six", "extra turn on capture", "safe start squares", "three tries" and "must capture" rules and the room's public/private visibility in the lobby. Settings are synchronized to all players and locked once the game starts. Any change made in the lobby resets every player's ready status. Public rooms show up on the `/discover` page for anyone to browse, and join while they are in the lobby, and stay listed while a game is running (a finished game is dropped), along with a per-setting overview (on/off and move time) of how the room is configured.

Every player can change their name and pick a still-available player color in the lobby. Names may be duplicated, taken colors are locked, and the chosen profile persists across a reload. If no name is entered, "Guest" is used.

The host can remove other players from the room, in the lobby and during a game (a running game asks for a second click to confirm). Removing the player whose turn it is hands the turn to the next player in line, and if only one player is left they win by forfeit. If the host is disconnected for 30 seconds, the host role moves to another connected human player; the game is never scrapped, and the original host doesn't get it back. After the game ends, players can return to the main menu or vote for a rematch. The first rematch vote starts a 30-second countdown; players who don't confirm in time are dropped, and everyone who agreed is moved into a brand-new room, reset to the lobby with the same settings.
