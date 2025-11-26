import { z } from 'zod';

import { createAiEditorService } from './ai-editor-service';

export async function createAIEditRouteHandler(req: Request) {
  const { context, action, prompt } = await getBodySchema().parseAsync(
    await req.json(),
  );

  const editAction = getEditAction(action);
  const content = await editAction({ context, prompt });

  return new Response(JSON.stringify({ content }), {
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

export async function createAIAutocompleteRouteHandler(req: Request) {
  const json = await req.json();

  const { prompt: context } = await z
    .object({
      prompt: z.string().min(10),
    })
    .parseAsync(json);

  return createAiEditorService().completeParagraph({
    context,
  });
}

function getBodySchema() {
  return z.object({
    context: z.string().min(1),
    action: z.enum(['rewrite', 'grammar', 'custom']),
    prompt: z.string().min(1).optional(),
  });
}

export function getEditAction(action: string) {
  const service = createAiEditorService();

  return ({ context, prompt }: { context: string; prompt?: string }) => {
    switch (action) {
      case 'grammar':
        return service.correctGrammar({ context });

      case 'rewrite':
        return service.rewriteParagraph({ context });

      case 'custom':
        return service.customPromptEdit({ context, prompt: prompt ?? `` });
    }

    throw new Error(`Unknown action: ${action}`);
  };
}
