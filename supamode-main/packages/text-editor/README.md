## Text Editor Plugin

This is a text editor built on top of [Lexical](https://lexical.dev/). It is inspired by Notion's text editor and is designed to be a simple and easy-to-use text editor.

It also allows you to use AI commands.

### Installation

Pull the plugin from the main repository:

```
npx @makerkit/cli@latest plugins install text-editor
```

Now, install the plugin from your main app by adding the following to your `package.json` file:

```json title="apps/web/package.json"
{
  "dependencies": {
    "@kit/text-editor": "workspace:*"
  }
}
```

And then run `pnpm install` to install the plugin.

### AI Routes

Add the following AI Routes to your Next.js API routes:

One route at `apps/web/app/api/editor/edit/route.ts`:

```ts
import { createAIEditRouteHandler } from '@kit/text-editor/server';

export const POST = createAIEditRouteHandler;
```

And another route at `apps/web/app/api/editor/autocomplete/route.ts`:

```ts
import { createAIAutocompleteRouteHandler } from '@kit/text-editor/server';

export const POST = createAIAutocompleteRouteHandler;
```

### Environment Variables

Make sure to add the variable `OPENAI_API_KEY` to your `.env.local` file to test locally, and make sure it's added to your production environment variables.

### Import the component

Now, you can import the component from the plugin:

```tsx
import { TextEditor } from '@kit/text-editor';
import '@kit/text-editor/style';
```

And use it in your app:

```tsx
<TextEditor />
```