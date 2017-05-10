import { TestBed, inject } from '@angular/core/testing';

import { NumbersService } from './numbers.service';

describe('NumbersService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [NumbersService]
    });
  });

  it('should be created', inject([NumbersService], (service: NumbersService) => {
    expect(service).toBeTruthy();
  }));
});
