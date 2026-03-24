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

const PREVIEW_CSP = [
	"default-src 'none'",
	"base-uri 'none'",
	"form-action 'none'",
	"frame-ancestors 'none'",
	"object-src 'none'",
	"connect-src 'none'",
	"frame-src 'none'",
	"child-src 'none'",
	"manifest-src 'none'",
	'img-src data: blob:',
	'media-src data: blob:',
	'font-src https://fonts.gstatic.com data:',
	"style-src 'unsafe-inline' https://fonts.googleapis.com",
	"script-src 'unsafe-inline'"
].join('; ');

const CSP_META_TAG = `<meta http-equiv="Content-Security-Policy" content="${PREVIEW_CSP}">`;
const PREVIEW_RESIZE_MESSAGE_TYPE = 'uibattles-preview-resize';

interface PreviewDocumentOptions {
	resizeToContent?: boolean;
	previewId?: string;
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

export function createSandboxedPreviewDocument(
	html: string,
	options: PreviewDocumentOptions = {}
): string {
	const trimmed = html.trim();
	const resizeScript =
		options.resizeToContent && options.previewId
			? createPreviewResizeScript(options.previewId)
			: '';
	const headInjection = `${CSP_META_TAG}${resizeScript}`;

	if (/<head(\s|>)/i.test(trimmed)) {
		return trimmed.replace(/<head(\s*[^>]*)>/i, `<head$1>${headInjection}`);
	}

	if (/<html(\s|>)/i.test(trimmed)) {
		return trimmed.replace(/<html(\s*[^>]*)>/i, `<html$1><head>${headInjection}</head>`);
	}

	return `<!doctype html><html><head>${headInjection}</head><body>${trimmed}</body></html>`;
}
