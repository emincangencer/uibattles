<script lang="ts">
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import { formatCount, formatDateTime } from '$lib/utils';

	interface Creator {
		id: string;
		name: string | null;
		image: string | null;
	}

	interface GenerationItem {
		id: string;
		modelId: string;
		modelName: string;
		html: string;
		createdAt: Date;
	}

	type DeviceType = 'desktop' | 'tablet' | 'mobile';

	let { data } = $props();
	let generation = $derived(
		data.generation as {
			id: string;
			name: string;
			prompt: string;
			createdAt: Date;
			viewCount?: number;
			likesCount?: number;
		}
	);
	let creator = $derived(data.creator as Creator | null);
	let items = $derived(data.items as GenerationItem[]);
	let initialUserLiked = $derived((data as { userLiked?: boolean }).userLiked ?? false);
	let userLoggedIn = $derived(!!data.user);

	let selectedModelIndex = $state(0);
	let device = $state<DeviceType>('desktop');
	let showPromptModal = $state(false);

	let localLikeState = $state<{ isLiked: boolean; likesCount: number } | null>(null);

	let isLiked = $derived(localLikeState !== null ? localLikeState.isLiked : initialUserLiked);
	let likesCount = $derived(
		localLikeState !== null ? localLikeState.likesCount : (generation.likesCount ?? 0)
	);
	let isLiking = $state(false);

	const deviceWidths = {
		desktop: 1440,
		tablet: 768,
		mobile: 375
	} as const;

	onMount(() => {
		const viewedKey = `viewed_${generation.id}`;
		const hasViewed = localStorage.getItem(viewedKey);
		if (!hasViewed) {
			fetch(`/api/generations/${generation.id}/view`, { method: 'POST' });
			localStorage.setItem(viewedKey, 'true');
		}
	});

	async function handleLike() {
		if (!userLoggedIn || isLiking) return;
		isLiking = true;
		const previousState = localLikeState;

		// Optimistic update
		localLikeState = {
			isLiked: !isLiked,
			likesCount: likesCount + (isLiked ? -1 : 1)
		};

		try {
			const res = await fetch(`/api/generations/${generation.id}/like`, { method: 'POST' });
			const result = (await res.json()) as { success: boolean; liked: boolean; likesCount: number };
			if (result.success) {
				localLikeState = {
					isLiked: result.liked,
					likesCount: result.likesCount
				};
			} else {
				localLikeState = previousState;
			}
		} catch {
			localLikeState = previousState;
		} finally {
			isLiking = false;
		}
	}

	function selectModel(index: number) {
		selectedModelIndex = index;
	}

	function prevModel() {
		selectedModelIndex = selectedModelIndex > 0 ? selectedModelIndex - 1 : items.length - 1;
	}

	function nextModel() {
		selectedModelIndex = selectedModelIndex < items.length - 1 ? selectedModelIndex + 1 : 0;
	}

	function copyHtml() {
		if (currentItem) {
			navigator.clipboard.writeText(currentItem.html);
		}
	}

	let currentItem = $derived(items[selectedModelIndex] || null);
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && (showPromptModal = false)} />

<svelte:head>
	<title>{generation.name} - UI Battles</title>
</svelte:head>

