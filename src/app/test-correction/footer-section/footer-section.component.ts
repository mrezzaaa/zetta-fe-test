import { UtilityService } from 'app/service/utility/utility.service';
import { Component, OnInit, Input, OnChanges, Output, EventEmitter, OnDestroy } from '@angular/core';
import { UntypedFormGroup, UntypedFormArray } from '@angular/forms';
import { DateAdapter } from '@angular/material/core';
import { LangChangeEvent, TranslateService } from '@ngx-translate/core';
import * as _ from 'lodash';
import { ParseUtcToLocalPipe } from 'app/shared/pipes/parse-utc-to-local.pipe';
import { SubSink } from 'subsink';
import { Observable } from 'rxjs';
import { TestCorrectionService } from 'app/service/test-correction/test-correction.service';
import { debounceTime, map, startWith } from 'rxjs/operators';

@Component({
  selector: 'ms-footer-section',
  templateUrl: './footer-section.component.html',
  styleUrls: ['./footer-section.component.scss'],
  providers: [ParseUtcToLocalPipe],
})
export class FooterSectionComponent implements OnInit, OnChanges, OnDestroy {
  @Input() testCorrectionForm: UntypedFormGroup;
  @Input() testData: any;
  @Input() selectedGroupData: any;
  @Input() studentSelectDetail: any;
  @Input() loadReady;
  @Input() getDataForm;

  @Output() updateFirstForm = new EventEmitter<any>();

  private subs = new SubSink();

  correctorList:any = [];
  filteredCorrector: Observable<any[]>;

  constructor(private parseUTCtoLocal: ParseUtcToLocalPipe, private dateAdapter: DateAdapter<Date>, private translate: TranslateService, private testCorrectionService: TestCorrectionService, private utilityService: UtilityService) {}

  ngOnInit() {
    this.dateAdapter.setLocale(this.translate.currentLang);
    this.translate.onLangChange.subscribe((event: LangChangeEvent) => {
      this.dateAdapter.setLocale(this.translate.currentLang);
    });
    this.getAllDataCorrector();
  }

  ngOnChanges() {
    if (this.testData && this.testCorrectionForm.value) {

      if (!this.testData.group_test) {
        this.getCorrectorName();
      } else {
        if (this.selectedGroupData && (!this.studentSelectDetail || Array.isArray(this.studentSelectDetail))) {

          this.getCorrectorForGroup();
        } else {
          if (this.studentSelectDetail) {

            this.getCorrectorForGroupStudent();
          }
        }
      }

      // *************** Update populate corrector name in footer, we need to update the firstForm to prevent validation bug caused by footer value
      this.updateFirstForm.emit(true);
    }
  }

  getTranslatedDate(date) {
    if (date && date.date_utc && date.time_utc) {
      return this.parseUTCtoLocal.transformDate(date.date_utc, date.time_utc);
    } else {
      return '';
    }
  }

