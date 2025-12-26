import 'hono';

declare module 'hono' {
  export interface Env {
    Variables: {
      accessToken: string | undefined;
    };

    Bindings: object;
  }

  interface ContextVariableMap {
    accessToken: string | undefined;
  }

  interface ContextRenderer {
    (
      content: string | Promise<string>,
      head?: Head,
    ): Response | Promise<Response>;
  }
}
