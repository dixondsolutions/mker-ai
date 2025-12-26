export function DropdownMenuIcon({ children }: React.PropsWithChildren) {
  return (
    <div
      className={
        'h-9 w-9 rounded-md border bg-white' +
        ' flex items-center justify-center p-1' +
        ' dark:bg-background'
      }
    >
      {children}
    </div>
  );
}

export function TextIcon() {
  return (
    <span className={'text-lg font-bold'}>
      <span>T</span>
    </span>
  );
}

export function HeadingIcon({ children }: React.PropsWithChildren) {
  return (
    <span className={'text-lg font-bold'}>
      <span>H</span>
      <span>{children}</span>
    </span>
  );
}

export function BulletListIcon() {
  return <span className={'text-lg font-bold'}>•</span>;
}

export function DecimalListIcon() {
  return (
    <span className={'text-lg font-bold'}>
      <span>1.</span>
    </span>
  );
}
