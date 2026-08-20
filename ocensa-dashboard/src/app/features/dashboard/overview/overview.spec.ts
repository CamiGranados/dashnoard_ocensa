import { computed, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DatasetRelease } from '../../../core/models/dataset-release.model';
import { DatasetReleaseStore } from '../../../core/services/dataset-release-store.service';
import { Overview } from './overview';

const RELEASE_ID = 'a'.repeat(64);

describe('Overview', () => {
  let fixture: ComponentFixture<Overview>;
  let release: ReturnType<typeof signal<DatasetRelease | null>>;

  beforeEach(async () => {
    release = signal<DatasetRelease | null>(null);
    const importState = signal({
      kind: 'idle' as const,
      message: 'No existe un release consultable.',
    });
    const releaseStore = {
      release: release.asReadonly(),
      hasQueryableRelease: computed(() => {
        const current = release();
        return (
          current?.analyticsReadEnabled === true &&
          (current.status === 'approved_uat' ||
            (current.status === 'published' && current.isPublished === true))
        );
      }),
      gateMessage: computed(() => 'No existe un release consultable.'),
      importState: importState.asReadonly(),
    };

    await TestBed.configureTestingModule({
      imports: [Overview],
      providers: [provideRouter([]), { provide: DatasetReleaseStore, useValue: releaseStore }],
    }).compileComponents();

    fixture = TestBed.createComponent(Overview);
  });

  it('fails closed behind the release gate when no queryable release exists', () => {
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Resultados bloqueados');
    expect(text).not.toContain('Módulos trazables del release');
  });

  it('shows the coordinated descriptive panel for an approved UAT release', () => {
    release.set({
      releaseId: RELEASE_ID,
      status: 'approved_uat',
      publishedAt: null,
      approvedAt: '2026-08-20T12:00:00Z',
      isPublished: false,
      analyticsReadEnabled: true,
      sourceSha256: 'b'.repeat(64),
      classifierVersion: 'raw-cell-classifier-v1',
      storedRawCellCount: 313610,
    });
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const text = element.textContent ?? '';
    expect(text).toContain('Desarrollo · aprobado para análisis descriptivo');
    expect(text).toContain(RELEASE_ID);
    expect(text).toContain('Cobertura de datos');
    expect(text).toContain('Microbiología · H08');
    expect(text).toContain('Corrosión · cupón');
    expect(text).toContain('Celdas raw verificadas');
    expect(text).toMatch(/313[.,]610/);
    expect(text).toContain('Agua, volumen y FWV');
    expect(text).toContain('Dosis y residual de biocida');
    expect(text).toContain('Decisión de desescalamiento');
    expect(element.querySelector('a[href="/coverage"]')).toBeTruthy();
    expect(element.querySelector('a[href="/microbiology/distribution"]')).toBeTruthy();
    expect(element.querySelector('a[href="/corrosion/coupon"]')).toBeTruthy();
    expect(text).not.toContain('Resultados bloqueados');
  });

  it('does not resurrect legacy indicators, unsupported claims, or invented units', () => {
    release.set({
      releaseId: RELEASE_ID,
      status: 'approved_uat',
      publishedAt: null,
      approvedAt: '2026-08-20T12:00:00Z',
      isPublished: false,
      analyticsReadEnabled: true,
      sourceSha256: 'b'.repeat(64),
      classifierVersion: 'raw-cell-classifier-v1',
      storedRawCellCount: 313610,
    });
    fixture.detectChanges();

    const text = (fixture.nativeElement.textContent as string).toLocaleLowerCase();
    for (const forbidden of [
      'mediana',
      'ahorro',
      'consumo',
      'normal',
      'bbl',
      '20%',
      'recomendación habilitada',
    ]) {
      expect(text).not.toContain(forbidden);
    }
  });
});
