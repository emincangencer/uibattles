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

export const POST: RequestHandler = async ({ request, locals }) => {
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
