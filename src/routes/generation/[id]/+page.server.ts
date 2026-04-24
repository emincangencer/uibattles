import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { generations, generationItems, user, modelGenerationLikes } from '$lib/server/db/schema';
import { eq, and, sql, desc, asc } from 'drizzle-orm';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, locals, fetch: globalFetch }) => {
	let models: unknown[];
	try {
		const response = await globalFetch('/api/models');
		const result: { data?: unknown[] } = await response.json();
		models = result.data ?? [];
	} catch {
		models = [];
	}

	const generation = await db
		.select({
			id: generations.id,
			name: generations.name,
			prompt: generations.prompt,
			createdAt: generations.createdAt,
			userId: generations.userId,
			viewCount: generations.viewCount
		})
		.from(generations)
		.where(eq(generations.id, params.id))
		.limit(1);

	if (!generation.length) {
		throw error(404, 'Generation not found');
	}

	const gen = generation[0];

	const creator = await db
		.select({
			id: user.id,
			name: user.name,
			image: user.image
		})
		.from(user)
		.where(eq(user.id, gen.userId))
		.limit(1);

	const items = await db
		.select({
			id: generationItems.id,
			modelId: generationItems.modelId,
			modelName: generationItems.modelName,
			html: generationItems.html,
			status: generationItems.status,
			error: generationItems.error,
			createdAt: generationItems.createdAt,
			contributorId: generationItems.userId,
			contributorName: user.name,
			likesCount: generationItems.likesCount
		})
		.from(generationItems)
		.leftJoin(user, eq(generationItems.userId, user.id))
		.where(eq(generationItems.generationId, params.id))
		.orderBy(desc(generationItems.likesCount), asc(generationItems.createdAt));

	const allItems = items.filter((item) => item.status === 'completed' && item.html);
	const failedItems = items.filter((item) => item.status === 'error' || item.status === 'aborted');

	// Batch fetch all like counts in a single query
	const itemIds = allItems.map((item) => item.id);
	const likeCountsQuery = db
		.select({ itemId: modelGenerationLikes.itemId, count: sql<number>`count(*)`.as('like_count') })
		.from(modelGenerationLikes)
		.where(
			sql`${modelGenerationLikes.itemId} IN (${sql.join(
				itemIds.map((id) => sql`${id}`),
				sql`, `
			)})`
		)
		.groupBy(modelGenerationLikes.itemId);

	const likeCounts = await likeCountsQuery;
	const likeCountMap = new Map(likeCounts.map((r) => [r.itemId, r.count]));

	// Batch fetch user's likes if logged in
	let userLikesMap = new Set<string>();
	if (locals.user) {
		const userLikes = await db
			.select({ itemId: modelGenerationLikes.itemId })
			.from(modelGenerationLikes)
			.where(
				and(
					sql`${modelGenerationLikes.itemId} IN (${sql.join(
						itemIds.map((id) => sql`${id}`),
						sql`, `
					)})`,
					eq(modelGenerationLikes.userId, locals.user.id)
				)
			);
		userLikesMap = new Set(userLikes.map((r) => r.itemId));
	}

	let totalLikesCount = 0;
	const itemLikesMap: Record<string, { liked: boolean; likesCount: number }> = {};
	for (const item of allItems) {
		const itemLikes = likeCountMap.get(item.id) ?? 0;
		totalLikesCount += itemLikes;
		itemLikesMap[item.id] = {
			liked: userLikesMap.has(item.id),
			likesCount: itemLikes
		};
	}

	return {
		generation: {
			...gen,
			viewCount: gen.viewCount ?? 0,
			likesCount: totalLikesCount
		},
		creator: creator[0] || null,
		items: allItems,
		failedItems,
		itemLikes: itemLikesMap,
		currentItemId: allItems[0]?.id,
		models
	};
};
