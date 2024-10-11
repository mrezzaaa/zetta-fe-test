import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from 'app/service/auth-service/auth.service';
import { TestCorrectionService } from 'app/service/test-correction/test-correction.service';
import { SubSink } from 'subsink';
import Swal from 'sweetalert2';
import * as _ from 'lodash';
import { startWith, map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { UtilityService } from 'app/service/utility/utility.service';
import { UserProfileData } from 'app/users/user.model';
import { NgxPermissionsService } from 'ngx-permissions';

@Component({
  selector: 'ms-signature-corrector-dialog',
  templateUrl: './signature-corrector-dialog.component.html',
  styleUrls: ['./signature-corrector-dialog.component.scss'],
})
export class SignatureCorrectorDialogComponent implements OnInit, OnDestroy {
  form: UntypedFormGroup;
  isWaitingForResponse = false;

  currentUser: UserProfileData;
  correctorList:any = [];
  filteredCorrector: Observable<any[]>;

  private subs = new SubSink();
  constructor(
    @Inject(MAT_DIALOG_DATA) public parentData: any,
    public dialogRef: MatDialogRef<SignatureCorrectorDialogComponent>,
    private fb: UntypedFormBuilder,
    private testCorrectionService: TestCorrectionService,
    private translate: TranslateService,
    private authService: AuthService,
    private permissions: NgxPermissionsService,
    private utilityService: UtilityService
  ) {}

  ngOnInit(): void {
    this.initDataCurrentUser();
    this.initForm();
    this.getAllDataCorrector();
  }

  initDataCurrentUser() {
    this.currentUser = this.authService.getCurrentUser();
  }

  initForm() {
    this.form = this.fb.group({
      corrector_name: [null, Validators.required],
      signature: [false, Validators.requiredTrue],
    });
  }

  getAllDataCorrector(){
    this.isWaitingForResponse = true;
    this.subs.sink = this.testCorrectionService.getAllUserCorrector(this.parentData?.testId, this.parentData?.schoolId).subscribe((resp) => {
      this.isWaitingForResponse = false;
      if(resp && resp?.length){
        this.correctorList = _.cloneDeep(resp);
        this.correctorList = this.correctorList.filter(corrector => {
          // If user who logged in is corrector, do not display the other correctors related to this test correction
          return !this.permissions.getPermission('Corrector') || this.currentUser?._id === corrector?._id
        }).map((corrData) => {
          return {
            ...corrData,
            full_name: corrData?.last_name + ' ' + corrData?.first_name
          }
        }).sort((firstData, secondData) => {
          return this.utilityService.simplifyRegex(firstData.last_name).localeCompare(this.utilityService.simplifyRegex(secondData.last_name));
        });

        if (this.correctorList?.length === 1) {
          this.setUserCorrector(this.correctorList[0])
        }
        this.filteredCorrector = this.form.get('corrector_name').valueChanges.pipe(
          startWith(''),
          map((searchName: string) => this.correctorList.filter((correctorName) => this.utilityService.simplifyRegex(correctorName?.full_name)?.toLowerCase().includes(this.utilityService.simplifyRegex(searchName)?.toLowerCase()))),
        );
      };
    },
    (err) => {
      this.isWaitingForResponse = false;
      this.authService.postErrorLog(err);
    });
  }

  setUserCorrector(correctorData){
    const correctorName = correctorData?.last_name?.toUpperCase() + ' ' + correctorData?.first_name;
    this.form.get('corrector_name').setValue(correctorName);
  }

  submit() {
    if (this.form.invalid) {
      Swal.fire({
        type: 'warning',
        title: this.translate.instant('FormSave_S1.TITLE'),
        html: this.translate.instant('FormSave_S1.TEXT'),
        confirmButtonText: this.translate.instant('FormSave_S1.BUTTON_1'),
        footer: `<span style="margin-left: auto">FormSave_S1</span>`,
        allowEnterKey: false,
        allowEscapeKey: false,
        allowOutsideClick: false,
      });
      this.form.markAllAsTouched();
      return;
    }

    if (this.parentData?.testId && this.parentData?.schoolId) {
      const correctorName = this.form.get('corrector_name')?.value;
      const signature = this.form.get('signature')?.value;

      const payload = {
        testId : this.parentData?.testId ? this.parentData?.testId : null,
        schoolId : this.parentData?.schoolId ? this.parentData?.schoolId : null,
        correctorName: correctorName,
        signature: signature,
        correctorId: this.parentData?.correctorId ? this.parentData?.correctorId : null
      }

      this.isWaitingForResponse = true;
      this.subs.sink = this.testCorrectionService
        .setTestCorrectionCorrectorNameAndSignatory(
          payload.testId,
          payload.schoolId,
          payload.correctorName,
          payload.signature,
          payload.correctorId,
        )
        .subscribe(
          (resp) => {
            this.isWaitingForResponse = false;
            Swal.fire({
              type: 'success',
              title: 'Bravo',
              confirmButtonText: this.translate.instant('OK'),
              allowEscapeKey: false,
              allowEnterKey: false,
              allowOutsideClick: false,
            }).then(() => {
              let correctorValue = this.form?.get('corrector_name')?.value
              let signatureValue = this.form?.get('signature')?.value
              if(resp?.length){
                const current = resp.find(test => test?._id === this.parentData?.testCorrectionId)
                if(current?.correction_grid?.footer?.fields?.length){
                  const currCorrector = current?.correction_grid?.footer?.fields?.find(field => field?.type === 'correctername')?.value?.correcter_name
                  const currCorrectorFromText = current?.correction_grid?.footer?.fields?.find(field => field?.type === 'text' && field?.label?.match(/corrector|correcteur/i))?.value?.text
                  const currSignature = current?.correction_grid?.footer?.fields?.find(field => field?.type === 'signature')?.value?.signature
                  correctorValue = currCorrector? currCorrector : currCorrectorFromText ? currCorrectorFromText : correctorValue
                  signatureValue = currSignature ? currSignature : signatureValue
                }
              }
              this.closeDialog({correctorValue,signatureValue});
            });
          },
          (err) => {
            this.isWaitingForResponse = false;
            this.authService.postErrorLog(err);
          },
        );
    }
  }

  checkCorrector() {
    const searchString = this.form.get('corrector_name').value;
    const find = this.correctorList.find((corrector) => corrector?.full_name === searchString);
    if (find) {
      this.form.get('corrector_name').setValue(find?.full_name);
    } else {
      this.form.get('corrector_name').setValue(null, {emitEvent: false});
    }
  }

  closeDialog(value?) {
    this.dialogRef.close(value);
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }
}
