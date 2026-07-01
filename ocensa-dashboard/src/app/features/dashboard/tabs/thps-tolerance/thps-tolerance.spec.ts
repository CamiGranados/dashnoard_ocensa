import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ThpsTolerance } from './thps-tolerance';

describe('ThpsTolerance', () => {
  let component: ThpsTolerance;
  let fixture: ComponentFixture<ThpsTolerance>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ThpsTolerance],
    }).compileComponents();

    fixture = TestBed.createComponent(ThpsTolerance);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
