import { integer, sqliteTable, text, index } from 'drizzle-orm/sqlite-core';
import { user } from './auth.schema';
import { relations } from 'drizzle-orm';

export const generations = sqliteTable(
	'generations',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		name: text('name').notNull(),
		prompt: text('prompt').notNull(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.notNull()
			.$defaultFn(() => new Date()),
		status: text('status').notNull().default('pending'),
		startedAt: integer('started_at', { mode: 'timestamp_ms' }),
		completedAt: integer('completed_at', { mode: 'timestamp_ms' }),
		abortRequested: integer('abort_requested', { mode: 'boolean' }).default(false),
		viewCount: integer('view_count').default(0).notNull(),
		likesCount: integer('likes_count').default(0).notNull()
	},
	(table) => [
		index('idx_generations_name').on(table.name),
		index('idx_generations_created_at').on(table.createdAt),
		index('idx_generations_view_count').on(table.viewCount),
		index('idx_generations_likes_count').on(table.likesCount)
	]
);

export const generationLikes = sqliteTable(
	'generation_likes',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		generationId: text('generation_id')
			.notNull()
			.references(() => generations.id, { onDelete: 'cascade' }),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.notNull()
			.$defaultFn(() => new Date())
	},
	(table) => [index('generation_likes_user_gen_idx').on(table.userId, table.generationId)]
);

export const generationLikesRelations = relations(generationLikes, ({ one }) => ({
	generation: one(generations, {
		fields: [generationLikes.generationId],
		references: [generations.id]
	}),
	user: one(user, {
		fields: [generationLikes.userId],
		references: [user.id]
	})
}));

export const generationItems = sqliteTable('generation_items', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	generationId: text('generation_id')
		.notNull()
		.references(() => generations.id, { onDelete: 'cascade' }),
	modelId: text('model_id').notNull(),
	modelName: text('model_name').notNull(),
	html: text('html'),
	createdAt: integer('created_at', { mode: 'timestamp_ms' })
		.notNull()
		.$defaultFn(() => new Date()),
	status: text('status').notNull().default('pending'),
	error: text('error'),
	startedAt: integer('started_at', { mode: 'timestamp_ms' }),
	completedAt: integer('completed_at', { mode: 'timestamp_ms' })
});

export * from './auth.schema';
