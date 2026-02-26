import type { PageServerLoad } from './$types';
import { generationService } from '$lib/server/services/generation';

export const load: PageServerLoad = async ({ locals }) => {
	const userId = locals.user?.id;

	const result = await generationService.getPaginatedGenerations({
		limit: 20,
		sort: 'recent',
		userId
	});

	return {
		generations: result.generations,
		initialCursor: result.nextCursor,
		initialHasMore: result.hasMore
	};
};
