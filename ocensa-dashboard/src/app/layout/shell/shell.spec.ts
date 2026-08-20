import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Shell } from './shell';
import { provideRouter } from '@angular/router';

describe('Shell', () => {
  let component: Shell;
  let fixture: ComponentFixture<Shell>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Shell],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Shell);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('provides a keyboard skip link to the main content', () => {
    fixture.detectChanges();
    const link = fixture.nativeElement.querySelector('.shell__skip-link');
    const main = fixture.nativeElement.querySelector('#main-content');

    expect(link?.getAttribute('href')).toBe('#main-content');
    expect(main).not.toBeNull();
  });
});
