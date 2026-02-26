<script lang="ts">
	import { enhance } from '$app/forms';
	let { data, form } = $props();

	let deleteConfirmText = $state('');
	let showDeleteModal = $state(false);
	let activeTab = $state<'profile' | 'danger'>('profile');
	let profileSaving = $state(false);
	let deleting = $state(false);

	function formatDate(date: Date | string | undefined): string {
		if (!date) return 'N/A';
		const d = typeof date === 'string' ? new Date(date) : date;
		return d.toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}
</script>

<svelte:head>
	<title>Account - UI Battles</title>
</svelte:head>

<div class="min-h-screen bg-zinc-950 px-4 py-8">
	<div class="mx-auto max-w-2xl">
		<h1 class="mb-8 text-3xl font-bold text-zinc-100">Account Settings</h1>

		<div class="mb-6 flex gap-2 border-b border-zinc-800">
			<button
				class="rounded-t-lg px-4 py-2 text-sm font-medium transition-colors {activeTab === 'profile'
					? 'border-b-2 border-emerald-500 text-emerald-400'
					: 'text-zinc-400 hover:text-zinc-200'}"
				onclick={() => (activeTab = 'profile')}
			>
				Profile
			</button>
			<button
				class="rounded-t-lg px-4 py-2 text-sm font-medium transition-colors {activeTab === 'danger'
					? 'border-b-2 border-red-500 text-red-400'
					: 'text-zinc-400 hover:text-zinc-200'}"
				onclick={() => (activeTab = 'danger')}
			>
				Danger Zone
			</button>
		</div>

		{#if activeTab === 'profile'}
			<div class="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
				<h2 class="mb-4 text-xl font-semibold text-zinc-100">Profile Information</h2>

				<div class="mb-6 flex items-center gap-4">
					{#if data.user.image}
						<img
							src={data.user.image}
							alt={data.user.name}
							class="h-20 w-20 rounded-full object-cover"
						/>
					{:else}
						<div
							class="flex h-20 w-20 items-center justify-center rounded-full bg-zinc-800 text-2xl font-bold text-zinc-400"
						>
							{data.user.name?.charAt(0).toUpperCase() || 'U'}
						</div>
					{/if}
					<div class="text-sm text-zinc-400">
						<p>Joined: {formatDate(data.user.createdAt)}</p>
					</div>
				</div>

				<form
					method="post"
					action="?/updateProfile"
					use:enhance={() => {
						profileSaving = true;
						return async ({ update }) => {
							await update();
							profileSaving = false;
						};
					}}
					class="space-y-4"
				>
					<div>
						<label for="name" class="mb-1 block text-sm font-medium text-zinc-300">Name</label>
						<input
							type="text"
							id="name"
							name="name"
							value={(form as { name?: string })?.name ?? data.user.name}
							required
							class="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-zinc-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
						/>
					</div>

					<div>
						<label for="email" class="mb-1 block text-sm font-medium text-zinc-300">Email</label>
						<input
							type="email"
							id="email"
							value={data.user.email}
							disabled
							class="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-2 text-zinc-400"
						/>
						<p class="mt-1 text-xs text-zinc-500">Email cannot be changed</p>
					</div>

					{#if form?.success && form?.message}
						<p class="text-sm text-emerald-400">{form.message}</p>
					{/if}
					{#if form?.error}
						<p class="text-sm text-red-400">{form.error}</p>
					{/if}

					<button
						type="submit"
						disabled={profileSaving}
						class="rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{profileSaving ? 'Saving...' : 'Save Changes'}
					</button>
				</form>
			</div>
		{/if}

		{#if activeTab === 'danger'}
			<div class="rounded-xl border border-red-900/50 bg-zinc-900 p-6">
				<h2 class="mb-4 text-xl font-semibold text-red-400">Delete Account</h2>
				<p class="mb-4 text-zinc-400">
					Once you delete your account, there is no going back. Please be certain. All your
					generations, likes, and data will be permanently deleted.
				</p>

				{#if !showDeleteModal}
					<button
						onclick={() => (showDeleteModal = true)}
						class="rounded-lg bg-red-600 px-4 py-2 font-medium text-white transition hover:bg-red-500"
					>
						Delete Account
					</button>
				{:else}
					<div class="rounded-lg border border-red-800 bg-red-950/30 p-4">
						<p class="mb-3 text-sm text-red-300">
							Type <strong>DELETE</strong> to confirm account deletion
						</p>
						<form
							method="post"
							action="?/deleteAccount"
							use:enhance={() => {
								deleting = true;
								return async ({ update }) => {
									await update();
									deleting = false;
								};
							}}
						>
							<input
								type="text"
								name="confirmText"
								bind:value={deleteConfirmText}
								placeholder="DELETE"
								class="mb-3 w-full rounded-lg border border-red-800 bg-zinc-800 px-4 py-2 text-zinc-100 focus:border-red-500 focus:outline-none"
							/>
							<div class="flex gap-2">
								<button
									type="submit"
									disabled={deleteConfirmText !== 'DELETE' || deleting}
									class="rounded-lg bg-red-600 px-4 py-2 font-medium text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
								>
									{deleting ? 'Deleting...' : 'Confirm Delete'}
								</button>
								<button
									type="button"
									onclick={() => {
										showDeleteModal = false;
										deleteConfirmText = '';
									}}
									class="rounded-lg border border-zinc-700 bg-transparent px-4 py-2 font-medium text-zinc-300 transition hover:bg-zinc-800"
								>
									Cancel
								</button>
							</div>
						</form>
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>