<div class="mx-auto max-w-full">
	<!-- Header -->
	<header class="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
		<div class="mx-auto flex h-16 max-w-full items-center justify-between gap-4 px-4">
			<div class="flex min-w-0 items-center gap-4">
				<a
					href={resolve('/')}
					class="text-zinc-400 transition-colors hover:text-zinc-200"
					aria-label="Back to home"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-5 w-5"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<path d="M19 12H5M12 19l-7-7 7-7" />
					</svg>
				</a>
				<div class="min-w-0">
					<h1 class="truncate text-lg font-semibold text-zinc-100">{generation.name}</h1>
					<p class="flex flex-wrap items-center gap-x-2 text-xs text-zinc-500">
						{#if creator}
							<span class="text-zinc-400">{creator.name || 'Anonymous'}</span>
						{/if}
						<span>{formatDateTime(generation.createdAt)}</span>
						<span class="flex items-center gap-1">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-3 w-3"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
							>
								<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
								<circle cx="12" cy="12" r="3" />
							</svg>
							{formatCount(generation.viewCount ?? 0)}
						</span>
						<span class="flex items-center gap-1">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-3 w-3"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
							>
								<path
									d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
								/>
							</svg>
							{formatCount(likesCount)}
						</span>
					</p>
				</div>
			</div>

			<div class="flex items-center gap-3">
				<!-- Model Navigation -->
				{#if items.length > 1}
					<div class="flex items-center gap-2 rounded-lg bg-zinc-800 px-3 py-1.5">
						<button
							onclick={prevModel}
							class="rounded p-1 transition-colors hover:bg-zinc-700"
							aria-label="Previous model"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-4 w-4"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
							>
								<path d="M15 18l-6-6 6-6" />
							</svg>
						</button>
						<span class="min-w-[60px] text-center text-sm text-zinc-400">
							{items.length > 0 ? selectedModelIndex + 1 : 0} / {items.length}
						</span>
						<button
							onclick={nextModel}
							class="rounded p-1 transition-colors hover:bg-zinc-700"
							aria-label="Next model"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-4 w-4"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
							>
								<path d="M9 18l6-6-6-6" />
							</svg>
						</button>
					</div>
				{/if}

				<!-- Model Selector -->
				{#if items.length > 0}
					<select
						value={selectedModelIndex}
						onchange={(e) => selectModel(Number((e.target as HTMLSelectElement).value))}
						class="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
					>
						{#each items as item, i (item.id)}
							<option value={i}>{item.modelName}</option>
						{/each}
					</select>
				{/if}

				<!-- Device Toggle -->
				<div class="flex items-center gap-1 rounded-lg bg-zinc-800 px-1 py-1">
					<button
						onclick={() => (device = 'desktop')}
						class="rounded p-1.5 transition-colors {device === 'desktop'
							? 'bg-zinc-700 text-zinc-100'
							: 'text-zinc-400 hover:text-zinc-200'}"
						aria-label="Desktop view"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-4 w-4"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
						>
							<rect x="2" y="3" width="20" height="14" rx="2" />
							<path d="M8 21h8M12 17v4" />
						</svg>
					</button>
					<button
						onclick={() => (device = 'tablet')}
						class="rounded p-1.5 transition-colors {device === 'tablet'
							? 'bg-zinc-700 text-zinc-100'
							: 'text-zinc-400 hover:text-zinc-200'}"
						aria-label="Tablet view"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-4 w-4"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
						>
							<rect x="4" y="2" width="16" height="20" rx="2" />
							<path d="M12 18h.01" />
						</svg>
					</button>
					<button
						onclick={() => (device = 'mobile')}
						class="rounded p-1.5 transition-colors {device === 'mobile'
							? 'bg-zinc-700 text-zinc-100'
							: 'text-zinc-400 hover:text-zinc-200'}"
						aria-label="Mobile view"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-4 w-4"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
						>
							<rect x="5" y="2" width="14" height="20" rx="2" />
							<path d="M12 18h.01" />
						</svg>
					</button>
				</div>

				<!-- Copy Button -->
				{#if currentItem}
					<button
						onclick={copyHtml}
						class="rounded-lg bg-zinc-800 px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:bg-zinc-700"
					>
						Copy HTML
					</button>
				{/if}

				<!-- Like Button -->
				<button
					onclick={handleLike}
					disabled={!userLoggedIn || isLiking}
					class="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm transition-colors hover:bg-zinc-700 disabled:opacity-50
						{isLiked ? 'border-red-500/50 text-red-400' : 'text-zinc-300'}"
					title={userLoggedIn ? (isLiked ? 'Unlike' : 'Like') : 'Sign in to like'}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-4 w-4"
						viewBox="0 0 24 24"
						fill={isLiked ? 'currentColor' : 'none'}
						stroke="currentColor"
						stroke-width="2"
					>
						<path
							d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
						/>
					</svg>
					{likesCount}
				</button>
			</div>
		</div>
	</header>

	<!-- Prompt Display -->
	<div class="border-b border-zinc-800 bg-zinc-900/30 px-4 py-3">
		<p class="max-w-4xl text-sm text-zinc-400">
			<span class="text-zinc-500">Prompt:</span>
			{#if generation.prompt.length > 200}
				<span class="line-clamp-2">{generation.prompt.slice(0, 200)}</span>
				<button
					onclick={() => (showPromptModal = true)}
					class="ml-1 text-emerald-400 hover:text-emerald-300"
				>
					Read more
				</button>
			{:else}
				{generation.prompt}
			{/if}
		</p>
	</div>

	<!-- Preview Area -->
	{#if !currentItem}
		<div class="flex h-96 items-center justify-center text-zinc-500">No generation items found</div>
	{:else}
		<div class="p-4">
			<!-- Single Preview based on device -->
			<div class="mx-auto flex flex-col items-center">
				<div
					class="flex w-full items-center justify-between rounded-t-lg border border-b-0 border-zinc-700 bg-zinc-900 px-4 py-2"
				>
					<span class="text-sm font-medium text-zinc-400 capitalize">{device}</span>
					<span class="text-sm text-zinc-500">{deviceWidths[device]}px</span>
				</div>
				<div class="w-full overflow-hidden rounded-b-lg border border-zinc-700 bg-white">
					<iframe
						srcdoc={currentItem.html}
						title="{device} preview"
						class="mx-auto"
						style="width: {deviceWidths[device]}px; max-width: 100%; height: calc(100vh - 280px);"
						sandbox="allow-scripts"
					></iframe>
				</div>
			</div>
		</div>
	{/if}

	<!-- Prompt Modal -->
	{#if showPromptModal}
		<div
			class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
			onclick={(e) => {
				if (e.target === e.currentTarget) showPromptModal = false;
			}}
			role="presentation"
		>
			<div
				class="max-h-[80vh] w-full max-w-2xl overflow-auto rounded-xl border border-zinc-700 bg-zinc-900 p-6"
				role="dialog"
				aria-modal="true"
			>
				<div class="mb-4 flex items-center justify-between">
					<h2 class="text-lg font-semibold text-zinc-100">Prompt</h2>
					<button
						onclick={() => (showPromptModal = false)}
						class="rounded-lg p-1 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
						aria-label="Close modal"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-5 w-5"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
						>
							<path d="M18 6L6 18M6 6l12 12" />
						</svg>
					</button>
				</div>
				<p class="text-sm leading-relaxed whitespace-pre-wrap text-zinc-300">
					{generation.prompt}
				</p>
			</div>
		</div>
	{/if}
</div>
