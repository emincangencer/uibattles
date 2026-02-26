<script lang="ts">
	import { resolve } from '$app/paths';
	import SearchInput from '$lib/components/SearchInput.svelte';
	import SortDropdown from '$lib/components/SortDropdown.svelte';
	import GenerationCard from '$lib/components/GenerationCard.svelte';
	import InfiniteScroll from '$lib/components/InfiniteScroll.svelte';

	interface Preview {
		id: string;
		modelName: string;
		html: string;
	}

	interface Generation {
		id: string;
		name: string;
		createdAt: Date;
		itemCount: number;
		viewCount: number;
		likesCount: number;
		preview: Preview | null;
		userLiked?: boolean;
	}

	let { data } = $props();

	// Use $derived.by to transform data, then use that to initialize state
	// This pattern is intentional: start with server data, replace with client data
	let generationsList = $state<Generation[]>([]);
	let cursor = $state<string | null>(null);
	let hasMore = $state(true);
	let isLoading = $state(false);
	let searchQuery = $state('');
	let sortBy = $state<'recent' | 'popular' | 'most_liked'>('recent');
	let userLoggedIn = $state(false);

	// Initialize from server data on mount
	$effect(() => {
		const gens = (data.generations as Generation[]).map((g) => ({
			...g,
			viewCount: g.viewCount ?? 0,
			likesCount: g.likesCount ?? 0
		}));
		if (generationsList.length === 0 && gens.length > 0) {
			generationsList = gens;
			cursor = (data as { initialCursor?: string }).initialCursor ?? null;
			hasMore = (data as { initialHasMore?: boolean }).initialHasMore ?? true;
			userLoggedIn = !!data.user;
		}
	});

	async function loadMore() {
		if (isLoading || !hasMore) return;
		isLoading = true;

		try {
			const queryParts = [`limit=20`, `sort=${sortBy}`];
			if (cursor) queryParts.push(`cursor=${encodeURIComponent(cursor)}`);
			if (searchQuery) queryParts.push(`search=${encodeURIComponent(searchQuery)}`);

			const res = await fetch(`/api/generations?${queryParts.join('&')}`);
			const result = (await res.json()) as {
				generations: Generation[];
				nextCursor: string | null;
				hasMore: boolean;
			};

			generationsList = [...generationsList, ...result.generations];
			cursor = result.nextCursor;
			hasMore = result.hasMore;
		} catch (error) {
			console.error('Error loading more generations:', error);
		} finally {
			isLoading = false;
		}
	}

	async function handleSearchChange(value: string) {
		searchQuery = value;
		await resetAndLoad();
	}

	async function handleSortChange(value: 'recent' | 'popular' | 'most_liked') {
		sortBy = value;
		await resetAndLoad();
	}

	async function resetAndLoad() {
		isLoading = true;
		generationsList = [];
		cursor = null;
		hasMore = true;

		try {
			const queryParts = [`limit=20`, `sort=${sortBy}`];
			if (searchQuery) queryParts.push(`search=${encodeURIComponent(searchQuery)}`);

			const res = await fetch(`/api/generations?${queryParts.join('&')}`);
			const result = (await res.json()) as {
				generations: Generation[];
				nextCursor: string | null;
				hasMore: boolean;
			};

			generationsList = result.generations;
			cursor = result.nextCursor;
			hasMore = result.hasMore;
		} catch (error) {
			console.error('Error resetting generations:', error);
		} finally {
			isLoading = false;
		}
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

	<div class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div class="w-full sm:w-80">
			<SearchInput bind:value={searchQuery} onchange={handleSearchChange} />
		</div>
		<div class="flex items-center gap-4">
			<SortDropdown bind:value={sortBy} onchange={handleSortChange} />
		</div>
	</div>

	{#if generationsList.length === 0 && !isLoading}
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
			<h2 class="mb-2 text-xl font-semibold text-zinc-300">
				{searchQuery ? 'No results found' : 'No battles yet'}
			</h2>
			<p class="mb-6 text-zinc-500">
				{searchQuery ? 'Try a different search term' : 'Create your first UI battle to get started'}
			</p>
		</div>
	{:else}
		<InfiniteScroll {hasMore} {isLoading} onloadmore={loadMore}>
			<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
				{#each generationsList as generation (generation.id)}
					<GenerationCard
						id={generation.id}
						name={generation.name}
						createdAt={generation.createdAt}
						itemCount={generation.itemCount}
						viewCount={generation.viewCount}
						likesCount={generation.likesCount}
						preview={generation.preview}
						userLiked={generation.userLiked}
						{userLoggedIn}
					/>
				{/each}
			</div>
		</InfiniteScroll>
	{/if}
</div>
