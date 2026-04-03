<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import Navbar from '$lib/components/Navbar.svelte';

	interface User {
		id: string;
		name: string;
		email: string;
		image: string | null;
	}

	let { children, data } = $props();
	let user = $derived(data.user as User | null);
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<div class="min-h-screen bg-zinc-950 text-zinc-100">
	<Navbar {user} />
	<main>
		{@render children()}
	</main>
</div>
