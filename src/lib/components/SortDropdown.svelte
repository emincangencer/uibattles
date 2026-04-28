<script lang="ts">
	interface Props {
		value?: 'recent' | 'popular';
		onchange?: (value: 'recent' | 'popular') => void;
	}

	let { value = $bindable('recent'), onchange }: Props = $props();

	const options = [
		{ value: 'recent', label: 'Most Recent' },
		{ value: 'popular', label: 'Most Viewed' }
	] as const;

	function handleChange(e: Event) {
		const target = e.target as HTMLSelectElement;
		value = target.value as typeof value;
		onchange?.(value);
	}
</script>

<label class="flex items-center gap-2">
	<span class="text-sm text-muted-foreground">Sort by:</span>
	<select
		{value}
		onchange={handleChange}
		class="cursor-pointer rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground transition-colors hover:border-muted-foreground focus:border-primary focus:outline-none"
	>
		{#each options as option (option.value)}
			<option value={option.value}>{option.label}</option>
		{/each}
	</select>
</label>
