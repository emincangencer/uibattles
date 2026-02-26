import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { generations, generationItems, user, generationLikes } from '$lib/server/db/schema';
import { eq, asc, and } from 'drizzle-orm';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, locals }) => {
	const generation = await db
		.select({
			id: generations.id,
			name: generations.name,
			prompt: generations.prompt,
			createdAt: generations.createdAt,
			userId: generations.userId,
			viewCount: generations.viewCount,
			likesCount: generations.likesCount
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
			createdAt: generationItems.createdAt
		})
		.from(generationItems)
		.where(eq(generationItems.generationId, params.id))
		.orderBy(asc(generationItems.createdAt));

	const completedItems = items.filter((item) => item.status === 'completed' && item.html);

	let userLiked = false;
	if (locals.user) {
		const [like] = await db
			.select({ id: generationLikes.id })
			.from(generationLikes)
			.where(
				and(eq(generationLikes.generationId, params.id), eq(generationLikes.userId, locals.user.id))
			)
			.limit(1);
		userLiked = !!like;
	}

	return {
		generation: {
			...gen,
			viewCount: gen.viewCount ?? 0,
			likesCount: gen.likesCount ?? 0
		},
		creator: creator[0] || null,
		items: completedItems,
		userLiked
	};
};
