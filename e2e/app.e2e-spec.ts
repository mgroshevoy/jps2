import { Jps2Page } from './app.po';

describe('jps2 App', () => {
  let page: Jps2Page;

  beforeEach(() => {
    page = new Jps2Page();
  });

  it('should display message saying app works', () => {
    page.navigateTo();
    expect(page.getParagraphText()).toEqual('app works!');
  });
});
