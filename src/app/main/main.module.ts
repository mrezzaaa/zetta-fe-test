import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { HorizontalMenuItems } from 'app/core/menu/horizontal-menu-items/horizontal-menu-items';
import { MenuItems } from 'app/core/menu/menu-items/menu-items';
import { MenuToggleModule } from 'app/core/menu/menu-toggle.module';
import { PageTitleService } from 'app/core/page-title/page-title.service';
import { VoiceRecognitionService } from 'app/service/voice-recognition/voice-recognition.service';
import { FooterComponent } from 'app/shared/footer/footer.component';
import { SharedModule } from 'app/shared/shared.module';
import { BreadcrumbService } from 'ng5-breadcrumb';
import { NgxMaterialTimepickerModule } from 'ngx-material-timepicker';
import { PerfectScrollbarConfigInterface, PerfectScrollbarModule, PERFECT_SCROLLBAR_CONFIG } from 'ngx-perfect-scrollbar';
import { MainRoutingModule } from './main-routing.module';
import { MainComponent } from './main.component';
import { ColorPickerModule } from 'ngx-color-picker';

const DEFAULT_PERFECT_SCROLLBAR_CONFIG: PerfectScrollbarConfigInterface = {
  suppressScrollX: true,
};


@NgModule({
  declarations: [MainComponent, FooterComponent],
  imports: [
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    CommonModule,
    MainRoutingModule,
    MenuToggleModule,
    NgxMaterialTimepickerModule,
    MatSlideToggleModule,
    PerfectScrollbarModule,
    ColorPickerModule
  ],
  providers: [
    MenuItems,
    HorizontalMenuItems,
    BreadcrumbService,
    PageTitleService,
    VoiceRecognitionService,
    {
      provide: PERFECT_SCROLLBAR_CONFIG,
      useValue: DEFAULT_PERFECT_SCROLLBAR_CONFIG,
    },
  ]
})
export class MainModule { }
