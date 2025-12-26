import { cn } from '../lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '../shadcn/avatar';

type SessionProps = {
  displayName: string | null;
  pictureUrl?: string | null;
};

type TextProps = {
  text: string;
};

type ProfileAvatarProps = (SessionProps | TextProps) & {
  className?: string;
  fallbackClassName?: string;
};

export function ProfileAvatar(props: ProfileAvatarProps) {
  const avatarClassName = cn(
    props.className,
    'mx-auto h-9 w-9 group-focus:ring-2',
  );

  if ('text' in props) {
    return (
      <Avatar className={avatarClassName}>
        <AvatarFallback
          data-testid="profile-avatar-fallback"
          className={cn(props.fallbackClassName, 'uppercase')}
        >
          {props.text.slice(0, 1)}
        </AvatarFallback>
      </Avatar>
    );
  }

  const initials = props.displayName?.slice(0, 1);

  return (
    <Avatar className={avatarClassName}>
      <AvatarImage src={props.pictureUrl ?? undefined} />

      <AvatarFallback
        data-testid="profile-avatar-fallback"
        className={cn(props.fallbackClassName)}
      >
        <span suppressHydrationWarning className={'uppercase'}>
          {initials}
        </span>
      </AvatarFallback>
    </Avatar>
  );
}
