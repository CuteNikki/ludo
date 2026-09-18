# Ludo

Real-time multiplayer foundation for "Mensch ärgere Dich nicht" (Ludo) built with Bun, native WebSockets and Next.js.

## Structure

- `apps/web`: Next.js App Router, Tailwind CSS and Shadcn/UI configuration
- `apps/server`: Authoritative Bun WebSocket server and room management
- `packages/shared`: Shared, strictly typed event protocol and game model

## Getting Started

```bash
bun install
bun run dev
```

The frontend then runs on `http://localhost:3000` and the WebSocket server on `ws://localhost:3001/ws`. For different hosts, `NEXT_PUBLIC_WS_URL` can be set in the frontend.

## Protocol

Clients only ever send actions such as `room:create`, `room:join`, `player:ready` and `game:move`. The server rolls the dice, mutates the state, increments its `revision`, and then broadcasts the full `GameState` to every connection in the room.

The server automatically rolls the dice at the start of every turn and synchronizes the roll animation and result with all clients. If there is no valid move, this is briefly displayed and the next player automatically takes their turn. If there is no other possible move, the figure is moved automatically after a short display. Only when there are multiple options does the configured time remain to select a highlighted figure. The server validates every move, resolves captures, and automatically advances to the next connected player when time runs out. A tab can reclaim its seat for up to five minutes after a reload.

The "Fair Dice" option ensures that every number is rolled regularly so no one has to wait long for a six. The order of the rolls themselves stays random.

## Room Settings

The creator of a room is the host and can configure the turn timer (15, 30, 45 or 60 seconds), automatic moves, the fair dice option and the room's public/private visibility in the lobby. Settings are synchronized to all players and locked once the game starts. Any change made in the lobby resets every player's ready status. Public rooms show up, while still in the lobby, on the `/discover` page for anyone to browse and join.

Every player can change their name and pick a still-available player color in the lobby. Names may be duplicated, taken colors are locked, and the chosen profile persists across a reload. If no name is entered, "Guest" is used.

The host can remove other players from the room while in the lobby. After the game ends, players can return to the main menu or vote for a rematch. The first rematch vote starts a 30-second countdown; players who don't confirm in time are dropped, and everyone who agreed is moved into a brand-new room, reset to the lobby with the same settings.

# Ludo Project To-Do List

## 1. Game Flow, Rooms & Match Lifecycle

- [x] **End-Screen & Post-Game Timer**:
  - Implement a 30-second post-game countdown timer when a match finishes.
  - Provide clear voting options for players to either play again (rematch) or return to the home screen.
  - Handle room cleanup on timeout: kick out inactive players, and automatically transition rematching players into a brand-new room.
- [x] **Clear Rematch Voting UX**: Redesign the rematch prompt and UI on the end screen so it is explicitly and unmistakably clear to all participants that a rematch vote is currently taking place.
- [x] **Public Rooms & Discovery Page**: Add a visibility toggle to rooms (public vs. private) and build a discovery page that lists active public rooms so players can easily browse and join open games.
- [x] **Lobby Leave Notifications**: Implement real-time notifications alerting remaining players in the lobby whenever someone leaves the room.
- [x] **Accurate Leave/Kick Notifications**: Fix inaccurate notification messages (e.g., displaying "Kicked by the Host" when it wasn't the case). Update the notification system to properly reflect the actual reason for leaving or being removed.
- [x] **Static vs. Dynamic Rendering Optimization**: Investigate and refactor pages so they remain static where possible, preventing the entire site from switching to dynamic rendering solely due to language switching.
- [x] **Better Invite UI/UX**: When the room was not found, there should be an input to submit a room code. The room code should also be copyable in the room rather than only the link being available. Additionally the invite form on the home page is not submittable by pressing enter in the invite code field.
  - Consider adding visual feedback for successful or failed room code submissions.
  - Ensure the invite input is accessible and user-friendly on both desktop and mobile devices.

## 2. Core Game Logic & Rules

- [x] **Optional "Must-Spawn-on-6" Rule**: Add a toggleable rule (disabled by default) that forces players to deploy a figure from home/spawn when rolling a 6 if any figures are still waiting there, preventing them from moving 6 tiles on the board instead.
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
- [x] **English README**: Translate the `README.md` on GitHub into English.

## 5. Legal & Compliance

- [ ] **Legal Pages & Footer Links**: Create and add standard legal pages (Imprint/Impressum, Privacy Policy, Terms of Service) and include a direct link back to the [GitHub repository](https://github.com/CuteNikki/ludo).
