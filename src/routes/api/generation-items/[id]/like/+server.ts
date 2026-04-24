import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generationService } from '$lib/server/services/generation';

export const POST: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		return json({ error: 'Authentication required' }, { status: 401 });
	}

	const { id: itemId } = params;

	try {
		const result = await generationService.toggleModelLike(itemId, locals.user.id);
		return json({ success: true, ...result });
	} catch (error) {
		if (error instanceof Error) {
			if (error.message === 'ITEM_NOT_FOUND') {
				return json({ error: 'Item not found' }, { status: 404 });
			}
		}
		console.error('Error toggling model like:', error);
		return json({ error: 'Failed to toggle like' }, { status: 500 });
	}
};

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		return json({ liked: false, likesCount: 0 });
	}

	const { id: itemId } = params;

	try {
		const result = await generationService.getModelLikeStatus(itemId, locals.user.id);
		return json(result);
	} catch (error) {
		if (error instanceof Error) {
			if (error.message === 'ITEM_NOT_FOUND') {
				return json({ error: 'Item not found' }, { status: 404 });
			}
		}
		console.error('Error getting model like status:', error);
		return json({ error: 'Failed to get like status' }, { status: 500 });
	}
};
