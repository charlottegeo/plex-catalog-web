import { components } from './api-types';

export type DbServer = components['schemas']['DbServer'];
export type MediaRequestPayload = components['schemas']['MediaRequestPayload'];
/** Flat request row: use `subscribers` (no single requester). Per-row `requestedSeason` for TV. */
export type MediaRequest = components['schemas']['MediaRequest'];
export type SystemInfo = components['schemas']['SystemInfo'];
export type Library = components['schemas']['Library'];
export type Item = components['schemas']['Item'];
export type ItemWithDetails = components['schemas']['ItemWithDetails'];
export type SearchResult = components['schemas']['SearchResult'];
export type MediaDetails = components['schemas']['MediaDetails'];
export type SeasonSummary = components['schemas']['SeasonSummary'];
export type EpisodeDetails = components['schemas']['EpisodeDetails'];
export type PlexExtra = components['schemas']['PlexExtra'];
export type MediaVersion = components['schemas']['MediaVersion'];

export interface ImageQuery {
  width?: number;
  height?: number;
}

export interface DiscoverResult {
  ratingKey: string;
  title: string;
  type: string;
  summary?: string;
  year?: number;
  thumb?: string;
  duration?: number;
  childCount?: number;
  contentRating?: string;
  originallyAvailableAt?: string;
}

export interface GroupedResult extends Omit<
  SearchResult,
  'serverId' | 'serverName' | 'ratingKey'
> {
  servers: {
    id: string;
    name: string;
    ratingKey: string;
  }[];
}
