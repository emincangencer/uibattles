import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { generations } from '$lib/server/db/schema';
import { eq, desc, and, sql } from 'drizzle-orm';

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const cursor = url.searchParams.get('cursor') ?? undefined;
	const limit = Math.min(Number(url.searchParams.get('limit')) || 20, 50);

	try {
		const conditions: ReturnType<typeof sql>[] = [eq(generations.userId, locals.user.id)];

		if (cursor) {
			const [cursorGen] = await db
				.select({ createdAt: generations.createdAt })
				.from(generations)
				.where(eq(generations.id, cursor))
				.limit(1);

			if (cursorGen) {
				conditions.push(sql`${generations.createdAt} < ${cursorGen.createdAt}`);
			}
		}

		const whereClause = and(...conditions);

		const result = await db
			.select({
				id: generations.id,
				name: generations.name,
				status: generations.status,
				createdAt: generations.createdAt
			})
			.from(generations)
			.where(whereClause)
			.orderBy(desc(generations.createdAt))
			.limit(limit + 1);

		const hasMore = result.length > limit;
		const generationsList = hasMore ? result.slice(0, limit) : result;
		const nextCursor = hasMore ? (generationsList[generationsList.length - 1]?.id ?? null) : null;

		return json({
			generations: generationsList,
			nextCursor,
			hasMore
		});
	} catch (error) {
		console.error('Failed to fetch user generations:', error);
		return json({ error: 'Failed to fetch generations' }, { status: 500 });
	}
};
