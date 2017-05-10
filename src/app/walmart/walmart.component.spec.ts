import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { WalmartComponent } from './walmart.component';

describe('WalmartComponent', () => {
  let component: WalmartComponent;
  let fixture: ComponentFixture<WalmartComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ WalmartComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(WalmartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
