import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const OPENROUTER_API = 'https://openrouter.ai/api/v1/models';
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

interface CacheEntry {
	data: unknown;
	expires: number;
}

let memoryCache: CacheEntry | null = null;

async function fetchModels(): Promise<unknown> {
	// Check memory cache first
	if (memoryCache && memoryCache.expires > Date.now()) {
		return memoryCache.data;
	}

	const response = await fetch(OPENROUTER_API, {
		headers: {
			'HTTP-Referer': process.env.ORIGIN || 'http://localhost:5173',
			'X-Title': 'UI Battles'
		}
	});

	if (!response.ok) {
		throw new Error(`Failed to fetch models: ${response.statusText}`);
	}

	const data = await response.json();

	// Cache the response
	memoryCache = {
		data,
		expires: Date.now() + CACHE_TTL
	};

	return data;
}

export const GET: RequestHandler = async () => {
	try {
		const response = await fetchModels();

		// Filter for chat models only (exclude embeddings, TTS, etc.)
		const allModels = (response as { data: unknown[] }).data;
		const chatModels = allModels.filter((model: unknown) => {
			const m = model as { architecture?: { modality?: string } };
			// Include models that support text chat
			const modality = m.architecture?.modality?.toLowerCase() || '';
			return modality.includes('text') || modality === 'text->text' || !modality;
		});

		return json({ data: chatModels });
	} catch (error) {
		console.error('Error fetching models:', error);
		return json({ error: 'Failed to fetch models' }, { status: 500 });
	}
};
