import { TodoesPage } from './app.po';

describe('todoes App', () => {
  let page: TodoesPage;

  beforeEach(() => {
    page = new TodoesPage();
  });

  it('should display message saying app works', () => {
    page.navigateTo();
    expect(page.getParagraphText()).toEqual('app works!');
  });
});
