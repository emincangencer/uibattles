import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generateText } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { db } from '$lib/server/db';
import { generations, generationItems } from '$lib/server/db/schema';
import { z } from 'zod';

const generateSchema = z.object({
	prompt: z.string().min(1).max(2000),
	name: z.string().min(1).max(100),
	models: z.array(z.string()).min(1).max(5),
	apiKey: z.string().min(1)
});

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

export const POST: RequestHandler = async ({ request, getClientAddress, locals }) => {
	try {
		if (!locals.user) {
			return json({ error: 'Authentication required' }, { status: 401 });
		}

		const body = await request.json();
		const parsed = generateSchema.safeParse(body);

		if (!parsed.success) {
			return json(
				{
					error: 'Invalid request',
					details: parsed.error.flatten().fieldErrors
				},
				{ status: 400 }
			);
		}

		const { prompt, name, models, apiKey } = parsed.data;

		// Rate limiting - simple in-memory implementation
		const clientIP = getClientAddress();
		const now = Date.now();
		const windowMs = 60 * 1000; // 1 minute
		const maxRequests = 3;

		if (!rateLimitStore.has(clientIP)) {
			rateLimitStore.set(clientIP, []);
		}

		const timestamps = rateLimitStore.get(clientIP)!;
		const recentRequests = timestamps.filter((t) => now - t < windowMs);

		if (recentRequests.length >= maxRequests) {
			return json({ error: 'Rate limit exceeded. Please try again later.' }, { status: 429 });
		}

		rateLimitStore.set(clientIP, [...recentRequests, now]);

		// Create generation record
		const generationId = crypto.randomUUID();

		// Insert generation into DB
		await db.insert(generations).values({
			id: generationId,
			name,
			prompt,
			userId: locals.user.id
		});

		const openrouter = createOpenRouter({ apiKey });

		const results: { modelId: string; success: boolean; error?: string }[] = [];

		// Generate sequentially for each model
		for (const modelId of models) {
			try {
				const result = await generateText({
					model: openrouter.chat(modelId),
					messages: [
						{ role: 'system', content: SYSTEM_PROMPT },
						{ role: 'user', content: prompt }
					]
				});

				let html = result.text;

				// Clean up - remove markdown code blocks if present
				html = html
					.replace(/^```html\s*/, '')
					.replace(/^```\s*$/, '')
					.trim();

				// Store generation item
				await db.insert(generationItems).values({
					id: crypto.randomUUID(),
					generationId,
					modelId,
					modelName: modelId,
					html
				});

				results.push({ modelId, success: true });
			} catch (modelError) {
				console.error(`Error generating with model ${modelId}:`, modelError);
				results.push({
					modelId,
					success: false,
					error: modelError instanceof Error ? modelError.message : 'Generation failed'
				});
			}
		}

		return json({ id: generationId, results });
	} catch (error) {
		console.error('Generation error:', error);
		return json(
			{ error: error instanceof Error ? error.message : 'Generation failed' },
			{ status: 500 }
		);
	}
};

// Simple in-memory rate limiting
const rateLimitStore = new Map<string, number[]>();

// Cleanup old entries periodically
setInterval(
	() => {
		const now = Date.now();
		const windowMs = 60 * 1000;

		for (const [ip, timestamps] of rateLimitStore) {
			const recent = timestamps.filter((t) => now - t < windowMs);
			if (recent.length === 0) {
				rateLimitStore.delete(ip);
			} else {
				rateLimitStore.set(ip, recent);
			}
		}
	},
	5 * 60 * 1000
); // Every 5 minutes
