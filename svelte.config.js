import adapter from '@sveltejs/adapter-auto';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter(),
		csp: {
			mode: 'auto',
			directives: {
				'default-src': ['self'],
				'connect-src': [
					'self',
					'https://api.iconify.design',
					'https://api.unisvg.com',
					'https://api.simplesvg.com'
				],
				'script-src': [
					'self',
					'unsafe-inline',
					'https://cdn.jsdelivr.net/npm/iconify-icon@3/dist/iconify-icon.min.js'
				],
				'style-src': ['self', 'unsafe-inline', 'https://fonts.googleapis.com'],
				'font-src': ['self', 'https://fonts.gstatic.com'],
				'img-src': ['self', 'data:', 'blob:'],
				'frame-src': ['self']
			}
		}
	}
};

export default config;
