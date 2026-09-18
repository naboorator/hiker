interface MapboxWorkerConfiguration {
  workerClass: unknown;
}

export function configureMapboxWorker(mapbox: MapboxWorkerConfiguration): void {
  if (typeof Worker === 'undefined') return;
  mapbox.workerClass = class {
    constructor() {
      return new Worker(new URL('./mapbox-gl-csp.worker', import.meta.url), {
        type: 'module',
      }) as never;
    }
  };
}
