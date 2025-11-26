type Position = `bottom-left` | `bottom-right`;

interface Branding {
  primaryColor: string | undefined;
  accentColor: string | undefined;
  textColor: string | undefined;
}

export interface ChatbotSettings {
  title: string | undefined;
  position: Position;
  branding: Branding;
}
