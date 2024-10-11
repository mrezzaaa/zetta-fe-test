import { NgModule } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { SharedModule } from 'app/shared/shared.module';
import { RncpTitleRoutingModule } from './rncp-title-routing.module';
import { NgSelectModule } from '@ng-select/ng-select';
import { TestDetailsComponent } from './dashboard/test-details/test-details.component';
import { SweetAlert2Module } from '@sweetalert2/ngx-sweetalert2';
import { PdfPersonalizedGroupComponent } from './dashboard/test-details/pdf-personalized-group/pdf-personalized-group.component';
import { PdfPersonalizedStudentComponent } from './dashboard/test-details/pdf-personalized-student/pdf-personalized-student.component';
import { MoveFolderDialogComponent } from './dashboard/move-folder-dialog/move-folder-dialog.component';
import { ViewDialogComponent } from './dashboard/test-details/view-dialog/view-dialog.component';

@NgModule({
    declarations: [
        TestDetailsComponent,
        PdfPersonalizedGroupComponent,
        PdfPersonalizedStudentComponent,
        ViewDialogComponent,
        MoveFolderDialogComponent
    ],
    imports: [
        CommonModule,
        SharedModule,
        RncpTitleRoutingModule,
        NgSelectModule,
        SweetAlert2Module.forRoot(),
    ],
    providers: [DatePipe],
    exports: [PdfPersonalizedGroupComponent, PdfPersonalizedStudentComponent]
})
export class RncpTitlesModule { }
