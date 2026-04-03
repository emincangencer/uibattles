<script lang="ts">
	import { resolve } from '$app/paths';
	import { enhance } from '$app/forms';

	interface User {
		id: string;
		name: string;
		email: string;
		image: string | null;
	}

	let { user }: { user: User | null } = $props();
	let menuOpen = $state(false);
	let menuRef: HTMLDivElement | undefined = $state();

	function handleClickOutside(event: MouseEvent) {
		if (menuRef && !menuRef.contains(event.target as Node)) {
			menuOpen = false;
		}
	}

	function closeMenu() {
		menuOpen = false;
	}
</script>

<svelte:window onclick={handleClickOutside} />

<header class="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
	<div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
		<a
			href={resolve('/')}
			class="text-xl font-bold tracking-tight transition-colors hover:text-zinc-300"
		>
			UI<span class="text-emerald-400">Battles</span>
		</a>
		<div class="flex items-center gap-2 md:gap-3">
			<a
				href="https://github.com/emincangencer/uibattles"
				target="_blank"
				rel="noopener noreferrer"
				aria-label="GitHub repository"
				class="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					><path
						d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"
					/><path d="M9 18c-4.51 2-5-2-7-2" /></svg
				>
			</a>
			<a
				href={resolve('/generate')}
				class="rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-emerald-600 md:px-4 md:py-2"
			>
				Generate
			</a>
			{#if user}
				<div class="relative" bind:this={menuRef}>
					<button
						type="button"
						aria-label="User menu"
						aria-expanded={menuOpen}
						aria-haspopup="true"
						class="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
						onclick={() => (menuOpen = !menuOpen)}
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="20"
							height="20"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
							<circle cx="12" cy="7" r="4" />
						</svg>
					</button>
					{#if menuOpen}
						<div
							class="absolute top-full right-0 mt-2 w-48 rounded-lg border border-zinc-700 bg-zinc-800 py-1 shadow-lg"
							role="menu"
						>
							<a
								href={resolve('/account')}
								onclick={closeMenu}
								class="block px-4 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-zinc-100"
								role="menuitem"
							>
								Account
							</a>
							<form
								method="POST"
								action={resolve('/signout')}
								use:enhance={() => {
									menuOpen = false;
								}}
							>
								<button
									type="submit"
									class="block w-full px-4 py-2 text-left text-sm text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-zinc-100"
									role="menuitem"
								>
									Sign out
								</button>
							</form>
						</div>
					{/if}
				</div>
			{:else}
				<a
					href={resolve('/login')}
					class="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm font-semibold text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-zinc-100 md:px-4 md:py-2"
				>
					Sign in
				</a>
			{/if}
		</div>
	</div>
</header>
