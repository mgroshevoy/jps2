import { TestBed, inject } from '@angular/core/testing';

import { AmazonService } from './amazon.service';

describe('AmazonService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AmazonService]
    });
  });

  it('should ...', inject([AmazonService], (service: AmazonService) => {
    expect(service).toBeTruthy();
  }));
});