  getCorrectorName() {
    const payload = _.cloneDeep(this.testCorrectionForm.value);
    const footer = _.cloneDeep(this.testCorrectionForm.get('correction_grid').get('footer').get('fields').value);
    if (payload && payload.corrector) {
      if (footer && footer.length) {
        footer.forEach((foot, inFoot) => {
          if (foot?.type === 'correctername' || foot?.label?.includes('correcteur') || foot?.label?.includes('corrector')) {
            if (this.testData.corrector_assigned_for_final_retake && this.testData.corrector_assigned_for_final_retake.length) {
              const corrector = this.testData.corrector_assigned_for_final_retake.find(
                (test) => test.corrector_id && test.corrector_id._id === payload.corrector,
              );
              if (corrector) {

                const name = corrector.corrector_id.last_name + ' ' + corrector.corrector_id.first_name;
                if (!this.testCorrectionForm.get('correction_grid').get('footer').get('fields').get(inFoot.toString()).get('value').value) {
                  if (foot.data_type !== 'checkbox') {
                    this.testCorrectionForm
                      .get('correction_grid')
                      .get('footer')
                      .get('fields')
                      .get(inFoot.toString())
                      .get('value')
                      .patchValue(name);
                  }
                }
              } else {
                const correctors = this.testData.corrector_assigned.find(
                  (test) => test.corrector_id && test.corrector_id._id === payload.corrector,
                );
                if (correctors) {

                  const name = correctors.corrector_id.last_name + ' ' + correctors.corrector_id.first_name;
                  if (
                    !this.testCorrectionForm.get('correction_grid').get('footer').get('fields').get(inFoot.toString()).get('value').value
                  ) {
                    if (foot.data_type !== 'checkbox') {
                      this.testCorrectionForm
                        .get('correction_grid')
                        .get('footer')
                        .get('fields')
                        .get(inFoot.toString())
                        .get('value')
                        .patchValue(name);
                    }
                  }
                }
              }
            } else {
              const corrector = this.testData.corrector_assigned.find(
                (test) => test.corrector_id && test.corrector_id._id === payload.corrector,
              );
              if (corrector) {

                const name = corrector.corrector_id.last_name + ' ' + corrector.corrector_id.first_name;
                if (!this.testCorrectionForm.get('correction_grid').get('footer').get('fields').get(inFoot.toString()).get('value').value) {
                  if (foot.data_type !== 'checkbox') {
                    this.testCorrectionForm
                      .get('correction_grid')
                      .get('footer')
                      .get('fields')
                      .get(inFoot.toString())
                      .get('value')
                      .patchValue(name);
                  }
                }
              } else {
                this.testData.corrector_assigned.forEach((corrs, inCors) => {
                  const students = corrs.students.find((test) => test._id === payload.student);
                  if (students) {
                    const correctors = this.testData.corrector_assigned[inCors];
                    if (correctors) {

                      const name = correctors.corrector_id.last_name + ' ' + correctors.corrector_id.first_name;
                      if (
                        !this.testCorrectionForm.get('correction_grid').get('footer').get('fields').get(inFoot.toString()).get('value')
                          .value
                      ) {
                        if (foot.data_type !== 'checkbox') {
                          this.testCorrectionForm
                            .get('correction_grid')
                            .get('footer')
                            .get('fields')
                            .get(inFoot.toString())
                            .get('value')
                            .patchValue(name);
                        }
                      }
                    }
                  }
                });
              }
            }
          }
        });
      }
    } else {
      if (payload && payload.student) {
        if (footer && footer.length) {
          footer.forEach((foot, inFoot) => {
            if (foot?.type === 'correctername' || foot?.label?.includes('correcteur') || foot?.label?.includes('corrector')) {
              if (this.testData.corrector_assigned_for_final_retake && this.testData.corrector_assigned_for_final_retake.length) {
                this.testData.corrector_assigned_for_final_retake.forEach((corr, inCor) => {
                  const student = corr.students.find((test) => test._id === payload.student);
                  if (student) {
                    const corrector = this.testData.corrector_assigned_for_final_retake[inCor];
                    if (corrector) {

                      const name = corrector.corrector_id.last_name + ' ' + corrector.corrector_id.first_name;
                      if (
                        !this.testCorrectionForm.get('correction_grid').get('footer').get('fields').get(inFoot.toString()).get('value')
                          .value
                      ) {
                        if (foot.data_type !== 'checkbox') {
                          this.testCorrectionForm
                            .get('correction_grid')
                            .get('footer')
                            .get('fields')
                            .get(inFoot.toString())
                            .get('value')
                            .patchValue(name);
                        }
                      }
                    } else {
                      this.testData.corrector_assigned.forEach((corrs, inCors) => {
                        const students = corrs.students.find((test) => test._id === payload.student);
                        if (students) {
                          const correctors = this.testData.corrector_assigned[inCors];
                          if (correctors) {

                            const name = correctors.corrector_id.last_name + ' ' + correctors.corrector_id.first_name;
                            if (
                              !this.testCorrectionForm
                                .get('correction_grid')
                                .get('footer')
                                .get('fields')
                                .get(inFoot.toString())
                                .get('value').value
                            ) {
                              if (foot.data_type !== 'checkbox') {
                                this.testCorrectionForm
                                  .get('correction_grid')
                                  .get('footer')
                                  .get('fields')
                                  .get(inFoot.toString())
                                  .get('value')
                                  .patchValue(name);
                              }
                            }
                          }
                        }
                      });
                    }
                  }
                });
              } else {
                this.testData.corrector_assigned.forEach((corr, inCor) => {
                  const student = corr.students.find((test) => test._id === payload.student);
                  if (student) {
                    const corrector = this.testData.corrector_assigned[inCor];
                    if (corrector) {

                      const name = corrector.corrector_id.last_name + ' ' + corrector.corrector_id.first_name;
                      if (
                        !this.testCorrectionForm.get('correction_grid').get('footer').get('fields').get(inFoot.toString()).get('value')
                          .value
                      ) {
                        if (foot.data_type !== 'checkbox') {
                          this.testCorrectionForm
                            .get('correction_grid')
                            .get('footer')
                            .get('fields')
                            .get(inFoot.toString())
                            .get('value')
                            .patchValue(name);
                        }
                      }
                    }
                  }
                });
              }
            }
          });
        }
      }
    }
  }

