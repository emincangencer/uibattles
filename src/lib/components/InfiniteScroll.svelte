<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		hasMore: boolean;
		isLoading: boolean;
		onloadmore: () => void;
		children: Snippet;
	}

	let { hasMore, isLoading, onloadmore, children }: Props = $props();

	let sentinel: HTMLDivElement;

	$effect(() => {
		if (!sentinel || !hasMore || isLoading) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0]?.isIntersecting && !isLoading && hasMore) {
					onloadmore();
				}
			},
			{ rootMargin: '200px' }
		);

		observer.observe(sentinel);

		return () => observer.disconnect();
	});
</script>

<div>
	{@render children()}

	<div bind:this={sentinel} class="h-4 w-full"></div>

	{#if isLoading}
		<div class="flex justify-center py-8">
			<div class="flex items-center gap-2 text-zinc-400">
				<svg
					class="h-5 w-5 animate-spin"
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
				>
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
					></circle>
					<path
						class="opacity-75"
						fill="currentColor"
						d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
					></path>
				</svg>
				<span class="text-sm">Loading more...</span>
			</div>
		</div>
	{:else if !hasMore}
		<div class="py-8 text-center text-sm text-zinc-500">No more generations to load</div>
	{/if}
</div>
