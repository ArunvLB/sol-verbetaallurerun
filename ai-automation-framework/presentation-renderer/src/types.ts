export interface DesignedSlide {
  index: number;
  title: string;
  layout: 'title-only' | 'title-bullets' | 'title-image' | 'title-bullets-image';
  bullets: string[];
  media: string[];
  badge?: string;
}

export interface SlideNarration {
  index: number;
  slide: string;
  narration: string;
  transition?: string;
}

export function screenshotUrl(rawPath: string): string {
  // Convert Windows absolute path to /screenshots/<filename> URL
  const filename = rawPath.replace(/\\/g, '/').split('/').pop() || '';
  return `/screenshots/${filename}`;
}

export function badgeColor(badge?: string): string {
  if (badge === 'PASS') return 'var(--pass)';
  if (badge === 'FAIL') return 'var(--fail)';
  return 'var(--info)';
}
