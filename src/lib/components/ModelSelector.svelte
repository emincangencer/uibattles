<script lang="ts">
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
	<span class="mb-2 block text-sm font-medium text-zinc-300">
		Models ({selectedModels.length} selected)
	</span>
	<div class="mb-2">
		<input
			type="text"
			bind:value={search}
			placeholder="Search models..."
			{disabled}
			class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-transparent focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:opacity-50"
		/>
	</div>
	<div
		class="{maxHeight} space-y-1 overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-900 p-2"
	>
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
					? 'bg-emerald-500/20 text-emerald-400'
					: isRetryable
						? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
						: 'text-zinc-300 hover:bg-zinc-800'}"
			>
				<input
					type="checkbox"
					checked={selectedModels.includes(model.id)}
					disabled={isExcluded || disabled}
					class="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0 disabled:opacity-50"
				/>
				<span class="text-sm">
					{model.name}
					{#if isRetryable}
						<span class="text-xs text-amber-500">(retry)</span>
					{/if}
				</span>
			</button>
		{/each}
	</div>
	{#if excludedCount > 0 || retryableCount > 0}
		<p class="mt-2 text-xs text-zinc-500">
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
