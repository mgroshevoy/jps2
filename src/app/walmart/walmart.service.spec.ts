import { TestBed, inject } from '@angular/core/testing';

import { WalmartService } from './walmart.service';

describe('WalmartService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [WalmartService]
    });
  });

  it('should ...', inject([WalmartService], (service: WalmartService) => {
    expect(service).toBeTruthy();
  }));
});
