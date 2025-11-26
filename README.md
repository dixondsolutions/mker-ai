# AI Templates for Next.js Supabase

This repository contains the following Premium AI Templates:

1. PDF Chat
2. AI Avatars
3. Chatbots
4. Blog Writer
5. Kanban

Please always refer to the app's README for instructions on how to run and set up the application.

The root package.json contains shortcuts commands for running the applications:

```bash
pnpm run dev:pdf
pnpm run supabase:pdf:start
pnpm run supabase:pdf:stop

pnpm run dev:ai-avatars
pnpm run supabase:avatars:start
pnpm run supabase:avatars:stop
```

and so on.

If you're not interested in the other templates, simply delete the folders from `apps/`.

Below is the standard README for the Makerkit project.

## Updating the Makerkit

We use git subtree to pull changes from `apps/web` (the original app) into the other apps.

It works in the following way:

1. Pull the updates from the original app. This will update the `apps/web` folder and the `packages` folder.
2. The `packages` will be updated with the latest changes - but we need to push these changes to the other apps.
3. We use `pnpm run split:web` to push a remote branch with the contents of the `apps/web` folder.
4. We then pull the changes from the remote branch into the other apps.

### Pulling changes from the original app

First, pull the changes from the original app:

```bash
git pull upstream main
```

Then, we split the changes from the `apps/web` folder:

```bash
pnpm run split:web
```

Then, push the changes to the remote branch `web-branch`:

```bash
git push origin web-branch
```

Then, pull the changes from the remote branch into the other apps:

```bash
pnpm run update:kanban          # updates the kanban app
pnpm run update:pdf             # updates the pdf app
pnpm run update:avatars         # updates the avatars app
pnpm run update:chatbots        # updates the chatbots app
pnpm run update:blog-writer     # updates the blog-writer app
```

Resolve the conflicts if any and push the changes.

# Makerkit - Supabase SaaS Starter Kit - Turbo Edition

This is a Starter Kit for building SaaS applications using Supabase, Next.js, and Tailwind CSS.

A demo version of this project can be found at [makerkit/next-supabase-saas-kit-turbo-demo](https://github.com/makerkit/next-supabase-saas-kit-turbo-demo). This version contains a tasks functionality that is not present in the original version, multiple languages, and other various modifications.

[Please follow the documentation to get started](https://makerkit.dev/docs/next-supabase-turbo/introduction).

**Please remember to update the repository daily**.