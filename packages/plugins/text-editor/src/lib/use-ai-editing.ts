import { useMutation } from '@tanstack/react-query';

const AI_EDIT_ENDPOINT = process.env.AI_EDIT_ENDPOINT ?? '/api/editor/edit';

export function useAiEditing() {
  const mutationKey = ['ai-edit'];

  const mutationFn = async (params: {
    context: string;
    action: string;
    prompt?: string;
  }) => {
    const response = await fetch(AI_EDIT_ENDPOINT, {
      method: 'POST',
      body: JSON.stringify(params),
    });

    const json = (await response.json()) as { content: string };

    return json.content;
  };

  return useMutation({
    mutationKey,
    mutationFn,
  });
}
