# uibattles

framework: sveltekit (svelte 5)
ui: tailwind v4 (use src/routes/layout.css for tailwind design tokens)
db: drizzle + sqlite (Never run db operations like generate, migrate, push. Leave it to the user.)
scripts: never run 'dev' or 'build'. Assume dev is running and build is for production.
code verification: run pnpm lint && pnpm check

Use pnpm.

# Docs

Fetch when you get relevant error. Don't wait a second before fetching.

- no-navigation-without-resolve: https://sveltejs.github.io/eslint-plugin-svelte/rules/no-navigation-without-resolve/
