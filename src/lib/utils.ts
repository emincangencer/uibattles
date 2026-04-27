export function formatCount(count: number): string {
	if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
	if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
	return count.toString();
}

export function formatDate(date: Date): string {
	return new Intl.DateTimeFormat('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric'
	}).format(new Date(date));
}

export function formatDateTime(date: Date): string {
	return new Intl.DateTimeFormat('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	}).format(new Date(date));
}

export const PREVIEW_CSP = [
	"default-src 'none'",
	"base-uri 'none'",
	"form-action 'none'",
	"object-src 'none'",
	'connect-src https://api.iconify.design https://api.unisvg.com https://api.simplesvg.com',
	"frame-src 'none'",
	"child-src 'none'",
	"manifest-src 'none'",
	'img-src data: blob:',
	'media-src data: blob:',
	'font-src https://fonts.gstatic.com data:',
	"style-src 'unsafe-inline' https://fonts.googleapis.com",
	"script-src 'unsafe-inline' https://cdn.jsdelivr.net/npm/iconify-icon@3/dist/iconify-icon.min.js"
].join('; ');

const CSP_META_TAG = `<meta http-equiv="Content-Security-Policy" content="${PREVIEW_CSP}">`;
const PREVIEW_RESIZE_MESSAGE_TYPE = 'uibattles-preview-resize';
const PREVIEW_HOST_SCROLL_MESSAGE_TYPE = 'uibattles-preview-host-scroll';
const STANDALONE_PREVIEW_CSP = [
	"default-src 'none'",
	"base-uri 'none'",
	"form-action 'none'",
	"object-src 'none'",
	'connect-src https://api.iconify.design https://api.unisvg.com https://api.simplesvg.com',
	"frame-src 'self'",
	"child-src 'self'",
	"manifest-src 'none'",
	'img-src data: blob:',
	'media-src data: blob:',
	'font-src https://fonts.gstatic.com data:',
	"style-src 'unsafe-inline' https://fonts.googleapis.com",
	"script-src 'unsafe-inline' https://cdn.jsdelivr.net/npm/iconify-icon@3/dist/iconify-icon.min.js"
].join('; ');

interface PreviewViewport {
	width: number;
	height: number;
}

interface PreviewDocumentOptions {
	resizeToContent?: boolean;
	previewId?: string;
	syncHostScroll?: boolean;
	viewport?: PreviewViewport;
}

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

function serializeForInlineScript(value: unknown): string {
	return JSON.stringify(value)
		.replace(/</g, '\\u003C')
		.replace(/>/g, '\\u003E')
		.replace(/&/g, '\\u0026')
		.replace(/\u2028/g, '\\u2028')
		.replace(/\u2029/g, '\\u2029');
}

export function sanitizeRedirectPath(value: string | null | undefined, fallback = '/'): string {
	if (!value || !value.startsWith('/') || value.startsWith('//')) {
		return fallback;
	}

	try {
		const url = new URL(value, 'https://uibattles.local');
		return `${url.pathname}${url.search}${url.hash}`;
	} catch {
		return fallback;
	}
}

function createPreviewResizeScript(previewId: string): string {
	const payload = JSON.stringify({
		type: PREVIEW_RESIZE_MESSAGE_TYPE,
		previewId
	});

	return `<script>
(() => {
	const payload = ${payload};

	function getHeight() {
		const body = document.body;
		const documentElement = document.documentElement;

		return Math.max(
			body ? body.scrollHeight : 0,
			body ? body.offsetHeight : 0,
			body ? body.clientHeight : 0,
			documentElement.scrollHeight,
			documentElement.offsetHeight,
			documentElement.clientHeight
		);
	}

	function postHeight() {
		window.parent.postMessage({ ...payload, height: getHeight() }, '*');
	}

	function schedulePost() {
		requestAnimationFrame(() => {
			requestAnimationFrame(postHeight);
		});
	}

	window.addEventListener('load', schedulePost);
	window.addEventListener('resize', schedulePost);

	if (document.fonts && typeof document.fonts.ready?.then === 'function') {
		document.fonts.ready.then(schedulePost).catch(() => {});
	}

	if (typeof ResizeObserver === 'function') {
		const observer = new ResizeObserver(schedulePost);
		observer.observe(document.documentElement);
		if (document.body) {
			observer.observe(document.body);
		}
	}

	schedulePost();
	setTimeout(postHeight, 150);
})();
</script>`;
}

function createPreviewHostScrollSyncScript(previewId: string): string {
	return `<script>
(() => {
	const messageType = ${JSON.stringify(PREVIEW_HOST_SCROLL_MESSAGE_TYPE)};
	const expectedPreviewId = ${JSON.stringify(previewId)};
	const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;
	const state = {
		scrollTop: 0,
		viewportHeight: window.innerHeight
	};

	function defineInstanceProperty(target, key, getter) {
		try {
			Object.defineProperty(target, key, {
				configurable: true,
				get: getter
			});
		} catch {}
	}

	function applyVirtualMetrics() {
		defineInstanceProperty(window, 'scrollY', () => state.scrollTop);
		defineInstanceProperty(window, 'pageYOffset', () => state.scrollTop);
		defineInstanceProperty(window, 'innerHeight', () => state.viewportHeight);

		if (document.documentElement) {
			defineInstanceProperty(document.documentElement, 'scrollTop', () => state.scrollTop);
			defineInstanceProperty(document.documentElement, 'clientHeight', () => state.viewportHeight);
		}

		if (document.body) {
			defineInstanceProperty(document.body, 'scrollTop', () => state.scrollTop);
			defineInstanceProperty(document.body, 'clientHeight', () => state.viewportHeight);
		}
	}

	Element.prototype.getBoundingClientRect = function () {
		const rect = originalGetBoundingClientRect.call(this);
		if (
			this === document.documentElement ||
			this === document.body ||
			(this instanceof HTMLElement && getComputedStyle(this).position === 'fixed')
		) {
			return rect;
		}

		return new DOMRect(rect.x, rect.y - state.scrollTop, rect.width, rect.height);
	};

	function emitViewportEvents(viewportChanged) {
		window.dispatchEvent(new Event('scroll'));
		document.dispatchEvent(new Event('scroll'));

		if (viewportChanged) {
			window.dispatchEvent(new Event('resize'));
		}
	}

	window.addEventListener('message', (event) => {
		const data = event.data;
		if (!data || typeof data !== 'object') return;
		if (data.type !== messageType || data.previewId !== expectedPreviewId) return;

		const nextScrollTop =
			typeof data.scrollTop === 'number' && Number.isFinite(data.scrollTop)
				? Math.max(0, data.scrollTop)
				: state.scrollTop;
		const nextViewportHeight =
			typeof data.viewportHeight === 'number' && Number.isFinite(data.viewportHeight)
				? Math.max(0, data.viewportHeight)
				: state.viewportHeight;

		const scrollChanged = nextScrollTop !== state.scrollTop;
		const viewportChanged = nextViewportHeight !== state.viewportHeight;
		if (!scrollChanged && !viewportChanged) return;

		state.scrollTop = nextScrollTop;
		state.viewportHeight = nextViewportHeight;
		applyVirtualMetrics();
		emitViewportEvents(viewportChanged);
	});

	applyVirtualMetrics();
})();
</script>`;
}

function createPreviewViewportNormalizationScript(viewport: PreviewViewport): string {
	const payload = JSON.stringify({
		width: viewport.width,
		height: viewport.height
	});

	return `<script>
(() => {
	const viewport = ${payload};
	const VIEWPORT_UNIT_PATTERN = /(-?\\d*\\.?\\d+)\\s*(dvh|svh|lvh|vh|dvw|svw|lvw|vw|vmin|vmax)/gi;
	const BASE_STYLE_ID = 'uibattles-preview-viewport-units';

	function ensureBaseStyle() {
		if (document.getElementById(BASE_STYLE_ID)) return;

		const style = document.createElement('style');
		style.id = BASE_STYLE_ID;
		style.textContent =
			':root {' +
			'--uibattles-preview-vw: ' + viewport.width / 100 + 'px;' +
			'--uibattles-preview-vh: ' + viewport.height / 100 + 'px;' +
			'--uibattles-preview-vmin: ' + Math.min(viewport.width, viewport.height) / 100 + 'px;' +
			'--uibattles-preview-vmax: ' + Math.max(viewport.width, viewport.height) / 100 + 'px;' +
			'}';

		(document.head || document.documentElement).appendChild(style);
	}

	function toReplacementValue(amount, unit) {
		const normalizedUnit = unit.toLowerCase();
		if (normalizedUnit === 'vw' || normalizedUnit === 'svw' || normalizedUnit === 'lvw' || normalizedUnit === 'dvw') {
			return 'calc(var(--uibattles-preview-vw) * ' + amount + ')';
		}
		if (normalizedUnit === 'vmin') {
			return 'calc(var(--uibattles-preview-vmin) * ' + amount + ')';
		}
		if (normalizedUnit === 'vmax') {
			return 'calc(var(--uibattles-preview-vmax) * ' + amount + ')';
		}
		return 'calc(var(--uibattles-preview-vh) * ' + amount + ')';
	}

	function normalizeCssValue(value) {
		return value.replace(VIEWPORT_UNIT_PATTERN, (match, amount, unit) => {
			if (!amount || !unit) return match;
			return toReplacementValue(amount, unit);
		});
	}

	function normalizeStyleElement(styleElement) {
		if (!(styleElement instanceof HTMLStyleElement)) return;
		if (styleElement.id === BASE_STYLE_ID) return;

		const original = styleElement.textContent || '';
		const normalized = normalizeCssValue(original);
		if (normalized !== original) {
			styleElement.textContent = normalized;
		}
	}

	function normalizeInlineStyle(element) {
		if (!(element instanceof HTMLElement)) return;
		const original = element.getAttribute('style');
		if (!original) return;

		const normalized = normalizeCssValue(original);
		if (normalized !== original) {
			element.setAttribute('style', normalized);
		}
	}

	function normalizeTree(root) {
		if (!(root instanceof Element || root instanceof Document)) return;

		if (root instanceof HTMLStyleElement) {
			normalizeStyleElement(root);
			return;
		}

		if (root instanceof HTMLElement) {
			normalizeInlineStyle(root);
		}

		root.querySelectorAll('style').forEach((styleElement) => {
			normalizeStyleElement(styleElement);
		});
		root.querySelectorAll('[style]').forEach((element) => {
			normalizeInlineStyle(element);
		});
	}

	ensureBaseStyle();
	normalizeTree(document);

	const observer = new MutationObserver((mutations) => {
		for (const mutation of mutations) {
			if (mutation.type === 'characterData') {
				const parentElement = mutation.target.parentElement;
				if (parentElement instanceof HTMLStyleElement) {
					normalizeStyleElement(parentElement);
				}
				continue;
			}

			if (mutation.type === 'attributes' && mutation.target instanceof HTMLElement) {
				normalizeInlineStyle(mutation.target);
				continue;
			}

			if (mutation.target instanceof HTMLStyleElement) {
				normalizeStyleElement(mutation.target);
			}

			for (const node of mutation.addedNodes) {
				if (node instanceof Element) {
					normalizeTree(node);
				}
			}
		}
	});

	observer.observe(document.documentElement, {
		subtree: true,
		childList: true,
		characterData: true,
		attributes: true,
		attributeFilter: ['style']
	});

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', () => normalizeTree(document), { once: true });
	}
})();
</script>`;
}

export function createSandboxedPreviewDocument(
	html: string,
	options: PreviewDocumentOptions = {}
): string {
	const trimmed = html.trim();
	const viewportScript = options.viewport
		? createPreviewViewportNormalizationScript(options.viewport)
		: '';
	const hostScrollSyncScript =
		options.syncHostScroll && options.previewId
			? createPreviewHostScrollSyncScript(options.previewId)
			: '';
	const resizeScript =
		options.resizeToContent && options.previewId
			? createPreviewResizeScript(options.previewId)
			: '';
	const headInjection = `${CSP_META_TAG}${viewportScript}${hostScrollSyncScript}${resizeScript}`;

	if (/<head(\s|>)/i.test(trimmed)) {
		return trimmed.replace(/<head(\s*[^>]*)>/i, `<head$1>${headInjection}`);
	}

	if (/<html(\s|>)/i.test(trimmed)) {
		return trimmed.replace(/<html(\s*[^>]*)>/i, `<html$1><head>${headInjection}</head>`);
	}

	return `<!doctype html><html><head>${headInjection}</head><body>${trimmed}</body></html>`;
}

export function createStandalonePreviewDocument(
	html: string,
	options: {
		title?: string;
	}
): { html: string; csp: string } {
	const previewDocument = createSandboxedPreviewDocument(html);
	const title = options.title ?? 'Preview';
	const previewDocumentJson = serializeForInlineScript(previewDocument);
	const escapedTitle = escapeHtml(title);

	return {
		csp: STANDALONE_PREVIEW_CSP,
		html: `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="icon" href="data:,">
<title>${escapedTitle}</title>
<style>
	:root {
		color-scheme: dark;
	}

	* {
		box-sizing: border-box;
	}

	html,
	body {
		margin: 0;
		min-height: 100%;
		background: #09090b;
	}

	body {
		overflow-x: hidden;
	}

	.preview-shell {
		width: 100vw;
		height: 100vh;
	}

	iframe {
		display: block;
		width: 100%;
		height: 100%;
		border: 0;
		background: transparent;
	}
</style>
</head>
<body>
<main class="preview-shell">
	<iframe id="preview-frame" title=${JSON.stringify(title)} sandbox="allow-scripts" scrolling="auto"></iframe>
</main>
<script>
(() => {
	const iframe = document.getElementById('preview-frame');
	iframe.srcdoc = ${previewDocumentJson};
})();
</script>
</body>
</html>`
	};
}