  getCorrectorForGroup() {
    const payload = _.cloneDeep(this.testCorrectionForm.value);
    const footer = _.cloneDeep(this.testCorrectionForm.get('correction_grid').get('footer').get('fields').value);
    if (footer && footer.length) {
      footer.forEach((foot, inFoot) => {
        if (foot?.type === 'correctername' || foot?.label?.includes('correcteur') || foot?.label?.includes('corrector')) {
          if (this.testData.corrector_assigned_for_final_retake && this.testData.corrector_assigned_for_final_retake.length) {
            this.testData.corrector_assigned_for_final_retake.forEach((corr, inCor) => {
              if (corr.test_groups && corr.test_groups.length) {
                const group = corr.test_groups.find((test) => test._id === this.selectedGroupData._id);
                if (group) {
                  const corrector = this.testData.corrector_assigned_for_final_retake[inCor];
                  if (corrector) {

                    const name = corrector.corrector_id.last_name + ' ' + corrector.corrector_id.first_name;
                    if (
                      !this.testCorrectionForm.get('correction_grid').get('footer').get('fields').get(inFoot.toString()).get('value').value
                    ) {
                      if (foot.data_type !== 'checkbox') {
                        this.testCorrectionForm
                          .get('correction_grid')
                          .get('footer')
                          .get('fields')
                          .get(inFoot.toString())
                          .get('value')
                          .patchValue(name);
                      }
                    }
                  } else {
                    this.testData.corrector_assigned.forEach((corrs, inCors) => {
                      if (corrs.test_groups && corrs.test_groups.length) {
                        const groups = corrs.test_groups.find((test) => test._id === this.selectedGroupData._id);
                        if (groups) {
                          const correctors = this.testData.corrector_assigned[inCors];
                          if (correctors) {

                            const name = correctors.corrector_id.last_name + ' ' + correctors.corrector_id.first_name;
                            if (
                              !this.testCorrectionForm
                                .get('correction_grid')
                                .get('footer')
                                .get('fields')
                                .get(inFoot.toString())
                                .get('value').value
                            ) {
                              if (foot.data_type !== 'checkbox') {
                                this.testCorrectionForm
                                  .get('correction_grid')
                                  .get('footer')
                                  .get('fields')
                                  .get(inFoot.toString())
                                  .get('value')
                                  .patchValue(name);
                              }
                            }
                          }
                        }
                      }
                    });
                  }
                }
              }
            });
          } else {
            this.testData.corrector_assigned.forEach((corr, inCor) => {
              if (corr.test_groups && corr.test_groups.length) {
                const groups = corr.test_groups.find((test) => test._id === this.selectedGroupData._id);
                if (groups) {
                  const corrector = this.testData.corrector_assigned[inCor];
                  if (corrector) {

                    const name = corrector.corrector_id.last_name + ' ' + corrector.corrector_id.first_name;
                    if (
                      !this.testCorrectionForm.get('correction_grid').get('footer').get('fields').get(inFoot.toString()).get('value').value
                    ) {
                      if (foot.data_type !== 'checkbox') {
                        this.testCorrectionForm
                          .get('correction_grid')
                          .get('footer')
                          .get('fields')
                          .get(inFoot.toString())
                          .get('value')
                          .patchValue(name);
                      }
                    }
                  }
                }
              }
            });
          }
        }
      });
    }
  }

