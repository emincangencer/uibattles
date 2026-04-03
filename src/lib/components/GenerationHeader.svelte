<script lang="ts">
	import { resolve } from '$app/paths';
	import { formatCount, formatDateTime } from '$lib/utils';

	interface Creator {
		id: string;
		name: string | null;
		image: string | null;
	}

	interface Generation {
		id: string;
		name: string;
		createdAt: Date;
		viewCount?: number;
	}

	interface Item {
		id: string;
		modelName: string;
	}

	type DeviceType = 'desktop' | 'tablet' | 'mobile';

	let {
		generation,
		creator,
		likesCount,
		isLiked,
		userLoggedIn,
		isLiking,
		items,
		selectedModelIndex = $bindable(),
		device = $bindable(),
		onOpenCodeModal,
		onOpenAddModelModal,
		onLike
	} = $props<{
		generation: Generation;
		creator: Creator | null;
		likesCount: number;
		isLiked: boolean;
		userLoggedIn: boolean;
		isLiking: boolean;
		items: Item[];
		selectedModelIndex: number;
		device: DeviceType;
		onOpenCodeModal: () => void;
		onOpenAddModelModal: () => void;
		onLike: () => void;
	}>();

	function prevModel() {
		selectedModelIndex = selectedModelIndex > 0 ? selectedModelIndex - 1 : items.length - 1;
	}

	function nextModel() {
		selectedModelIndex = selectedModelIndex < items.length - 1 ? selectedModelIndex + 1 : 0;
	}

	function selectModel(index: number) {
		selectedModelIndex = index;
	}
</script>

<header class="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
	<div
		class="mx-auto flex h-auto min-h-16 flex-wrap items-center justify-between gap-2 px-2 py-2 sm:flex-nowrap sm:gap-4 sm:px-4 sm:py-0"
	>
		<div class="flex min-w-0 items-center gap-2 sm:gap-4">
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
				<h1 class="truncate text-base font-semibold text-zinc-100 sm:text-lg">
					{generation.name}
				</h1>
				<p class="flex flex-wrap items-center gap-x-1 gap-y-1 text-xs text-zinc-500 sm:gap-x-2">
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

		<div class="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:gap-3">
			<!-- Model Navigation -->
			{#if items.length > 1}
				<div
					class="flex items-center gap-1 rounded-lg bg-zinc-800 px-2 py-1 sm:gap-2 sm:px-3 sm:py-1.5"
				>
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
					<span class="min-w-[40px] text-center text-xs text-zinc-400 sm:min-w-[60px] sm:text-sm">
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
					class="max-w-[120px] rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none sm:max-w-none sm:px-3 sm:py-1.5 sm:text-sm"
				>
					{#each items as item, i (item.id)}
						<option value={i}>{item.modelName}</option>
					{/each}
				</select>
			{/if}

			<!-- Device Toggle -->
			<div
				class="flex items-center gap-0.5 rounded-lg bg-zinc-800 px-0.5 py-0.5 sm:gap-1 sm:px-1 sm:py-1"
			>
				<button
					onclick={() => (device = 'desktop')}
					class="rounded p-1 transition-colors {device === 'desktop'
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
					class="rounded p-1 transition-colors {device === 'tablet'
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
					class="rounded p-1 transition-colors {device === 'mobile'
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

			<!-- Code Button -->
			{#if items.length > 0 && items[selectedModelIndex]}
				<button
					onclick={onOpenCodeModal}
					class="rounded-lg bg-zinc-800 px-2 py-1 text-xs whitespace-nowrap text-zinc-300 transition-colors hover:bg-zinc-700 sm:px-3 sm:py-1.5 sm:text-sm"
				>
					Code
				</button>
			{/if}

			<!-- Like Button -->
			<button
				onclick={onLike}
				disabled={!userLoggedIn || isLiking}
				class="flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs whitespace-nowrap transition-colors hover:bg-zinc-700 disabled:opacity-50 sm:gap-2 sm:px-3 sm:py-1.5 sm:text-sm
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
				<span class="hidden sm:inline">{likesCount}</span>
			</button>

			<!-- Add Model Button -->
			<button
				onclick={onOpenAddModelModal}
				class="flex items-center gap-1 rounded-lg bg-emerald-500 px-2 py-1 text-xs font-medium whitespace-nowrap text-zinc-950 transition-colors hover:bg-emerald-600 sm:gap-2 sm:px-3 sm:py-1.5 sm:text-sm"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-4 w-4"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
				>
					<path d="M12 5v14M5 12h14" />
				</svg>
				<span>Add Model</span>
			</button>
		</div>
	</div>
</header>
