# storyforge

A text RPG that produces stories you'd actually want to read. Real rules, real dice, real consequences — powered by Claude.

**[Play the demo](https://storyforge-game.com)** | **[Read the Tales](https://storyforge-game.com/chronicles)** | **[Buy me a beer](https://buymeacoffee.com/storyforgegame)**

## What is this?

Storyforge is a solo text RPG with Claude as your Game Master. You make choices, roll dice, and build a story across chapters. Every playthrough is unique. The game tracks NPCs, promises, factions, tension clocks, and consequences — so the world remembers what you did.

Six genres, each with its own world, characters, classes, and tone:

- **Space Opera** — A fractured galaxy. One ship. No good options.
- **Fantasy** — The world is older than it remembers.
- **Grimdark** — Kingdoms rot from the inside. Someone has to survive it.
- **Cyberpunk** — The city owns everything.
- **Noir** — Everyone lies. The truth is what's left when the lies stop working.
- **Epic Sci-Fi** — Power has a price. Someone always pays.

## How it works

- **No account required.** Your game saves to your browser's local storage.
- **Bring your own API key.** Get a Claude API key from [Anthropic](https://console.anthropic.com/) and play unlimited. Your key stays in your browser and is never sent to our servers.
- **Free demo.** Try a few chapters without an API key. Limited monthly token budget.
- **Open source.** The full codebase is here. Run your own instance, modify it, contribute.

## Tech stack

- [Next.js](https://nextjs.org/) (App Router)
- [Claude](https://anthropic.com/) (Anthropic API) as the GM
- [Tailwind CSS](https://tailwindcss.com/) for styling
- Deployed on [Vercel](https://vercel.com/)
- No database — all state in localStorage

## Running locally

```bash
git clone https://github.com/mheuer86/storyforge-game.git
cd storyforge-game
pnpm install
cp .env.example .env.local  # add your Anthropic API key
pnpm dev
```

## License

[AGPL-3.0](LICENSE). See [NOTICE](NOTICE) for details.

For commercial use without AGPL obligations, contact storyforgegame@gmail.com.

## Content policy

Storyforge engages with morally serious themes. The genres it supports involve violence, betrayal, loss, and moral compromise. That's the point. See the full [content policy](https://storyforge-game.com/content-policy) for what this game is and isn't for.

## Contact

- Email: storyforgegame@gmail.com
- Issues: [GitHub Issues](https://github.com/mheuer86/storyforge-game/issues)

---

Built by one person with [Claude Code](https://claude.ai/code).
