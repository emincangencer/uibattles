import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { user } from './auth.schema';

export const generations = sqliteTable('generations', {
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
	abortRequested: integer('abort_requested', { mode: 'boolean' }).default(false)
});

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
