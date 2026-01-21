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
