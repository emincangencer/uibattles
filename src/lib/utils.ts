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

export function createSandboxedPreviewDocument(html: string): string {
	const trimmed = html.trim();

	if (/<head(\s|>)/i.test(trimmed)) {
		return trimmed.replace(/<head(\s*[^>]*)>/i, `<head$1>${CSP_META_TAG}`);
	}

	if (/<html(\s|>)/i.test(trimmed)) {
		return trimmed.replace(/<html(\s*[^>]*)>/i, `<html$1><head>${CSP_META_TAG}</head>`);
	}

	return `<!doctype html><html><head>${CSP_META_TAG}</head><body>${trimmed}</body></html>`;
}
