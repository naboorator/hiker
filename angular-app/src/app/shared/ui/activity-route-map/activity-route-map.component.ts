import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import type { ElementRef } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import type { Map as MapboxMap } from 'mapbox-gl';
import type { ActivityGpsLocation } from '../../../core/interface/activity-gps-location.interface';
import { LogWrapper } from '../../../core/logging/log-wrapper.service';
import { MAPBOX_LOAD_TIMEOUT_MS } from './activity-route-map.constants';
import { routeBounds, routeGeoJson } from './activity-route-map.helpers';
import { configureMapboxWorker } from './mapbox-worker.helpers';

@Component({
  selector: 'app-activity-route-map',
  imports: [TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './activity-route-map.component.html',
  styleUrl: './activity-route-map.component.css',
})
export class ActivityRouteMapComponent {
  private readonly logger = inject(LogWrapper);
  private readonly destroyRef = inject(DestroyRef);
  private readonly container = viewChild<ElementRef<HTMLDivElement>>('mapContainer');
  private map: MapboxMap | null = null;
  private loadTimeout: ReturnType<typeof setTimeout> | null = null;
  private initialization = 0;
  readonly locations = input.required<readonly ActivityGpsLocation[]>();
  readonly accessToken = input.required<string>();
  readonly styleUrl = input.required<string>();
  readonly routeColor = input.required<string>();
  readonly feature = computed(() => routeGeoJson(this.locations()));
  readonly loading = signal(true);
  readonly failed = signal(false);
  readonly ready = signal(false);

  constructor() {
    afterNextRender(() => void this.initialize());
    const resize = () => this.map?.resize();
    document.addEventListener('fullscreenchange', resize);
    this.destroyRef.onDestroy(() => {
      document.removeEventListener('fullscreenchange', resize);
      this.disposeMap();
    });
  }

  retry(): void {
    void this.initialize();
  }

  private async initialize(): Promise<void> {
    const feature = this.feature();
    const container = this.container()?.nativeElement;
    if (!feature || !container) {
      this.loading.set(false);
      return;
    }
    const currentInitialization = ++this.initialization;
    this.disposeMap();
    this.loading.set(true);
    this.failed.set(false);
    this.ready.set(false);
    if (!this.accessToken().trim()) return this.fail('Mapbox access token is missing');
    try {
      const mapboxModule = await import('mapbox-gl');
      if (currentInitialization !== this.initialization) return;
      const mapbox = mapboxModule.default;
      configureMapboxWorker(mapbox);
      mapbox.accessToken = this.accessToken();
      const map = new mapbox.Map({
        container,
        style: this.styleUrl(),
        attributionControl: true,
      });
      this.map = map;
      this.loadTimeout = setTimeout(() => {
        if (this.map === map && !this.ready()) this.fail('Mapbox map load timed out');
      }, MAPBOX_LOAD_TIMEOUT_MS);
      map.addControl(new mapbox.NavigationControl(), 'top-right');
      map.addControl(new mapbox.FullscreenControl({ container }), 'top-right');
      map.once('load', () => {
        if (this.map !== map) return;
        this.clearLoadTimeout();
        map.addSource('activity-route', { type: 'geojson', data: feature });
        map.addLayer({
          id: 'activity-route',
          type: 'line',
          source: 'activity-route',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': this.routeColor(), 'line-width': 4, 'line-opacity': 0.95 },
        });
        map.fitBounds(routeBounds(feature), { padding: 42, maxZoom: 16, duration: 0 });
        this.loading.set(false);
        this.ready.set(true);
      });
      map.on('error', (event) => {
        this.logger.error('Mapbox reported a map resource error', event.error);
      });
    } catch (error) {
      this.fail('Unable to initialize Mapbox', error);
    }
  }

  private fail(message: string, error?: unknown): void {
    this.logger.error(message, error);
    this.disposeMap();
    this.loading.set(false);
    this.ready.set(false);
    this.failed.set(true);
  }

  private disposeMap(): void {
    this.clearLoadTimeout();
    this.map?.remove();
    this.map = null;
  }

  private clearLoadTimeout(): void {
    if (this.loadTimeout === null) return;
    clearTimeout(this.loadTimeout);
    this.loadTimeout = null;
  }
}
