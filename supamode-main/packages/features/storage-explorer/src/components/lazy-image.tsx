import { cn } from '@kit/ui/utils';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackClassName?: string;
}

export function LazyImage({ src, alt, className }: LazyImageProps) {
  return (
    <div className={cn('relative h-full w-full overflow-hidden', className)}>
      <img
        src={src}
        alt={alt}
        className={cn('h-full w-full object-contain')}
        loading="lazy"
        decoding="async"
      />
    </div>
  );
}
