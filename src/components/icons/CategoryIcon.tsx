interface CategoryIconProps {
  category: 'social' | 'images' | 'broadcast' | 'cinema';
  size?: number;
  className?: string;
}

export default function CategoryIcon({ category, size = 18, className = '' }: CategoryIconProps) {
  const props = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
  };

  switch (category) {
    // Social — share/heart
    case 'social':
      return (
        <svg {...props}>
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <path d="M8.59 13.51l6.83 3.98" />
          <path d="M15.41 6.51l-6.82 3.98" />
        </svg>
      );

    // Images — photo icon
    case 'images':
      return (
        <svg {...props}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 15l5-5 4 4 3-3 6 6" />
          <circle cx="8.5" cy="8.5" r="1.5" />
        </svg>
      );

    // Broadcast — antenna
    case 'broadcast':
      return (
        <svg {...props}>
          <path d="M12 20V10" />
          <path d="M18 20H6" />
          <path d="M6 8l6-6 6 6" />
          <path d="M4 10c0-4.42 3.58-8 8-8s8 3.58 8 8" />
          <path d="M8 10a4 4 0 018 0" />
        </svg>
      );

    // Cinema — clapperboard
    case 'cinema':
      return (
        <svg {...props}>
          <path d="M20 20H4V8h16z" />
          <path d="M4 8l4-4 4 4 4-4 4 4" />
          <path d="M4 14h16" />
        </svg>
      );

    default:
      return null;
  }
}
