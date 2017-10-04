import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ListSharerComponent } from './list-sharer.component';

describe('ListSharerComponent', () => {
  let component: ListSharerComponent;
  let fixture: ComponentFixture<ListSharerComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ListSharerComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ListSharerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
