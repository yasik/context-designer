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

Open `index.html` in a modern browser. No installation, build step, account, or API key is required.

You can also serve the directory:

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## Storage and token counts

Drafts and your theme preference are saved in this browser. Export JSON for a portable backup; changing browsers, moving from a local file to the hosted tool, or clearing browser storage does not transfer your draft.

Prompt text is processed locally. The app has no backend or analytics. It downloads tokenizer and tooltip libraries from public CDNs, so the first load needs an internet connection.

Token counts use [gpt-tokenizer](https://github.com/niieani/gpt-tokenizer) 3.4.0 with `o200k_base` or `cl100k_base`. They count each slot's literal text and sum the results. API message framing, image tokens, and provider-specific overhead are excluded; reserve space for them separately. A slot budget is a planning value, not a truncation limit.

## Deploy

Deploy this directory as a static site. On Vercel, choose **Other** as the framework, leave the build command empty, and use the repository root as the output directory. The included `vercel.json` configures static hosting and response headers.

## License

[MIT](LICENSE). The interface uses the [Ayu palette](https://github.com/ayu-theme/ayu-colors).
