export const formatResolution = (resolution?: string): string => {
  if (!resolution) return '';

  const res = resolution.toLowerCase();
  if (res.includes('2160') || res.includes('4k')) return '4K';
  if (res.includes('4320') || res.includes('8k')) return '8K';
  if (res.includes('1080')) return '1080p';
  if (res.includes('720')) return '720p';

  if (!isNaN(parseInt(resolution, 10))) {
    return `${resolution}p`;
  }
  return resolution;
};

export const REQUEST_RESOLUTION_TIERS = ['720p', '1080p', '4K'] as const;
export type RequestResolutionTier = (typeof REQUEST_RESOLUTION_TIERS)[number];

export function parseVideoResolutionTier(
  raw: string
): RequestResolutionTier | null {
  const normalized = formatResolution(raw);
  if (normalized === '4K' || normalized === '8K') return '4K';
  if (normalized === '1080p') return '1080p';
  if (normalized === '720p') return '720p';
  return null;
}

export const formatDuration = (ms?: number): string => {
  if (!ms) return '';
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  return `${minutes}m`;
};

export const formatDate = (dateString?: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;

  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const EXTRA_TYPE_LABELS: Record<string, string> = {
  sceneorsample: 'Scene',
  behindthescenes: 'Behind the Scenes',
  deletedscene: 'Deleted Scene',
  deleted: 'Deleted Scene',
  featurette: 'Featurette',
  interview: 'Interview',
  scene: 'Scene',
  short: 'Short',
  trailer: 'Trailer',
  other: 'Other',
};

export const formatExtraType = (extraType?: string | null): string => {
  if (!extraType) return '';
  const key = extraType.toLowerCase().trim();
  const label = EXTRA_TYPE_LABELS[key];
  if (label) return label;
  return extraType.charAt(0).toUpperCase() + extraType.slice(1).toLowerCase();
};

export const formatRelativeTime = (dateString?: string | null): string => {
  if (!dateString) return 'Never';
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  return date.toLocaleDateString();
};
