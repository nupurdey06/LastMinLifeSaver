export interface Theme {
  id: string;
  name: string;
  primaryBg: string;
  primaryText: string;
  primaryHover: string;
  primaryFocus: string;
  primaryBorder: string;
  primaryLightBg: string;
  primaryLightText: string;
  primaryLightBorder: string;
  gradientFromTo: string;
  bannerGradient: string;
  textMuted: string;
  accentBadge: string;
}

export const THEMES: Record<string, Theme> = {
  slate: {
    id: 'slate',
    name: 'Cosmic Slate (Indigo)',
    primaryBg: 'bg-indigo-600',
    primaryText: 'text-indigo-600',
    primaryHover: 'hover:bg-indigo-700',
    primaryFocus: 'focus:ring-indigo-500',
    primaryBorder: 'border-indigo-100',
    primaryLightBg: 'bg-indigo-50',
    primaryLightText: 'text-indigo-700',
    primaryLightBorder: 'border-indigo-200',
    gradientFromTo: 'from-indigo-50/50 to-blue-50/50',
    bannerGradient: 'from-indigo-900 to-indigo-800',
    textMuted: 'text-indigo-400',
    accentBadge: 'bg-indigo-100 text-indigo-700'
  },
  sage: {
    id: 'sage',
    name: 'Eucalyptus Sage (Green)',
    primaryBg: 'bg-teal-600',
    primaryText: 'text-teal-600',
    primaryHover: 'hover:bg-teal-700',
    primaryFocus: 'focus:ring-teal-500',
    primaryBorder: 'border-teal-100',
    primaryLightBg: 'bg-teal-50',
    primaryLightText: 'text-teal-700',
    primaryLightBorder: 'border-teal-200',
    gradientFromTo: 'from-teal-50/50 to-emerald-50/50',
    bannerGradient: 'from-teal-900 to-emerald-800',
    textMuted: 'text-teal-400',
    accentBadge: 'bg-teal-100 text-teal-700'
  },
  lavender: {
    id: 'lavender',
    name: 'Calming Lavender (Violet)',
    primaryBg: 'bg-violet-600',
    primaryText: 'text-violet-600',
    primaryHover: 'hover:bg-violet-700',
    primaryFocus: 'focus:ring-violet-500',
    primaryBorder: 'border-violet-100',
    primaryLightBg: 'bg-violet-50',
    primaryLightText: 'text-violet-700',
    primaryLightBorder: 'border-violet-200',
    gradientFromTo: 'from-violet-50/50 to-purple-50/50',
    bannerGradient: 'from-violet-900 to-purple-800',
    textMuted: 'text-violet-400',
    accentBadge: 'bg-violet-100 text-violet-700'
  },
  emerald: {
    id: 'emerald',
    name: 'Forest Mint (Green)',
    primaryBg: 'bg-emerald-600',
    primaryText: 'text-emerald-600',
    primaryHover: 'hover:bg-emerald-700',
    primaryFocus: 'focus:ring-emerald-500',
    primaryBorder: 'border-emerald-100',
    primaryLightBg: 'bg-emerald-50',
    primaryLightText: 'text-emerald-700',
    primaryLightBorder: 'border-emerald-200',
    gradientFromTo: 'from-emerald-50/50 to-teal-50/50',
    bannerGradient: 'from-emerald-900 to-teal-800',
    textMuted: 'text-emerald-400',
    accentBadge: 'bg-emerald-100 text-emerald-700'
  },
  amber: {
    id: 'amber',
    name: 'Sunset Terracotta (Amber)',
    primaryBg: 'bg-amber-600',
    primaryText: 'text-amber-600',
    primaryHover: 'hover:bg-amber-700',
    primaryFocus: 'focus:ring-amber-500',
    primaryBorder: 'border-amber-100',
    primaryLightBg: 'bg-amber-50',
    primaryLightText: 'text-amber-700',
    primaryLightBorder: 'border-amber-200',
    gradientFromTo: 'from-amber-50/50 to-orange-50/50',
    bannerGradient: 'from-amber-900 to-orange-800',
    textMuted: 'text-amber-400',
    accentBadge: 'bg-amber-100 text-amber-700'
  },
  rose: {
    id: 'rose',
    name: 'Nordic Crimson (Rose)',
    primaryBg: 'bg-rose-600',
    primaryText: 'text-rose-600',
    primaryHover: 'hover:bg-rose-700',
    primaryFocus: 'focus:ring-rose-500',
    primaryBorder: 'border-rose-100',
    primaryLightBg: 'bg-rose-50',
    primaryLightText: 'text-rose-700',
    primaryLightBorder: 'border-rose-200',
    gradientFromTo: 'from-rose-50/50 to-pink-50/50',
    bannerGradient: 'from-rose-900 to-pink-800',
    textMuted: 'text-rose-400',
    accentBadge: 'bg-rose-100 text-rose-700'
  }
};
