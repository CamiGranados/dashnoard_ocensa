import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Corrosion } from './corrosion';

describe('Corrosion', () => {
  let component: Corrosion;
  let fixture: ComponentFixture<Corrosion>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Corrosion],
    }).compileComponents();

    fixture = TestBed.createComponent(Corrosion);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
