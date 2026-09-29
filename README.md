# Context Designer

Design the context your AI agent sees.

Context Designer treats a context window like a memory map: divide it into named slots, group them into categories, and decide how much space each part deserves. Fill slots with real content to see how instructions, tool schemas, memory, and conversation history compete for the same token budget.

## What it's for

- Plan a new agent's context structure before implementing its harness.
- Compare the space reserved for stable instructions, retrieved context, and growing conversation history.
- Find prompts that exceed their budgets and leave room for model output.
- Share a concrete context design with your team as a portable JSON file.

## Use it

1. Set the context window, output reserve, and tokenizer.
2. Add or rename categories such as **Request envelope**, **Stable system tier**, or **Growing body**.
3. Add slots and assign a token budget to each one.
4. Select **Edit content** on a slot and paste its actual text. Token counts update as you type.
5. Reorder, duplicate, or move slots between categories. Use **Fit budget to text** to match a slot's budget to its content.
6. Export the design as JSON to back it up or share it. Import JSON to continue another design.

The allocation bar shows content as filled space, unused slot budgets as pale space, and slot overruns in red. Each slot occupies the larger of its budget or actual content size. Output reserve is separate; anything left is unallocated.

Use the sun or moon icon in the top-right corner to switch between Ayu dark and light themes.

## Run locally

Use Node.js 22.12 or newer and pnpm 10.29.3.

```sh
pnpm install
pnpm dev
```

Open <http://localhost:4321>. No account or API key is required.

```sh
pnpm check          # Check Astro components
pnpm build          # Generate the static app in dist/
pnpm preview        # Serve the production build locally
pnpm exec playwright install chromium
pnpm test           # Build and run browser regression tests
pnpm format:check   # Check source formatting
```

## Project structure

- `src/pages/index.astro` composes the page and loads client modules.
- `src/components/` contains the hero and editor markup.
- `src/styles/app.css` owns layout, controls, and the Ayu palettes.
- `src/scripts/model.js` defines the design format and import validation.
- `src/scripts/designer.js` handles editing, persistence, and user actions.
- `src/scripts/view.js` renders the live slot map, allocation bar, and editor state.
- `src/scripts/tokenizer.js`, `theme.js`, and `tooltips.js` handle their respective browser behaviors.

Astro renders static HTML; the browser modules add interactivity without a UI framework. Dependencies are pinned through `pnpm-lock.yaml`.

## Storage and token counts

Drafts and your theme preference are saved in this browser. Export JSON for a portable backup; changing browsers, moving from a local file to the hosted tool, or clearing browser storage does not transfer your draft.

Prompt text is processed locally. The app has no backend or analytics. Tokenizer and tooltip dependencies are bundled with the app and served from the same origin. Tokenizer chunks load only when their encoding is selected.

Token counts use [gpt-tokenizer](https://github.com/niieani/gpt-tokenizer) 3.4.0 with `o200k_base` or `cl100k_base`. They count each slot's literal text and sum the results. API message framing, image tokens, and provider-specific overhead are excluded; reserve space for them separately. A slot budget is a planning value, not a truncation limit.

## Deploy

Import this repository into Vercel as an **Astro** project. The included `vercel.json` installs dependencies with pnpm, runs `pnpm build`, and serves `dist/`. No server adapter or environment variables are required.

For other static hosts, deploy the contents of `dist/` after building.

## License

[MIT](LICENSE). The interface uses the [Ayu palette](https://github.com/ayu-theme/ayu-colors).
