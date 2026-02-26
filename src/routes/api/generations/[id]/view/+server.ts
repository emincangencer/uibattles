import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generationService } from '$lib/server/services/generation';

export const POST: RequestHandler = async ({ params }) => {
	const { id: generationId } = params;

	try {
		const viewCount = await generationService.incrementViewCount(generationId);
		return json({ success: true, viewCount });
	} catch (error) {
		console.error('Error incrementing view count:', error);
		return json({ error: 'Failed to increment view count' }, { status: 500 });
	}
};
