import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImportMarkDialogComponent } from './import-mark-dialog.component';

describe('ImportMarkDialogComponent', () => {
  let component: ImportMarkDialogComponent;
  let fixture: ComponentFixture<ImportMarkDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ImportMarkDialogComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ImportMarkDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
