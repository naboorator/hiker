import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Translation, TranslocoLoader } from '@jsverse/transloco';
import { forkJoin, map } from 'rxjs';
import { translationFiles } from './translation-files';

@Injectable({ providedIn: 'root' })
export class TranslocoHttpLoader implements TranslocoLoader {
  private readonly http = inject(HttpClient);

  getTranslation(language: string) {
    return forkJoin(
      translationFiles.map((file) =>
        this.http.get<Translation>(`assets/lang/${language}/${file}.json`),
      ),
    ).pipe(map((translations) => Object.assign({}, ...translations)));
  }
}
