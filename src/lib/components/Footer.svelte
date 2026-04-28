<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<footer class="border-t border-border bg-surface/30 px-4 py-12 md:px-6">
	<div class="mx-auto max-w-7xl">
		<div class="grid gap-10 md:grid-cols-[minmax(0,1.6fr)_minmax(0,0.75fr)_minmax(0,0.75fr)]">
			<div class="max-w-sm">
				<a href={resolve('/')} class="text-xl font-bold tracking-tight">
					UI<span class="text-primary">Battles</span>
				</a>
				<p class="mt-3 max-w-xs text-sm text-muted-foreground">
					See how different AI models build the same UI
				</p>
			</div>

			<div>
				<h3 class="mb-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
					Product
				</h3>
				<ul class="space-y-2">
					<li>
						<a
							href={resolve('/generate')}
							class="text-sm text-muted-foreground transition-colors hover:text-muted"
						>
							Generate
						</a>
					</li>
					<li>
						<a
							href={resolve('/')}
							class="text-sm text-muted-foreground transition-colors hover:text-muted"
						>
							Home
						</a>
					</li>
				</ul>
			</div>

			<div>
				<h3 class="mb-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
					Community
				</h3>
				<ul class="space-y-2">
					<li>
						<a
							href="https://github.com/emincangencer/uibattles"
							target="_blank"
							rel="noopener noreferrer"
							class="text-sm text-muted-foreground transition-colors hover:text-muted"
						>
							GitHub
						</a>
					</li>
				</ul>
			</div>
		</div>

		<div
			class="mt-10 flex flex-col gap-4 border-t border-border pt-6 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between"
		>
			<p>© {new Date().getFullYear()} UI Battles</p>
			<div class="flex gap-6">
				<a href={resolve('/terms')} class="transition-colors hover:text-muted-foreground">Terms</a>
				<a href={resolve('/privacy')} class="transition-colors hover:text-muted-foreground"
					>Privacy</a
				>
			</div>
		</div>
	</div>
</footer>
