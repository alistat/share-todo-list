import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CDialogButtonComponent } from './c-dialog-button.component';

describe('CDialogButtonComponent', () => {
  let component: CDialogButtonComponent;
  let fixture: ComponentFixture<CDialogButtonComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CDialogButtonComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CDialogButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
