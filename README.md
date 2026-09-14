# portfolio_mobile_astro

A mobile-friendly astrophysics portfolio that plays as a single SSH terminal
session: log in, browse a NeoTree-style file tree, and `cat` each section.
Rebuilt from scratch on [Astro](https://astro.build).

## Commands

| Command           | Action                                       |
| :---------------- | :------------------------------------------- |
| `npm install`     | Install dependencies                         |
| `npm run dev`     | Start dev server at `localhost:4321`         |
| `npm run build`   | Build the static site to `./dist`            |
| `npm run preview` | Preview the production build locally         |
| `npm run check`   | Type-check `.astro` files                    |

## Structure

```
public/assets/        Fonts and pixel art (served as-is)
src/
  components/         Shell (window bar, sidebar, tree, login) + SimWindow
    sections/         One content component per file in the tree
  data/               Site metadata, tree model, ASCII logo
  layouts/            BaseLayout: the single terminal window
  pages/              index.astro renders every section
  scripts/            session/login/theme + canvas simulations
  styles/             Global stylesheet and theme tokens
```

## How the session works

1. `SshLogin` types `ssh fug@portfolio -i ~/.ssh/portfolio` and prints a MOTD
   banner, then reveals the workspace (once per session; skipped entirely under
   `prefers-reduced-motion`).
2. `Sidebar` renders the file tree from `src/data/tree.ts` via the recursive
   `TreeBranch` component.
3. `session.js` owns navigation: clicking a file types `cat <path>` into the
   terminal panel and reveals that section. The route lives in the URL hash
   (e.g. `#research/dynamo.md`), so links are shareable and back/forward work.
4. Simulation sections (`mhd`, `dynamo`) lazily import their canvas module on
   first view and stop it when you navigate away.

Adding a section means adding a file to `src/data/tree.ts`, a
`components/sections/*.astro` component, and a `FileView` in `index.astro`.

### Command prompt

Every section ends with a live shell prompt, as an optional second way to
navigate. Type a command and press Enter:

- `cat about.md`, `cat about`, or `cat research/dynamo.md` — open any file in
  the tree (the `.md` extension is optional).
- `clear` — clear the prompt history and return to the home page (`about`).
- `cat <unknown>` prints `cat: <unknown>: No such file or directory`.
- Anything else prints `<command>: command not found`.
- Bare `cat` prints `cat: missing operand`.

Errors are appended to the prompt history; valid commands navigate exactly like
clicking the file tree. The prompt is focused automatically, so you can start
typing without clicking, and **Tab** completes commands and file paths
(e.g. `cat res<Tab>` → `cat research/`, then `<Tab>` lists the files inside).

## Fonts

Body text uses **Inconsolata Nerd Font** (self-hosted, subset to the characters
the site needs so each weight is ~22 KB). Display text uses Press Start 2P.
Nerd icons are referenced with numeric entities (e.g. `&#xF0DA;`) and inherit the
body font, so they render straight from the subset.

To regenerate the subset after adding new icons, download the Nerd Fonts release
and run:

```sh
pyftsubset InconsolataNerdFontMono-Regular.ttf \
  --unicodes='U+0020-007E,U+00A0-00FF,U+0100-017F,U+2013-2014,U+2018-201D,U+2022,U+2026,U+2500-259F,<extra-icon-codepoints>' \
  --layout-features='*' --flavor=woff2 \
  --output-file=public/assets/fonts/inconsolata-nerd-font-regular.woff2
```

## Theming

The CRT palette is defined as CSS custom properties in `src/styles/global.css`.
The theme toggle flips `data-theme` on `<html>` between `lime` and `amber` and
broadcasts a `theme:change` event that the canvas scripts listen for.

## Simulation seeds

The MHD and dynamo canvases are randomly seeded on each load. Pass a `?seed=123`
query parameter to reproduce a specific run.
