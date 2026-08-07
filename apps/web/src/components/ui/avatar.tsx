import { cn } from '@/lib/utils';

// Deterministic per-user gradient for initial avatars.
const AVATAR_GRADIENTS = [
  'from-indigo-500 to-violet-500',
  'from-violet-500 to-fuchsia-500',
  'from-fuchsia-500 to-rose-500',
  'from-sky-500 to-indigo-500',
  'from-emerald-500 to-teal-500',
  'from-amber-500 to-orange-500',
  'from-cyan-500 to-blue-500',
  'from-purple-500 to-indigo-500',
];

function hashName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function avatarGradient(name: string): string {
  return AVATAR_GRADIENTS[hashName(name) % AVATAR_GRADIENTS.length];
}

export function initials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

interface AvatarProps {
  name: string;
  src?: string | null;
  className?: string;
}

export function Avatar({ name, src, className }: AvatarProps) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        className={cn('h-8 w-8 rounded-full object-cover ring-2 ring-background', className)}
      />
    );
  }
  return (
    <div
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold text-white shadow-sm ring-2 ring-background',
        avatarGradient(name),
        className,
      )}
    >
      {initials(name)}
    </div>
  );
}
