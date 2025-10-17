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
  availableOn: ServerAvailability[];
};

export type GroupedResult = {
  guid: string;
  title: string;
  year?: number;
  thumbPath?: string;
  servers: Array<{ id: string; name: string }>;
  itemType: 'movie' | 'show';
};
