import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { translationFiles } from './translation-files';
import { TranslocoHttpLoader } from './transloco-loader';

describe('TranslocoHttpLoader', () => {
  it('loads and combines every translation file for a language', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const loader = TestBed.inject(TranslocoHttpLoader);
    const http = TestBed.inject(HttpTestingController);
    const result = firstValueFrom(loader.getTranslation('si'));

    for (const file of translationFiles) {
      http.expectOne(`assets/lang/si/${file}.json`).flush({ [file]: file });
    }
    expect(await result).toMatchObject(
      Object.fromEntries(translationFiles.map((file) => [file, file])),
    );
    http.verify();
  });
});
