import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { generations, generationItems, user } from '$lib/server/db/schema';
import { eq, asc } from 'drizzle-orm';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params }) => {
	const generation = await db
		.select({
			id: generations.id,
			name: generations.name,
			prompt: generations.prompt,
			createdAt: generations.createdAt,
			userId: generations.userId
		})
		.from(generations)
		.where(eq(generations.id, params.id))
		.limit(1);

	if (!generation.length) {
		throw error(404, 'Generation not found');
	}

	const creator = await db
		.select({
			id: user.id,
			name: user.name,
			image: user.image
		})
		.from(user)
		.where(eq(user.id, generation[0].userId))
		.limit(1);

	const items = await db
		.select({
			id: generationItems.id,
			modelId: generationItems.modelId,
			modelName: generationItems.modelName,
			html: generationItems.html,
			createdAt: generationItems.createdAt
		})
		.from(generationItems)
		.where(eq(generationItems.generationId, params.id))
		.orderBy(asc(generationItems.createdAt));

	return {
		generation: generation[0],
		creator: creator[0] || null,
		items
	};
};
