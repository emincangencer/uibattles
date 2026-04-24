<script lang="ts">
	import { createSandboxedPreviewDocument } from '$lib/utils';

	type DeviceType = 'desktop' | 'tablet' | 'mobile';

	interface Props {
		device: DeviceType;
		previewViewportWidth: number;
		previewIframe: HTMLIFrameElement | null;
		currentItem: { id: string; html: string; status?: string } | null;
		canOpenStandalonePreview: boolean;
		standalonePreviewHref: string;
		onDeviceChange: (device: DeviceType) => void;
		onOpenCodeModal: () => void;
	}

	let {
		device = $bindable(),
		previewViewportWidth,
		previewIframe,
		currentItem,
		canOpenStandalonePreview,
		standalonePreviewHref,
		onDeviceChange,
		onOpenCodeModal
	}: Props = $props();

	const deviceHeights = {
		desktop: 900,
		tablet: 1024,
		mobile: 812
	} as const;

	function reloadPreview() {
		if (!previewIframe || !currentItem) return;
		previewIframe.srcdoc = createSandboxedPreviewDocument(currentItem.html, {
			resizeToContent: true,
			syncHostScroll: true,
			previewId: currentItem.id,
			viewport: {
				width: previewViewportWidth,
				height: deviceHeights[device]
			}
		});
	}

	function openStandalonePreview() {
		if (!canOpenStandalonePreview) return;
		window.open(standalonePreviewHref, '_blank', 'noopener,noreferrer');
	}
</script>

<div
	class="flex w-full items-center justify-between rounded-t-lg border border-b-0 border-zinc-700 bg-zinc-900 px-2 py-1 sm:px-4 sm:py-2"
>
	<div class="flex items-center gap-2">
		<!-- Device Toggle -->
		<div class="flex items-center gap-0.5 rounded-lg bg-zinc-800 px-0.5 py-0.5">
			<button
				onclick={() => onDeviceChange('desktop')}
				class="rounded p-1 transition-colors {device === 'desktop'
					? 'bg-zinc-700 text-zinc-100'
					: 'text-zinc-400 hover:text-zinc-200'}"
				aria-label="Desktop view"
				title="Desktop view (1440px)"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-4 w-4"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
				>
					<rect x="2" y="3" width="20" height="14" rx="2" />
					<path d="M8 21h8M12 17v4" />
				</svg>
			</button>
			<button
				onclick={() => onDeviceChange('tablet')}
				class="rounded p-1 transition-colors {device === 'tablet'
					? 'bg-zinc-700 text-zinc-100'
					: 'text-zinc-400 hover:text-zinc-200'}"
				aria-label="Tablet view"
				title="Tablet view (768px)"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-4 w-4"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
				>
					<rect x="4" y="2" width="16" height="20" rx="2" />
					<path d="M12 18h.01" />
				</svg>
			</button>
			<button
				onclick={() => onDeviceChange('mobile')}
				class="rounded p-1 transition-colors {device === 'mobile'
					? 'bg-zinc-700 text-zinc-100'
					: 'text-zinc-400 hover:text-zinc-200'}"
				aria-label="Mobile view"
				title="Mobile view (375px)"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-4 w-4"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
				>
					<rect x="5" y="2" width="14" height="20" rx="2" />
					<path d="M12 18h.01" />
				</svg>
			</button>
		</div>
		<span class="text-xs text-zinc-500 sm:text-sm">{previewViewportWidth}px</span>
	</div>
	<div class="flex items-center gap-2">
		<button
			type="button"
			onclick={reloadPreview}
			class="rounded-md p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
			aria-label="Reload preview"
			title="Reload preview"
			disabled={!currentItem}
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="h-4 w-4"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
			>
				<path d="M21 2v6h-6" />
				<path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
				<path d="M3 22v-6h6" />
				<path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
			</svg>
		</button>
		<button
			type="button"
			onclick={openStandalonePreview}
			class="rounded-md p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
			aria-label="Open preview in new tab"
			title={canOpenStandalonePreview
				? 'Open preview in new tab'
				: 'Preview available after generation completes'}
			disabled={!canOpenStandalonePreview}
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="h-4 w-4"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
			>
				<path d="M14 3h7v7" />
				<path d="M10 14L21 3" />
				<path d="M21 14v4a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3h4" />
			</svg>
		</button>
		<button
			type="button"
			onclick={onOpenCodeModal}
			class="rounded-md p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
			aria-label="View code"
			title="View code"
			disabled={!currentItem}
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="h-4 w-4"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
			>
				<path d="M16 18l6-6-6-6" />
				<path d="M8 6l-6 6 6 6" />
			</svg>
		</button>
	</div>
</div>
