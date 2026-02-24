import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { generations, generationItems } from '$lib/server/db/schema';
import { eq, asc, or, and } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals, url, fetch: globalFetch }) => {
	if (!locals.user) {
		const loginUrl = new URL('/login', url.origin);
		loginUrl.searchParams.set('redirect', url.pathname);
		throw redirect(302, loginUrl.toString());
	}

	try {
		const response = await globalFetch('/api/models');
		const result: { data?: unknown[] } = await response.json();

		const inProgressGenerations = await db
			.select()
			.from(generations)
			.where(
				and(
					eq(generations.userId, locals.user.id),
					or(eq(generations.status, 'pending'), eq(generations.status, 'in_progress'))
				)
			)
			.orderBy(asc(generations.createdAt));

		const generationsWithItems = await Promise.all(
			inProgressGenerations.map(async (gen) => {
				const items = await db
					.select()
					.from(generationItems)
					.where(eq(generationItems.generationId, gen.id))
					.orderBy(asc(generationItems.createdAt));
				return {
					...gen,
					items: items.map((item) => ({
						id: item.id,
						modelId: item.modelId,
						modelName: item.modelName,
						status: item.status,
						error: item.error
					}))
				};
			})
		);

		return {
			models: result.data || [],
			inProgressGenerations: generationsWithItems
		};
	} catch {
		return { models: [], inProgressGenerations: [] };
	}
};
