<script lang="ts">
	interface Props {
		value?: 'recent' | 'popular' | 'most_liked';
		onchange?: (value: 'recent' | 'popular' | 'most_liked') => void;
	}

	let { value = $bindable('recent'), onchange }: Props = $props();

	const options = [
		{ value: 'recent', label: 'Most Recent' },
		{ value: 'popular', label: 'Most Viewed' },
		{ value: 'most_liked', label: 'Most Liked' }
	] as const;

	function handleChange(e: Event) {
		const target = e.target as HTMLSelectElement;
		value = target.value as typeof value;
		onchange?.(value);
	}
</script>

<select
	{value}
	onchange={handleChange}
	class="cursor-pointer rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 transition-colors hover:border-zinc-600 focus:border-emerald-500 focus:outline-none"
>
	{#each options as option (option.value)}
		<option value={option.value}>{option.label}</option>
	{/each}
</select>
