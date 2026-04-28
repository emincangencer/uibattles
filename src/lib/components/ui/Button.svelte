<script lang="ts">
	import type { Snippet } from 'svelte';

	type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive';
	type Size = 'sm' | 'md' | 'lg';

	interface Props {
		variant?: Variant;
		size?: Size;
		disabled?: boolean;
		type?: 'button' | 'submit' | 'reset';
		class?: string;
		children: Snippet;
		onclick?: (e: MouseEvent) => void;
		'aria-label'?: string;
		title?: string;
	}

	let {
		variant = 'primary',
		size = 'md',
		disabled = false,
		type = 'button',
		class: className = '',
		children,
		onclick,
		'aria-label': ariaLabel,
		title
	}: Props = $props();

	const variantClasses: Record<Variant, string> = {
		primary: 'bg-primary text-primary-foreground hover:bg-primary-hover',
		secondary: 'border border-border bg-surface-elevated hover:bg-border text-foreground',
		ghost: 'hover:bg-surface-elevated text-muted-foreground hover:text-foreground',
		destructive: 'border border-destructive/50 text-destructive hover:bg-destructive/10'
	};

	const sizeClasses: Record<Size, string> = {
		sm: 'px-2 py-1 text-xs gap-1',
		md: 'px-3 py-1.5 text-sm gap-2',
		lg: 'px-4 py-3 text-base gap-3'
	};
</script>

<button
	{type}
	{disabled}
	{onclick}
	aria-label={ariaLabel}
	{title}
	class="inline-flex items-center justify-center rounded-lg font-medium whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-50 {variantClasses[
		variant
	]} {sizeClasses[size]} {className}"
>
	{@render children()}
</button>
