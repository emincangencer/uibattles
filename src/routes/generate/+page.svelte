<script lang="ts">
	import { resolve } from '$app/paths';
	import ModelSelector from '$lib/components/ModelSelector.svelte';
	import ApiKeyInput from '$lib/components/ApiKeyInput.svelte';

	interface Model {
		id: string;
		name: string;
	}

	interface GenerationItem {
		id: string;
		modelId: string;
		modelName: string;
		status: 'pending' | 'generating' | 'completed' | 'error' | 'aborted';
		error: string | null;
	}

	interface GenerationData {
		id: string;
		name: string;
		prompt: string;
		status: 'pending' | 'in_progress' | 'completed' | 'aborted';
		items: GenerationItem[];
	}

	interface InProgressGeneration {
		id: string;
		name: string;
		prompt: string;
		status: string;
		items: {
			id: string;
			modelId: string;
			modelName: string;
			status: string;
			error: string | null;
		}[];
	}

	let { data } = $props();
	let models = $derived(data.models as Model[]);

	let prompt = $state('');
	let name = $state('');
	let rememberMe = $state(false);
	let apiKey = $state('');

	function loadApiKey() {
		if (typeof window !== 'undefined') {
			const stored = localStorage.getItem('openrouter_api_key');
			if (stored) {
				apiKey = stored;
				rememberMe = true;
			}
		}
	}

	loadApiKey();

	$effect(() => {
		if (typeof window !== 'undefined') {
			if (rememberMe && apiKey) {
				localStorage.setItem('openrouter_api_key', apiKey);
			} else {
				localStorage.removeItem('openrouter_api_key');
			}
		}
	});

	let selectedModels = $state<string[]>([]);
	let isGenerating = $state(false);
	let error = $state('');
	let generations = $state<GenerationData[]>([]);
	let pollingIntervals = $state<Map<string, number>>(new Map());

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

	function connectToStream(generationId: string) {
		const existingInterval = pollingIntervals.get(generationId);
		if (existingInterval) {
			return;
		}

		async function pollStatus() {
			try {
				const response = await fetch(`/api/generation/${generationId}/status`);
				if (!response.ok) {
					clearInterval(pollingIntervals.get(generationId));
					pollingIntervals.delete(generationId);
					return;
				}

				const status: GenerationData = await response.json();

				generations = generations.map((g) => {
					if (g.id === status.id) {
						return {
							...status,
							items: status.items.map((item) => ({
								id: item.id,
								modelId: item.modelId,
								modelName: item.modelName,
								status: item.status as GenerationData['items'][0]['status'],
								error: item.error
							}))
						};
					}
					return g;
				});

				if (status.status === 'completed' || status.status === 'aborted') {
					clearInterval(pollingIntervals.get(generationId));
					pollingIntervals.delete(generationId);
				}
			} catch (e) {
				console.error('Polling error:', e);
			}
		}

		pollStatus();

		const intervalId = window.setInterval(pollStatus, 3000);
		pollingIntervals.set(generationId, intervalId);
	}

	function initFromServerData() {
		const inProgress = (data as { inProgressGenerations?: InProgressGeneration[] })
			.inProgressGenerations;
		if (inProgress && inProgress.length > 0) {
			generations = inProgress.map((g) => ({
				id: g.id,
				name: g.name,
				prompt: g.prompt,
				status: g.status as GenerationData['status'],
				items: g.items.map((item) => ({
					id: item.id,
					modelId: item.modelId,
					modelName: item.modelName,
					status: item.status as GenerationData['items'][0]['status'],
					error: item.error
				}))
			}));

			if (typeof window !== 'undefined') {
				setTimeout(() => {
					for (const gen of generations) {
						if (gen.status === 'in_progress' || gen.status === 'pending') {
							connectToStream(gen.id);
						}
					}
				}, 100);
			}
		}
	}

	$effect(() => {
		initFromServerData();

		return () => {
			for (const intervalId of pollingIntervals.values()) {
				clearInterval(intervalId);
			}
			pollingIntervals.clear();
		};
	});

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

			const newGeneration: GenerationData = {
				id: result.id,
				name,
				prompt,
				status: 'in_progress',
				items: selectedModels.map((modelId) => ({
					id: '',
					modelId,
					modelName: modelId,
					status: 'pending' as const,
					error: null
				}))
			};

			generations = [...generations, newGeneration];
			connectToStream(result.id);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Generation failed';
			isGenerating = false;
		}
	}

	async function handleAbort(generationId: string) {
		try {
			await fetch(`/api/generation/${generationId}/abort`, {
				method: 'POST'
			});
		} catch (e) {
			console.error('Abort failed:', e);
		}
	}

	async function handleRetryItem(generationId: string, itemId: string) {
		try {
			const response = await fetch(`/api/generation/item/${itemId}/retry`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ apiKey })
			});

			const result: { success?: boolean; error?: string } = await response.json();

			if (!response.ok || !result.success) {
				throw new Error(result.error || 'Retry failed');
			}

			generations = generations.map((generation) => {
				if (generation.id !== generationId) {
					return generation;
				}

				return {
					...generation,
					status: 'in_progress',
					items: generation.items.map((item) =>
						item.id === itemId
							? {
									...item,
									status: 'pending',
									error: null
								}
							: item
					)
				};
			});

			connectToStream(generationId);
		} catch (e) {
			console.error('Retry failed:', e);
		}
	}

	function getModelDisplayName(modelId: string): string {
		const parts = modelId.split('/');
		return parts.length > 1 ? parts[1] : modelId;
	}

	function isAllComplete(generation: GenerationData): boolean {
		return generation.items.every(
			(item) => item.status === 'completed' || item.status === 'error' || item.status === 'aborted'
		);
	}

	function hasErrors(generation: GenerationData): boolean {
		return generation.items.some((item) => item.status === 'error');
	}

	function removeCompletedGeneration(generationId: string) {
		generations = generations.filter((g) => g.id !== generationId);
		const intervalId = pollingIntervals.get(generationId);
		if (intervalId) {
			clearInterval(intervalId);
			pollingIntervals.delete(generationId);
		}
	}
