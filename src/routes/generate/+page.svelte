<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	interface Model {
		id: string;
		name: string;
	}

	let { data } = $props();
	let models = $derived(data.models as Model[]);

	let prompt = $state('');
	let name = $state('');
	let apiKey = $state('');
	let selectedModels = $state<string[]>([]);
	let isGenerating = $state(false);
	let currentModel = $state('');
	let error = $state('');

	const promptExamples = [
		'A modern SaaS landing page with hero section, features grid, pricing cards, and footer',
		'A login form with email and password fields, remember me checkbox, and social login buttons',
		'A dashboard with sidebar navigation, stats cards, and a data table',
		'An e-commerce product page with image gallery, add to cart button, and reviews section'
	];

	function selectExample(example: string) {
		prompt = example;
	}

	function toggleModel(modelId: string) {
		if (selectedModels.includes(modelId)) {
			selectedModels = selectedModels.filter((m) => m !== modelId);
		} else {
			selectedModels = [...selectedModels, modelId];
		}
	}

	async function handleGenerate() {
		if (!prompt.trim()) {
			error = 'Please enter a prompt';
			return;
		}
		if (!name.trim()) {
			error = 'Please enter a name for this generation';
			return;
		}
		if (selectedModels.length === 0) {
			error = 'Please select at least one model';
			return;
		}
		if (!apiKey.trim()) {
			error = 'Please enter your OpenRouter API key';
			return;
		}

		error = '';
		isGenerating = true;

		try {
			const response = await fetch('/api/generate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					prompt,
					name,
					models: selectedModels,
					apiKey
				})
			});

			const result: { id?: string; error?: string } = await response.json();

			if (!response.ok || !result.id) {
				throw new Error(result.error || 'Generation failed');
			}

			goto(resolve('/generation/[id]', { id: result.id }));
		} catch (e) {
			error = e instanceof Error ? e.message : 'Generation failed';
		} finally {
			isGenerating = false;
		}
	}
</script>

<svelte:head>
	<title>Generate - UI Battles</title>
</svelte:head>

<div class="mx-auto max-w-4xl px-4 py-12">
	<div class="mb-12 text-center">
		<h1 class="mb-4 text-4xl font-bold">Generate UI</h1>
		<p class="mx-auto max-w-2xl text-lg text-zinc-400">
			Compare how different AI models render the same UI. Enter a prompt, select models, and see the
			results.
		</p>
	</div>

	<div class="space-y-8">
		<!-- Name Input -->
		<div>
			<label for="name" class="mb-2 block text-sm font-medium text-zinc-300"> Name </label>
			<input
				type="text"
				id="name"
				bind:value={name}
				placeholder="e.g., finance landing page, auth form"
				class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:border-transparent focus:ring-2 focus:ring-emerald-500 focus:outline-none"
			/>
		</div>

		<!-- Prompt Input -->
		<div>
			<label for="prompt" class="mb-2 block text-sm font-medium text-zinc-300"> Prompt </label>
			<textarea
				id="prompt"
				bind:value={prompt}
				rows="4"
				placeholder="Describe the UI you want to generate..."
				class="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:border-transparent focus:ring-2 focus:ring-emerald-500 focus:outline-none"
			></textarea>
			<div class="mt-3 flex flex-wrap gap-2">
				{#each promptExamples as example (example)}
					<button
						type="button"
						onclick={() => selectExample(example)}
						class="rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-400 transition-colors hover:bg-zinc-700"
					>
						{example.slice(0, 40)}...
					</button>
				{/each}
			</div>
		</div>

		<!-- Model Selection -->
		<div>
			<span class="mb-2 block text-sm font-medium text-zinc-300">
				Models ({selectedModels.length} selected)
			</span>
			<div
				class="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-900 p-2"
			>
				{#each models as model (model.id)}
					<button
						type="button"
						onclick={() => toggleModel(model.id)}
						class="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors {selectedModels.includes(
							model.id
						)
							? 'bg-emerald-500/20 text-emerald-400'
							: 'text-zinc-300 hover:bg-zinc-800'}"
					>
						<input
							type="checkbox"
							checked={selectedModels.includes(model.id)}
							class="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0"
						/>
						<span class="text-sm">{model.name}</span>
					</button>
				{/each}
			</div>
		</div>

		<!-- API Key Input -->
		<div>
			<label for="apiKey" class="mb-2 block text-sm font-medium text-zinc-300">
				OpenRouter API Key
			</label>
			<input
				type="password"
				id="apiKey"
				bind:value={apiKey}
				placeholder="sk-or-v1-..."
				class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:border-transparent focus:ring-2 focus:ring-emerald-500 focus:outline-none"
			/>
			<p class="mt-2 text-xs text-zinc-500">
				Your API key is sent directly to OpenRouter and never stored on our servers.
			</p>
		</div>

		<!-- Error Message -->
		{#if error}
			<div class="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
				{error}
			</div>
		{/if}

		<!-- Generate Button -->
		<button
			onclick={handleGenerate}
			disabled={isGenerating}
			class="w-full rounded-lg bg-emerald-500 py-4 text-lg font-semibold text-zinc-950 transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-zinc-700"
		>
			{#if isGenerating}
				Generating with {currentModel}...
			{:else}
				Generate
			{/if}
		</button>
	</div>
</div>
