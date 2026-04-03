<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		apiKey: string;
		rememberMe: boolean;
		disabled?: boolean;
		idPrefix?: string;
		loadFromStorage?: boolean;
		onUpdateApiKey: (key: string) => void;
		onUpdateRememberMe: (remember: boolean) => void;
	}

	let {
		apiKey,
		rememberMe,
		disabled = false,
		idPrefix = '',
		loadFromStorage = false,
		onUpdateApiKey,
		onUpdateRememberMe
	}: Props = $props();

	onMount(() => {
		if (loadFromStorage) {
			const stored = localStorage.getItem('openrouter_api_key');
			if (stored) {
				onUpdateApiKey(stored);
				onUpdateRememberMe(true);
			}
		}
	});
</script>

<div>
	<label for="{idPrefix}apiKey" class="mb-2 block text-sm font-medium text-zinc-300">
		OpenRouter API Key
	</label>
	<input
		type="password"
		id="{idPrefix}apiKey"
		value={apiKey}
		oninput={(e) => onUpdateApiKey((e.target as HTMLInputElement).value)}
		placeholder="sk-or-v1-..."
		{disabled}
		class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:border-transparent focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:opacity-50"
	/>
	<div class="mt-2 flex items-center gap-2">
		<input
			type="checkbox"
			id="{idPrefix}rememberMe"
			checked={rememberMe}
			onchange={(e) => onUpdateRememberMe((e.target as HTMLInputElement).checked)}
			{disabled}
			class="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0"
		/>
		<label
			for="{idPrefix}rememberMe"
			class="cursor-help text-xs text-zinc-400"
			title="Saves your API key in this browser. Uncheck to remove."
		>
			Remember this device
		</label>
	</div>
	<p class="mt-2 text-xs text-zinc-500">
		Your API key is sent directly to OpenRouter and never stored on our servers.
	</p>
</div>
