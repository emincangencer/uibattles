import { createStandalonePreviewDocument } from '$lib/utils';
import { db } from '$lib/server/db';
import { generationItems } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { error } from '@sveltejs/kit';

export async function GET({ params }) {
	const [item] = await db
		.select({
			html: generationItems.html,
			modelName: generationItems.modelName
		})
		.from(generationItems)
		.where(and(eq(generationItems.id, params.itemId), eq(generationItems.status, 'completed')))
		.limit(1);

	if (!item?.html) {
		throw error(404, 'Preview not found');
	}

	const preview = createStandalonePreviewDocument(item.html, {
		title: item.modelName ? `${item.modelName} Preview` : 'Preview'
	});

	return new Response(preview.html, {
		headers: {
			'content-type': 'text/html; charset=utf-8',
			'content-security-policy': preview.csp,
			'x-content-type-options': 'nosniff'
		}
	});
}
