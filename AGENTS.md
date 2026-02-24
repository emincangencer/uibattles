# uibattles

framework: sveltekit (svelte 5)
ui: tailwind v4 (use src/routes/layout.css for tailwind design tokens)
db: drizzle + sqlite ()
runtime: bun (only use bun commands like bun add. Don't use npm etc.)
scripts: never run 'dev' or 'build'. Assume dev is running and build is for production.
code verification: run bun lint && bun check
