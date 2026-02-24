import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generationService } from '$lib/server/services/generation';

export const POST: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Authentication required' }, { status: 401 });
	}

	const { itemId } = params;

	const body = await request.json();
	const { apiKey } = body as { apiKey?: string };

	if (!apiKey) {
		return json({ error: 'API key required' }, { status: 400 });
	}

	try {
		await generationService.retryItem(itemId, locals.user.id, apiKey);
		return json({ success: true });
	} catch (error) {
		const status = error instanceof Error && error.message === 'Unauthorized' ? 403 : 500;
		return json({ error: error instanceof Error ? error.message : 'Retry failed' }, { status });
	}
};
