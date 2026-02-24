import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import type { PageServerLoad } from './$types';
import { auth } from '$lib/server/auth';

export const load: PageServerLoad = async (event) => {
	if (event.locals.user) {
		const redirectTo = event.url.searchParams.get('redirect') || '/';
		return redirect(302, redirectTo);
	}
	return {
		redirectTo: event.url.searchParams.get('redirect') || '/'
	};
};

export const actions: Actions = {
	signInSocial: async (event) => {
		const formData = await event.request.formData();
		const provider = formData.get('provider')?.toString() ?? 'google';
		const callbackURL = formData.get('callbackURL')?.toString() ?? '/';

		const result = await auth.api.signInSocial({
			body: {
				provider: provider as 'google',
				callbackURL
			}
		});

		if (result.url) {
			return redirect(302, result.url);
		}
		return fail(400, { message: 'Social sign-in failed' });
	}
};
