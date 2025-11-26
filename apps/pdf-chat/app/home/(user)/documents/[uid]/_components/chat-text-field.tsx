export function ChatTextField({
  onSubmit,
  onInputChange,
  input,
  loading,
}: React.PropsWithChildren<{
  onSubmit: (content: string) => void;
  onInputChange: (value: string) => void;
  input: string;
  loading: boolean;
}>) {
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (input.trim() && !loading) {
      onSubmit(input.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className={'border-muted border-t p-4'}>
      <input
        disabled={loading}
        onChange={(e) => onInputChange(e.target.value)}
        value={input}
        placeholder="Ask your PDF anything and it will answer you."
        className={
          'bg-secondary/50 !min-h-[60px] w-full border px-4 shadow-sm' +
          ' focus:ring-none hover:bg-accent focus:bg-accent transition-all outline-none' +
          ' aria-disabled:opacity-50'
        }
      />
    </form>
  );
}
