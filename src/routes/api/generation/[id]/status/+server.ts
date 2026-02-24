import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generationService } from '$lib/server/services/generation';

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		return json({ error: 'Authentication required' }, { status: 401 });
	}

	const { id: generationId } = params;

	const status = await generationService.getStatus(generationId);

	if (!status) {
		return json({ error: 'Generation not found' }, { status: 404 });
	}

	if (status.userId !== locals.user.id) {
		return json({ error: 'Unauthorized' }, { status: 403 });
	}

	return json(status);
};
