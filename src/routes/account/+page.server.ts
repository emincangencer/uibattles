import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { user, account, session } from '$lib/server/db/auth.schema';
import { generations } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		const loginUrl = new URL('/login', url.origin);
		loginUrl.searchParams.set('redirect', url.pathname);
		throw redirect(302, loginUrl.toString());
	}

	return {
		user: {
			id: locals.user.id,
			name: locals.user.name,
			email: locals.user.email,
			image: locals.user.image,
			createdAt: locals.user.createdAt
		}
	};
};

export const actions: Actions = {
	updateProfile: async ({ request, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const name = (formData.get('name')?.toString() ?? '').trim();

		if (name.length === 0) {
			return fail(400, { error: 'Name is required', name });
		}

		if (name.length > 100) {
			return fail(400, { error: 'Name must be less than 100 characters', name });
		}

		try {
			await db.update(user).set({ name }).where(eq(user.id, locals.user.id));

			return { success: true, message: 'Profile updated successfully' };
		} catch (error) {
			console.error('Failed to update profile:', error);
			return fail(500, { error: 'Failed to update profile' });
		}
	},

	deleteAccount: async ({ request, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const confirmText = formData.get('confirmText')?.toString().trim() ?? '';

		if (confirmText !== 'DELETE') {
			return fail(400, { error: 'Please type DELETE to confirm' });
		}

		try {
			const userId = locals.user.id;

			await db.delete(session).where(eq(session.userId, userId));
			await db.delete(account).where(eq(account.userId, userId));
			await db.delete(generations).where(eq(generations.userId, userId));
			await db.delete(user).where(eq(user.id, userId));

			throw redirect(302, '/');
		} catch (error) {
			if (error instanceof Response && error.status === 302) {
				throw error;
			}
			console.error('Failed to delete account:', error);
			return fail(500, { error: 'Failed to delete account' });
		}
	}
};
