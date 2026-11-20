import { useEffect, useState } from 'react';
import { Shirt } from 'lucide-react';

interface ResilientImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackTitle?: string;
  loading?: 'eager' | 'lazy';
  decoding?: 'sync' | 'async' | 'auto';
  fetchPriority?: 'high' | 'low' | 'auto';
}

export function ResilientImage({
  src,
  alt,
  className = '',
  fallbackTitle,
  loading = 'eager',
  decoding = 'sync',
  fetchPriority,
}: ResilientImageProps) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  if (hasError || !src) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#F5EBD9] via-[#EAD9BE] to-[#DCC39E] dark:from-[#261911] dark:via-[#1F140D] dark:to-[#170F0A] text-[#5E402A] dark:text-[#D4BEA1] p-4 ${className}`}
      >
        <Shirt className="w-7 h-7 stroke-[1.25] text-[#B45309] dark:text-[#E5B54F] opacity-75 mb-2" aria-hidden="true" />
        <span className="text-xs font-medium tracking-wide text-center line-clamp-2">
          {fallbackTitle || alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={loading}
      decoding={decoding}
      fetchPriority={fetchPriority}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={className}
    />
  );
}
