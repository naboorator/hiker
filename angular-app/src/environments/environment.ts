import type { MapboxConfig } from '../app/core/interface/mapbox-config.interface';

export const environment = {
  apiOrigin: 'http://localhost:3000',
  mapbox: {
    accessToken:
      '',
    styleUrl: 'mapbox://styles/mapbox/outdoors-v12',
    routeColor: '#ed7a32',
  } satisfies MapboxConfig,
} as const;
