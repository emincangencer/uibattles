<script lang="ts">
	import { resolve } from '$app/paths';
	import { formatCount, formatDateTime } from '$lib/utils';
	import Button from './ui/Button.svelte';

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
		contributorId?: string | null;
		contributorName?: string | null;
	}

	let {
		generation,
		creator,
		totalLikes,
		isLiked,
		userLoggedIn,
		isLiking,
		items,
		itemLikesCount,
		selectedModelIndex = $bindable(),
		onOpenAddModelModal,
		onLike
	} = $props<{
		generation: Generation;
		creator: Creator | null;
		totalLikes: number;
		isLiked: boolean;
		userLoggedIn: boolean;
		isLiking: boolean;
		items: Item[];
		itemLikesCount: number;
		selectedModelIndex: number;
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

<header class="sticky top-0 z-40 border-b border-border bg-surface/50 backdrop-blur-sm">
	<div
		class="mx-auto flex h-auto min-h-16 flex-wrap items-center justify-between gap-2 px-2 py-2 sm:flex-nowrap sm:gap-4 sm:px-4 sm:py-0"
	>
		<div class="flex min-w-0 items-center gap-2 sm:gap-4">
			<a
				href={resolve('/')}
				class="text-muted-foreground transition-colors hover:text-foreground"
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
				<h1 class="truncate text-base font-semibold text-foreground sm:text-lg">
					{generation.name}
				</h1>
				<p
					class="flex flex-wrap items-center gap-x-1 gap-y-1 text-xs text-muted-foreground sm:gap-x-2"
				>
					{#if creator}
						<span class="text-muted-foreground">{creator.name || 'Anonymous'}</span>
					{/if}
					<span>{formatDateTime(generation.createdAt)}</span>
					{#if items[selectedModelIndex]?.contributorName && items[selectedModelIndex]?.contributorId !== creator?.id}
						<span class="flex items-center gap-1 text-primary" title="Model contributor">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-3 w-3"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
							>
								<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
								<circle cx="9" cy="7" r="4" />
								<path d="M22 21v-2a4 4 0 0 0-3-3.87" />
								<path d="M16 3.13a4 4 0 0 1 0 7.75" />
							</svg>
							<span class="xs:inline hidden">Model by</span>
							{items[selectedModelIndex].contributorName}
						</span>
					{/if}
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
					<span class="flex items-center gap-1" title="Total likes across all model generations">
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
						{formatCount(totalLikes)}
					</span>
				</p>
			</div>
		</div>

		<div class="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:gap-3">
			<!-- Model Navigation -->
			{#if items.length > 1}
				<div
					class="flex items-center gap-1 rounded-lg bg-surface-elevated px-2 py-1 sm:gap-2 sm:px-3 sm:py-1.5"
				>
					<Button variant="ghost" size="sm" onclick={prevModel} aria-label="Previous model">
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
					</Button>
					<span
						class="min-w-[40px] text-center text-xs text-muted-foreground sm:min-w-[60px] sm:text-sm"
					>
						{items.length > 0 ? selectedModelIndex + 1 : 0} / {items.length}
					</span>
					<Button variant="ghost" size="sm" onclick={nextModel} aria-label="Next model">
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
					</Button>
				</div>
			{/if}

			<!-- Model Selector -->
			{#if items.length > 0}
				<select
					value={selectedModelIndex}
					onchange={(e) => selectModel(Number((e.target as HTMLSelectElement).value))}
					class="max-w-[120px] rounded-lg border border-border bg-surface-elevated px-2 py-1 text-xs text-foreground focus:ring-2 focus:ring-primary focus:outline-none sm:max-w-none sm:px-3 sm:py-1.5 sm:text-sm"
				>
					{#each items as item, i (item.id)}
						<option value={i}>{item.modelName}</option>
					{/each}
				</select>
			{/if}

			<!-- Like Button -->
			<Button
				variant={isLiked ? 'destructive' : 'secondary'}
				size="sm"
				onclick={onLike}
				disabled={!userLoggedIn || isLiking}
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
				<span class="hidden sm:inline">{itemLikesCount}</span>
			</Button>

			<!-- Add Model Button -->
			<Button variant="primary" size="sm" onclick={onOpenAddModelModal}>
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
			</Button>
		</div>
	</div>
</header>
