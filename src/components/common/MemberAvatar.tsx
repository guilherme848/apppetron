import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User } from 'lucide-react';
import { getProfilePhotoUrl } from '@/types/team';
import { cn } from '@/lib/utils';

interface MemberAvatarProps {
  name: string | null;
  photoPath: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-16 w-16 text-lg',
  xl: 'h-24 w-24 text-2xl',
};

const iconSizes = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12',
};

export function MemberAvatar({ name, photoPath, size = 'md', className }: MemberAvatarProps) {
  const photoUrl = getProfilePhotoUrl(photoPath);
  
  const getInitials = (name: string | null): string => {
    if (!name) return '';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      {photoUrl && <AvatarImage src={photoUrl} alt={name || 'Avatar'} />}
      <AvatarFallback className="bg-muted">
        {name ? (
          getInitials(name)
        ) : (
          <User className={iconSizes[size]} />
        )}
      </AvatarFallback>
    </Avatar>
  );
}
