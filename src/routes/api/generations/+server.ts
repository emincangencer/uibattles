import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generationService } from '$lib/server/services/generation';

export const GET: RequestHandler = async ({ url }) => {
	const cursor = url.searchParams.get('cursor') ?? undefined;
	const limit = Number(url.searchParams.get('limit')) || 20;
	const search = url.searchParams.get('search') ?? undefined;
	const sort = (url.searchParams.get('sort') as 'recent' | 'popular') || 'recent';

	const result = await generationService.getPaginatedGenerations({
		cursor,
		limit: Math.min(limit, 50),
		search,
		sort
	});

	return json(result);
};
