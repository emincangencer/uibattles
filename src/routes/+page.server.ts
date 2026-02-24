import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { generations, generationItems } from '$lib/server/db/schema';
import { desc, eq } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
	const allGenerations = await db
		.select({
			id: generations.id,
			name: generations.name,
			prompt: generations.prompt,
			createdAt: generations.createdAt
		})
		.from(generations)
		.orderBy(desc(generations.createdAt))
		.limit(50);

	// Get first item (preview) for each generation
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
				.where(eq(generationItems.generationId, gen.id))
				.limit(1);

			return {
				...gen,
				itemCount: items.length,
				preview: items[0] || null
			};
		})
	);

	return {
		generations: generationsWithPreviews
	};
};
