import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generationService } from '$lib/server/services/generation';
import { z } from 'zod';

const addModelsSchema = z.object({
	models: z.array(z.string()).min(1),
	apiKey: z.string().min(1)
});

export const POST: RequestHandler = async ({ request, params, locals }) => {
	const userId = locals.user?.id;
	if (!userId) {
		return json({ error: 'Authentication required' }, { status: 401 });
	}

	try {
		const body = await request.json();
		const parsed = addModelsSchema.safeParse(body);

		if (!parsed.success) {
			return json(
				{
					error: 'Invalid request',
					details: parsed.error.flatten().fieldErrors
				},
				{ status: 400 }
			);
		}

		const { models, apiKey } = parsed.data;
		const { id: generationId } = params;

		if (!generationId) {
			return json({ error: 'Generation ID required' }, { status: 400 });
		}

		const result = await generationService.addModels(generationId, models, apiKey);

		if (!result.success) {
			return json({ error: result.error }, { status: 400 });
		}

		return json({ success: true, addedCount: result.addedCount, retryCount: result.retryCount });
	} catch (error) {
		console.error('Add models error:', error);
		return json(
			{ error: error instanceof Error ? error.message : 'Failed to add models' },
			{ status: 500 }
		);
	}
};
