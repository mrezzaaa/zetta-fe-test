import { TestBed } from '@angular/core/testing';

import { UserActivityTranslateService } from './user-activity-translate.service';

describe('UserActivityTranslateService', () => {
  let service: UserActivityTranslateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UserActivityTranslateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
