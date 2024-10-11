import { Component, Inject, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { TestCorrectionService } from 'app/service/test-correction/test-correction.service';
import { UtilityService } from 'app/service/utility/utility.service';
import { SubSink } from 'subsink';
import Swal from 'sweetalert2';

@Component({
  selector: 'ms-import-mark-dialog',
  templateUrl: './import-mark-dialog.component.html',
  styleUrls: ['./import-mark-dialog.component.scss'],
})
export class ImportMarkDialogComponent implements OnInit, OnDestroy {
  @ViewChild('importFile', { static: false }) imporFile: any;
  private subs = new SubSink();
  private timeOutVal: any;

  isWaitingForResponse = false;

  file: File;

  invalidFile = false;

  constructor(
    public dialogRef: MatDialogRef<ImportMarkDialogComponent>,
    private utilService: UtilityService,
    private translate: TranslateService,
    private testCorrection: TestCorrectionService,
    @Inject(MAT_DIALOG_DATA) public data: any,
  ) {}

  ngOnInit(): void {}

  openUploadWindow() {
    this.imporFile.nativeElement.click();
  }

  handleInputChange(fileInput: Event) {
    this.isWaitingForResponse = true;
    const file = (<HTMLInputElement>fileInput.target)?.files?.[0];

    if (!file?.name) {
      return (this.isWaitingForResponse = false);
    }

    const acceptFile = ['csv', 'tsv'];
    const fileType = this.utilService.getFileExtension(file.name).toLocaleLowerCase();

    if (acceptFile.includes(fileType)) {
      this.file = (<HTMLInputElement>fileInput.target).files[0];
      this.isWaitingForResponse = false;
      this.invalidFile = false;
    } else {
      this.file = null;
      this.isWaitingForResponse = false;
      Swal.fire({
        type: 'error',
        title: this.translate.instant('UPLOAD_ERROR.WRONG_TYPE_TITLE'),
        text: this.translate.instant('UPLOAD_ERROR.WRONG_TYPE_TEXT', { file_exts: '.csv, .tsv' }),
        allowEscapeKey: false,
        allowOutsideClick: false,
        allowEnterKey: false,
      });
    }
  }

  submitImport() {
    let intervalRef = null;
    let timeDisabled = 5;
    if (this.data && this.file) {
      this.isWaitingForResponse = true;
      this.subs.sink = this.testCorrection?.validateImportMarkEntryProcess(this.data?.testId, this.data?.correctorId, this.data?.schoolId, this.data?.isGroup).subscribe((resp) => {
        this.isWaitingForResponse = false;
        if(resp && resp?.is_error && resp?.message?.includes('You are about to replace the marks!')) {
          Swal.fire({
            type: 'warning',
            title: this.translate.instant('Import_Mark_S2.TITLE'),
            html: this.translate.instant('Import_Mark_S2.TEXT'),
            footer: `<span style="margin-left: auto">Import_Mark_S2</span>`,
            confirmButtonText: this.translate.instant('Import_Mark_S2.BUTTON_1') + ` (${timeDisabled})`,
            cancelButtonText: this.translate.instant('Import_Mark_S2.BUTTON_2'),
            allowEscapeKey: true,
            showCancelButton: true,
            allowOutsideClick: false,
            allowEnterKey: false,
            onOpen: () => {
              Swal.disableConfirmButton();
              const confirmBtnRef = Swal.getConfirmButton();
              intervalRef = setInterval(() => {
                timeDisabled -= 1;
                confirmBtnRef.innerText = this.translate.instant('Import_Mark_S2.BUTTON_1') + ` (${timeDisabled})`;
              }, 1000);
              this.timeOutVal = setTimeout(() => {
                confirmBtnRef.innerText = this.translate.instant('Import_Mark_S2.BUTTON_1');
                Swal.enableConfirmButton();
                clearInterval(intervalRef);
                clearTimeout(this.timeOutVal);
              }, timeDisabled * 1000);
            },
            onClose: () => {
              clearInterval(intervalRef);
              clearTimeout(this.timeOutVal);
            }
          }).then((resp) => {
            if (resp?.value) {
              this.callImportMarkApi();
            }
          });
        } else if (resp && !resp?.is_error && resp?.message?.includes('Continue to import')) {
          this.callImportMarkApi();
        }
      },
      (error) => {
        this.isWaitingForResponse = false;
        Swal.fire({
          type: 'error',
          title: 'Error',
          text: error && error['message'] ? error['message'] : error,
          confirmButtonText: this.translate.instant('DISCONNECT_SCHOOL.BUTTON3'),
        });
      })
    } else {
      Swal.fire({
        type: 'warning',
        title: this.translate.instant('Invalid_Form_Warning.TITLE'),
        text: this.translate.instant('Invalid_Form_Warning.TEXT'),
        confirmButtonText: this.translate.instant('Invalid_Form_Warning.BUTTON'),
        allowEnterKey: false,
        allowEscapeKey: false,
        allowOutsideClick: false,
      }).then(() => {
        this.invalidFile = true;
      });
    }
  }

  callImportMarkApi(){
    this.isWaitingForResponse = true;
    this.subs.sink = this.testCorrection
      .importMarkEntry(this.file, this.translate.currentLang, this.data?.delimeter, this.data?.testId, this.data?.schoolId, this.data?.isGroup)
      .subscribe(
        (resp) => {
          this.isWaitingForResponse = false;
          if (resp && !resp?.is_error && resp?.message?.includes('mark entry import successfully')) {
            Swal.fire({
              type: 'success',
              title: this.translate.instant('Bravo'),
              confirmButtonText: this.translate.instant('OK'),
              allowEnterKey: false,
              allowEscapeKey: false,
              allowOutsideClick: false,
            }).then(() => {
              this.dialogRef.close(true);
            });
          } else if (resp && resp?.is_error && resp?.message?.includes('some student already marked but also some got an error')) {
            Swal.fire({
              type: 'warning',
              title: this.translate.instant('Import_Mark_S1.TITLE'),
              html: this.translate.instant('Import_Mark_S1.TEXT'),
              footer: `<span style="margin-left: auto">Import_Mark_S1</span>`,
              confirmButtonText: this.translate.instant('Import_Mark_S1.BUTTON'),
              allowEnterKey: false,
              allowEscapeKey: false,
              allowOutsideClick: false,
            }).then(() => {
              this.dialogRef.close(true);
            });
          } else {
            Swal.fire({
              title: this.translate.instant('STUDENT_IMPORT.DELIMITER_UNSUCCESSFULL_IMPORT.TITLE'),
              type: 'error',
              allowEscapeKey: true,
              footer: `<span style="margin-left: auto">GENIMPORT_S1</span>`,
              confirmButtonText: this.translate.instant('STUDENT_IMPORT.UNSUCCESSFULL_IMPORT.BUTTON'),
            });
          }
        },
        (error) => {
          this.isWaitingForResponse = false;
          Swal.fire({
            title: this.translate.instant('STUDENT_IMPORT.DELIMITER_UNSUCCESSFULL_IMPORT.TITLE'),
            type: 'error',
            allowEscapeKey: true,
            footer: `<span style="margin-left: auto">GENIMPORT_S1</span>`,
            confirmButtonText: this.translate.instant('STUDENT_IMPORT.UNSUCCESSFULL_IMPORT.BUTTON'),
          });
        },
      );
  }

  closeDialog() {
    this.dialogRef.close();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }
}
