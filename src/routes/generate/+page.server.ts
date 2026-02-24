import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url, fetch: globalFetch }) => {
	if (!locals.user) {
		const loginUrl = new URL('/login', url.origin);
		loginUrl.searchParams.set('redirect', url.pathname);
		throw redirect(302, loginUrl.toString());
	}

	try {
		const response = await globalFetch('/api/models');
		const result: { data?: unknown[] } = await response.json();
		return {
			models: result.data || []
		};
	} catch {
		return { models: [] };
	}
};
