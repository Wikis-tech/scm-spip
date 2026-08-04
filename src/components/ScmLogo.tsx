import React from 'react';

interface ScmLogoProps {
  variant?: 'color' | 'light' | 'dark' | 'white';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

export const ScmLogo: React.FC<ScmLogoProps> = ({
  variant = 'color',
  size = 'md',
  showText = true,
  className = '',
}) => {
  // Determine dimensions
  const dimensions = {
    sm: { svg: 'w-7 h-7', text: 'text-xs text-[10px]' },
    md: { svg: 'w-9 h-9', text: 'text-base text-[11px]' },
    lg: { svg: 'w-12 h-12', text: 'text-lg text-xs' },
    xl: { svg: 'w-16 h-16', text: 'text-2xl text-sm' },
  }[size];

  // Colors based on variant
  const logoColors = {
    color: {
      primary: '#b1191f', // SCM Red
      accent: '#fce4ec',  // Secondary Pale Red/Pink
      textMain: 'text-slate-900',
      textSub: 'text-slate-400',
    },
    light: {
      primary: '#b1191f',
      accent: '#fce4ec',
      textMain: 'text-slate-100',
      textSub: 'text-slate-400',
    },
    dark: {
      primary: '#1e293b',
      accent: '#475569',
      textMain: 'text-slate-900',
      textSub: 'text-slate-500',
    },
    white: {
      primary: '#ffffff',
      accent: 'rgba(255,255,255,0.2)',
      textMain: 'text-white',
      textSub: 'text-white/70',
    },
  }[variant];

  // Define the SCM spherical dots coordinate mapping to replicate the official logo
  const dots: Array<{ cx: number; cy: number; r: number; color: 'white' | 'peach' }> = [
    // Column 1 (Leftmost, small peach dots)
    { cx: 14.2, cy: 25.3, r: 1.1, color: 'peach' },
    { cx: 10.8, cy: 31.8, r: 1.3, color: 'peach' },
    { cx: 8.5, cy: 39.5, r: 1.5, color: 'peach' },
    { cx: 7.7, cy: 47.9, r: 1.5, color: 'peach' },
    { cx: 8.8, cy: 56.4, r: 1.4, color: 'peach' },
    { cx: 11.8, cy: 64.9, r: 1.3, color: 'peach' },
    { cx: 16.5, cy: 72.8, r: 1.2, color: 'peach' },

    // Column 2 (Second column from left, peach dots)
    { cx: 20.2, cy: 29.8, r: 1.5, color: 'peach' },
    { cx: 17.2, cy: 38.6, r: 1.8, color: 'peach' },
    { cx: 14.8, cy: 48.4, r: 2.1, color: 'peach' },
    { cx: 13.8, cy: 59.0, r: 2.2, color: 'peach' },
    { cx: 14.4, cy: 69.4, r: 2.1, color: 'peach' },
    { cx: 17.3, cy: 78.5, r: 1.8, color: 'peach' },

    // Column 3 (Third column, peach dots)
    { cx: 31.8, cy: 29.8, r: 1.8, color: 'peach' },
    { cx: 28.2, cy: 39.5, r: 2.2, color: 'peach' },
    { cx: 25.0, cy: 50.1, r: 2.6, color: 'peach' },
    { cx: 22.2, cy: 61.4, r: 2.8, color: 'peach' },
    { cx: 21.0, cy: 72.5, r: 2.8, color: 'peach' },
    { cx: 22.0, cy: 82.5, r: 2.5, color: 'peach' },

    // Column 4 (Fourth column, peach dots)
    { cx: 37.5, cy: 40.5, r: 2.5, color: 'peach' },
    { cx: 34.0, cy: 52.0, r: 3.1, color: 'peach' },
    { cx: 31.0, cy: 64.2, r: 3.5, color: 'peach' },
    { cx: 29.8, cy: 76.5, r: 3.6, color: 'peach' },
    { cx: 31.2, cy: 87.4, r: 3.2, color: 'peach' },

    // Column 5 (Left bottom white dots)
    { cx: 41.5, cy: 66.8, r: 4.8, color: 'white' },
    { cx: 39.8, cy: 80.2, r: 5.2, color: 'white' },
    { cx: 41.4, cy: 91.8, r: 4.5, color: 'white' },

    // Column 6 (Center white dots)
    { cx: 56.4, cy: 46.5, r: 4.5, color: 'white' },
    { cx: 50.4, cy: 59.4, r: 5.8, color: 'white' },
    { cx: 45.4, cy: 73.5, r: 6.8, color: 'white' },
    { cx: 42.4, cy: 86.8, r: 7.2, color: 'white' },
    { cx: 44.4, cy: 97.2, r: 6.2, color: 'white' },

    // Column 7 (Center right white dots)
    { cx: 61.8, cy: 37.2, r: 4.8, color: 'white' },
    { cx: 66.4, cy: 50.2, r: 6.1, color: 'white' },
    { cx: 60.5, cy: 65.1, r: 7.3, color: 'white' },
    { cx: 54.8, cy: 80.2, r: 8.0, color: 'white' },
    { cx: 51.5, cy: 93.4, r: 7.5, color: 'white' },

    // Column 8 (Right middle white dots)
    { cx: 68.2, cy: 20.3, r: 3.2, color: 'white' },
    { cx: 64.6, cy: 29.8, r: 4.2, color: 'white' },
    { cx: 74.8, cy: 41.2, r: 5.4, color: 'white' },
    { cx: 71.2, cy: 56.4, r: 6.9, color: 'white' },
    { cx: 66.0, cy: 71.8, r: 7.8, color: 'white' },
    { cx: 60.2, cy: 86.2, r: 8.0, color: 'white' },
    { cx: 56.5, cy: 96.8, r: 6.8, color: 'white' },

    // Column 9 (Right outer white dots)
    { cx: 79.4, cy: 22.4, r: 3.0, color: 'white' },
    { cx: 86.6, cy: 31.8, r: 4.1, color: 'white' },
    { cx: 83.2, cy: 46.5, r: 5.4, color: 'white' },
    { cx: 79.2, cy: 61.8, r: 6.8, color: 'white' },
    { cx: 73.8, cy: 76.5, r: 7.6, color: 'white' },
    { cx: 67.5, cy: 89.4, r: 7.5, color: 'white' },

    // Column 10 (Rightmost white dots)
    { cx: 93.4, cy: 43.1, r: 2.8, color: 'white' },
    { cx: 90.2, cy: 57.5, r: 4.1, color: 'white' },
    { cx: 85.8, cy: 71.8, r: 5.4, color: 'white' },
    { cx: 80.5, cy: 85.0, r: 6.2, color: 'white' },
    { cx: 74.5, cy: 95.8, r: 5.8, color: 'white' },

    // Rim white dots
    { cx: 81.8, cy: 37.0, r: 4.5, color: 'white' },
    { cx: 70.8, cy: 33.2, r: 4.4, color: 'white' },
  ];

  // Colors mapping for the specific dots based on theme variants
  const getDotColor = (dotColorType: 'white' | 'peach') => {
    if (variant === 'white') {
      return dotColorType === 'white' ? '#ffffff' : 'rgba(255, 255, 255, 0.7)';
    }
    if (variant === 'dark') {
      return dotColorType === 'white' ? '#1e293b' : '#94a3b8';
    }
    // Solid colored globe
    return dotColorType === 'white' ? '#ffffff' : '#fbcfe8'; // White and pale peach matching original logo
  };

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Real SCM Globe Logo Badge */}
      <svg
        className={`${dimensions.svg} shrink-0`}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Rounded badge backing standard with SCM institutional red, or transparent for monotone variants */}
        <rect
          width="100"
          height="100"
          rx="18"
          fill={variant === 'white' ? 'transparent' : variant === 'dark' ? '#f1f5f9' : '#b1191f'}
        />

        {/* Outer subtle ring border to add depth to the logo emblem */}
        <rect
          x="2"
          y="2"
          width="96"
          height="96"
          rx="16"
          stroke={variant === 'white' ? 'rgba(255,255,255,0.2)' : variant === 'dark' ? 'rgba(30,41,59,0.1)' : 'rgba(255,255,255,0.15)'}
          strokeWidth="1.5"
        />

        {/* Render precise SCM 3D Globe circle arrays */}
        {dots.map((dot, index) => (
          <circle
            key={index}
            cx={dot.cx}
            cy={dot.cy}
            r={dot.r}
            fill={getDotColor(dot.color)}
          />
        ))}
      </svg>

      {/* SCM Branding Typography */}
      {showText && (
        <div className="flex flex-col">
          <span className={`font-display font-black tracking-tight leading-tight ${dimensions.text.split(' ')[0]} ${logoColors.textMain}`}>
            SCM CAPITAL
          </span>
          <span className={`font-mono font-bold tracking-widest uppercase block ${dimensions.text.split(' ')[1]} ${logoColors.textSub}`}>
            ASSET MANAGEMENT
          </span>
        </div>
      )}
    </div>
  );
};
