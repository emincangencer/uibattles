import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import type { PageServerLoad } from './$types';
import { auth } from '$lib/server/auth';
import { sanitizeRedirectPath } from '$lib/utils';

export const load: PageServerLoad = async (event) => {
	const redirectTo = sanitizeRedirectPath(event.url.searchParams.get('redirect'));

	if (event.locals.user) {
		return redirect(302, redirectTo);
	}

	return {
		redirectTo
	};
};

export const actions: Actions = {
	signInSocial: async (event) => {
		const formData = await event.request.formData();
		const provider = formData.get('provider')?.toString() ?? 'google';
		const callbackURL = sanitizeRedirectPath(formData.get('callbackURL')?.toString());

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
