import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Physicochemistry } from './physicochemistry';

describe('Physicochemistry', () => {
  let component: Physicochemistry;
  let fixture: ComponentFixture<Physicochemistry>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Physicochemistry],
    }).compileComponents();

    fixture = TestBed.createComponent(Physicochemistry);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
