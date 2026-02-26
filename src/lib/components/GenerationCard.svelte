<script lang="ts">
	import { resolve } from '$app/paths';
	import { formatCount, formatDate } from '$lib/utils';

	interface Preview {
		id: string;
		modelName: string;
		html: string;
	}

	interface Props {
		id: string;
		name: string;
		createdAt: Date;
		itemCount: number;
		viewCount: number;
		likesCount: number;
		preview: Preview | null;
		userLiked?: boolean;
		userLoggedIn?: boolean;
	}

	let {
		id,
		name,
		createdAt,
		itemCount,
		viewCount,
		likesCount,
		preview,
		userLiked = false,
		userLoggedIn = false
	}: Props = $props();

	let localLikeState = $state<{ isLiked: boolean; likesCount: number } | null>(null);

	let isLiked = $derived(localLikeState !== null ? localLikeState.isLiked : userLiked);
	let currentLikesCount = $derived(
		localLikeState !== null ? localLikeState.likesCount : likesCount
	);
	let isLiking = $state(false);

	async function handleLike(e: Event) {
		e.preventDefault();
		e.stopPropagation();

		if (!userLoggedIn || isLiking) return;

		isLiking = true;
		const previousState = localLikeState;

		// Optimistic update
		localLikeState = {
			isLiked: !isLiked,
			likesCount: currentLikesCount + (isLiked ? -1 : 1)
		};

		try {
			const res = await fetch(`/api/generations/${id}/like`, { method: 'POST' });
			const data = (await res.json()) as { success: boolean; liked: boolean; likesCount: number };
			if (data.success) {
				localLikeState = {
					isLiked: data.liked,
					likesCount: data.likesCount
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
</script>

<a
	href={resolve('/generation/[id]', { id })}
	class="group relative block overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 transition-all hover:border-zinc-700 hover:shadow-lg hover:shadow-emerald-500/5"
>
	<div class="relative aspect-video overflow-hidden bg-zinc-950">
		{#if preview}
			<iframe
				srcdoc={preview.html}
				title={name}
				class="h-full w-full transform border-0 transition-transform duration-300 group-hover:scale-[1.02]"
				sandbox="allow-scripts"
			></iframe>
			<div
				class="absolute right-2 bottom-2 rounded bg-zinc-950/80 px-2 py-1 text-xs text-zinc-400 backdrop-blur-sm"
			>
				{preview.modelName.split('/').pop()}
			</div>
		{:else}
			<div class="flex h-full w-full items-center justify-center text-zinc-600">No preview</div>
		{/if}

		<button
			onclick={handleLike}
			class="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-zinc-950/80 backdrop-blur-sm transition-all hover:scale-110 disabled:opacity-50
				{isLiked ? 'text-red-500' : 'text-zinc-400 hover:text-red-400'}"
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
		</button>
	</div>

	<div class="p-4">
		<h3 class="truncate font-semibold text-zinc-100 transition-colors group-hover:text-emerald-400">
			{name}
		</h3>
		<div class="mt-2 flex items-center justify-between text-sm text-zinc-500">
			<span>{itemCount} model{itemCount !== 1 ? 's' : ''}</span>
			<span>{formatDate(createdAt)}</span>
		</div>
		<div class="mt-2 flex items-center gap-4 text-xs text-zinc-500">
			<span class="flex items-center gap-1">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-3.5 w-3.5"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
				>
					<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
					<circle cx="12" cy="12" r="3" />
				</svg>
				{formatCount(viewCount)}
			</span>
			<span class="flex items-center gap-1">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-3.5 w-3.5"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
				>
					<path
						d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
					/>
				</svg>
				{formatCount(currentLikesCount)}
			</span>
		</div>
	</div>
</a>
