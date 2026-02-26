<script lang="ts">
	interface Props {
		value?: string;
		placeholder?: string;
		onchange?: (value: string) => void;
	}

	let { value = $bindable(''), placeholder = 'Search...', onchange }: Props = $props();

	let inputValue = $state(value);
	let debounceTimer: ReturnType<typeof setTimeout>;

	$effect(() => {
		return () => clearTimeout(debounceTimer);
	});

	function handleInput(e: Event) {
		const target = e.target as HTMLInputElement;
		inputValue = target.value;
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			value = inputValue;
			onchange?.(inputValue);
		}, 300);
	}

	function handleClear() {
		inputValue = '';
		value = '';
		onchange?.('');
	}
</script>

<div class="relative">
	<svg
		xmlns="http://www.w3.org/2000/svg"
		class="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-zinc-500"
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
		value={inputValue}
		oninput={handleInput}
		{placeholder}
		class="w-full rounded-lg border border-zinc-700 bg-zinc-900 py-2.5 pr-10 pl-10 text-sm text-zinc-100 placeholder-zinc-500 transition-colors focus:border-emerald-500 focus:outline-none"
	/>
	{#if inputValue}
		<button
			onclick={handleClear}
			class="absolute top-1/2 right-3 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
			aria-label="Clear search"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="h-4 w-4"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
			>
				<path d="M18 6 6 18M6 6l12 12" />
			</svg>
		</button>
	{/if}
</div>
