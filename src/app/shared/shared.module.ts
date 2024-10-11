import { NgModule } from '@angular/core';
import { A11yModule } from '@angular/cdk/a11y';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { PortalModule } from '@angular/cdk/portal';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { CdkStepperModule } from '@angular/cdk/stepper';
import { CdkTableModule } from '@angular/cdk/table';
import { CdkTreeModule } from '@angular/cdk/tree';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatBadgeModule } from '@angular/material/badge';
import { MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatStepperModule } from '@angular/material/stepper';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatNativeDateModule, MatRippleModule, MAT_DATE_FORMATS, DateAdapter } from '@angular/material/core';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSliderModule } from '@angular/material/slider';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipDefaultOptions, MatTooltipModule, MAT_TOOLTIP_DEFAULT_OPTIONS } from '@angular/material/tooltip';
import { MatTreeModule } from '@angular/material/tree';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FlexLayoutModule } from '@angular/flex-layout';
import { CommonModule } from '@angular/common';
import { AppDateAdapter, APP_DATE_FORMATS } from './date.adapter';
import { CustomMatPaginatorIntl } from './custom-mat-paginator-intl';
import { ParseUtcToLocalPipe } from './pipes/parse-utc-to-local.pipe';
import { ParseLocalToUtcPipe } from './pipes/parse-local-to-utc.pipe';
import { CKEditorModule } from '@ckeditor/ckeditor5-angular';
import { SpeechToTextDialogComponent } from './components/speech-to-text-dialog/speech-to-text-dialog.component';
import { NgxPermissionsModule } from 'ngx-permissions';
import { NgSelectModule } from '@ng-select/ng-select';
import { SweetAlert2Module } from '@sweetalert2/ngx-sweetalert2';
import { PdfDetailComponent } from 'app/test-correction/pdf-detail/pdf-detail.component';
import { SafeHtmlPipe } from './pipes/safe-html.pipe';
import { CkeditorInputDialogComponent } from './components/ckeditor-input-dialog/ckeditor-input-dialog.component';

const modules: any = [
  A11yModule,
  CdkStepperModule,
  CdkTableModule,
  CdkTreeModule,
  DragDropModule,
  MatAutocompleteModule,
  MatBadgeModule,
  MatBottomSheetModule,
  MatButtonModule,
  MatButtonToggleModule,
  MatCardModule,
  MatCheckboxModule,
  MatChipsModule,
  MatStepperModule,
  MatDatepickerModule,
  MatDialogModule,
  MatDividerModule,
  MatExpansionModule,
  MatGridListModule,
  MatIconModule,
  MatInputModule,
  MatListModule,
  MatMenuModule,
  MatNativeDateModule,
  MatPaginatorModule,
  MatProgressBarModule,
  MatProgressSpinnerModule,
  MatRadioModule,
  MatRippleModule,
  MatSelectModule,
  MatSidenavModule,
  MatSliderModule,
  MatSlideToggleModule,
  MatSnackBarModule,
  MatSortModule,
  MatTableModule,
  MatTabsModule,
  MatToolbarModule,
  MatTooltipModule,
  MatTreeModule,
  PortalModule,
  ScrollingModule,
  TranslateModule,
  FormsModule,
  ReactiveFormsModule,
  FlexLayoutModule,
  CommonModule,
];

export const OtherOptions: MatTooltipDefaultOptions = {
  showDelay: 0,
  hideDelay: 0,
  touchGestures: 'auto',
  touchendHideDelay: 0,
  disableTooltipInteractivity: true,
};

@NgModule({
  declarations: [
    ParseUtcToLocalPipe,
    ParseLocalToUtcPipe,
    SpeechToTextDialogComponent,
    PdfDetailComponent,
    SafeHtmlPipe,
    CkeditorInputDialogComponent
  ],
  imports: [...modules, CKEditorModule, NgxPermissionsModule.forChild(), NgSelectModule, SweetAlert2Module.forRoot()],
  exports: [
    ...modules,
    PdfDetailComponent,
    SafeHtmlPipe,
    CkeditorInputDialogComponent
  ],
  providers: [
    {
      provide: DateAdapter,
      useClass: AppDateAdapter,
    },
    {
      provide: MAT_DATE_FORMATS,
      useValue: APP_DATE_FORMATS,
    },
    {
      provide: MatPaginatorIntl,
      useClass: CustomMatPaginatorIntl,
    },
    {
      provide: MAT_TOOLTIP_DEFAULT_OPTIONS,
      useValue: OtherOptions,
    },
  ],
})
export class SharedModule {}
