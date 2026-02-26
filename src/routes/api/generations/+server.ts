import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generationService } from '$lib/server/services/generation';

export const GET: RequestHandler = async ({ url, locals }) => {
	const cursor = url.searchParams.get('cursor') ?? undefined;
	const limit = Number(url.searchParams.get('limit')) || 20;
	const search = url.searchParams.get('search') ?? undefined;
	const sort = (url.searchParams.get('sort') as 'recent' | 'popular' | 'most_liked') || 'recent';

	const userId = locals.user?.id;

	const result = await generationService.getPaginatedGenerations({
		cursor,
		limit: Math.min(limit, 50),
		search,
		sort,
		userId
	});

	return json(result);
};
