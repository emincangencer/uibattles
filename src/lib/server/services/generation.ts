import { generateText, RetryError, APICallError } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { db } from '$lib/server/db';
import { generations, generationItems, modelGenerationLikes, user } from '$lib/server/db/schema';
import { eq, asc, desc, sql, and } from 'drizzle-orm';
import { parse } from 'parse5';

const MODEL_TIMEOUT_MS = 300_000;

function isValidHtml(html: string): boolean {
	const trimmed = html.trim();
	if (!trimmed) return false;

	try {
		const doc = parse(trimmed) as {
			childNodes: Array<{
				nodeName: string;
				childNodes?: Array<{ nodeName: string; childNodes?: Array<unknown> }>;
			}>;
		};
		const htmlNode = doc.childNodes.find((n) => n.nodeName === 'html');
		if (!htmlNode?.childNodes) return false;

		const bodyNode = htmlNode.childNodes.find((n) => n.nodeName === 'body');
		if (!bodyNode?.childNodes || bodyNode.childNodes.length === 0) return false;

		return true;
	} catch {
		return false;
	}
}

const SYSTEM_PROMPT = `Generate a complete, single-file HTML document.
You may use:
- HTML5 elements, CSS3 (flexbox, grid, animations, transitions)
- JavaScript (vanilla, no frameworks)
- Google Fonts via @import or <link>
- Iconify via CDN: <script src="https://cdn.jsdelivr.net/npm/iconify-icon@3/dist/iconify-icon.min.js"></script>
- Then use <iconify-icon icon="[PREFIX]:[ICON_NAME]"></iconify-icon> (e.g., <iconify-icon icon="mdi:home"></iconify-icon>)
- Inline SVG images (as data URIs or inline)

Iconify icon sets include: mdi (Material Design), ri (RemixIcon), lucide, heroicons, twemoji, line-md, feather, etc.

You must NOT:
- Use external CSS/JS libraries other than Iconify and Google Fonts
- Reference external resources except Google Fonts and Iconify CDN
- Make network requests
- Use data: URLs except for inline SVGs
- Generate incomplete or placeholder content
- Use @iconify/iconify CSS version (e.g., iconify@2.x.x/dist/iconify.min.css) - only use iconify-icon@3 JavaScript web component
- Wrap output in markdown code blocks (no \`\`\`html or \`\`\` fences)

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
	userId?: string | null;
	contributorName?: string | null;
	status: 'pending' | 'generating' | 'completed' | 'error' | 'aborted';
	html: string;
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
}

export type SortOption = 'recent' | 'popular';

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
				userId,
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
		while (true) {
			const [generation] = await db
				.select()
				.from(generations)
				.where(eq(generations.id, generationId));

			const currentItems = await db
				.select()
				.from(generationItems)
				.where(eq(generationItems.generationId, generationId))
				.orderBy(asc(generationItems.createdAt));

			if (generation?.abortRequested) {
				await this.abortRemaining(generationId, currentItems);
				await db
					.update(generations)
					.set({ status: 'aborted', completedAt: new Date() })
					.where(eq(generations.id, generationId));

				return;
			}

			const pendingItems = currentItems.filter((item) => item.status === 'pending');
			if (pendingItems.length === 0) {
				break;
			}

			await Promise.all(pendingItems.map((item) => this.processModelWithTimeout(item, openrouter)));
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
				.replace(/^```html\s*[\n\r]?/, '')
				.replace(/^```\s*[\n\r]?/, '')
				.replace(/[\n\r]?```\s*$/, '')
				.trim();

			if (!isValidHtml(html)) {
				await db
					.update(generationItems)
					.set({ status: 'error', error: 'Malformed HTML output', completedAt: new Date() })
					.where(eq(generationItems.id, item.id));
				return;
			}

			const [updatedGeneration] = await db
				.select()
				.from(generations)
				.where(eq(generations.id, item.generationId));

			if (updatedGeneration?.abortRequested) {
				await db
					.update(generationItems)
					.set({ status: 'aborted', completedAt: new Date() })
					.where(eq(generationItems.id, item.id));
				return;
			}

			await db
				.update(generationItems)
				.set({ status: 'completed', html, completedAt: new Date() })
				.where(eq(generationItems.id, item.id));
		} catch (error) {
			const [latestItem] = await db
				.select()
				.from(generationItems)
				.where(eq(generationItems.id, item.id));

			if (latestItem?.status === 'aborted') {
				return;
			}

			let errorMessage = 'Generation failed';

			// Handle abort error from timeout
			if (error instanceof Error && error.name === 'AbortError') {
				errorMessage = 'Generation timed out (5 minute limit)';
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
						if (parsed.error?.metadata?.raw) {
							errorMessage = parsed.error.metadata.raw;
						} else if (parsed.error?.message) {
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
								if (parsed.error?.metadata?.raw) {
									errorMessage = parsed.error.metadata.raw;
									break;
								} else if (parsed.error?.message) {
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
						if (parsed.error?.metadata?.raw) {
							errorMessage = parsed.error.metadata.raw;
						} else if (parsed.error?.message) {
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
		const now = new Date();
		const items = await db
			.select()
			.from(generationItems)
			.where(eq(generationItems.generationId, generationId));

		await db
			.update(generations)
			.set({ abortRequested: true, status: 'aborted', completedAt: now })
			.where(eq(generations.id, generationId));

		await this.abortRemaining(generationId, items);
	}

	async addModels(
		generationId: string,
		models: string[],
		apiKey: string,
		userId: string
	): Promise<{ success: boolean; addedCount: number; retryCount: number; error?: string }> {
		const [generation] = await db
			.select()
			.from(generations)
			.where(eq(generations.id, generationId));

		if (!generation) {
			return { success: false, addedCount: 0, retryCount: 0, error: 'Generation not found' };
		}

		const existingItems = await db
			.select()
			.from(generationItems)
			.where(eq(generationItems.generationId, generationId));

		const existingItemsByModel = new Map(existingItems.map((item) => [item.modelId, item]));
		const completedModelIds = new Set(
			existingItems.filter((item) => item.status === 'completed').map((item) => item.modelId)
		);

		const failedModelIds = new Set(
			existingItems
				.filter((item) => item.status === 'error' || item.status === 'aborted')
				.map((item) => item.modelId)
		);

		const modelsToAdd: string[] = [];
		const modelsToRetry: string[] = [];

		for (const modelId of models) {
			if (completedModelIds.has(modelId)) {
				continue;
			}
			if (failedModelIds.has(modelId)) {
				modelsToRetry.push(modelId);
			} else {
				modelsToAdd.push(modelId);
			}
		}

		if (modelsToAdd.length === 0 && modelsToRetry.length === 0) {
			return {
				success: false,
				addedCount: 0,
				retryCount: 0,
				error: 'All models already exist in this generation'
			};
		}

		for (const modelId of modelsToAdd) {
			await db.insert(generationItems).values({
				id: crypto.randomUUID(),
				generationId,
				userId,
				modelId,
				modelName: modelId,
				status: 'pending'
			});
		}

		for (const modelId of modelsToRetry) {
			const existingItem = existingItemsByModel.get(modelId);
			if (existingItem) {
				await db
					.update(generationItems)
					.set({
						status: 'pending',
						userId,
						error: null,
						startedAt: null,
						completedAt: null
					})
					.where(eq(generationItems.id, existingItem.id));
			}
		}

		if (generation.status === 'completed' || modelsToRetry.length > 0) {
			await db
				.update(generations)
				.set({
					status: 'in_progress',
					startedAt: new Date(),
					completedAt: null,
					abortRequested: false
				})
				.where(eq(generations.id, generationId));

			this.processGeneration(generationId, apiKey).catch((err) => {
				console.error('Add models processing error:', err);
			});
		}

		return { success: true, addedCount: modelsToAdd.length, retryCount: modelsToRetry.length };
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

		await db
			.update(generations)
			.set({
				status: 'in_progress',
				startedAt: new Date(),
				completedAt: null,
				abortRequested: false
			})
			.where(eq(generations.id, item.generationId));

		this.processGeneration(item.generationId, apiKey).catch((err) => {
			console.error('Retry processing error:', err);
		});
	}

	async getStatus(generationId: string): Promise<GenerationStatus | null> {
		const [initialGeneration] = await db
			.select()
			.from(generations)
			.where(eq(generations.id, generationId));

		if (!initialGeneration) {
			return null;
		}

		await this.reconcileGenerationState(initialGeneration);

		const [generation] = await db
			.select()
			.from(generations)
			.where(eq(generations.id, generationId));

		if (!generation) {
			return null;
		}

		const items = await db
			.select({
				id: generationItems.id,
				modelId: generationItems.modelId,
				modelName: generationItems.modelName,
				userId: generationItems.userId,
				contributorName: user.name,
				status: generationItems.status,
				html: generationItems.html,
				error: generationItems.error,
				startedAt: generationItems.startedAt,
				completedAt: generationItems.completedAt
			})
			.from(generationItems)
			.leftJoin(user, eq(generationItems.userId, user.id))
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
				userId: item.userId,
				contributorName: item.contributorName,
				status: item.status as GenerationItemStatus['status'],
				html: item.html ?? '',
				error: item.error,
				startedAt: item.startedAt,
				completedAt: item.completedAt
			}))
		};
	}

	private async reconcileGenerationState(
		generation: typeof generations.$inferSelect
	): Promise<void> {
		const items = await db
			.select()
			.from(generationItems)
			.where(eq(generationItems.generationId, generation.id));

		if (generation.abortRequested || generation.status === 'aborted') {
			await this.abortRemaining(generation.id, items);
			if (generation.status !== 'aborted' || !generation.completedAt) {
				await db
					.update(generations)
					.set({ status: 'aborted', completedAt: generation.completedAt ?? new Date() })
					.where(eq(generations.id, generation.id));
			}
			return;
		}

		const now = Date.now();
		const staleGeneratingItems = items.filter(
			(item) =>
				item.status === 'generating' &&
				item.startedAt !== null &&
				now - item.startedAt.getTime() > MODEL_TIMEOUT_MS
		);

		for (const item of staleGeneratingItems) {
			await db
				.update(generationItems)
				.set({
					status: 'error',
					error: 'Generation timed out (5 minute limit)',
					completedAt: new Date()
				})
				.where(eq(generationItems.id, item.id));
		}

		if (staleGeneratingItems.length > 0) {
			return this.reconcileGenerationState(generation);
		}

		const hasActiveItems = items.some(
			(item) => item.status === 'pending' || item.status === 'generating'
		);

		if (
			!hasActiveItems &&
			(generation.status === 'pending' || generation.status === 'in_progress')
		) {
			const allAborted = items.length > 0 && items.every((item) => item.status === 'aborted');
			await db
				.update(generations)
				.set({ status: allAborted ? 'aborted' : 'completed', completedAt: new Date() })
				.where(eq(generations.id, generation.id));
		}
	}

	async getPaginatedGenerations(params: {
		cursor?: string;
		limit: number;
		search?: string;
		sort: SortOption;
	}): Promise<{
		generations: GenerationCardData[];
		nextCursor: string | null;
		hasMore: boolean;
	}> {
		const { cursor, limit, search, sort } = params;

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
					viewCount: generations.viewCount
				})
				.from(generations)
				.where(eq(generations.id, cursor))
				.limit(1);
			if (cursorGen) {
				switch (sort) {
					case 'popular':
						conditions.push(sql`${generations.viewCount} < ${cursorGen.viewCount ?? 0}`);
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
				viewCount: generations.viewCount
			})
			.from(generations)
			.where(whereClause);

		let orderedQuery;
		switch (sort) {
			case 'popular':
				orderedQuery = baseQuery.orderBy(desc(generations.viewCount));
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
				html: generationItems.html,
				likesCount: generationItems.likesCount
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
			)
			.orderBy(desc(generationItems.likesCount), asc(generationItems.createdAt));

		// Get most liked preview for each generation
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

		// Batch fetch item counts (only successful/completed models)
		const allCounts = await db
			.select({
				generationId: generationItems.generationId,
				count: sql<number>`count(*)`
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
			)
			.groupBy(generationItems.generationId);

		const countMap = new Map<string, number>();
		for (const row of allCounts) {
			countMap.set(row.generationId, row.count);
		}

		// Batch fetch likes for all generation items using denormalized likesCount
		const allLikes = await db
			.select({
				generationId: generationItems.generationId,
				totalLikes: sql<number>`sum(${generationItems.likesCount})`
			})
			.from(generationItems)
			.where(
				sql`${generationItems.generationId} IN (${sql.join(
					generationIds.map((id) => sql`${id}`),
					sql`, `
				)})`
			)
			.groupBy(generationItems.generationId);

		const likesCountMap = new Map<string, number>();
		for (const row of allLikes) {
			likesCountMap.set(row.generationId, row.totalLikes ?? 0);
		}

		// Combine all data
		const generationsWithPreviews = items.map((gen) => ({
			id: gen.id,
			name: gen.name,
			createdAt: gen.createdAt,
			itemCount: countMap.get(gen.id) ?? 0,
			viewCount: gen.viewCount ?? 0,
			likesCount: likesCountMap.get(gen.id) ?? 0,
			preview: previewMap.get(gen.id) ?? null
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

	async toggleModelLike(
		itemId: string,
		userId: string
	): Promise<{ liked: boolean; likesCount: number }> {
		const [item] = await db
			.select({ id: generationItems.id })
			.from(generationItems)
			.where(eq(generationItems.id, itemId))
			.limit(1);

		if (!item) {
			throw new Error('ITEM_NOT_FOUND');
		}

		return db.transaction(async (tx) => {
			const existingLikes = await tx
				.select({ id: modelGenerationLikes.id })
				.from(modelGenerationLikes)
				.where(
					and(eq(modelGenerationLikes.itemId, itemId), eq(modelGenerationLikes.userId, userId))
				);

			let liked: boolean;

			if (existingLikes.length > 0) {
				await tx
					.delete(modelGenerationLikes)
					.where(
						and(eq(modelGenerationLikes.itemId, itemId), eq(modelGenerationLikes.userId, userId))
					);
				liked = false;
			} else {
				await tx.insert(modelGenerationLikes).values({
					id: crypto.randomUUID(),
					itemId,
					userId
				});
				liked = true;
			}

			const [likeCount] = await tx
				.select({ count: sql<number>`count(*)` })
				.from(modelGenerationLikes)
				.where(eq(modelGenerationLikes.itemId, itemId));

			const nextLikesCount = likeCount?.count ?? 0;

			await tx
				.update(generationItems)
				.set({ likesCount: nextLikesCount })
				.where(eq(generationItems.id, itemId));

			return {
				liked,
				likesCount: nextLikesCount
			};
		});
	}

	async getModelLikeStatus(
		itemId: string,
		userId: string
	): Promise<{ liked: boolean; likesCount: number }> {
		const [item] = await db
			.select({ id: generationItems.id })
			.from(generationItems)
			.where(eq(generationItems.id, itemId))
			.limit(1);

		if (!item) {
			throw new Error('ITEM_NOT_FOUND');
		}

		const [existingLike] = await db
			.select({ id: modelGenerationLikes.id })
			.from(modelGenerationLikes)
			.where(and(eq(modelGenerationLikes.itemId, itemId), eq(modelGenerationLikes.userId, userId)))
			.limit(1);

		const [itemData] = await db
			.select({ likesCount: generationItems.likesCount })
			.from(generationItems)
			.where(eq(generationItems.id, itemId));

		return {
			liked: !!existingLike,
			likesCount: itemData?.likesCount ?? 0
		};
	}
}

export const generationService = new GenerationService();
