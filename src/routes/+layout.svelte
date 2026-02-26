<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { resolve } from '$app/paths';
	import { enhance } from '$app/forms';

	interface User {
		id: string;
		name: string;
		email: string;
		image: string | null;
	}

	let { children, data } = $props();
	let user = $derived(data.user as User | null);
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<div class="min-h-screen bg-zinc-950 text-zinc-100">
	<header class="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
		<div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
			<a
				href={resolve('/')}
				class="text-xl font-bold tracking-tight transition-colors hover:text-zinc-300"
			>
				UI<span class="text-emerald-400">Battles</span>
			</a>
			<nav class="flex items-center gap-3">
				<a
					href={resolve('/generate')}
					class="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition-colors hover:bg-emerald-600"
				>
					Generate
				</a>
				{#if user}
					<a
						href={resolve('/account')}
						class="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
					>
						Account
					</a>
					<form method="POST" action={resolve('/signout')} use:enhance>
						<button
							type="submit"
							class="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
						>
							Sign out
						</button>
					</form>
				{:else}
					<a
						href={resolve('/login')}
						class="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
					>
						Login
					</a>
				{/if}
			</nav>
		</div>
	</header>
	<main>
		{@render children()}
	</main>
</div>
