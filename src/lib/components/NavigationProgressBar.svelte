<script lang="ts">
	import { navigating } from '$app/state';
	import { onMount } from 'svelte';

	let p = $state(0);
	let visible = $state(false);
	let opacity = $state(0);

	let interval: ReturnType<typeof setInterval> | null = null;
	let timeout: ReturnType<typeof setTimeout> | null = null;

	const start = () => {
		if (timeout) clearTimeout(timeout);
		if (interval) clearInterval(interval);

		p = 0;
		opacity = 1;
		visible = true;

		interval = setInterval(() => {
			if (p < 30) {
				p += Math.random() * 10;
			} else if (p < 70) {
				p += Math.random() * 2;
			} else if (p < 95) {
				p += Math.random() * 0.5;
			}
		}, 100);
	};

	const complete = () => {
		if (interval) clearInterval(interval);
		p = 100;

		timeout = setTimeout(() => {
			opacity = 0;
			timeout = setTimeout(() => {
				visible = false;
				p = 0;
			}, 300);
		}, 200);
	};

	$effect(() => {
		if (navigating.to) {
			start();
		} else {
			complete();
		}
	});

	onMount(() => {
		return () => {
			if (interval) clearInterval(interval);
			if (timeout) clearTimeout(timeout);
		};
	});
</script>

{#if visible}
	<div
		class="bg-primary fixed top-0 left-0 z-[100] h-0.5 transition-all duration-300 ease-out"
		style:width="{p}%"
		style:opacity
	></div>
{/if}

<style>
	.bg-primary {
		background-color: #10b981;
	}
</style>
