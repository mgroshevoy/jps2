import { GetTimeStampPipe } from './get-time-stamp.pipe';

describe('GetTimeStampPipe', () => {
  it('create an instance', () => {
    const pipe = new GetTimeStampPipe();
    expect(pipe).toBeTruthy();
  });
});
