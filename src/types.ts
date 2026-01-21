export type MediaVersion = {
  videoResolution: string;
  subtitles: string[];
};

export type ServerAvailability = {
  serverId: string;
  serverName: string;
  ratingKey: string;
  versions: MediaVersion[];
};

export type MediaDetails = {
  guid: string;
  title: string;
  summary?: string;
  year?: number;
  artPath?: string;
  thumbPath?: string;
  itemType: string;
  contentRating?: string;
  duration?: number;
  originallyAvailableAt?: string;
  studio?: string;
  availableOn: ServerAvailability[];
};

export type GroupedResult = {
  guid: string;
  title: string;
  year?: number;
  thumbPath?: string;
  servers: Array<{ id: string; name: string }>;
  itemType: 'movie' | 'show';
  contentRating?: string;
  duration?: number;
  originallyAvailableAt?: string;
};

export type SystemInfo = {
  lastUpdated: string | null;
  syncIntervalHours: number;
  totalMovies: number;
  totalShows: number;
  serverCount: number;
};

export type Server = {
  id: string;
  name: string;
  isOnline: boolean;
};

export type Library = {
  key: string;
  title: string;
};
