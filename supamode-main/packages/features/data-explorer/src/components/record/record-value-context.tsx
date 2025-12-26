import { createContext, useContext } from 'react';

const RecordValueContext = createContext<Record<string, unknown>>({});

export function RecordValueProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: Record<string, unknown> | undefined;
}) {
  return (
    <RecordValueContext.Provider value={value || {}}>
      {children}
    </RecordValueContext.Provider>
  );
}

export function useRecordValue() {
  return useContext(RecordValueContext);
}
