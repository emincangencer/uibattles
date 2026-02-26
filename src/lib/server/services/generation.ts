import { generateText, RetryError, APICallError } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { db } from '$lib/server/db';
import { generations, generationItems, generationLikes } from '$lib/server/db/schema';
import { eq, asc, desc, sql, and } from 'drizzle-orm';

const MAX_CONCURRENT = 3;
const MODEL_TIMEOUT_MS = 120_000;

const SYSTEM_PROMPT = `Generate a complete, single-file HTML document.
You may use:
- HTML5 elements, CSS3 (flexbox, grid, animations, transitions)
- JavaScript (vanilla, no frameworks)
- Google Fonts via @import or <link>
- Inline SVG images (as data URIs or inline)

You must NOT:
- Use external CSS/JS libraries (no Tailwind CDN, React, Vue, etc.)
- Reference external resources except Google Fonts
- Make network requests
- Use data: URLs except for inline SVGs
- Generate incomplete or placeholder content

Output ONLY the raw HTML code, no explanations or markdown.`;

export interface GenerationStatus {
	id: string;
	name: string;
	prompt: string;
	userId: string;
	status: 'pending' | 'in_progress' | 'completed' | 'aborted';
	startedAt: Date | null;
	completedAt: Date | null;
	abortRequested: boolean;
	items: GenerationItemStatus[];
}

export interface GenerationItemStatus {
	id: string;
	modelId: string;
	modelName: string;
	status: 'pending' | 'generating' | 'completed' | 'error' | 'aborted';
	error: string | null;
	startedAt: Date | null;
	completedAt: Date | null;
}

export interface GenerationCardData {
	id: string;
	name: string;
	createdAt: Date;
	itemCount: number;
	viewCount: number;
	likesCount: number;
	preview: { id: string; modelName: string; html: string } | null;
	userLiked?: boolean;
}

export type SortOption = 'recent' | 'popular' | 'most_liked';

export class GenerationService {
	async enqueue(params: {
		prompt: string;
		name: string;
		models: string[];
		apiKey: string;
		userId: string;
	}): Promise<string> {
		const { prompt, name, models, apiKey, userId } = params;

		const generationId = crypto.randomUUID();

		await db.insert(generations).values({
			id: generationId,
			name,
			prompt,
			userId,
			status: 'pending'
		});

		for (const modelId of models) {
			await db.insert(generationItems).values({
				id: crypto.randomUUID(),
				generationId,
				modelId,
				modelName: modelId,
				status: 'pending'
			});
		}

		this.processGeneration(generationId, apiKey).catch((err) => {
			console.error('Generation processing error:', err);
		});

		return generationId;
	}

	private async processGeneration(generationId: string, apiKey: string): Promise<void> {
		await db
			.update(generations)
			.set({ status: 'in_progress', startedAt: new Date() })
			.where(eq(generations.id, generationId));

		const openrouter = createOpenRouter({ apiKey });

		const allItems = await db
			.select()
			.from(generationItems)
			.where(eq(generationItems.generationId, generationId))
			.orderBy(asc(generationItems.createdAt));

		const pendingItems = allItems.filter((item) => item.status === 'pending');

		for (let i = 0; i < pendingItems.length; i += MAX_CONCURRENT) {
			const [generation] = await db
				.select()
				.from(generations)
				.where(eq(generations.id, generationId));

			if (generation?.abortRequested) {
				await this.abortRemaining(generationId, allItems);
				await db
					.update(generations)
					.set({ status: 'aborted', completedAt: new Date() })
					.where(eq(generations.id, generationId));

				return;
			}

			const chunk = pendingItems.slice(i, i + MAX_CONCURRENT);

			await Promise.all(chunk.map((item) => this.processModelWithTimeout(item, openrouter)));
		}

		const finalItems = await db
			.select()
			.from(generationItems)
			.where(eq(generationItems.generationId, generationId));

		const allAborted = finalItems.every((item) => item.status === 'aborted');

		const finalStatus: 'completed' | 'aborted' = allAborted ? 'aborted' : 'completed';

		await db
			.update(generations)
			.set({ status: finalStatus, completedAt: new Date() })
			.where(eq(generations.id, generationId));
	}

