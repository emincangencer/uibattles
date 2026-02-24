<script lang="ts">
	import { resolve } from '$app/paths';

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
		data.generation as { id: string; name: string; prompt: string; createdAt: Date }
	);
	let creator = $derived(data.creator as Creator | null);
	let items = $derived(data.items as GenerationItem[]);

	let selectedModelIndex = $state(0);
	let device = $state<DeviceType>('desktop');
	let showPromptModal = $state(false);

	let currentItem = $derived(items[selectedModelIndex] || null);

	const deviceWidths = {
		desktop: 1440,
		tablet: 768,
		mobile: 375
	} as const;

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

	function formatDate(date: Date): string {
		return new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		}).format(new Date(date));
	}
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
					<p class="text-xs text-zinc-500">
						{#if creator}
							<span class="text-zinc-400">{creator.name || 'Anonymous'}</span>
							<span class="mx-1">·</span>
						{/if}
						{formatDate(generation.createdAt)}
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
