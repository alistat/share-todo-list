import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TodoListSelectorComponent } from './todo-list-selector.component';

describe('TodoListSelectorComponent', () => {
  let component: TodoListSelectorComponent;
  let fixture: ComponentFixture<TodoListSelectorComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TodoListSelectorComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TodoListSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