	private async processModelWithTimeout(
		item: typeof generationItems.$inferSelect,
		openrouter: ReturnType<typeof createOpenRouter>
	): Promise<void> {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), MODEL_TIMEOUT_MS);

		try {
			await this.processModel(item, openrouter, controller.signal);
		} finally {
			clearTimeout(timeoutId);
		}
	}

	private async processModel(
		item: typeof generationItems.$inferSelect,
		openrouter: ReturnType<typeof createOpenRouter>,
		abortSignal?: AbortSignal
	): Promise<void> {
		await db
			.update(generationItems)
			.set({ status: 'generating', startedAt: new Date() })
			.where(eq(generationItems.id, item.id));

		try {
			const [generation] = await db
				.select()
				.from(generations)
				.where(eq(generations.id, item.generationId));

			if (generation?.abortRequested) {
				await db
					.update(generationItems)
					.set({ status: 'aborted', completedAt: new Date() })
					.where(eq(generationItems.id, item.id));

				return;
			}

			const result = await generateText({
				model: openrouter.chat(item.modelId),
				messages: [
					{ role: 'system', content: SYSTEM_PROMPT },
					{ role: 'user', content: generation?.prompt ?? '' }
				],
				abortSignal
			});

			let html = result.text;

			html = html
				.replace(/^```html\s*/, '')
				.replace(/^```\s*$/, '')
				.trim();

			await db
				.update(generationItems)
				.set({ status: 'completed', html, completedAt: new Date() })
				.where(eq(generationItems.id, item.id));
		} catch (error) {
			let errorMessage = 'Generation failed';

			// Handle abort error from timeout
			if (error instanceof Error && error.name === 'AbortError') {
				errorMessage = 'Generation timed out (2 minute limit)';
				await db
					.update(generationItems)
					.set({ status: 'error', error: errorMessage, completedAt: new Date() })
					.where(eq(generationItems.id, item.id));

				return;
			}

			// Use recommended AI SDK error type checking
			if (RetryError.isInstance(error)) {
				// Handle RetryError - all retry attempts failed
				const lastError = error.lastError as { responseBody?: string } | undefined;
				const retryMessage = error.message;

				// Try to extract provider error message from lastError.responseBody
				if (lastError?.responseBody) {
					try {
						const parsed = JSON.parse(lastError.responseBody);
						if (parsed.error?.message) {
							errorMessage = parsed.error.message;
						}
					} catch {
						// Not JSON, continue
					}
				}

				// Fallback: check errors array
				if (errorMessage === 'Generation failed' && error.errors?.length) {
					const errors = error.errors as Array<{ responseBody?: string }>;
					for (const err of errors) {
						if (err.responseBody) {
							try {
								const parsed = JSON.parse(err.responseBody);
								if (parsed.error?.message) {
									errorMessage = parsed.error.message;
									break;
								}
							} catch {
								// Not JSON
							}
						}
					}
				}

				// Final fallback to error message
				if (errorMessage === 'Generation failed') {
					errorMessage = retryMessage;
				}

				console.error(`RetryError for model ${item.modelId}:`, error);
			} else if (APICallError.isInstance(error)) {
				// Handle APICallError - single API call failed
				const apiError = error as { responseBody?: string };
				if (apiError.responseBody) {
					try {
						const parsed = JSON.parse(apiError.responseBody);
						if (parsed.error?.message) {
							errorMessage = parsed.error.message;
						}
					} catch {
						// Not JSON
					}
				}
				if (errorMessage === 'Generation failed') {
					errorMessage = error.message;
				}
				console.error(`APICallError for model ${item.modelId}:`, error);
			} else if (error instanceof Error) {
				// Handle generic errors
				errorMessage = error.message;
				console.error(`Error generating with model ${item.modelId}:`, error);
			}

			await db
				.update(generationItems)
				.set({ status: 'error', error: errorMessage, completedAt: new Date() })
				.where(eq(generationItems.id, item.id));
		}
	}

	private async abortRemaining(
		generationId: string,
		items: (typeof generationItems.$inferSelect)[]
	): Promise<void> {
		const pendingOrGenerating = items.filter(
			(item) => item.status === 'pending' || item.status === 'generating'
		);

		for (const item of pendingOrGenerating) {
			await db
				.update(generationItems)
				.set({ status: 'aborted', completedAt: new Date() })
				.where(eq(generationItems.id, item.id));
		}
	}

	async abort(generationId: string): Promise<void> {
		await db
			.update(generations)
			.set({ abortRequested: true })
			.where(eq(generations.id, generationId));
	}

	async retryItem(itemId: string, userId: string, apiKey: string): Promise<void> {
		const [item] = await db.select().from(generationItems).where(eq(generationItems.id, itemId));

		if (!item) {
			throw new Error('Item not found');
		}

		const [generation] = await db
			.select()
			.from(generations)
			.where(eq(generations.id, item.generationId));

		if (!generation) {
			throw new Error('Generation not found');
		}

		if (generation.userId !== userId) {
			throw new Error('Unauthorized');
		}

		if (item.status !== 'error' && item.status !== 'aborted') {
			throw new Error('Can only retry failed or aborted items');
		}

		await db
			.update(generationItems)
			.set({ status: 'pending', error: null, startedAt: null, completedAt: null })
			.where(eq(generationItems.id, itemId));

		this.processGeneration(item.generationId, apiKey).catch((err) => {
			console.error('Retry processing error:', err);
		});
	}

	async getStatus(generationId: string): Promise<GenerationStatus | null> {
		const [generation] = await db
			.select()
			.from(generations)
			.where(eq(generations.id, generationId));

		if (!generation) {
			return null;
		}

		const items = await db
			.select()
			.from(generationItems)
			.where(eq(generationItems.generationId, generationId))
			.orderBy(asc(generationItems.createdAt));

		return {
			id: generation.id,
			name: generation.name,
			prompt: generation.prompt,
			userId: generation.userId,
			status: generation.status as GenerationStatus['status'],
			startedAt: generation.startedAt,
			completedAt: generation.completedAt,
			abortRequested: generation.abortRequested ?? false,
			items: items.map((item) => ({
				id: item.id,
				modelId: item.modelId,
				modelName: item.modelName,
				status: item.status as GenerationItemStatus['status'],
				error: item.error,
				startedAt: item.startedAt,
				completedAt: item.completedAt
			}))
		};
	}

	async getPaginatedGenerations(params: {
		cursor?: string;
		limit: number;
		search?: string;
		sort: SortOption;
		userId?: string;
	}): Promise<{
		generations: GenerationCardData[];
		nextCursor: string | null;
		hasMore: boolean;
	}> {
		const { cursor, limit, search, sort, userId } = params;

		const conditions: ReturnType<typeof sql>[] = [];

		// Check for completed items using subquery
		const completedSubquery = db
			.select({ generationId: generationItems.generationId })
			.from(generationItems)
			.where(sql`${generationItems.status} = 'completed'`)
			.groupBy(generationItems.generationId)
			.as('completed_gen');

		conditions.push(sql`${generations.id} IN (SELECT generation_id FROM ${completedSubquery})`);

		if (cursor) {
			const [cursorGen] = await db
				.select({
					createdAt: generations.createdAt,
					viewCount: generations.viewCount,
					likesCount: generations.likesCount
				})
				.from(generations)
				.where(eq(generations.id, cursor))
				.limit(1);
			if (cursorGen) {
				switch (sort) {
					case 'popular':
						conditions.push(sql`${generations.viewCount} < ${cursorGen.viewCount ?? 0}`);
						break;
					case 'most_liked':
						conditions.push(sql`${generations.likesCount} < ${cursorGen.likesCount ?? 0}`);
						break;
					default:
						conditions.push(sql`${generations.createdAt} < ${cursorGen.createdAt}`);
				}
			}
		}

		if (search) {
			const searchPattern = `%${search.toLowerCase()}%`;
			conditions.push(sql`LOWER(${generations.name}) LIKE ${searchPattern}`);
		}

		const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

		const baseQuery = db
			.select({
				id: generations.id,
				name: generations.name,
				createdAt: generations.createdAt,
				viewCount: generations.viewCount,
				likesCount: generations.likesCount
			})
			.from(generations)
			.where(whereClause);

		let orderedQuery;
		switch (sort) {
			case 'popular':
				orderedQuery = baseQuery.orderBy(desc(generations.viewCount));
				break;
			case 'most_liked':
				orderedQuery = baseQuery.orderBy(desc(generations.likesCount));
				break;
			default:
				orderedQuery = baseQuery.orderBy(desc(generations.createdAt));
		}

		const results = await orderedQuery.limit(limit + 1);

		const hasMore = results.length > limit;
		const items = hasMore ? results.slice(0, limit) : results;
		const nextCursor = hasMore ? items[items.length - 1].id : null;

		if (items.length === 0) {
			return {
				generations: [],
				nextCursor,
				hasMore
			};
		}

		// Optimize: Batch fetch all previews in one query
		const generationIds = items.map((g) => g.id);

		const allPreviews = await db
			.select({
				id: generationItems.id,
				generationId: generationItems.generationId,
				modelName: generationItems.modelName,
				html: generationItems.html
			})
			.from(generationItems)
			.where(
				and(
					sql`${generationItems.generationId} IN (${sql.join(
						generationIds.map((id) => sql`${id}`),
						sql`, `
					)})`,
					sql`${generationItems.status} = 'completed'`
				)
			);

		// Get first preview for each generation
		const previewMap = new Map<string, { id: string; modelName: string; html: string }>();
		for (const preview of allPreviews) {
			if (!previewMap.has(preview.generationId)) {
				previewMap.set(preview.generationId, {
					id: preview.id,
					modelName: preview.modelName,
					html: preview.html ?? ''
				});
			}
		}

		// Batch fetch item counts
		const allCounts = await db
			.select({
				generationId: generationItems.generationId,
				count: sql<number>`count(*)`
			})
			.from(generationItems)
			.where(
				sql`${generationItems.generationId} IN (${sql.join(
					generationIds.map((id) => sql`${id}`),
					sql`, `
				)})`
			)
			.groupBy(generationItems.generationId);

		const countMap = new Map<string, number>();
		for (const row of allCounts) {
			countMap.set(row.generationId, row.count);
		}

		// Batch fetch likes if user is logged in
		let likeMap = new Map<string, boolean>();
		if (userId) {
			const userLikes = await db
				.select({ generationId: generationLikes.generationId })
				.from(generationLikes)
				.where(
					and(
						sql`${generationLikes.generationId} IN (${sql.join(
							generationIds.map((id) => sql`${id}`),
							sql`, `
						)})`,
						eq(generationLikes.userId, userId)
					)
				);

			likeMap = new Map(userLikes.map((like) => [like.generationId, true]));
		}

		// Combine all data
		const generationsWithPreviews = items.map((gen) => ({
			id: gen.id,
			name: gen.name,
			createdAt: gen.createdAt,
			itemCount: countMap.get(gen.id) ?? 0,
			viewCount: gen.viewCount ?? 0,
			likesCount: gen.likesCount ?? 0,
			preview: previewMap.get(gen.id) ?? null,
			userLiked: likeMap.get(gen.id) ?? false
		}));

		return {
			generations: generationsWithPreviews,
			nextCursor,
			hasMore
		};
	}

	async incrementViewCount(generationId: string): Promise<number> {
		await db
			.update(generations)
			.set({ viewCount: sql`view_count + 1` })
			.where(eq(generations.id, generationId));

		const [gen] = await db
			.select({ viewCount: generations.viewCount })
			.from(generations)
			.where(eq(generations.id, generationId));

		return gen?.viewCount ?? 0;
	}

	async toggleLike(
		generationId: string,
		userId: string
	): Promise<{ liked: boolean; likesCount: number }> {
		const [existingLike] = await db
			.select({ id: generationLikes.id })
			.from(generationLikes)
			.where(
				and(eq(generationLikes.generationId, generationId), eq(generationLikes.userId, userId))
			)
			.limit(1);

		if (existingLike) {
			await db.delete(generationLikes).where(eq(generationLikes.id, existingLike.id));

			await db
				.update(generations)
				.set({ likesCount: sql`likes_count - 1` })
				.where(eq(generations.id, generationId));
		} else {
			await db.insert(generationLikes).values({
				id: crypto.randomUUID(),
				generationId,
				userId
			});

			await db
				.update(generations)
				.set({ likesCount: sql`likes_count + 1` })
				.where(eq(generations.id, generationId));
		}

		const [gen] = await db
			.select({ likesCount: generations.likesCount })
			.from(generations)
			.where(eq(generations.id, generationId));

		return {
			liked: !existingLike,
			likesCount: gen?.likesCount ?? 0
		};
	}

	async getLikeStatus(
		generationId: string,
		userId: string
	): Promise<{ liked: boolean; likesCount: number }> {
		const [existingLike] = await db
			.select({ id: generationLikes.id })
			.from(generationLikes)
			.where(
				and(eq(generationLikes.generationId, generationId), eq(generationLikes.userId, userId))
			)
			.limit(1);

		const [gen] = await db
			.select({ likesCount: generations.likesCount })
			.from(generations)
			.where(eq(generations.id, generationId));

		return {
			liked: !!existingLike,
			likesCount: gen?.likesCount ?? 0
		};
	}
}

export const generationService = new GenerationService();
