# Ply

A calendar-linked relationship memory app. It reads your Google Calendar, asks what happened after each meeting, and shows you those notes before you next meet the same people.

- **How it is built and why:** [CLAUDE.md](CLAUDE.md)
- **Account setup, click by click:** [docs/SETUP.md](docs/SETUP.md)

## Current state

Milestone 1 of 9: the layout shell with sample data. No sign-in, no database yet.

## Run it on your computer

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install
```

```bash
npm run dev
```

Then open http://localhost:3000.

## Useful commands

| Command             | What it does                                       |
| ------------------- | -------------------------------------------------- |
| `npm run dev`       | Start the app for development                      |
| `npm run build`     | Build the production version (also catches errors) |
| `npm run lint`      | Check the code for common mistakes                 |
| `npm run typecheck` | Check the TypeScript types                         |
| `npm run format`    | Tidy the formatting of every file                  |

## Environment variables

None are needed yet. From milestone 2, copy `.env.example` to `.env.local` and fill in the values described in [docs/SETUP.md](docs/SETUP.md). Never commit `.env.local`.

## Deploy

The app is hosted on Vercel, which rebuilds it automatically on every push to GitHub. See Part 5 of [docs/SETUP.md](docs/SETUP.md).
