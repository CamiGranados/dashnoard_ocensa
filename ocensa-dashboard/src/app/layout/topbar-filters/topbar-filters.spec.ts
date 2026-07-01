import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TopbarFilters } from './topbar-filters';

describe('TopbarFilters', () => {
  let component: TopbarFilters;
  let fixture: ComponentFixture<TopbarFilters>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TopbarFilters],
    }).compileComponents();

    fixture = TestBed.createComponent(TopbarFilters);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
