import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generationService } from '$lib/server/services/generation';

export const POST: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		return json({ error: 'Authentication required' }, { status: 401 });
	}

	const { id: generationId } = params;

	try {
		const result = await generationService.toggleLike(generationId, locals.user.id);
		return json({ success: true, ...result });
	} catch (error) {
		console.error('Error toggling like:', error);
		return json({ error: 'Failed to toggle like' }, { status: 500 });
	}
};

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		return json({ liked: false, likesCount: 0 });
	}

	const { id: generationId } = params;

	try {
		const result = await generationService.getLikeStatus(generationId, locals.user.id);
		return json(result);
	} catch (error) {
		console.error('Error getting like status:', error);
		return json({ error: 'Failed to get like status' }, { status: 500 });
	}
};