</script>

<svelte:head>
	<title>Generate - UI Battles</title>
</svelte:head>

<div class="mx-auto max-w-4xl px-4 py-12">
	<div class="mb-12 text-center">
		<h1 class="mb-4 text-4xl font-bold">Generate UI</h1>
		<p class="mx-auto max-w-2xl text-lg text-muted-foreground">
			Compare how different AI models render the same UI. Enter a prompt, select models, and see the
			results.
		</p>
	</div>

	<div class="space-y-8">
		<!-- Name Input -->
		<div>
			<label for="name" class="mb-2 block text-sm font-medium text-muted"> Name </label>
			<input
				type="text"
				id="name"
				bind:value={name}
				placeholder="e.g., finance landing page, auth form"
				disabled={isGenerating}
				class="w-full rounded-lg border border-border bg-surface px-4 py-3 text-foreground placeholder-muted-foreground focus:border-transparent focus:ring-2 focus:ring-primary focus:outline-none disabled:opacity-50"
			/>
		</div>

		<!-- Prompt Input -->
		<div>
			<label for="prompt" class="mb-2 block text-sm font-medium text-muted"> Prompt </label>
			<textarea
				id="prompt"
				bind:value={prompt}
				rows="4"
				placeholder="Describe the UI you want to generate..."
				disabled={isGenerating}
				class="w-full resize-none rounded-lg border border-border bg-surface px-4 py-3 text-foreground placeholder-muted-foreground focus:border-transparent focus:ring-2 focus:ring-primary focus:outline-none disabled:opacity-50"
			></textarea>
			<div class="mt-3 flex flex-wrap gap-2">
				{#each promptExamples as example (example)}
					<button
						type="button"
						onclick={() => selectExample(example)}
						disabled={isGenerating}
						class="rounded-full bg-surface-elevated px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-surface disabled:opacity-50"
					>
						{example.slice(0, 40)}...
					</button>
				{/each}
			</div>
		</div>

		<!-- Model Selection -->
		<ModelSelector {models} {selectedModels} disabled={isGenerating} onToggle={toggleModel} />

		<!-- API Key Input -->
		<ApiKeyInput
			{apiKey}
			{rememberMe}
			disabled={isGenerating}
			onUpdateApiKey={(key) => (apiKey = key)}
			onUpdateRememberMe={(val) => (rememberMe = val)}
		/>

		<!-- Error Message -->
		{#if error}
			<div
				class="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive"
			>
				{error}
			</div>
		{/if}

		<!-- Generate Button -->
		<button
			onclick={handleGenerate}
			disabled={isGenerating}
			class="w-full rounded-lg bg-primary py-4 text-lg font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-surface-elevated"
		>
			{#if isGenerating}
				Generating...
			{:else}
				Generate
			{/if}
		</button>

		<!-- Generation Status Panels -->
		{#each generations as generation (generation.id)}
			{@const allComplete = isAllComplete(generation)}
			{@const hasErrorItems = hasErrors(generation)}
			<div class="rounded-xl border border-border bg-surface p-6">
				<div class="mb-4 flex items-center justify-between">
					<h2 class="text-xl font-semibold">{generation.name}</h2>
					<div class="flex gap-2">
						{#if !allComplete}
							<button
								onclick={() => handleAbort(generation.id)}
								class="rounded-lg bg-destructive/20 px-4 py-2 text-sm text-destructive transition-colors hover:bg-destructive/30"
							>
								Abort
							</button>
						{/if}
						{#if allComplete}
							<button
								onclick={() => removeCompletedGeneration(generation.id)}
								class="rounded-lg bg-surface-elevated px-4 py-2 text-sm text-muted transition-colors hover:bg-border"
							>
								Dismiss
							</button>
							<a
								href={resolve('/generation/[id]', { id: generation.id })}
								target="_blank"
								rel="noopener noreferrer"
								class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
							>
								View Results →
							</a>
						{/if}
					</div>
				</div>

				<div class="space-y-3">
					{#each generation.items as item (item.id || item.modelId)}
						<div
							class="flex items-center justify-between rounded-lg border border-border bg-surface-elevated/50 p-4"
						>
							<div class="flex items-center gap-3">
								<span class="text-sm font-medium text-muted">
									{getModelDisplayName(item.modelName)}
								</span>
							</div>

							<div class="flex items-center gap-3">
								{#if item.status === 'pending'}
									<span class="text-sm text-muted-foreground">Waiting...</span>
								{:else if item.status === 'generating'}
									<span class="flex items-center gap-2 text-sm text-warning">
										<span class="h-2 w-2 animate-pulse rounded-full bg-warning"></span>
										Generating...
									</span>
								{:else if item.status === 'completed'}
									<span class="text-sm text-primary">✓ Done</span>
								{:else if item.status === 'error'}
									<div class="flex items-center gap-2">
										<span class="text-sm text-destructive">✗ {item.error}</span>
										<button
											onclick={() => handleRetryItem(generation.id, item.id)}
											class="rounded bg-destructive/20 px-2 py-1 text-xs text-destructive transition-colors hover:bg-destructive/30"
										>
											Retry
										</button>
									</div>
								{:else if item.status === 'aborted'}
									<span class="text-sm text-muted-foreground">⛔ Aborted</span>
								{/if}
							</div>
						</div>
					{/each}
				</div>

				{#if hasErrorItems && allComplete}
					<p class="mt-4 text-sm text-muted-foreground">
						Some models failed. You can retry individual items above.
					</p>
				{/if}
			</div>
		{/each}
	</div>
</div>
