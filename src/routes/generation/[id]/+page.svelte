<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { resolve } from '$app/paths';
	import { createSandboxedPreviewDocument } from '$lib/utils';
	import ModelSelector from '$lib/components/ModelSelector.svelte';
	import ApiKeyInput from '$lib/components/ApiKeyInput.svelte';
	import GenerationHeader from '$lib/components/GenerationHeader.svelte';

	interface Creator {
		id: string;
		name: string | null;
		image: string | null;
	}

	interface ItemLikes {
		liked: boolean;
		likesCount: number;
	}

	interface GenerationItem {
		id: string;
		modelId: string;
		modelName: string;
		html: string;
		createdAt: Date;
		status?: string;
		contributorId?: string | null;
		contributorName?: string | null;
	}

	type DeviceType = 'desktop' | 'tablet' | 'mobile';
	const PREVIEW_RESIZE_MESSAGE_TYPE = 'uibattles-preview-resize';
	const PREVIEW_HOST_SCROLL_MESSAGE_TYPE = 'uibattles-preview-host-scroll';
	const PREVIEW_FALLBACK_HEIGHT = 500;

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
	let userLoggedIn = $derived(!!data.user);
	let itemLikesMap = $state<Record<string, ItemLikes>>({});

	$effect(() => {
		const likes = (data as { itemLikes?: Record<string, ItemLikes> }).itemLikes;
		if (likes) {
			itemLikesMap = likes;
		}
	});

	let selectedModelIndex = $state(0);
	let device = $state<DeviceType>('desktop');
	let showPromptModal = $state(false);
	let showCodeModal = $state(false);
	let showAddModelModal = $state(false);
	let codeCopied = $state(false);
	let previewHeight = $state(PREVIEW_FALLBACK_HEIGHT);
	let previewFrameWidth = $state(0);
	let previewIframe: HTMLIFrameElement | null = $state(null);

	let localItemLikeState = $state<{ isLiked: boolean; likesCount: number } | null>(null);

	// Reset local like state when switching models
	$effect(() => {
		// Track dependency on selectedModelIndex
		void selectedModelIndex;
		localItemLikeState = null;
	});

	let currentItem = $derived(items[selectedModelIndex] || null);
	let currentItemLikes = $derived(
		itemLikesMap[currentItem?.id ?? ''] ?? { liked: false, likesCount: 0 }
	);
	let isLiked = $derived(
		localItemLikeState !== null ? localItemLikeState.isLiked : currentItemLikes.liked
	);
	let itemLikesCount = $derived(
		localItemLikeState !== null ? localItemLikeState.likesCount : currentItemLikes.likesCount
	);
	let isLiking = $state(false);

	let totalLikes = $derived(Object.values(itemLikesMap).reduce((sum, v) => sum + v.likesCount, 0));

	let selectedModels = $state<string[]>([]);
	let apiKey = $state('');
	let rememberMe = $state(false);
	let isAddingModels = $state(false);
	let addModelError = $state('');
	let pollInterval: ReturnType<typeof setInterval> | null = null;

	function loadApiKey() {
		if (typeof window !== 'undefined') {
			const stored = localStorage.getItem('openrouter_api_key');
			if (stored) {
				apiKey = stored;
				rememberMe = true;
			}
		}
	}

	loadApiKey();

	$effect(() => {
		if (typeof window !== 'undefined') {
			if (rememberMe && apiKey) {
				localStorage.setItem('openrouter_api_key', apiKey);
			} else if (!rememberMe) {
				localStorage.removeItem('openrouter_api_key');
			}
		}
	});

	let models = $derived(data.models as { id: string; name: string }[]);

	let polledItems = $derived.by(() => {
		return items;
	});
	let completedModelIds = $derived(
		polledItems.filter((item) => item.status === 'completed').map((item) => item.modelId)
	);
	let failedModelIds = $derived(
		(data as { failedItems?: GenerationItem[] }).failedItems?.map((item) => item.modelId) ?? []
	);

	const deviceWidths = {
		desktop: 1440,
		tablet: 768,
		mobile: 375
	} as const;

	const deviceHeights = {
		desktop: 900,
		tablet: 1024,
		mobile: 812
	} as const;

	let previewViewportWidth = $derived.by(() => {
		const baseWidth = deviceWidths[device];
		if (device !== 'desktop' || previewFrameWidth <= 0) return baseWidth;
		return Math.max(baseWidth, previewFrameWidth);
	});

	let previewScale = $derived.by(() => {
		if (previewFrameWidth <= 0) return 1;
		return Math.min(1, previewFrameWidth / previewViewportWidth);
	});

	let scaledPreviewHeight = $derived(
		Math.max(PREVIEW_FALLBACK_HEIGHT, Math.ceil(previewHeight * previewScale))
	);
	let standalonePreviewHref = $derived.by(() => {
		if (!currentItem) return '#';
		return resolve('/preview/[itemId]', { itemId: currentItem.id });
	});

	onMount(() => {
		const viewedKey = `viewed_${generation.id}`;
		const hasViewed = localStorage.getItem(viewedKey);
		if (!hasViewed) {
			fetch(`/api/generations/${generation.id}/view`, { method: 'POST' });
			localStorage.setItem(viewedKey, 'true');
		}
	});

	async function handleLike() {
		if (!userLoggedIn || isLiking || !currentItem) return;
		isLiking = true;
		const previousState = localItemLikeState;

		localItemLikeState = {
			isLiked: !isLiked,
			likesCount: itemLikesCount + (isLiked ? -1 : 1)
		};

		try {
			const res = await fetch(`/api/generation-items/${currentItem.id}/like`, { method: 'POST' });
			const result = (await res.json()) as { success: boolean; liked: boolean; likesCount: number };
			if (result.success) {
				localItemLikeState = {
					isLiked: result.liked,
					likesCount: result.likesCount
				};
				itemLikesMap = {
					...itemLikesMap,
					[currentItem.id]: { liked: result.liked, likesCount: result.likesCount }
				};
			} else {
				localItemLikeState = previousState;
			}
		} catch {
			localItemLikeState = previousState;
		} finally {
			isLiking = false;
		}
	}

	async function copyHtml() {
		if (currentItem) {
			await navigator.clipboard.writeText(currentItem.html);
			codeCopied = true;
			setTimeout(() => (codeCopied = false), 2000);
		}
	}

	function handlePreviewMessage(event: MessageEvent) {
		const data = event.data;
		if (!data || typeof data !== 'object') return;
		if (data.type !== PREVIEW_RESIZE_MESSAGE_TYPE) return;
		if (!currentItem || data.previewId !== currentItem.id) return;
		if (typeof data.height !== 'number' || !Number.isFinite(data.height)) return;

		previewHeight = Math.max(PREVIEW_FALLBACK_HEIGHT, Math.ceil(data.height));
	}

	function syncPreviewScrollState() {
		if (typeof window === 'undefined' || !previewIframe?.contentWindow || !currentItem) return;

		const rect = previewIframe.getBoundingClientRect();
		const viewportHeight = Math.max(
			0,
			Math.min(window.innerHeight, rect.bottom) - Math.max(0, rect.top)
		);
		const scrollTop = Math.max(0, -rect.top);

		previewIframe.contentWindow.postMessage(
			{
				type: PREVIEW_HOST_SCROLL_MESSAGE_TYPE,
				previewId: currentItem.id,
				scrollTop,
				viewportHeight
			},
			'*'
		);
	}

	let canOpenStandalonePreview = $derived(
		!!currentItem && currentItem.status === 'completed' && currentItem.html.trim().length > 0
	);

	function toggleModel(modelId: string) {
		if (selectedModels.includes(modelId)) {
			selectedModels = selectedModels.filter((m) => m !== modelId);
		} else {
			selectedModels = [...selectedModels, modelId];
		}
	}

	async function handleAddModels() {
		if (selectedModels.length === 0) {
			addModelError = 'Please select at least one model';
			return;
		}
		if (!apiKey.trim()) {
			addModelError = 'Please enter your OpenRouter API key';
			return;
		}

		addModelError = '';
		isAddingModels = true;

		try {
			const response = await fetch(`/api/generation/${generation.id}/add-models`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					models: selectedModels,
					apiKey
				})
			});

			const result: {
				success?: boolean;
				error?: string;
				addedCount?: number;
				retryCount?: number;
			} = await response.json();

			if (!response.ok || !result.success) {
				throw new Error(result.error || 'Failed to add models');
			}

			const totalAdded = (result.addedCount ?? 0) + (result.retryCount ?? 0);
			showAddModelModal = false;
			selectedModels = [];

			if (totalAdded > 0) {
				pollNewItems();
			}
		} catch (e) {
			addModelError = e instanceof Error ? e.message : 'Failed to add models';
		} finally {
			isAddingModels = false;
		}
	}

	function pollNewItems() {
		clearPollInterval();

		pollInterval = setInterval(async () => {
			try {
				const response = await fetch(`/api/generation/${generation.id}/status`);
				if (!response.ok) {
					clearPollInterval();
					return;
				}

				const status: {
					status: string;
					items: Array<{
						id: string;
						modelId: string;
						modelName: string;
						userId?: string | null;
						contributorName?: string | null;
						status: string;
						html?: string;
						error?: string | null;
					}>;
				} = await response.json();

				const allItemsComplete = status.items.every(
					(item) =>
						item.status === 'completed' || item.status === 'error' || item.status === 'aborted'
				);

				if (status.status === 'completed' || status.status === 'aborted' || allItemsComplete) {
					clearPollInterval();
					location.reload();
				}
			} catch {
				clearPollInterval();
			}
		}, 3000);
	}

	function clearPollInterval() {
		if (pollInterval) {
			clearInterval(pollInterval);
			pollInterval = null;
		}
	}

	onDestroy(() => {
		clearPollInterval();
	});

	$effect(() => {
		const previewKey = currentItem ? `${currentItem.id}:${device}` : `empty:${device}`;
		if (previewKey.length > 0) {
			previewHeight = PREVIEW_FALLBACK_HEIGHT;
		}
	});

	$effect(() => {
		if (typeof window === 'undefined' || !currentItem) return;

		requestAnimationFrame(() => {
			syncPreviewScrollState();
		});
	});
