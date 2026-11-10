import React, { useEffect, useMemo, useState } from 'react';
import { getAvatarUrl } from '../../lib/upload';

export interface UserAvatarProps {
  name?: string;
  initials?: string | null;
  avatarUrl?: string | null;
  className?: string;
  fallbackClassName?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  name = 'Usuário',
  initials,
  avatarUrl,
  className = '',
  fallbackClassName = '',
}) => {
  const [imageLoadFailed, setImageLoadFailed] = useState(false);
  const normalizedAvatarUrl = useMemo(() => getAvatarUrl(avatarUrl), [avatarUrl]);

  useEffect(() => {
    setImageLoadFailed(false);
  }, [normalizedAvatarUrl]);

  if (normalizedAvatarUrl && !imageLoadFailed) {
    return (
      <img
        src={normalizedAvatarUrl}
        alt={name}
        className={`rounded-full object-cover border border-gray-200 ${className}`.trim()}
        onError={() => setImageLoadFailed(true)}
      />
    );
  }

  return (
    <div
      aria-label={`Avatar de ${name}`}
      className={`rounded-full flex items-center justify-center text-white font-bold ${className} ${fallbackClassName}`.trim()}
    >
      {initials?.trim() || '??'}
    </div>
  );
};
