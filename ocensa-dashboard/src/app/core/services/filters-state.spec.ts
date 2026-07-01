import { TestBed } from '@angular/core/testing';

import { FiltersState } from './filters-state';

describe('FiltersState', () => {
  let service: FiltersState;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FiltersState);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
