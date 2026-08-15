import React from 'react';

export interface ZodiacIconProps {
  style?: React.CSSProperties;
  className?: string;
  width?: number | string;
  height?: number | string;
  size?: number | string;
}

const DASHA_SIGN_MAP: Record<string, string> = {
  sun: 'leo',
  surya: 'leo',
  moon: 'cancer',
  chandra: 'cancer',
  mars: 'aries',
  mangal: 'aries',
  mercury: 'gemini',
  budh: 'gemini',
  jupiter: 'sagittarius',
  guru: 'sagittarius',
  venus: 'taurus',
  shukra: 'taurus',
  saturn: 'capricorn',
  shani: 'capricorn',
  rahu: 'aquarius',
  ketu: 'scorpio',
};

export const ZodiacImg = ({
  sign,
  style,
  className,
  width,
  height,
  size = 24,
}: ZodiacIconProps & { sign: string }) => {
  const w = width ?? size;
  const h = height ?? size;
  const slug = sign?.toLowerCase().trim() || 'aries';

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/zodiacs/${slug}.png`}
      alt={sign}
      width={typeof w === 'number' ? w : undefined}
      height={typeof h === 'number' ? h : undefined}
      className={className}
      style={{
        width: typeof w === 'number' ? `${w}px` : w,
        height: typeof h === 'number' ? `${h}px` : h,
        borderRadius: '50%',
        objectFit: 'cover',
        display: 'inline-block',
        verticalAlign: 'middle',
        border: '1.5px solid rgba(228, 178, 92, 0.45)',
        boxShadow: '0 0 8px rgba(228, 178, 92, 0.35)',
        ...style,
      }}
    />
  );
};

/** Unified dynamic Zodiac Sign Icon component */
export const SignIcon = ({ sign, ...props }: ZodiacIconProps & { sign?: string }) => {
  if (!sign) return null;
  return <ZodiacImg sign={sign} {...props} />;
};

/** Unified dynamic Dasha Lord Icon component mapped to ruling zodiac sign */
export const DashaIcon = ({ dasha, ...props }: ZodiacIconProps & { dasha?: string }) => {
  if (!dasha) return null;
  const key = dasha.toLowerCase().trim();
  const sign = DASHA_SIGN_MAP[key] || 'leo';
  return <ZodiacImg sign={sign} {...props} />;
};

export const Aries       = (p: ZodiacIconProps) => <ZodiacImg sign="aries"       {...p} />;
export const Taurus      = (p: ZodiacIconProps) => <ZodiacImg sign="taurus"      {...p} />;
export const Gemini      = (p: ZodiacIconProps) => <ZodiacImg sign="gemini"      {...p} />;
export const Cancer      = (p: ZodiacIconProps) => <ZodiacImg sign="cancer"      {...p} />;
export const Leo         = (p: ZodiacIconProps) => <ZodiacImg sign="leo"         {...p} />;
export const Virgo       = (p: ZodiacIconProps) => <ZodiacImg sign="virgo"       {...p} />;
export const Libra       = (p: ZodiacIconProps) => <ZodiacImg sign="libra"       {...p} />;
export const Scorpio     = (p: ZodiacIconProps) => <ZodiacImg sign="scorpio"     {...p} />;
export const Sagittarius = (p: ZodiacIconProps) => <ZodiacImg sign="sagittarius" {...p} />;
export const Capricorn   = (p: ZodiacIconProps) => <ZodiacImg sign="capricorn"   {...p} />;
export const Aquarius    = (p: ZodiacIconProps) => <ZodiacImg sign="aquarius"    {...p} />;
export const Pisces      = (p: ZodiacIconProps) => <ZodiacImg sign="pisces"      {...p} />;

export const SIGN_ICONS = [
  Aries,
  Taurus,
  Gemini,
  Cancer,
  Leo,
  Virgo,
  Libra,
  Scorpio,
  Sagittarius,
  Capricorn,
  Aquarius,
  Pisces,
];


