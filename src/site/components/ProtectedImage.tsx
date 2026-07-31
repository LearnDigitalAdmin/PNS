import type { CSSProperties } from 'react';

export default function ProtectedImage({
  src,
  alt,
  className,
  style,
  onClick,
}: {
  src: string;
  alt?: string;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
}) {
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={{ userSelect: 'none', WebkitUserSelect: 'none', ...style }}
      draggable={false}
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
      onClick={onClick}
    />
  );
}
