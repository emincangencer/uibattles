import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { generations, generationItems } from '$lib/server/db/schema';
import { desc, eq, sql } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
	// Only fetch generations where at least one item has completed
	const allGenerations = await db
		.select({
			id: generations.id,
			name: generations.name,
			prompt: generations.prompt,
			createdAt: generations.createdAt
		})
		.from(generations)
		.where(
			sql`EXISTS (SELECT 1 FROM ${generationItems} WHERE ${generationItems.generationId} = ${generations.id} AND ${generationItems.status} = 'completed')`
		)
		.orderBy(desc(generations.createdAt))
		.limit(50);

	// Get first completed item (preview) for each generation
	const generationsWithPreviews = await Promise.all(
		allGenerations.map(async (gen) => {
			const items = await db
				.select({
					id: generationItems.id,
					modelId: generationItems.modelId,
					modelName: generationItems.modelName,
					html: generationItems.html
				})
				.from(generationItems)
				.where(
					sql`${generationItems.generationId} = ${gen.id} AND ${generationItems.status} = 'completed'`
				)
				.limit(1);

			const allItems = await db
				.select({ id: generationItems.id })
				.from(generationItems)
				.where(eq(generationItems.generationId, gen.id));

			return {
				...gen,
				itemCount: allItems.length,
				preview: items[0] || null
			};
		})
	);

	return {
		generations: generationsWithPreviews
	};
};
