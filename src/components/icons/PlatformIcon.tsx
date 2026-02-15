interface PlatformIconProps {
  platform: string;
  size?: number;
  className?: string;
}

export default function PlatformIcon({ platform, size = 24, className = '' }: PlatformIconProps) {
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

  switch (platform) {
    // Instagram Reels — camera/video icon
    case 'ig_reels':
      return (
        <svg {...props}>
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <path d="M8 21h8" />
          <path d="M12 17v4" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      );

    // Instagram Post — square frame
    case 'ig_post':
      return (
        <svg {...props}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
        </svg>
      );

    // Instagram Story — story ring
    case 'ig_story':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" strokeDasharray="3 2" />
          <circle cx="12" cy="12" r="5" />
          <path d="M12 9v6" />
          <path d="M9 12h6" />
        </svg>
      );

    // TikTok — music note
    case 'tiktok':
      return (
        <svg {...props}>
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
      );

    // YouTube Shorts — vertical phone with play
    case 'yt_shorts':
      return (
        <svg {...props}>
          <rect x="6" y="2" width="12" height="20" rx="2" />
          <polygon points="10 9 16 12 10 15" fill="currentColor" stroke="none" />
        </svg>
      );

    // YouTube — play button
    case 'youtube':
      return (
        <svg {...props}>
          <rect x="2" y="4" width="20" height="16" rx="3" />
          <polygon points="10 8 16 12 10 16" fill="currentColor" stroke="none" />
        </svg>
      );

    // MXF PAL / NTSC — broadcast signal
    case 'mxf_pal':
    case 'mxf_ntsc':
      return (
        <svg {...props}>
          <rect x="4" y="6" width="16" height="12" rx="1" />
          <path d="M8 18h8" />
          <path d="M12 18v3" />
          <path d="M2 3l3 3" />
          <path d="M22 3l-3 3" />
          <path d="M5 1l2 2" />
          <path d="M19 1l-2 2" />
        </svg>
      );

    // Cinema / Netflix — film strip
    case 'cinema':
      return (
        <svg {...props}>
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="M2 8h20" />
          <path d="M2 16h20" />
          <path d="M6 4v4" />
          <path d="M10 4v4" />
          <path d="M14 4v4" />
          <path d="M18 4v4" />
          <path d="M6 16v4" />
          <path d="M10 16v4" />
          <path d="M14 16v4" />
          <path d="M18 16v4" />
        </svg>
      );

    // DCP — film reel
    case 'dcp':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="3" />
          <circle cx="12" cy="5" r="1" fill="currentColor" stroke="none" />
          <circle cx="18" cy="9.5" r="1" fill="currentColor" stroke="none" />
          <circle cx="18" cy="14.5" r="1" fill="currentColor" stroke="none" />
          <circle cx="12" cy="19" r="1" fill="currentColor" stroke="none" />
          <circle cx="6" cy="14.5" r="1" fill="currentColor" stroke="none" />
          <circle cx="6" cy="9.5" r="1" fill="currentColor" stroke="none" />
        </svg>
      );

    // IG Post Image — image frame with square
    case 'ig_post_image':
      return (
        <svg {...props}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 15l5-5 4 4 3-3 6 6" />
          <circle cx="8.5" cy="8.5" r="1.5" />
        </svg>
      );

    // IG Story Image — vertical image
    case 'ig_story_image':
      return (
        <svg {...props}>
          <rect x="5" y="2" width="14" height="20" rx="2" />
          <path d="M5 16l4-4 3 3 4-4" />
          <circle cx="9" cy="8" r="1.5" />
        </svg>
      );

    // IG Reels Cover — thumbnail image
    case 'ig_reels_cover':
      return (
        <svg {...props}>
          <rect x="5" y="2" width="14" height="20" rx="2" />
          <polygon points="10 10 16 13 10 16" fill="currentColor" stroke="none" />
          <path d="M5 18h14" />
        </svg>
      );

    // Facebook Cover — wide landscape image
    case 'fb_cover':
      return (
        <svg {...props}>
          <rect x="2" y="6" width="20" height="12" rx="2" />
          <path d="M2 14l5-4 4 3 5-4 6 5" />
          <circle cx="7" cy="10" r="1.5" />
        </svg>
      );

    // LinkedIn Banner — wide horizontal banner
    case 'linkedin_banner':
      return (
        <svg {...props}>
          <rect x="2" y="7" width="20" height="10" rx="2" />
          <path d="M7 12h4" />
          <path d="M13 10v4" />
          <path d="M16 12h2" />
        </svg>
      );

    default:
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v4l3 3" />
        </svg>
      );
  }
}