  getCorrectorForGroupStudent() {
    const payload = _.cloneDeep(this.testCorrectionForm.value);
    const footer = _.cloneDeep(this.testCorrectionForm.get('correction_grid').get('footer').get('fields').value);
    if (footer && footer.length) {
      footer.forEach((foot, inFoot) => {
        if (foot?.type === 'correctername' || foot?.label?.includes('correcteur') || foot?.label?.includes('corrector')) {
          if (this.testData.corrector_assigned_for_final_retake && this.testData.corrector_assigned_for_final_retake.length) {
            this.testData.corrector_assigned_for_final_retake.forEach((corr, inCor) => {
              if (corr.test_groups && corr.test_groups.length) {
                const group = corr.test_groups.find((test) => test._id === this.selectedGroupData._id);

                if (group && group.students && group.students.length) {
                  const student = group.students.find((test) => test.student_id._id === this.studentSelectDetail._id);

                  if (student) {
                    const corrector = this.testData.corrector_assigned_for_final_retake[inCor];

                    if (corrector) {
                      const name = corrector.corrector_id.last_name + ' ' + corrector.corrector_id.first_name;
                      if (
                        !this.testCorrectionForm.get('correction_grid').get('footer').get('fields').get(inFoot.toString()).get('value')
                          .value
                      ) {
                        if (foot.data_type !== 'checkbox') {
                          this.testCorrectionForm
                            .get('correction_grid')
                            .get('footer')
                            .get('fields')
                            .get(inFoot.toString())
                            .get('value')
                            .patchValue(name);
                        }
                      }
                    }
                  } else {
                    this.testData.corrector_assigned.forEach((corrs, inCors) => {
                      if (corrs.test_groups && corrs.test_groups.length) {
                        const groups = corrs.test_groups.find((test) => test._id === this.selectedGroupData._id);

                        if (groups && group.students && group.students.length) {
                          const students = group.students.find((test) => test.student_id._id === this.studentSelectDetail._id);

                          if (students) {
                            const correctors = this.testData.corrector_assigned[inCors];

                            if (correctors) {
                              const name = correctors.corrector_id.last_name + ' ' + correctors.corrector_id.first_name;
                              if (
                                !this.testCorrectionForm
                                  .get('correction_grid')
                                  .get('footer')
                                  .get('fields')
                                  .get(inFoot.toString())
                                  .get('value').value
                              ) {
                                if (foot.data_type !== 'checkbox') {
                                  this.testCorrectionForm
                                    .get('correction_grid')
                                    .get('footer')
                                    .get('fields')
                                    .get(inFoot.toString())
                                    .get('value')
                                    .patchValue(name);
                                }
                              }
                            }
                          }
                        }
                      }
                    });
                  }
                }
              }
            });
          } else {
            this.testData.corrector_assigned.forEach((corr, inCor) => {
              if (corr.test_groups && corr.test_groups.length) {
                const group = corr.test_groups.find((test) => test._id === this.selectedGroupData._id);

                if (group && group.students && group.students.length) {
                  const student = group.students.find((test) => test.student_id._id === this.studentSelectDetail._id);

                  if (student) {
                    const corrector = this.testData.corrector_assigned[inCor];

                    if (corrector) {
                      const name = corrector.corrector_id.last_name + ' ' + corrector.corrector_id.first_name;
                      if (
                        !this.testCorrectionForm.get('correction_grid').get('footer').get('fields').get(inFoot.toString()).get('value')
                          .value
                      ) {
                        if (foot.data_type !== 'checkbox') {
                          this.testCorrectionForm
                            .get('correction_grid')
                            .get('footer')
                            .get('fields')
                            .get(inFoot.toString())
                            .get('value')
                            .patchValue(name);
                        }
                      }
                    }
                  }
                }
              }
            });
          }
        }
      });
    }
  }

