export function LoadingBubble() {
  const dotClassName = `rounded-full bg-muted h-2.5 w-2.5`;

  return (
    <div
      className={
        'animate-in slide-in-from-bottom-12 mt-4 py-4 duration-1000 ease-out'
      }
    >
      <div className={'flex animate-bounce space-x-1 duration-750'}>
        <div className={dotClassName} />
        <div className={dotClassName} />
        <div className={dotClassName} />
      </div>
    </div>
  );
}
