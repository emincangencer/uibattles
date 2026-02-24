<script lang="ts">
	import { resolve } from '$app/paths';

	interface Generation {
		id: string;
		name: string;
		prompt: string;
		createdAt: Date;
		itemCount: number;
		preview: {
			id: string;
			modelName: string;
			html: string;
		} | null;
	}

	let { data } = $props();
	let generations = $derived(data.generations as Generation[]);

	function formatDate(date: Date): string {
		return new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		}).format(new Date(date));
	}
</script>

<svelte:head>
	<title>UI Battles - Compare AI UI Generations</title>
	<meta
		name="description"
		content="Compare how different AI models generate UI. See which model creates the best landing pages, forms, and components."
	/>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-12">
	<div class="mb-12 text-center">
		<h1 class="mb-4 text-5xl font-bold tracking-tight">
			UI <span class="text-emerald-400">Battles</span>
		</h1>
		<p class="mx-auto mb-8 max-w-2xl text-lg text-zinc-400">
			Compare how different AI models generate UI. Enter a prompt, select multiple models, and see
			which one creates the best result.
		</p>
		<a
			href={resolve('/generate')}
			class="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-6 py-3 font-semibold text-zinc-950 transition-colors hover:bg-emerald-600"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="h-5 w-5"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
			>
				<path d="M12 5v14M5 12h14" />
			</svg>
			Start a Battle
		</a>
	</div>

	{#if generations.length === 0}
		<div class="py-20 text-center">
			<div class="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-zinc-900">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-12 w-12 text-zinc-600"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
				>
					<rect x="3" y="3" width="18" height="18" rx="2" />
					<path d="M3 9h18M9 21V9" />
				</svg>
			</div>
			<h2 class="mb-2 text-xl font-semibold text-zinc-300">No battles yet</h2>
			<p class="mb-6 text-zinc-500">Create your first UI battle to get started</p>
		</div>
	{:else}
		<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
			{#each generations as generation (generation.id)}
				<a
					href={resolve('/generation/[id]', { id: generation.id })}
					class="group block overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 transition-all hover:border-zinc-700 hover:shadow-lg hover:shadow-emerald-500/5"
				>
					<div class="relative aspect-video overflow-hidden bg-zinc-950">
						{#if generation.preview}
							<iframe
								srcdoc={generation.preview.html}
								title={generation.name}
								class="h-full w-full transform border-0 transition-transform duration-300 group-hover:scale-[1.02]"
								sandbox="allow-scripts"
							></iframe>
							<div
								class="absolute right-2 bottom-2 rounded bg-zinc-950/80 px-2 py-1 text-xs text-zinc-400 backdrop-blur-sm"
							>
								{generation.preview.modelName.split('/').pop()}
							</div>
						{:else}
							<div class="flex h-full w-full items-center justify-center text-zinc-600">
								No preview
							</div>
						{/if}
					</div>
					<div class="p-4">
						<h3
							class="truncate font-semibold text-zinc-100 transition-colors group-hover:text-emerald-400"
						>
							{generation.name}
						</h3>
						<div class="mt-2 flex items-center justify-between text-sm text-zinc-500">
							<span>{generation.itemCount} model{generation.itemCount !== 1 ? 's' : ''}</span>
							<span>{formatDate(generation.createdAt)}</span>
						</div>
					</div>
				</a>
			{/each}
		</div>
	{/if}
</div>
