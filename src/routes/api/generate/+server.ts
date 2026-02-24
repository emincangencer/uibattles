import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generationService } from '$lib/server/services/generation';
import { z } from 'zod';

const generateSchema = z.object({
	prompt: z.string().min(1),
	name: z.string().min(1).max(100),
	models: z.array(z.string()).min(1).max(10),
	apiKey: z.string().min(1)
});

export const POST: RequestHandler = async ({ request, getClientAddress, locals }) => {
	try {
		if (!locals.user) {
			return json({ error: 'Authentication required' }, { status: 401 });
		}

		const body = await request.json();
		const parsed = generateSchema.safeParse(body);

		if (!parsed.success) {
			return json(
				{
					error: 'Invalid request',
					details: parsed.error.flatten().fieldErrors
				},
				{ status: 400 }
			);
		}

		const { prompt, name, models, apiKey } = parsed.data;

		const clientIP = getClientAddress();
		const now = Date.now();
		const windowMs = 60 * 1000;
		const maxRequests = 3;

		if (!rateLimitStore.has(clientIP)) {
			rateLimitStore.set(clientIP, []);
		}

		const timestamps = rateLimitStore.get(clientIP)!;
		const recentRequests = timestamps.filter((t) => now - t < windowMs);

		if (recentRequests.length >= maxRequests) {
			return json({ error: 'Rate limit exceeded. Please try again later.' }, { status: 429 });
		}

		rateLimitStore.set(clientIP, [...recentRequests, now]);

		const generationId = await generationService.enqueue({
			prompt,
			name,
			models,
			apiKey,
			userId: locals.user.id
		});

		return json({ id: generationId });
	} catch (error) {
		console.error('Generation error:', error);
		return json(
			{ error: error instanceof Error ? error.message : 'Generation failed' },
			{ status: 500 }
		);
	}
};

const rateLimitStore = new Map<string, number[]>();

setInterval(
	() => {
		const now = Date.now();
		const windowMs = 60 * 1000;

		for (const [ip, timestamps] of rateLimitStore) {
			const recent = timestamps.filter((t) => now - t < windowMs);
			if (recent.length === 0) {
				rateLimitStore.delete(ip);
			} else {
				rateLimitStore.set(ip, recent);
			}
		}
	},
	5 * 60 * 1000
);