  getFooterFieldsFormArray(): UntypedFormArray {
    return this.testCorrectionForm.get('correction_grid').get('footer').get('fields') as UntypedFormArray;
  }
  getFooterFieldsFromTest() {
    return this.testData.correction_grid.footer.fields;
  }

  getAllDataCorrector(){
    this.subs.sink = this.testCorrectionService.getAllUserCorrector(this.testData?._id, this.testCorrectionForm?.get('school_id')?.value).subscribe((resp) => {
      if(resp && resp?.length){
        this.correctorList = _.cloneDeep(resp);
        this.correctorList = this.correctorList.map((corrData) => {
          return {
            ...corrData,
            full_name: corrData?.last_name + ' ' + corrData?.first_name
          }
        });
        this.correctorList = this.correctorList.sort((firstData, secondData) => {
          return this.utilityService.simplifyRegex(firstData.last_name).localeCompare(this.utilityService.simplifyRegex(secondData.last_name));
        });
        
        const index = this.getFooterFieldsFormArray()?.controls?.findIndex((control) => control?.get('data_type')?.value !== 'checkbox' && control?.get('data_type')?.value !== 'date' && control?.get('type')?.value === 'correctername');
        this.filteredCorrector =  this.getFooterFieldsFormArray().at(index).get('value').valueChanges.pipe(
          startWith(''),
          map((searchName: string) => this.correctorList.filter((correctorName) => this.utilityService.simplifyRegex(correctorName?.full_name)?.toLowerCase().includes(this.utilityService.simplifyRegex(searchName)?.toLowerCase()))),
        );

        // this.getFooterFieldsFormArray().at(index).get('value').valueChanges.pipe(debounceTime(1000)).subscribe(correctorData => {
        //   const foundUser = this.correctorList.find((corrector) => corrector?.full_name === correctorData);
        //   if (!foundUser) {
        //     this.getFooterFieldsFormArray().at(index).get('value').patchValue('', {emitEvent: false});
        //   }
        // })
      };
    })
  }

  setUserCorrector(correctorData){
    const correctorName = correctorData?.last_name?.toUpperCase() + ' ' + correctorData?.first_name;
    const index = this.getFooterFieldsFormArray()?.controls?.findIndex((control) => control?.get('data_type')?.value !== 'checkbox' && control?.get('data_type')?.value !== 'date' && control?.get('type')?.value === 'correctername');
    this.getFooterFieldsFormArray()?.at(index)?.get('value')?.setValue(correctorName);
  }

  checkCorrector(fieldIndex) {
    const searchString = this.getFooterFieldsFormArray().at(fieldIndex).get('value').value;
    const find = this.correctorList.find((corrector) => corrector?.full_name === searchString);
    if (find) {
      this.getFooterFieldsFormArray().at(fieldIndex).get('value').setValue(find?.full_name);
    } else {
      this.getFooterFieldsFormArray().at(fieldIndex).get('value').setValue(null, {emitEvent: false});
    }
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }
}
