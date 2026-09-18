import { afterEach, describe, expect, it, vi } from 'vitest';
import { configureMapboxWorker } from './mapbox-worker.helpers';

describe('configureMapboxWorker', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('configures a separately bundled module worker', () => {
    const workerConstructor = vi.fn();
    vi.stubGlobal(
      'Worker',
      class {
        constructor(url: URL, options: WorkerOptions) {
          workerConstructor(url, options);
        }
      },
    );
    const mapbox = { workerClass: null as unknown };

    configureMapboxWorker(mapbox);
    new (mapbox.workerClass as new () => Worker)();

    expect(workerConstructor).toHaveBeenCalledWith(expect.any(URL), { type: 'module' });
    expect((workerConstructor.mock.calls[0]?.[0] as URL).pathname).toMatch(/\/worker-.+\.js$/);
  });

  it('does nothing when Web Workers are unavailable', () => {
    vi.stubGlobal('Worker', undefined);
    const mapbox = { workerClass: null as unknown };

    configureMapboxWorker(mapbox);

    expect(mapbox.workerClass).toBeNull();
  });
});
