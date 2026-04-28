<script lang="ts">
	import { resolve } from '$app/paths';
	import { createSandboxedPreviewDocument, formatDate } from '$lib/utils';

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
	}

	let { id, name, createdAt, itemCount, viewCount, likesCount, preview }: Props = $props();
</script>

<a
	href={resolve('/generation/[id]', { id })}
	class="group relative block overflow-hidden rounded-xl border border-border bg-surface transition-all hover:border-muted-foreground hover:shadow-glow hover:shadow-lg"
>
	<div class="relative aspect-video overflow-hidden bg-background">
		{#if preview}
			<iframe
				srcdoc={createSandboxedPreviewDocument(preview.html)}
				title={name}
				class="h-full w-full transform border-0 transition-transform duration-300 group-hover:scale-[1.02]"
				sandbox="allow-scripts"
			></iframe>
			<div
				class="absolute right-2 bottom-2 rounded bg-background/80 px-2 py-1 text-xs text-muted-foreground backdrop-blur-sm"
			>
				{preview.modelName.split('/').pop()}
			</div>
		{:else}
			<div class="flex h-full w-full items-center justify-center text-muted-foreground">
				No preview
			</div>
		{/if}
	</div>

	<div class="p-4">
		<h2 class="truncate font-semibold text-foreground transition-colors group-hover:text-primary">
			{name}
		</h2>
		<div class="mt-2 flex items-center justify-between text-sm text-muted-foreground">
			<span>{itemCount} model{itemCount !== 1 ? 's' : ''}</span>
			<span>{formatDate(createdAt)}</span>
		</div>
		<div class="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
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
				{viewCount}
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
				{likesCount}
			</span>
		</div>
	</div>
</a>
