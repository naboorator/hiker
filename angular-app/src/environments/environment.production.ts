import type { MapboxConfig } from '../app/core/interface/mapbox-config.interface';

export const environment = {
  apiOrigin: 'https://hiker-api.divader.si',
  mapbox: {
    accessToken: '__MAPBOX_ACCESS_TOKEN__',
    styleUrl: 'mapbox:git //styles/mapbox/outdoors-v12',
    routeColor: '#ed7a32',
  } satisfies MapboxConfig,
} as const;
