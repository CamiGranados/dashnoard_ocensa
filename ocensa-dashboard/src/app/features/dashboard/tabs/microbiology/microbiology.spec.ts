import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Microbiology } from './microbiology';

describe('Microbiology', () => {
  let component: Microbiology;
  let fixture: ComponentFixture<Microbiology>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Microbiology],
    }).compileComponents();

    fixture = TestBed.createComponent(Microbiology);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
