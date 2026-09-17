import { TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LogWrapper } from '../../../core/logging/log-wrapper.service';
import { ActivityRouteMapComponent } from './activity-route-map.component';

const mapbox = vi.hoisted(() => ({
  constructor: vi.fn(),
  addControl: vi.fn(),
  addSource: vi.fn(),
  addLayer: vi.fn(),
  fitBounds: vi.fn(),
  remove: vi.fn(),
  resize: vi.fn(),
}));

vi.mock('mapbox-gl', () => {
  class MockMap {
    constructor(options: unknown) {
      mapbox.constructor(options);
    }
    addControl(control: unknown, position: string) {
      mapbox.addControl(control, position);
    }
    addSource(id: string, source: unknown) {
      mapbox.addSource(id, source);
    }
    addLayer(layer: unknown) {
      mapbox.addLayer(layer);
    }
    fitBounds(bounds: unknown, options: unknown) {
      mapbox.fitBounds(bounds, options);
    }
    once(event: string, callback: () => void) {
      if (event === 'load') queueMicrotask(callback);
    }
    on() {}
    remove() {
      mapbox.remove();
    }
    resize() {
      mapbox.resize();
    }
  }
  return {
    default: {
      accessToken: '',
      Map: MockMap,
      NavigationControl: class {},
      FullscreenControl: class {},
    },
  };
});

describe('ActivityRouteMapComponent', () => {
  const locations = [
    {
      latitude: 46.05,
      longitude: 14.5,
      accuracy: 5,
      recordedAt: '2026-09-17T10:00:00Z',
      segment: 0,
      sequence: 0,
    },
    {
      latitude: 46.06,
      longitude: 14.51,
      accuracy: 5,
      recordedAt: '2026-09-17T10:00:10Z',
      segment: 0,
      sequence: 1,
    },
  ];

  beforeEach(() => {
    Object.values(mapbox).forEach((spy) => spy.mockClear());
  });

  function create(accessToken = 'pk.test-token', route = locations) {
    const logger = { error: vi.fn() };
    TestBed.configureTestingModule({
      imports: [
        ActivityRouteMapComponent,
        TranslocoTestingModule.forRoot({
          langs: {
            en: {
              activityRouteMap: {
                label: 'Route map',
                loading: 'Loading',
                unavailable: 'Unavailable',
                retry: 'Try again',
              },
            },
          },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
        }),
      ],
      providers: [{ provide: LogWrapper, useValue: logger }],
    });
    const fixture = TestBed.createComponent(ActivityRouteMapComponent);
    fixture.componentRef.setInput('locations', route);
    fixture.componentRef.setInput('accessToken', accessToken);
    fixture.componentRef.setInput('styleUrl', 'mapbox://styles/mapbox/outdoors-v12');
    fixture.componentRef.setInput('routeColor', '#ed7a32');
    fixture.detectChanges();
    return { fixture, logger };
  }

  it('creates an outdoor map with route layer, controls, and fitted bounds', async () => {
    const { fixture } = create();
    await vi.waitFor(() => expect(fixture.componentInstance.ready()).toBe(true));

    expect(mapbox.constructor).toHaveBeenCalledWith(
      expect.objectContaining({ style: 'mapbox://styles/mapbox/outdoors-v12' }),
    );
    expect(mapbox.addControl).toHaveBeenCalledTimes(2);
    expect(mapbox.addSource).toHaveBeenCalledWith(
      'activity-route',
      expect.objectContaining({ type: 'geojson' }),
    );
    expect(mapbox.addLayer).toHaveBeenCalledWith(
      expect.objectContaining({ paint: expect.objectContaining({ 'line-color': '#ed7a32' }) }),
    );
    expect(mapbox.fitBounds).toHaveBeenCalled();

    document.dispatchEvent(new Event('fullscreenchange'));
    expect(mapbox.resize).toHaveBeenCalled();
    fixture.destroy();
    expect(mapbox.remove).toHaveBeenCalled();
  });

  it('shows a controlled error when Mapbox configuration is missing', async () => {
    const { fixture, logger } = create('');
    await vi.waitFor(() => expect(fixture.componentInstance.failed()).toBe(true));

    expect(mapbox.constructor).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalled();
  });

  it('does not initialize Mapbox without a drawable line', async () => {
    const { fixture } = create('pk.test-token', [locations[0]]);
    await fixture.whenStable();

    expect(fixture.componentInstance.feature()).toBeNull();
    expect(mapbox.constructor).not.toHaveBeenCalled();
  });
});
