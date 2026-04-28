<script lang="ts">
	interface Props {
		checked: boolean;
		disabled?: boolean;
		class?: string;
	}

	let { checked = $bindable(false), disabled = false, class: className = '' }: Props = $props();
</script>

<div
	class="pointer-events-none inline-flex h-5 w-5 items-center justify-center rounded border-2 transition-colors {className}
		{checked ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-surface'}
		{disabled ? 'opacity-50' : ''}"
	role="checkbox"
	aria-checked={checked}
	aria-disabled={disabled}
>
	{#if checked}
		<svg
			xmlns="http://www.w3.org/2000/svg"
			class="h-3.5 w-3.5"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="3"
			stroke-linecap="round"
			stroke-linejoin="round"
		>
			<polyline points="20 6 9 17 4 12" />
		</svg>
	{/if}
</div>
