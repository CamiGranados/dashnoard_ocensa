import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Gaps } from './gaps';

describe('Gaps', () => {
  let component: Gaps;
  let fixture: ComponentFixture<Gaps>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Gaps],
    }).compileComponents();

    fixture = TestBed.createComponent(Gaps);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
