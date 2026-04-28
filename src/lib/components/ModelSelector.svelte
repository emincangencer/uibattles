<script lang="ts">
	import Checkbox from './ui/Checkbox.svelte';

	interface Model {
		id: string;
		name: string;
	}

	interface Props {
		models: Model[];
		selectedModels: string[];
		disabled?: boolean;
		maxHeight?: string;
		excludedModels?: string[];
		retryableModels?: string[];
		onToggle: (modelId: string) => void;
	}

	let {
		models,
		selectedModels,
		disabled = false,
		maxHeight = 'max-h-64',
		excludedModels = [],
		retryableModels = [],
		onToggle
	}: Props = $props();

	let search = $state('');

	let availableModels = $derived(
		models.filter((m) => !excludedModels.includes(m.id) || retryableModels.includes(m.id))
	);

	let filteredModels = $derived(
		search.trim()
			? availableModels.filter(
					(m) =>
						m.name.toLowerCase().includes(search.toLowerCase()) ||
						m.id.toLowerCase().includes(search.toLowerCase())
				)
			: availableModels
	);

	let excludedCount = $derived(excludedModels.length);
	let retryableCount = $derived(retryableModels.length);
</script>

<div>
	<span class="mb-2 block text-sm font-medium text-muted">
		Models ({selectedModels.length} selected)
	</span>
	<div class="relative mb-2">
		<svg
			xmlns="http://www.w3.org/2000/svg"
			class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
		>
			<circle cx="11" cy="11" r="8" />
			<path d="m21 21-4.3-4.3" />
		</svg>
		<input
			type="text"
			bind:value={search}
			placeholder="Search models..."
			{disabled}
			class="w-full rounded-lg border border-border bg-surface px-3 py-2 pl-9 text-sm text-foreground placeholder-muted-foreground focus:border-transparent focus:ring-2 focus:ring-primary focus:outline-none disabled:opacity-50"
		/>
	</div>
	<div class="{maxHeight} space-y-1 overflow-y-auto rounded-lg border border-border bg-surface p-2">
		{#each filteredModels as model (model.id)}
			{@const isRetryable = retryableModels.includes(model.id)}
			{@const isExcluded = excludedModels.includes(model.id) && !isRetryable}
			<button
				type="button"
				onclick={() => onToggle(model.id)}
				disabled={isExcluded || disabled}
				class="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors disabled:opacity-50 {selectedModels.includes(
					model.id
				)
					? 'bg-primary/20 text-primary'
					: isRetryable
						? 'bg-warning/10 text-warning hover:bg-warning/20'
						: 'text-muted hover:bg-surface-elevated'}"
			>
				<Checkbox checked={selectedModels.includes(model.id)} disabled={isExcluded || disabled} />
				<span class="text-sm">
					{model.name}
					{#if isRetryable}
						<span class="text-xs text-warning">(retry)</span>
					{/if}
				</span>
			</button>
		{/each}
	</div>
	{#if excludedCount > 0 || retryableCount > 0}
		<p class="mt-2 text-xs text-muted-foreground">
			{#if excludedCount > 0}
				{excludedCount} model{excludedCount !== 1 ? 's' : ''} already completed
			{/if}
			{#if excludedCount > 0 && retryableCount > 0}
				,
			{/if}
			{#if retryableCount > 0}
				{retryableCount} failed {retryableCount !== 1 ? 'models' : 'model'} available to retry
			{/if}
		</p>
	{/if}
</div>
