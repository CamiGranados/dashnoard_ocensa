import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Physicochemistry } from './physicochemistry';
import { provideRouter } from '@angular/router';

describe('Physicochemistry', () => {
  let component: Physicochemistry;
  let fixture: ComponentFixture<Physicochemistry>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Physicochemistry],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Physicochemistry);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