</script>

<svelte:window
	onmessage={handlePreviewMessage}
	onscroll={syncPreviewScrollState}
	onresize={syncPreviewScrollState}
	onkeydown={(e) => {
		if (e.key === 'Escape') {
			showPromptModal = false;
			showCodeModal = false;
		}
	}}
/>

<svelte:head>
	<title>{generation.name} - UI Battles</title>
</svelte:head>

<div class="mx-auto max-w-full overflow-x-hidden">
	<GenerationHeader
		{generation}
		{creator}
		{totalLikes}
		{isLiked}
		{userLoggedIn}
		{isLiking}
		items={polledItems}
		{itemLikesCount}
		bind:selectedModelIndex
		bind:device
		onOpenCodeModal={() => (showCodeModal = true)}
		onOpenAddModelModal={() => (showAddModelModal = true)}
		onLike={handleLike}
	/>

	<div class="border-b border-zinc-800 bg-zinc-900/30 px-2 py-2 sm:px-4 sm:py-3">
		<p class="max-w-4xl text-xs text-zinc-400 sm:text-sm">
			<span class="text-zinc-500">Prompt:</span>
			{#if generation.prompt.length > 100}
				<span class="line-clamp-2">{generation.prompt.slice(0, 100)}</span>
				<button
					onclick={() => (showPromptModal = true)}
					class="ml-1 whitespace-nowrap text-emerald-400 hover:text-emerald-300"
				>
					Read more
				</button>
			{:else}
				{generation.prompt}
			{/if}
		</p>
	</div>

	{#if !currentItem}
		<div class="flex h-96 items-center justify-center text-zinc-500">No generation items found</div>
	{:else}
		<div class="p-2 sm:p-4">
			<div class="mx-auto flex flex-col items-center">
				<div
					class="flex w-full items-center justify-between rounded-t-lg border border-b-0 border-zinc-700 bg-zinc-900 px-2 py-1 sm:px-4 sm:py-2"
				>
					<span class="text-xs font-medium text-zinc-400 capitalize sm:text-sm">{device}</span>
					<div class="flex items-center gap-2">
						<span class="text-xs text-zinc-500 sm:text-sm">{previewViewportWidth}px</span>
						<button
							type="button"
							onclick={() => {
								if (!previewIframe) return;
								previewIframe.srcdoc = createSandboxedPreviewDocument(currentItem.html, {
									resizeToContent: true,
									syncHostScroll: true,
									previewId: currentItem.id,
									viewport: {
										width: previewViewportWidth,
										height: deviceHeights[device]
									}
								});
							}}
							class="rounded-md p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
							aria-label="Reload preview"
							title="Reload preview"
							disabled={!currentItem}
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-4 w-4"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
							>
								<path d="M21 2v6h-6" />
								<path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
								<path d="M3 22v-6h6" />
								<path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
							</svg>
						</button>
						<button
							type="button"
							onclick={() => {
								if (!canOpenStandalonePreview) return;
								window.open(standalonePreviewHref, '_blank', 'noopener,noreferrer');
							}}
							class="rounded-md p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
							aria-label="Open preview in new tab"
							title={canOpenStandalonePreview
								? 'Open preview in new tab'
								: 'Preview available after generation completes'}
							disabled={!canOpenStandalonePreview}
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-4 w-4"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
							>
								<path d="M14 3h7v7" />
								<path d="M10 14L21 3" />
								<path d="M21 14v4a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3h4" />
							</svg>
						</button>
					</div>
				</div>
				<div
					bind:clientWidth={previewFrameWidth}
					class="w-full overflow-hidden rounded-b-lg border border-zinc-700"
				>
					<div
						class="mx-auto origin-top-left overflow-hidden"
						style="width: {previewViewportWidth * previewScale}px; height: {scaledPreviewHeight}px;"
					>
						<iframe
							bind:this={previewIframe}
							srcdoc={createSandboxedPreviewDocument(currentItem.html, {
								resizeToContent: true,
								syncHostScroll: true,
								previewId: currentItem.id,
								viewport: {
									width: previewViewportWidth,
									height: deviceHeights[device]
								}
							})}
							onload={syncPreviewScrollState}
							title="{device} preview"
							class="block"
							style="width: {previewViewportWidth}px; min-height: {PREVIEW_FALLBACK_HEIGHT}px; height: {previewHeight}px; transform: scale({previewScale}); transform-origin: top left;"
							sandbox="allow-scripts"
							scrolling="no"
						></iframe>
					</div>
				</div>
			</div>
		</div>
	{/if}

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

	{#if showCodeModal && currentItem}
		<div
			class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 py-8"
			onclick={(e) => {
				if (e.target === e.currentTarget) showCodeModal = false;
			}}
			role="presentation"
		>
			<div
				class="w-full max-w-3xl rounded-xl border border-zinc-700 bg-zinc-900"
				role="dialog"
				aria-modal="true"
			>
				<div class="flex items-center justify-between border-b border-zinc-700 p-3 sm:p-4">
					<h2 class="text-base font-semibold text-zinc-100 sm:text-lg">
						{currentItem.modelName} - HTML
					</h2>
					<div class="flex items-center gap-2">
						<button
							onclick={copyHtml}
							class="rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-medium text-zinc-950 transition-colors hover:bg-emerald-600"
						>
							{codeCopied ? 'Copied!' : 'Copy'}
						</button>
						<button
							onclick={() => (showCodeModal = false)}
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
				</div>
				<textarea
					readonly
					class="h-[80vh] w-full resize-none overflow-auto bg-zinc-950 p-3 font-mono text-xs text-zinc-300 focus:outline-none sm:p-4 sm:text-sm"
					value={currentItem?.html ?? ''}
				></textarea>
			</div>
		</div>
	{/if}

	{#if showAddModelModal}
		<div
			class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 py-8"
			onclick={(e) => {
				if (e.target === e.currentTarget) showAddModelModal = false;
			}}
			role="presentation"
		>
			<div
				class="w-full max-w-2xl rounded-xl border border-zinc-700 bg-zinc-900"
				role="dialog"
				aria-modal="true"
			>
				<div class="flex items-center justify-between border-b border-zinc-700 p-3 sm:p-4">
					<h2 class="text-base font-semibold text-zinc-100 sm:text-lg">Add Models</h2>
					<button
						onclick={() => (showAddModelModal = false)}
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

				<div class="p-3 sm:p-4">
					{#if !userLoggedIn}
						<div
							class="mb-4 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-center"
						>
							<p class="mb-3 text-sm text-zinc-300">Sign in to add models to this generation</p>
							<a
								href={resolve(`/login?redirect=/generation/${generation.id}`)}
								class="inline-block rounded-lg bg-emerald-500 px-6 py-2 text-sm font-semibold text-zinc-950 transition-colors hover:bg-emerald-600"
							>
								Sign In
							</a>
						</div>
					{/if}

					<div class={!userLoggedIn ? 'pointer-events-none opacity-50 grayscale' : ''}>
						<ApiKeyInput
							{apiKey}
							{rememberMe}
							disabled={isAddingModels || !userLoggedIn}
							idPrefix="add"
							onUpdateApiKey={(key) => (apiKey = key)}
							onUpdateRememberMe={(val) => (rememberMe = val)}
						/>

						<div class="mt-4">
							<ModelSelector
								{models}
								{selectedModels}
								excludedModels={completedModelIds}
								retryableModels={failedModelIds}
								disabled={isAddingModels || !userLoggedIn}
								maxHeight="max-h-48"
								onToggle={toggleModel}
							/>
						</div>

						{#if addModelError}
							<div
								class="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400"
							>
								{addModelError}
							</div>
						{/if}

						<button
							onclick={handleAddModels}
							disabled={isAddingModels || selectedModels.length === 0 || !userLoggedIn}
							class="mt-4 w-full rounded-lg bg-emerald-500 py-2.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-zinc-700"
						>
							{#if isAddingModels}
								Adding models...
							{:else}
								Add {selectedModels.length} Model{selectedModels.length !== 1 ? 's' : ''}
							{/if}
						</button>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>
