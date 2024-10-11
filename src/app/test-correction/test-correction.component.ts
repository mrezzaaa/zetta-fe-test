import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked, ChangeDetectorRef } from '@angular/core';
import { UntypedFormGroup, UntypedFormBuilder, Validators, UntypedFormArray } from '@angular/forms';
import { SubSink } from 'subsink';
import { Router, ActivatedRoute } from '@angular/router';
import { InformationDialogComponent } from './information-dialog/information-dialog.component';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';
import { TestCorrectionService } from 'app/service/test-correction/test-correction.service';
import { ParseLocalToUtcPipe } from 'app/shared/pipes/parse-local-to-utc.pipe';
import * as _ from 'lodash';
import swal from 'sweetalert2';
import { BehaviorSubject, forkJoin, merge, of } from 'rxjs';
import { ParseUtcToLocalPipe } from 'app/shared/pipes/parse-utc-to-local.pipe';
import {
  TestCorrectionInput,
  TestCorrectionCorrectionGridCorrectionSectionInput,
  TestCorrectionCorrectionGridCorrectionInput,
  TestCorrectionCorrectionGridCorrectionSectionEvalskillInput,
  MultipleDateCorrection,
  TestCorrection,
  TestCorrectionCorrectionGridCorrectionPenaltyBonusInput,
} from './test-correction.model';
import { Section, PenaltiesBonuses, Correction, SectionEvalskill } from 'app/test/test-creation/test-creation.model';
import { SpeechToTextDialogComponent } from 'app/shared/components/speech-to-text-dialog/speech-to-text-dialog.component';
import { TestDetailsComponent } from 'app/rncp-titles/dashboard/test-details/test-details.component';
import { TranslateService } from '@ngx-translate/core';
import { PRINTSTYLES } from 'assets/scss/theme/doc-style';
import { TranscriptBuilderService } from 'app/service/transcript-builder/transcript-builder.service';
import { Observable } from 'apollo-link';
import Swal from 'sweetalert2';
import * as moment from 'moment';
import { AuthService } from 'app/service/auth-service/auth.service';
import { removeSpaces } from 'app/service/customvalidator.validator';
import { NgxPermissionsService } from 'ngx-permissions';
import { PdfDetailComponent } from './pdf-detail/pdf-detail.component';
import { UserProfileData } from 'app/users/user.model';
import { PdfGroupDetailComponent } from './pdf-group-detail/pdf-group-detail.component';
import { UtilityService } from 'app/service/utility/utility.service';
import { FileUploadService } from 'app/service/file-upload/file-upload.service';
import { AcademicKitService } from 'app/service/rncpTitles/academickit.service';

import * as DecoupledEditor from 'assets/ckeditor5-custom/ckeditor.js';
import { ApplicationUrls } from 'app/shared/settings';
import { Location } from '@angular/common';
import { PdfGroupDetailDialogComponent } from './pdf-group-detail/pdf-group-detail-dialog/pdf-group-detail-dialog.component';
import { CompetenceJobDescriptionResponse } from 'app/student-cards/job-description/job-desc.model';
import { filter, take, tap } from 'rxjs/operators';
import { environment } from 'environments/environment';
import { ImportMarkDialogComponent } from './import-mark-dialog/import-mark-dialog.component';
import { MatTab, MatTabGroup, MatTabHeader } from '@angular/material/tabs';
import { CoreService } from 'app/service/core/core.service';
import { SignatureCorrectorDialogComponent } from './signature-corrector-dialog/signature-corrector-dialog.component';
import { PdfTestDetailComponent } from './pdf-test-detail/pdf-test-detail.component';
import { Cacheable } from 'ngx-cacheable';
import { TestUtilityService } from 'app/service/test/test-utility.service';
import { UserActivityService } from 'app/service/user-activity/user-activity.service';
import { TutorialService } from 'app/service/tutorial/tutorial.service';

interface FilteredStudentList {
  correctionGrid?: any;
  testCorrectionId: string;
  _id: string;
  first_name: string;
  last_name: string;
  doc: string;
  missing_copy: boolean;
  is_do_not_participated: boolean;
  score: number;
  is_justified: string;
  school: {
    _id: string;
    short_name: string;
  };
  academic_pro_evaluation: {
    status: string;
  };
  soft_skill_pro_evaluation: {
    status: string;
  };
}

interface FilteredGroupList {
  correctionGrid?: any;
  groupTestCorrectionId: string;
  _id: string;
  name: string;
  doc: string;
  missing_copy: boolean;
  is_do_not_participated: boolean;
  is_justified: string;
  score: number;
}

@Component({
  selector: 'ms-test-correction',
  templateUrl: './test-correction.component.html',
  styleUrls: ['./test-correction.component.scss'],
  providers: [ParseLocalToUtcPipe, ParseUtcToLocalPipe],
})
export class TestCorrectionComponent implements OnInit, AfterViewChecked, OnDestroy {
  private subs = new SubSink();
  @ViewChild(PdfDetailComponent, { static: false }) pdfDetailRef: PdfDetailComponent;
  @ViewChild(PdfGroupDetailComponent, { static: false }) pdfGroupDetailRef: PdfGroupDetailComponent;
  @ViewChild(PdfTestDetailComponent, { static: false }) pdfTestDetailComponent: PdfTestDetailComponent;
  @ViewChild('notationGridContainer', { static: false }) notationGridContainer: ElementRef;
  @ViewChild('footerContainer', { static: false }) footerContainer: ElementRef;
  @ViewChild('fileUpload', { static: false }) fileUploader: ElementRef;
  @ViewChild('elementOfProofUpload', { static: false }) elementOfProofUploader: ElementRef;
  @ViewChild('competenceMatGroup', { static: false }) competenceMatGroup: MatTabGroup;

  selectedCompetenceIndex: number = 0;
  nextCompetenceIndex: null | number = null

  public Editor = DecoupledEditor;
  public config = {};
  selectedFile: File;
  uploadDocForm: any = {};
  testCorrectionForm: UntypedFormGroup;
  testCorrectionId = null;
  groupTestCorrectionId = null;

  titleId: string;
  schoolId: string;
  testId: string;
  taskId: string;
  groupId: string;

  selectedGroupData: any;

  titleData;
  schoolData;
  testData;
  taskData;
  selectedCorrector;
  selectedCorrectorId = '';
  selectedStudentId = '';
  maximumFinalMark = 0;
  additionalDecimalDigits = 0;

  studentList: any[];
  filteredStudentList: FilteredStudentList[];
  filteredGroupList: FilteredGroupList[];
  groupSelect: any;
  firstForm: any;
  studentSelect: any;
  originalStudentList: any = [];
  groupModel: any;
  test_group_id: any;
  studentSpecializationId: string = '';
  studentSelectDetail: any;
  studentData: any[];
  groupData: any[];
  groupList: any[];
  isStudent = false;
  isGroup = true;
  isWaitingForResponse = false;
  isWaitingPdf = false;
  private isWaitingPdfSource = new BehaviorSubject<boolean>(false);
  isWaitingPdf$ = this.isWaitingPdfSource.asObservable();
  loadReady = false;
  currentDate: any;
  CurUser: any;
  isADMTC: any;
  isUserLoginStudent = false;
  myInnerHeight = 960;
  currentUser: UserProfileData;

  userFullName: string;

  isDataLoaded = false;
  isTestHasDocumentExpected = false;
  isTestValidated = false;
  isModificationPeriodMoreThan14Days = false;
  loadOneTime = true;
  studentOfAllGroupList = [];
  dataFilledStudentOfAllGroupList = [];
  multipleDatesFormArray = new UntypedFormArray([]);
  isDataSaved = false;
  isDataSubmit = false;
  firstTime = true;
  isRefreshMultipleDateNotationGrid = false;
  isRefreshJuryNotationGrid = false;
  studentJobDescriptions: CompetenceJobDescriptionResponse[] = [];
  isAllStudentInputLatestMultipleDate: boolean;
  missingCopyDocument: any;
  elementOfProofDocument: any;
  serverimgPath = `${ApplicationUrls.baseApi}/fileuploads/`.replace('/graphql', '');
  isAcadir = false;
  isAcadAdmin = false;
  isCertifierAdmin = false;
  disabledCke = false;
  private timeOutVal: any;
  emptyTask = false;
  historyLastUpdated;
  isSaveThisScore = false;
  disabledSaveThisScore = false;
  isEvalProAuto = false;
  isChangedCorrector = false;
  isCannotBeEdited = false

  currentUserData = [];

  previouslySavedAsDraftStudent = null;

  dialogData: any;
  dataTutorial: any;
  tutorialData: any;
  isPermission: any;
  isTutorialAdded = false;
  tutorialIcon = '../../assets/img/tutorial.png';
  public onReady(editor) {
    editor.ui.getEditableElement().parentElement.insertBefore(editor.ui.view.toolbar.element, editor.ui.getEditableElement());
  }

  currentSectionTestData: any;
  currentSectionTabForm: any;

  tempCurrentSectionTabForm: any;

  showComptentyTab: any;
  showButtonImport: any;
  clickSubmitCorrection = false;
  isSavedAfterMoveTab = false;
  isSavedCurrentStudent = false;

  getDataForm: any;
  nextStudent = null;
  nextGroup = null;
  isSavedFromSubmitMarkS1 = false
  isTaskValidateTest = false
  isTaskMarkEntry = false

  constructor(
    private fb: UntypedFormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    public dialog: MatDialog,
    private testUtilityService: TestUtilityService,
    private testCorrectionService: TestCorrectionService,
    private parseUTCtoLocal: ParseUtcToLocalPipe,
    private parseLocaltoUTC: ParseLocalToUtcPipe,
    private translate: TranslateService,
    private transcriptBuilderService: TranscriptBuilderService,
    private CurUserService: AuthService,
    private permissions: NgxPermissionsService,
    private authService: AuthService,
    private utilService: UtilityService,
    private fileUploadService: FileUploadService,
    private acadKitService: AcademicKitService,
    private _location: Location,
    private cdr: ChangeDetectorRef,
    public coreService: CoreService,
    public tutorialService: TutorialService,
    private el:ElementRef,
    private userActivity: UserActivityService,
  ) {}

  ngOnInit() {
    this.isCertifierAdmin = this.utilService.isUserCRDirAdmin();
    if (!!this.permissions.getPermission('Academic Director') || !!this.permissions.getPermission('Academic Admin')) {
      this.isAcadir = true;
    }
    if (!!this.permissions.getPermission('ADMTC Director') || !!this.permissions.getPermission('ADMTC Admin')) {
      this.isADMTC = true;
    }
    if (!!this.permissions.getPermission('Student')) {
      this.isUserLoginStudent = true;
    }
    this.currentUser = _.cloneDeep(this.authService.getLocalStorageUser());
    this.subs.sink = this.route.paramMap.subscribe((params) => {
      this.titleId = params.get('titleId');
      this.testId = params.get('testId');
    });
    this.subs.sink = this.route.queryParamMap.subscribe((queryParams) => {
      this.taskId = queryParams.get('task');
      this.schoolId = queryParams.get('school');
    });
    this.CurUser = this.CurUserService.getLocalStorageUser();
    this.currentDate = moment().format('DD MMM YYYY');
    this.initTestCorrectionForm();
    // before getting test data, get the type of test first so on gettest we do not asking for companies and job desc if not pro eval
    if (this.testId) {
      this.testCorrectionService.getTestType(this.testId, this.schoolId).subscribe((resp) => {
        const autoProEval = [
          'academic_auto_evaluation',
          'academic_pro_evaluation',
          'soft_skill_auto_evaluation',
          'soft_skill_pro_evaluation',
        ];
        this.isEvalProAuto = resp?.type && autoProEval.includes(resp?.type);
        this.getDataFromParam();
      });
    }

    this.subs.sink = this.testCorrectionForm.get('student').valueChanges.subscribe((resp) => {
      if (resp) {
        const foundStudent = _.find(this.studentList, (student) => student._id === resp);
        if (foundStudent) {
          this.studentSelect = foundStudent.last_name.toUpperCase() + ' ' + foundStudent.first_name;
        }
      }
    });

    this.userFullName = this.currentUser?.last_name + ' ' + this.currentUser?.first_name;
  }

  /** `trackBy` function for tracking an item inside `*ngFor` using its `_id`. Can be used for any loop of data that has unique `_id`. */
  trackById(index: number, data: any) {
    return data?._id;
  }

  initTestCorrectionForm() {
    this.testCorrectionForm = this.fb.group({
      test: [this.testId, Validators.required],
      corrector: ['', Validators.required],
      student: [''],
      missing_copy: [false],
      is_justified: [null],
      reason_for_missing_copy: [''],
      document_for_missing_copy: [],
      date: this.fb.group({
        date_utc: [''],
        time_utc: [''],
      }),
      correction_grid: this.initCorrectionGridForm(),
      status: ['active'],
      expected_documents: this.fb.array([]),
      jury_enabled_list: this.fb.array([]),
      should_retake_test: [false],
      mark_entry_document: [null],
      element_of_proof_doc: [null],
      is_cross_correction: [false],
      final_retake: [false],
      quality_control: [false],
      jury_organization: [false],
      jury_organization_id: [null],
      jury_member_id: [null],
      for_retake_correction: [false],
      is_different_notation_grid: [false],
      is_initial_correction: [false],
      retake_correction: [null],
      initial_marks_total: [null],
      initial_marks_additional_total: [null],
      initial_correction: [null],
      school_id: [this.schoolId],
      is_saved: [false],
      is_saved_as_draft: [false],
      is_do_not_participated: [false],
    });
  }

  initCorrectionGridForm() {
    return this.fb.group({
      header: this.initHeaderCorrectionGridForm(),
      correction: this.initCorrectionForm(),
      footer: this.initFooterCorrectionGridForm(),
    });
  }

  initCorrectionForm() {
    return this.fb.group({
      penalties: this.fb.array([]),
      bonuses: this.fb.array([]),
      elimination: [false],
      elimination_reason: [''],
      total: [null],
      total_jury_avg_rating: [null],
      additional_total: [0],
      final_comment: [''],
      sections: this.fb.array([]),
      sections_evalskill: this.fb.array([]),
    });
  }

  initHeaderCorrectionGridForm(): UntypedFormGroup {
    return this.fb.group({
      fields: this.fb.array([]),
    });
  }

  initFooterCorrectionGridForm(): UntypedFormGroup {
    return this.fb.group({
      fields: this.fb.array([]),
    });
  }

  initHeaderFooterFieldsForm(): UntypedFormGroup {
    return this.fb.group({
      type: ['', Validators.required],
      label: ['', Validators.required], // will be value from step 2
      value: [null, [Validators.required, removeSpaces]], // real value inputted by used
      data_type: ['', Validators.required],
      align: ['', Validators.required],
    });
  }

  initSectionForm() {
    return this.fb.group({
      coefficient: [null],
      section_extra_total: [0],
      title: [''],
      rating: [null],
      comment: [''],
      sub_sections: this.fb.array([]),
      // *************** Starts front end only fields. Make sure to remove this fields in the `formatPayload` function
      cleanTitle: [''],
      // *************** End front end only fields.
    });
  }

  initSubSectionForm() {
    return this.fb.group({
      title: [''],
      directions: [''],
      rating: [null],
      marks_number: [null],
      marks_letter: [''],
      score_conversion_id: [null],
      comments: [''],
      jurys: this.fb.array([]),
      // *************** Starts front end only fields. Make sure to remove this fields in the `formatPayload` function
      cleanTitle: [''],
      cleanDirections:[''],
      showFullTitle: [false], // dummy field to truncate text
      showFullDirection: [false], // dummy field to truncate direction
      // *************** End front end only fields.
    });
  }

  initSectionEvalskillForm() {
    return this.fb.group({
      ref_id: [''],
      is_selected: [false],
      title: [''],
      rating: [null],
      comment: [''],
      academic_skill_competence_template_id: [null],
      soft_skill_competence_template_id: [null],
      academic_skill_block_template_id: [null],
      soft_skill_block_template_id: [null],
      sub_sections: this.fb.array([]),
      competence_status: [null],
      // *************** Starts front end only fields. Make sure to remove this fields in the `formatPayload` function
      missionsActivitiesAutonomy: this.fb.array([]),
      cleanTitle: [''],
      // *************** End front end only fields.
    });
  }

  initSubSectionEvalskillForm() {
    return this.fb.group({
      ref_id: [''],
      is_selected: [false],
      is_criteria_evaluated: [true],
      title: [''],
      rating: [null],
      comments: [''],
      directions: [''],
      marks_number: [null],
      marks_letter: [''],
      score_conversion_id: [null],
      academic_skill_criteria_of_evaluation_competence_id: [null],
      soft_skill_criteria_of_evaluation_competence_id: [null],
      academic_skill_competence_template_id: [null],
      soft_skill_competence_template_id: [null],
      jurys: this.fb.array([]),
      multiple_dates: this.fb.array([]),
      // *************** Starts front end only fields. Make sure to remove this fields in the `formatPayload` function
      cleanTitle: [''],
      cleanDirections:[''],
      showFullTitle: [false], // dummy field to truncate text
      showFullDirection: [false], // dummy field to truncate direction
      // *************** End front end only fields.
    });
  }

  initMissionsActivitiesAutonomyForm() {
    return this.fb.group({
      mission: [null],
      activity: [null],
      autonomy_level: [null],
    })
  }

  initBonusPenaltyFieldForm() {
    return this.fb.group({
      title: [''],
      rating: [0],
    });
  }

  initExpectedDocumentForm() {
    return this.fb.group({
      document_name: [''],
      document: [null],
      is_uploaded: [false],
      validation_status: ['uploaded'],
    });
  }

  initJurysSubSectionForm() {
    return this.fb.group({
      name: [''],
      marks: [null],
      score_conversion_id: [null],
    });
  }

  initMultipleDatesSubSectionForm() {
    return this.fb.group({
      date: [''],
      // tempTime: [''],
      marks: [null],
      observation: [''],
      score_conversion_id: [''],
    });
  }

  initJuryEnabledList(index) {
    return this.fb.group({
      position: [index ? index : 0],
      state: [index === 0 ? true : false],
    });
  }

  getDataFromParam() {
    const forkParam = [];
    // get title data
    if (this.titleId) {
      const titleGet = this.testCorrectionService.getTitle(this.titleId);
      forkParam.push(titleGet);
    }

    // get test data
    if (this.testId) {
      const testGet = this.testCorrectionService.getTest(this.testId, this.schoolId, this.isEvalProAuto);
      forkParam.push(testGet);
    }

    // get task data
    if (this.taskId) {
      const taskGet = this.testCorrectionService.getTask(this.taskId);
      forkParam.push(taskGet);
    }

    // get school data
    if (this.schoolId) {
      const schoolGet = this.testCorrectionService.getSchool(this.schoolId);
      forkParam.push(schoolGet);
    }

    this.isWaitingForResponse = true;
    this.subs.sink = forkJoin(forkParam).subscribe((resp) => {
      this.isWaitingForResponse = false;
      this.isDataLoaded = true;
      if (resp && resp.length) {
        let count = 0;
        if (this.titleId) {
          this.titleData = resp[count];
          count++;
        }
        if (this.testId) {
          this.testData = _.cloneDeep(resp[count]);
          this.showComptentyTab = this.competencyTabValidation();
          this.showButtonImport= this.importFunctionValidation();
          if (this.testData?.correction_grid?.correction?.sections_evalskill?.length) {
            let tempSectionsEvalSkill = _.cloneDeep(this.testData.correction_grid.correction.sections_evalskill);
            tempSectionsEvalSkill = tempSectionsEvalSkill
              ?.filter((section) => section?.is_selected)
              ?.map((section) => {
                return {
                  ...section,
                  sub_sections: section?.sub_sections?.filter((subSection) => subSection?.is_selected),
                };
              });
            this.testData.correction_grid.correction.sections_evalskill = tempSectionsEvalSkill
          }
          this.headerFormatFields(resp[count]);
          this.footerFormatFields(resp[count]);
          this.populateTestData(this.testData);
          this.resetSelectedTabIndex()
          if (this.firstTime) {
            this.createEmptyTestCorrection();
          }
          this.isValidatedByAcadirOrCertAdmin();
          this.calculateMaximumFinalMark();
          this.checkModificationPeriodDate();
          this.isTestHasDocumentExpected = this.checkTestDocumentExpected();
          this.isTestValidated = this.checkIfTestValidated();
          if (this.isTestValidated && !this.isADMTC) {
            this.testCorrectionForm.disable();
            this.disabledCke = true;
          }
          count++;
        } else {
          this.getCurrentTab()
        }
        if (this.taskId) {
          this.taskData = resp[count];
          this.getCurrentUser();
          if (resp[count]) {
            // *************** START OF populate last update to get data for swal CHANGE_N2
            const filteredDataOfSaveAssignedCorrector = this.taskData?.previous_tasks?.[0]?.history_of_updates?.filter(
              (data) => data?.function_name === 'SaveAssignedCorrector',
            );
            if (filteredDataOfSaveAssignedCorrector?.length) {
              this.historyLastUpdated = filteredDataOfSaveAssignedCorrector[filteredDataOfSaveAssignedCorrector?.length - 1];
            }
            // *************** END OF populate last update to get data for swal CHANGE_N2

            this.populateTestCorrectionFormWithTaskData();
            this.populateStudentList(resp[count]);

            if (!this.isADMTC && this.taskData.task_status === 'pending') {
              Swal.fire({
                type: 'info',
                title: this.translate.instant('REMOVE_CORRECTOR_S1.TITLE'),
                text: this.translate.instant('REMOVE_CORRECTOR_S1.TEXT', { eval_name: this.testData?.name }),
                confirmButtonText: this.translate.instant('REMOVE_CORRECTOR_S1.BUTTON'),
                footer: `<span style="margin-left: auto">REMOVE_CORRECTOR_S1</span>`,
              }).then((res) => {
                this.router.navigate(['/rncpTitles']);
              });
            }

            count++;
          } else {
            this.emptyTask = true;
            Swal.fire({
              type: 'info',
              title: this.translate.instant('REMOVE_CORRECTOR_S1.TITLE'),
              text: this.translate.instant('REMOVE_CORRECTOR_S1.TEXT', { eval_name: this.testData?.name }),
              confirmButtonText: this.translate.instant('REMOVE_CORRECTOR_S1.BUTTON'),
              footer: `<span style="margin-left: auto">REMOVE_CORRECTOR_S1</span>`,
            }).then((res) => {
              this.router.navigate(['/rncpTitles']);
            });
          }
        } else {
          this.getStudentFromCorrectorAssigned();
          if (this.testData.group_test) {
            this.getAllGroupByTestIdAndGroupId();
          }
        }
        if (this.schoolId) {
          this.schoolData = resp[count];
          count++;
        }
        // *************** For test with cross correction type, if there is no task data, meaning it comes from acad kit. So we need to
        if (!this.taskId && this.testData && this.testData.correction_type === 'cross_correction' && this.schoolId) {
          this.populateStudentList(resp[count]);
        }
      }

      this.getInAppTutorial();
      if (!this.firstTime) {
        if (this.testData && this.testData.group_test && this.isStudent) {
          this.getFilteredStudentList();
          this.sortStudentList();
        } else if (this.testData && !this.testData.group_test) {
          this.getFilteredStudentList();
          this.sortStudentList();
        } else if (this.testData && this.testData.group_test) {
          // this.getFilteredGroupList();
        }
      }

      this.isTaskMarkEntry = this.checkIfTaskIsMarkEntry();
      this.isTaskValidateTest = this.checkIfTaskIsValidateTest();
    });
  }

  createEmptyTestCorrection() {
    const listEval = [
      'academic_auto_evaluation',
      'academic_pro_evaluation',
      'soft_skill_auto_evaluation',
      'soft_skill_pro_evaluation',
      'academic_auto_evaluation',
    ];
    if (!listEval?.includes(this.testData?.type)) {
      this.isWaitingForResponse = true;
      const payload = _.cloneDeep(this.formatPayload());

      if (payload) {
        payload.correction_grid.correction.additional_total = Number(payload.correction_grid.correction.additional_total);
        payload.correction_grid.correction.total_jury_avg_rating = Number(payload.correction_grid.correction.total_jury_avg_rating);
        payload.correction_grid.correction.total = Number(payload.correction_grid.correction.total);
        payload.correction_grid.correction.sections.forEach((element, sectionIndex) => {
          if (payload?.correction_grid?.correction?.sections[sectionIndex]) {
            payload.correction_grid.correction.sections[sectionIndex].section_extra_total = 0;
            payload.correction_grid.correction.sections[sectionIndex].coefficient = Number(element.coefficient);
            payload.correction_grid.correction.sections[sectionIndex].rating = Number(element.rating);
            payload.correction_grid.correction.sections[sectionIndex].sub_sections.forEach((elementSub, subSectionIndex) => {
              payload.correction_grid.correction.sections[sectionIndex].sub_sections[subSectionIndex].rating =
                elementSub?.rating || elementSub?.rating === 0 ? Number(elementSub.rating) : null;
            });
          }
        });
        payload.correction_grid.correction.sections_evalskill.forEach((element, sectionIndex) => {
          if (payload?.correction_grid?.correction?.sections_evalskill[sectionIndex]) {
            payload.correction_grid.correction.sections_evalskill[sectionIndex].rating = element.rating ? Number(element.rating) : null;
            payload.correction_grid.correction.sections_evalskill[sectionIndex].sub_sections.forEach((elementSub, subSectionIndex) => {
              payload.correction_grid.correction.sections_evalskill[sectionIndex].sub_sections[subSectionIndex].rating =
                elementSub?.rating || elementSub?.rating === 0 ? Number(elementSub.rating) : null;
              if (
                payload.correction_grid.correction.sections_evalskill[sectionIndex].sub_sections[subSectionIndex].multiple_dates &&
                payload.correction_grid.correction.sections_evalskill[sectionIndex].sub_sections[subSectionIndex].multiple_dates.length
              ) {
                payload.correction_grid.correction.sections_evalskill[sectionIndex].sub_sections[subSectionIndex].multiple_dates.forEach(
                  (date, dateIndex) => {
                    if (date?.marks || date.marks === 0) {
                      date.marks = Number(date.marks);
                    }
                  },
                );
                // when saving data, sort from earliest date to latest date
                if (this.taskData) {
                  payload.correction_grid.correction.sections_evalskill[sectionIndex].sub_sections[
                    subSectionIndex
                  ].multiple_dates = payload.correction_grid.correction.sections_evalskill[sectionIndex].sub_sections[
                    subSectionIndex
                  ].multiple_dates.reverse();
                }
              } else {
                delete payload.correction_grid.correction.sections_evalskill[sectionIndex].sub_sections[subSectionIndex].multiple_dates;
              }
            });
            payload.correction_grid.correction.sections_evalskill[sectionIndex].competence_status = !payload.correction_grid.correction
              .sections_evalskill[sectionIndex]?.competence_status
              ? 'not_started'
              : payload.correction_grid.correction.sections_evalskill[sectionIndex]?.competence_status;
          }
        });
        payload.corrector = null;
        delete payload.student;
        delete payload.test_group_id;
      }
      this.subs.sink = this.testCorrectionService.CreateTestCorrectionForAllStudentAndGroup(payload).subscribe(resp => {
        this.isWaitingForResponse = false;
        if (this.testData && this.testData.group_test && this.isStudent) {
          this.getFilteredStudentList();
          this.sortStudentList();
        } else if (this.testData && !this.testData.group_test) {
          this.getFilteredStudentList();
          this.sortStudentList();
        } else if (this.testData && this.testData.group_test) {
          this.populateGroupList();
        }
      });
    } else {
      if (this.testData && this.testData.group_test && this.isStudent) {
        this.getFilteredStudentList();
        this.sortStudentList();
      } else if (this.testData && !this.testData.group_test) {
        this.getFilteredStudentList();
        this.sortStudentList();
      } else if (this.testData && this.testData.group_test) {
        this.populateGroupList();
      }
    }
  }

  sortStudentList() {
    this.studentList = _.orderBy(this.studentList, ['last_name'], ['asc']);
    this.studentList = this.studentList.sort((a, b) => {
      return a.last_name.toLowerCase().localeCompare(b.last_name.toLowerCase());
    });
  }

  calculateMaximumFinalMark() {
    if (this.testData?.correction_grid?.correction) {
      const correctionData: Correction = this.testData.correction_grid.correction;
      if (this.testData?.correction_grid?.correction?.display_section_coefficient) {
        this.maximumFinalMark = +correctionData?.section_coefficient?.section_additional_max_score;
      } else {
        correctionData.sections.forEach((section) => {
          this.maximumFinalMark = this.maximumFinalMark + (section.maximum_rating ? +section.maximum_rating : 0);
        });
      }
    }
    if (this.testData?.correction_grid?.correction?.display_final_total) {
      this.additionalDecimalDigits = this.testData.correction_grid.correction?.total_zone?.decimal_place || 0;
    }
  }

  checkModificationPeriodDate() {
    // calculate difference of today date with modification_period_date.
    // if the difference more than 14 days, hide the save, submit, and validate button for user other than ADMTC

    if (this.testData.block_type === 'competence' || this.testData.block_type === 'soft_skill') {
      this.isModificationPeriodMoreThan14Days = false;
      return;
    }

    if (!this.utilService.isUserEntityADMTC() && this.testData && this.testData.correction_status_for_schools) {
      const schoolCorrection = this.testData.correction_status_for_schools.find((corr) => {
        if (corr && corr.school && corr.school._id) {
          return corr.school._id === this.schoolId;
        }
        return false;
      });
      if (schoolCorrection) {
        // schoolCorrection.modification_period_date.date = '01/11/2020';
        // schoolCorrection.modification_period_date.time = '15:59';
        const today = moment().format('DD/MM/YYYY');
        const date = schoolCorrection.modification_period_date.date ? schoolCorrection.modification_period_date.date : today;
        const time = schoolCorrection.modification_period_date.time ? schoolCorrection.modification_period_date.time : '00:00';
        if (date && time) {
          const modificationDate = this.parseUTCtoLocal.transformDateInDateFormat(date, time);
          const dayDifference = moment().diff(modificationDate, 'days');

          if (dayDifference > 30) {
            this.isModificationPeriodMoreThan14Days = true;
          }
        }
      }
    }
  }

  getAdditionalScore() {
    if (this.testData && this.testData.correction_grid && this.testData.correction_grid.correction) {
      if (this.testData.correction_grid.correction.total_zone.display_additional_total) {
        return this.testData.correction_grid.correction.total_zone.additional_max_score;
      } else {
        return '';
      }
    }
  }

  /**
   * Function to get the score to be displayed in the `student-list` or `group-list` component
   * @param testCorrection Test correction data of the student or group
   * @returns Test correction's score if all the marks are already corrected. Returns `null` instead when not all of the marks are corrected
   */
  getScore(testCorrection: any): number | null {
    const correctionMark = testCorrection?.correction_grid?.correction
    let score = null;
    if (this.testData.type === 'free_continuous_control' || this.testData?.controlled_test) {
      const total = correctionMark?.additional_total
      score = total >= 0 && total <= 20 ? total : null
    } else if (testCorrection?.is_saved && this.testData?.correction_grid?.correction?.total_zone?.display_additional_total) {
      score = correctionMark?.additional_total || 0;
    } else if (testCorrection?.is_saved) {
      score = correctionMark?.total || 0;
    }

    return score;
  }

  getCompanyAndMentor(companies: any[]) {
    const company = companies.find((comp) => comp.status === 'active');
    return company ? company : null;
  }

  addStudentWithNoCorrection(student: any) {
    return {
      testCorrectionId: null,
      _id: student._id,
      first_name: student.first_name,
      last_name: student.last_name,
      civility: student.civility,
      doc: null,
      missing_copy: false,
      is_do_not_participated: false,
      is_justified: null,
      score: null,
      company: student.companies && student.companies.length ? this.getCompanyAndMentor(student.companies) : null,
      specialization_id: student?.specialization?._id,
    };
  }

  populateStudentsWithTestCorrection(testCorrections: TestCorrection[]) {
    const tempStudentList = _.cloneDeep(this.studentList);

    let tempResult = [];
    if (testCorrections && testCorrections.length) {
      testCorrections.forEach((testCorrection) => {
        if (testCorrection.student) {
          // add test correction data to student that we get from corrector_assigned array
          let temporaryResult;
          const found = _.find(tempStudentList, (studentList) => studentList?._id === testCorrection?.student?._id);
          if (found) {

            temporaryResult = {
              testCorrectionId: testCorrection?._id,
              _id: found._id,
              school: found && found.school ? found.school : null,
              first_name: found.first_name,
              last_name: found.last_name,
              civility: found.civility,
              doc: testCorrection.expected_documents,
              missing_copy: testCorrection.missing_copy ? testCorrection.missing_copy : false,
              is_do_not_participated: testCorrection.is_do_not_participated ? testCorrection.is_do_not_participated : false,
              is_justified: testCorrection.is_justified ? testCorrection.is_justified : null,
              score: this.getScore(testCorrection),
              company: found.companies && found.companies.length ? this.getCompanyAndMentor(found.companies) : null,
              academic_pro_evaluation: found.academic_pro_evaluation,
              soft_skill_pro_evaluation: found.soft_skill_pro_evaluation,
              correctionGrid: testCorrection.correction_grid,
              specialization_id: found?.specialization?._id,
            }

            if (testCorrection?.correction_grid?.correction?.sections_evalskill?.length) {
              temporaryResult = {
                ...temporaryResult,
                correctionGrid: {
                  ...testCorrection.correction_grid,
                  correction: {
                    ...testCorrection.correction_grid.correction,
                    sections_evalskill: testCorrection.correction_grid.correction.sections_evalskill.filter((section) => section?.is_selected)
                  }
                },
              }
            }
            // **************** Add additional map process to clean html data on the comment field after change the ckeditor to textarea
            if (temporaryResult?.correctionGrid?.correction?.sections_evalskill?.length) {
              temporaryResult?.correctionGrid?.correction?.sections_evalskill.forEach((element, idx) => {
                if (element?.comment) {
                  temporaryResult.correctionGrid.correction.sections_evalskill[idx].comment = this.getFullTextFromHtml(element?.comment)
                }
              });
            }
            tempResult.push(temporaryResult);
          }
        }
      });
      // remove duplicated student if student has multiple test correction data
      tempResult = _.uniqBy(tempResult, '_id');
      // if student has no test correction yet, add empty test correction to that student
      tempStudentList.forEach((student) => {
        const found = _.find(tempResult, (tempStudent) => tempStudent?._id === student?._id);
        if (!found) {
          tempResult.push(this.addStudentWithNoCorrection(student));
        }
      });
    } else {
      // if there is no test correction for this test, students, and school yet, add all student from corrector_assigned array
      this.studentList.forEach((student) => {
        tempResult.push(this.addStudentWithNoCorrection(student));
      });
    }
    this.filteredStudentList = tempResult;
    this.filteredStudentList = _.orderBy(this.filteredStudentList, ['last_name'], ['asc']);
    this.filteredStudentList = this.filteredStudentList.sort((a, b) => {
      return a.last_name.toLowerCase().localeCompare(b.last_name.toLowerCase());
    });
    if (this.testData && !this.testData.group_test) {
      this.populateStudentRemaining(this.filteredStudentList);
      if(this.isSavedFromSubmitMarkS1){
        this.isSavedFromSubmitMarkS1 = false
        this.submittedTestCorrection()
      }
      else if ((this.testData.type !== 'academic_pro_evaluation' && this.testData.type !== 'soft_skill_pro_evaluation') || this.isDataSubmit) {
        this.populateFormFirstTime();
      } else if (this.firstTime) {
        this.firstTime = false;
        this.populateFormFirstTime();
      }
      if (this.taskData && this.taskData.description !== 'Validate Test') {
        this.getAllTestCorrection();
      }
    }else if(this.testData?.group_test && this.showComptentyTab && !this.isSavedFromSubmitMarkS1){
      this.populateFormFirstTime();
    }else if(this.isSavedFromSubmitMarkS1){
      this.isSavedFromSubmitMarkS1 = false
      this.submittedTestCorrection()
    }
  }


  getFilteredStudentList() {
    if (this.selectedCorrector && this.selectedCorrector.corrector_id && this.selectedCorrector.corrector_id._id) {
      const selectorID = this.selectedCorrector.corrector_id._id;
      this.selectedCorrectorId = selectorID;
      this.testCorrectionForm.get('corrector').patchValue(this.selectedCorrectorId);
      const student_ids = [];
      if (this.studentList && this.studentList.length) {
        this.studentList.forEach((student) => {
          student_ids.push(student._id);
        });
      }
      this.isWaitingForResponse = true;
      // if there is task data (open mark entry page from pending task or task table), execute this block of code
      this.subs.sink = this.testCorrectionService
        .getAllTestCorrectionWithStudents(this.testId, student_ids, this.schoolId)
        .subscribe((response) => {
          this.isWaitingForResponse = false;
          this.populateStudentsWithTestCorrection(response);
        });
    } else {
      // if there is no task data (when open mark entry page from folder 06 acadkit), execute this block of code
      this.selectedCorrectorId = this.currentUser._id;
      this.testCorrectionForm.get('corrector').patchValue(this.selectedCorrectorId);
      this.isWaitingForResponse = true;

      if (this.testData && this.testData.correction_type && this.testData.correction_type === 'cross_correction') {
        const student_ids = [];
        const students = _.cloneDeep(this.studentList);
        if (students && students.length) {
          students.forEach((student) => {
            student_ids.push(student._id);
          });
          this.subs.sink = this.testCorrectionService
            .getAllTestCorrectionNonCorrectorByCross(this.testId, student_ids)
            .subscribe((response) => {
              this.isWaitingForResponse = false;
              if (response) {
                this.populateStudentsWithTestCorrection(response);
              }
            });
        }else if(this.isSavedFromSubmitMarkS1){
          this.isSavedFromSubmitMarkS1 = false
          this.submittedTestCorrection()
        }
        this.isWaitingForResponse = false;
      } else {
        // const studentsId = this.route.snapshot.queryParams?.studentId;
        // If task is mark entry and its for auto evaluation. thats mean its only for 1 student. Filter out the student in getalltestcorrection
        const autoEvaluation = ['academic_auto_evaluation', 'soft_skill_auto_evaluation']
        let studentIds = [];
        if (autoEvaluation.includes(this.testData?.type) && this.taskData?.description === 'Marks Entry') {
          if (this.studentList && this.studentList.length) {
            this.studentList.forEach((student) => {
              studentIds.push(student._id);
            });
          }
        }

        this.subs.sink = this.testCorrectionService.getAllTestCorrectionNonCorrector(this.testId, this.schoolId).subscribe((response) => {
          this.isWaitingForResponse = false;
          if (response) {
            this.populateStudentsWithTestCorrection(response);
          }
        });
      }
    }
  }

  populateStudentsInGroupWithTestCorrection(testCorrections: TestCorrection[]) {
    const tempStudentList = _.cloneDeep(this.studentList);
    let tempResult = [];
    const tempAllStudentList = _.cloneDeep(this.studentOfAllGroupList);
    const tempAllStudent = [];
    if (testCorrections && testCorrections.length) {
      testCorrections.forEach((testCorrection) => {
        if (testCorrection.student) {
          // add test correction data to student that we get from corrector_assigned array
          const found = _.find(tempStudentList, (studentList) => studentList._id === testCorrection.student._id);
          if (found) {
            tempResult.push({
              testCorrectionId: testCorrection._id,
              _id: found._id,
              first_name: found.first_name,
              last_name: found.last_name,
              civility: found.civility,
              doc: testCorrection.expected_documents,
              missing_copy: testCorrection.missing_copy ? testCorrection.missing_copy : false,
              is_justified: testCorrection.is_justified ? testCorrection.is_justified : null,
              is_do_not_participated: testCorrection.is_do_not_participated ? testCorrection.is_do_not_participated : false,
              score: this.getScore(testCorrection),
              company: found.companies && found.companies.length ? this.getCompanyAndMentor(found.companies) : null,
              specialization_id: found?.specialization?._id,
              correctionGrid: testCorrection.correction_grid ? testCorrection.correction_grid : null
            });
          }

          const foundAllStudent = _.find(tempAllStudentList, (studentList) => studentList._id === testCorrection.student._id);
          if (foundAllStudent) {
            tempAllStudent.push({
              testCorrectionId: testCorrection._id,
              _id: foundAllStudent._id,
              first_name: foundAllStudent.first_name,
              last_name: foundAllStudent.last_name,
              doc: testCorrection.expected_documents,
              missing_copy: testCorrection.missing_copy ? testCorrection.missing_copy : false,
              is_justified: testCorrection.is_justified ? testCorrection.is_justified : null,
              groupId: foundAllStudent.groupId,
              score: this.getScore(testCorrection),
              company:
                foundAllStudent.companies && foundAllStudent.companies.length ? this.getCompanyAndMentor(foundAllStudent.companies) : null,
              specialization_id: foundAllStudent?.specialization?._id,
              correctionGrid: testCorrection.correction_grid ? testCorrection.correction_grid : null
            });
          }
        }
      });
      // remove duplicated student if student has multiple test correction data
      tempResult = _.uniqBy(tempResult, '_id');
      // if student has no test correction yet, add empty test correction to that student
      tempStudentList.forEach((student) => {
        const found = _.find(tempResult, (tempStudent) => tempStudent._id === student._id);
        if (!found) {
          tempResult.push(this.addStudentWithNoCorrection(student));
        }
      });
    } else {
      // if there is no test correction for this test, students, and school yet, add all student from corrector_assigned array
      this.studentList.forEach((student) => {
        tempResult.push(this.addStudentWithNoCorrection(student));
      });
    }
    this.filteredStudentList = tempResult;
    this.filteredStudentList = _.orderBy(this.filteredStudentList, ['last_name'], ['asc']);
    this.filteredStudentList = this.filteredStudentList.sort((a, b) => {
      return a.last_name.toLowerCase().localeCompare(b.last_name.toLowerCase());
    });
    this.dataFilledStudentOfAllGroupList = tempAllStudent;
    this.populateStudentRemaining(this.filteredStudentList);
  }

  getFilteredStudentListInGroup() {
    if (this.selectedCorrector && this.selectedCorrector.corrector_id && this.selectedCorrector.corrector_id._id) {
      const selectorID = this.selectedCorrector.corrector_id._id;
      this.selectedCorrectorId = selectorID;
      this.testCorrectionForm.get('corrector').patchValue(this.selectedCorrectorId);
      const student_ids = [];
      if (this.studentList && this.studentList.length) {
        this.studentList.forEach((student) => {
          student_ids.push(student._id);
        });
      }
      this.isWaitingForResponse = true;
      // if there is task data (open mark entry page from pending task or task table), execute this block of code
      this.subs.sink = this.testCorrectionService
        .getAllTestCorrectionWithStudents(this.testId, student_ids, this.schoolId)
        .subscribe((response) => {
          this.isWaitingForResponse = false;
          this.populateStudentsInGroupWithTestCorrection(response);
        });
    } else {
      // if there is no task data (when open mark entry page from folder 06 acadkit), execute this block of code
      this.selectedCorrectorId = this.currentUser._id;
      this.testCorrectionForm.get('corrector').patchValue(this.selectedCorrectorId);
      this.isWaitingForResponse = true;
      this.subs.sink = this.testCorrectionService.getAllTestCorrectionNonCorrector(this.testId, this.schoolId).subscribe((response) => {
        this.isWaitingForResponse = false;
        if (response) {
          this.populateStudentsInGroupWithTestCorrection(response);
        }
      });
    }
  }

  populateTestData(dataRef) {
    const data = _.cloneDeep(dataRef);
    if (data) {
      // Populate the date
      if (data.date) {
        if (data.date.date_utc) {
          this.testCorrectionForm.get('date').get('date_utc').patchValue(data.date.date_utc);
        }
        if (data.date.time_utc) {
          this.testCorrectionForm.get('date').get('time_utc').patchValue(data.date.time_utc);
        }
      }

      // Populate header fields
      if (
        data.correction_grid &&
        data.correction_grid.header &&
        data.correction_grid.header.fields &&
        data.correction_grid.header.fields.length
      ) {
        const result = [];
        data.correction_grid.header.fields.forEach((headerField) => {
          this.addHeaderFieldsFormArray();
          const index = this.getHeaderFieldsFormArray().length - 1;
          headerField.label = headerField.value;
          if (headerField.data_type === 'checkbox') {
            headerField.value = false;
            this.getHeaderFieldsFormArray().at(index).get('value').setValidators([Validators.requiredTrue]);
            this.getHeaderFieldsFormArray().at(index).get('value').updateValueAndValidity();
          } else if (!headerField.data_type) {
            headerField.data_type = 'text';
          } else {
            headerField.value = '';
          }
          result.push(headerField);
        });
        // Populate the form with filtered header fields
        this.testCorrectionForm.get('correction_grid').get('header').get('fields').patchValue(result);
      }

      // Populate footer fields
      if (
        data.correction_grid &&
        data.correction_grid.footer &&
        data.correction_grid.footer.fields &&
        data.correction_grid.footer.fields.length
      ) {
        const result = [];
        data.correction_grid.footer.fields.forEach((footerField) => {
          this.addFooterFieldsFormArray();
          const index = this.getFooterFieldsFormArray().length - 1;
          footerField.label = footerField.value;
          if (footerField.data_type === 'checkbox') {
            footerField.value = false;
            this.getFooterFieldsFormArray().at(index).get('value').setValidators([Validators.requiredTrue]);
            this.getFooterFieldsFormArray().at(index).get('value').updateValueAndValidity();
          } else if (!footerField.data_type) {
            footerField.data_type = 'text';
          } else {
            footerField.value = '';
          }
          if (footerField.value === 'Nom du Président de Jury') {
            footerField.value = '';
          }
          result.push(footerField);
        });
        // Populate the form with filtered footer fields
        this.testCorrectionForm.get('correction_grid').get('footer').get('fields').patchValue(result);
      }

      // populate expected document
      if (data.expected_documents && data.expected_documents.length) {
        data.expected_documents.forEach((doc) => {
          this.addExpectedDocumentForm();
        });
      }

      // populate corection field
      if (data.correction_grid && data.correction_grid.correction) {
        const correction: Correction = data.correction_grid.correction;
        if (correction.sections && correction.sections.length) {
          const sections: Section[] = correction.sections;
          sections.forEach((section, sectionIndex) => {
            // add title to notation grid form table
            this.addSectionForm();
            this.getSectionForm().at(sectionIndex).get('title').setValue(section.title);
            this.getSectionForm().at(sectionIndex).get('coefficient').setValue(section.coefficient);
            this.getSectionForm().at(sectionIndex).get('section_extra_total').setValue(section.section_extra_total);
            if (this.testData?.correction_grid?.correction?.comment_for_each_section) {
              this.getSectionForm()?.at(sectionIndex)?.get('comment')?.setValidators([Validators.required]);
              this.getSectionForm()?.at(sectionIndex)?.get('comment')?.updateValueAndValidity();
            }
            this.getSectionForm().at(sectionIndex).get('cleanTitle').setValue(this.getFullTextFromHtml(section.title));
            if (section?.sub_sections?.length) {
              section.sub_sections.forEach((subSection, subSectionIndex) => {
                // add text and direction value to notation grid form table
                this.addSubSectionForm(sectionIndex);
                this.getSubSectionForm(sectionIndex).at(subSectionIndex).get('title').setValue(subSection.title);
                this.getSubSectionForm(sectionIndex).at(subSectionIndex).get('directions').setValue(subSection.direction);
                this.getSubSectionForm(sectionIndex).at(subSectionIndex).get('cleanTitle').setValue(this.getFullTextFromHtml(subSection.title));
                this.getSubSectionForm(sectionIndex).at(subSectionIndex).get('cleanDirections').setValue(this.getFullTextFromHtml(subSection.direction));
                if (
                  data?.type === 'academic_recommendation' &&
                  !this.testCorrectionForm.get('missing_copy').value &&
                  !this.testCorrectionForm.get('is_do_not_participated').value
                ) {
                  this.getSubSectionForm(sectionIndex).at(subSectionIndex).get('comments').setValidators([Validators.required]);
                  this.getSubSectionForm(sectionIndex).at(subSectionIndex).get('comments').updateValueAndValidity();
                } else {
                  if (this.testData?.correction_grid?.correction?.comment_for_each_sub_section) {
                    this.getSubSectionForm(sectionIndex).at(subSectionIndex).get('comments').setValidators([Validators.required]);
                    this.getSubSectionForm(sectionIndex).at(subSectionIndex).get('comments').updateValueAndValidity();
                  }
                  this.getSubSectionForm(sectionIndex).at(subSectionIndex).get('rating').setValidators([Validators.required]);
                  this.getSubSectionForm(sectionIndex).at(subSectionIndex).get('rating').updateValueAndValidity();
                }
                // add jury subsection form array if test type is jury organization
                data.jury_max = 3; // hard coded as 3 in admtc v1
                this.testData.jury_max = 3;
                if ((data.type === 'memoire_oral_non_jury' || data.type === 'memoire_oral') && data.jury_max >= 0) {
                  for (let i = 0; i < data.jury_max; i++) {
                    this.addJurysSubSectionForm(sectionIndex, subSectionIndex);
                  }
                }
              });
            }
          });
        }

        const listEval = [
          'academic_auto_evaluation',
          'academic_pro_evaluation',
          'soft_skill_auto_evaluation',
          'soft_skill_pro_evaluation',
        ];
        if (correction.sections_evalskill && correction.sections_evalskill.length) {
          const sections: SectionEvalskill[] = correction.sections_evalskill;
          sections
            .filter(
              section =>
                !section?.specialization_id ||
                !listEval?.includes(this.testData?.type) ||
                (listEval?.includes(this.testData?.type) && section?.specialization_id === this.studentSpecializationId),
            )
          .forEach((section, sectionIndex) => {
              // add title to notation grid form table
              this.addSectionEvalskillForm();
              this.getSectionEvalskillForm().at(sectionIndex).get('ref_id').setValue(section.ref_id);
              this.getSectionEvalskillForm().at(sectionIndex).get('is_selected').setValue(section.is_selected);
              this.getSectionEvalskillForm().at(sectionIndex).get('title').setValue(section.title);
              this.getSectionEvalskillForm().at(sectionIndex).get('cleanTitle').setValue(this.getFullTextFromHtml(section.title));
              if (section.academic_skill_competence_template_id && section.academic_skill_competence_template_id._id) {
                this.getSectionEvalskillForm()
                  .at(sectionIndex)
                  .get('academic_skill_competence_template_id')
                  .setValue(section.academic_skill_competence_template_id._id);
              }
              if (section.soft_skill_competence_template_id && section.soft_skill_competence_template_id._id) {
                this.getSectionEvalskillForm()
                  .at(sectionIndex)
                  .get('soft_skill_competence_template_id')
                  .setValue(section.soft_skill_competence_template_id._id);
              }
              if (section?.sub_sections?.length) {
                section.sub_sections.forEach((subSection, subSectionIndex) => {
                  // add text and direction value to notation grid form table
                  this.addSubSectionEvalskillForm(sectionIndex);
                  this.getSubSectionEvalskillForm(sectionIndex).at(subSectionIndex).get('ref_id').setValue(subSection.ref_id);
                  this.getSubSectionEvalskillForm(sectionIndex).at(subSectionIndex).get('is_selected').setValue(subSection.is_selected);
                  this.getSubSectionEvalskillForm(sectionIndex).at(subSectionIndex).get('title').setValue(subSection.title);
                  this.getSubSectionEvalskillForm(sectionIndex).at(subSectionIndex).get('directions').setValue(subSection.direction);
                  this.getSubSectionEvalskillForm(sectionIndex).at(subSectionIndex).get('cleanTitle').setValue(this.getFullTextFromHtml(subSection.title));
                  this.getSubSectionEvalskillForm(sectionIndex).at(subSectionIndex).get('cleanDirections').setValue(this.getFullTextFromHtml(subSection.direction));
                  // add jury subsection form array if test type is jury organization
                  data.jury_max = 3; // hard coded as 3 in admtc v1
                  this.testData.jury_max = 3;
                  if ((data.type === 'memoire_oral_non_jury' || data.type === 'memoire_oral') && data.jury_max >= 0) {
                    for (let i = 0; i < data.jury_max; i++) {
                      this.addJurysSubSectionForm(sectionIndex, subSectionIndex);
                    }
                  }
                  if (
                    subSection.academic_skill_criteria_of_evaluation_competence_id &&
                    subSection.academic_skill_criteria_of_evaluation_competence_id._id
                  ) {
                    this.getSubSectionEvalskillForm(sectionIndex)
                      .at(subSectionIndex)
                      .get('academic_skill_criteria_of_evaluation_competence_id')
                      .setValue(subSection.academic_skill_criteria_of_evaluation_competence_id._id);
                  }
                  if (subSection.is_selected) {
                    this.getSubSectionEvalskillForm(sectionIndex).at(subSectionIndex).get('rating').setValidators([Validators.required,Validators.min(0)]);
                    this.getSubSectionEvalskillForm(sectionIndex).at(subSectionIndex).get('rating').updateValueAndValidity();
                  }
                });
              }
            });
        }

        if (correction.show_penalty && correction.penalties && correction.penalties.length) {
          const penalties: PenaltiesBonuses[] = correction.penalties;
          penalties.forEach((penalty, penaltyIndex) => {
            // add penalty title and maximum rating
            this.addPenaltyFieldForm();
            this.getPenaltiesFieldForm().at(penaltyIndex).get('title').setValue(penalty.title);
            this.getPenaltiesFieldForm().at(penaltyIndex).get('rating').setValidators([Validators.required]);
            this.getPenaltiesFieldForm().at(penaltyIndex).get('rating').updateValueAndValidity();
          });
        }
        if (correction.show_bonus && correction.bonuses && correction.bonuses.length) {
          const bonuses: PenaltiesBonuses[] = correction.bonuses;
          bonuses.forEach((bonus, bonusIndex) => {
            // add bonus title and maximum rating
            this.addBonusFieldForm();
            this.getBonusesFieldForm().at(bonusIndex).get('title').setValue(bonus.title);
            this.getBonusesFieldForm().at(bonusIndex).get('rating').setValidators([Validators.required]);
            this.getBonusesFieldForm().at(bonusIndex).get('rating').updateValueAndValidity();
          });
        }
        if (correction.show_final_comment) {
          this.getCorrectionForm().get('final_comment').setValidators([Validators.required]);
          this.getCorrectionForm().get('final_comment').updateValueAndValidity();
        }
      }

      // populate the enabled list(the slider in jury form)
      if (data.type === 'memoire_oral_non_jury' || data.type === 'memoire_oral') {
        for (let i = 0; i < 3; i++) {
          this.addJuryEnabledList(i);
        }
      }

      // this.firstForm = _.cloneDeep(this.testCorrectionForm.value);
    }

    this.getCurrentTab()
  }

  populateTestCorrectionFormWithTaskData() {
    if (this.taskData) {
      if (this.taskData.type === 'final_retake_marks_entry') {
        this.testCorrectionForm.get('final_retake').setValue(true);
      }
      if (
        this.taskData.type === 'jury_organization_marks_entry' ||
        this.taskData.type === 'validate_jury_organization' ||
        this.taskData.type === 'certifier_validation'
      ) {
        this.testCorrectionForm.get('jury_organization').setValue(true);
        if (this.taskData.jury_id && this.taskData.jury_id?._id) {
          this.testCorrectionForm.get('jury_organization_id').setValue(this.taskData.jury_id._id);
        }
        this.testCorrectionForm.get('jury_member_id').setValue(this.taskData.jury_member_id);
      }
    }
  }

  getCorrectorAssigned(taskData?: any): any[] {
    let correctorAssigned = [];

    // for jury organization test, get student list from president_jury_assigned
    if (
      taskData &&
      (taskData.type === 'jury_organization_marks_entry' ||
        taskData.type === 'validate_jury_organization' ||
        taskData.type === 'certifier_validation')
    ) {
      this.testCorrectionForm.get('jury_organization').setValue(true);
      correctorAssigned = _.cloneDeep(this.testData.president_jury_assigned);
    } else if (
      this.testData.president_jury_assigned.length &&
      (this.testData.type === 'memoire_oral_non_jury' || this.testData.type === 'memoire_oral')
    ) {
      // if there is no task data (we open it from folder 06, then we can check if president_jury_assigned has value or not)
      // if has value, then this test is jury organization
      correctorAssigned = _.cloneDeep(this.testData.president_jury_assigned);
      this.testCorrectionForm.get('jury_organization').setValue(true);
      this.testCorrectionForm.get('jury_organization_id').setValue(correctorAssigned[0]?.jury_member_id?._id);
      this.testCorrectionForm.get('jury_member_id').setValue(correctorAssigned[0]?.jury_member_id?.jury_organization_id?._id);
    }

    // for final retake test, get student list from corrector_assigned_for_final_retake
    else if (taskData && (taskData.type === 'final_retake_marks_entry' || taskData.type === 'validate_test_correction_for_final_retake')) {
      correctorAssigned = _.cloneDeep(this.testData.corrector_assigned_for_final_retake);
    } else if (this.testData.corrector_assigned_for_final_retake.length) {
      // if there is no task data (we open it from folder 06, then we can check if corrector_assigned_for_final_retake has value or not)
      // if has value, then this test is retake test
      correctorAssigned = _.cloneDeep(this.testData.corrector_assigned_for_final_retake);
    }

    // for normal test, get student list from corrector_assigned
    else {
      correctorAssigned = _.cloneDeep(this.testData.corrector_assigned);
    }

    return correctorAssigned;
  }

  populateStudentList(dataRef) {
    const taskData = _.cloneDeep(dataRef);

    // if doesnt have task data and for test cross correction, then get all student correction for the student list
    if (this.testData && this.testData.correction_type === 'cross_correction' && !taskData) {
      this.subs.sink = this.testCorrectionService
        .getStudentsByTestAndSchoolForCrossCorrection(this.testId, this.schoolId)
        .subscribe((res) => {
          this.studentList = _.cloneDeep(res);
          const student_ids = [];
          const studentsList = _.cloneDeep(this.studentList);
          if (studentsList && studentsList.length) {
            studentsList.forEach((student) => {
              student_ids.push(student._id);
            });
          }
          if (this.loadOneTime) {
            this.loadOneTime = false;
            this.subs.sink = this.testCorrectionService
              .getAllTestCorrectionNonCorrectorByCross(this.testId, student_ids)
              .subscribe((response) => {
                this.isWaitingForResponse = false;
                this.populateStudentsWithTestCorrection(response);
              });
          }
        });
    } else {
      // If from cross correction then get the student is different
      if (taskData.type === 'cross_correction') {
        this.subs.sink = this.testCorrectionService.getStudentForCrossCorrMarksEntry(this.taskId).subscribe((students) => {
          this.studentList = _.cloneDeep(students);

          const student_ids = [];
          const studentsList = _.cloneDeep(this.studentList);
          if (studentsList && studentsList.length) {
            studentsList.forEach((student) => {
              student_ids.push(student._id);
            });
          }
          if (this.loadOneTime) {
            this.loadOneTime = false;
            this.subs.sink = this.testCorrectionService
              .getAllTestCorrectionNonCorrectorByCross(this.testId, student_ids)
              .subscribe((response) => {
                this.isWaitingForResponse = false;
                this.populateStudentsWithTestCorrection(response);
              });
          }
        });
      }
      // get student list data if task type is jury organization
      else if (taskData && taskData.type === 'jury_organization_marks_entry') {
        if (this.testData) {
          // Find the corrector by filtering corrector_assigned array in test data with task's user_selection id
          const correctorAssigned = this.getCorrectorAssigned(taskData);

          const selectedCorrector = correctorAssigned.find((corrector) => {
            if (corrector.corrector_id && corrector.corrector_id._id && taskData.user_selection && taskData.user_selection.user_id) {
              const correctorFound = corrector.corrector_id._id === taskData.user_selection.user_id._id;
              if (corrector.jury_member_id && corrector.jury_member_id._id && taskData.jury_member_id) {
                const juryIdFound = corrector.jury_member_id._id === taskData.jury_member_id;
                return juryIdFound && correctorFound;
              }
              return correctorFound;
            } else {
              return false;
            }
          });
          if (selectedCorrector) {
            this.studentList = selectedCorrector.students;
            this.studentList = this.studentList.filter((student) => (student.school ? student.school._id === this.schoolId : false));
            this.selectedCorrector = selectedCorrector;
          }
        }
      }
      // validate test for jury
      else if (
        (taskData && (taskData.type === 'validate_jury_organization' || taskData.type === 'certifier_validation')) ||
        (this.checkIfTaskIsValidateTest() && this.testData.type === 'memoire_oral')
      ) {
        const correctorAssigned = this.getCorrectorAssigned(taskData);
        this.studentList = correctorAssigned.reduce((accumulator, currentValue) => accumulator.concat(currentValue.students), []);
        this.studentList = this.studentList.filter((student) => (student.school ? student.school._id === this.schoolId : false));
        this.studentList = _.uniqBy(this.studentList, '_id');

        this.selectedCorrector = taskData.user_selection.user_id._id;
      }

      // get student list data if task type is normal test or final retake
      else if (taskData && (taskData.description === 'Marks Entry' || taskData.type === 'final_retake_marks_entry')) {
        if (this.testData) {
          // Find the corrector by filtering corrector_assigned array in test data with task's user_selection id
          const correctorAssigned = this.getCorrectorAssigned(taskData);
          const selectedCorrector = correctorAssigned.find((corrector) => {
            if (corrector && corrector.corrector_id && corrector.corrector_id._id) {
              const schoolFound = corrector.school_id._id === this.schoolId;
              const correctorFound = corrector.corrector_id._id === taskData.user_selection.user_id._id;
              return schoolFound && correctorFound;
            } else {
              return false;
            }
          });
          if (selectedCorrector) {
            this.studentList = selectedCorrector.students;
            this.selectedCorrector = selectedCorrector;
          }
        }
      }
      // if task is validate test
      else if (this.checkIfTaskIsValidateTest()) {
        this.getStudentFromCorrectorAssigned();
      }

      // if task data has transcript process id, it mean this mark entry is transcript retake mark entry. so only display 1 student
      if (taskData.transcript_process_id && taskData.transcript_process_id._id && taskData.student_id && taskData.student_id._id) {
        const transcriptRetakeStudent = this.studentList.find((stud) => stud._id === taskData.student_id._id);
        this.studentList = [transcriptRetakeStudent];
      }
    }
  }

  getStudentFromCorrectorAssigned() {
    // Find the corrector by filtering corrector_assigned array in test data with task's user_selection id
    const correctorAssigned = this.getCorrectorAssigned();

    if (this.testData.type === 'memoire_oral') {
      this.studentList = correctorAssigned.reduce((accumulator, currentValue) => accumulator.concat(currentValue.students), []);
      this.studentList = this.studentList.filter((student) => (student.school ? student.school._id === this.schoolId : false));
      this.studentList = _.uniqBy(this.studentList, '_id');
      this.selectedCorrector = null;
    } else {
      const temp = [];
      correctorAssigned.forEach((corrector) => {
        if (
          corrector &&
          corrector.school_id &&
          corrector.school_id._id === this.schoolId &&
          corrector.students &&
          corrector.students.length
        ) {
          corrector.students.forEach((student) => {
            temp.push(student);
          });
        }
      });

      this.studentList = temp;
      this.selectedCorrector = null;
    }
  }

  openInformation() {
    this.subs.sink = this.dialog
      .open(InformationDialogComponent, {
        disableClose: true,
        width: '600px',
        panelClass: 'certification-rule-pop-up',
        data: this.testData,
      })
      .afterClosed()
      .subscribe((result) => {
        if (result) {
        }
      });
  }

  populateStudentRemaining(data) {
    if (data) {
      this.studentData = data;
      this.studentData = _.orderBy(this.studentData, ['last_name'], ['asc']);
      this.studentData = this.studentData.sort((a, b) => {
        return a.last_name.toLowerCase().localeCompare(b.last_name.toLowerCase());
      });
      if (this.previouslySavedAsDraftStudent?._id) {
        this.studentSelectDetail = _.cloneDeep(this.previouslySavedAsDraftStudent);
      } else {
        this.studentSelectDetail = data;
      }
    }
  }

  studentFilter(event) {
    this.studentData = this.originalStudentList.filter((student) =>
      student
        ? student.last_name
            .toLowerCase()
            .trim()
            .includes(this.studentSelect ? this.studentSelect.toLowerCase() : '')
        : '',
    );
    this.studentData = _.orderBy(this.studentData, ['last_name'], ['asc']);
    this.studentData = this.studentData.sort((a, b) => {
      return a.last_name.toLowerCase().localeCompare(b.last_name.toLowerCase());
    });
  }

  groupFilter(event) {
    if (this.groupModel && this.groupModel.length >= 3) {
      this.groupData = this.filteredGroupList.filter((groups) =>
        groups ? groups.name.toLowerCase().trim().includes(this.groupModel.toLowerCase()) : '',
      );
    }
  }

  updateFirstForm(eventData) {
    this.firstForm = _.cloneDeep(this.testCorrectionForm.value);
  }

  studentSelected(event, notResetIndex?) {
    // If student is same (doesn't change), index of competence will not change (stay in current tab competence)
    notResetIndex = this.selectedStudentId === event?._id ? true : notResetIndex
    // *************** needValidation only true when being called as eventEmitted from studentList to make the validation only triggers if user click on studentList UI.
    this.changeStudentSelection(event, notResetIndex);
  }

  changeStudentSelection(event,notResetIndex?) {
    this.isStudent = true;
    this.isGroup = false;
    this.studentSelectDetail = _.cloneDeep(event);
    this.testCorrectionForm.get('student').patchValue(event._id);
    if(notResetIndex !== true){
      this.resetSelectedTabIndex()
    }

    this.studentSpecializationId = event?.specialization_id;
    this.selectedStudentId = event._id ? event._id : '';
    this.studentSelect = event.last_name.toUpperCase() + ' ' + event.first_name;
    this.setStudentJobDescriptionData();
    this.injectMissionsActivitiesAutonomyToTestCorrectionForm();
    if (event.testCorrectionId) {
      this.testCorrectionId = event.testCorrectionId;
    } else {
      this.testCorrectionId = null;
      this.formReset();
    }
  }

  injectMissionsActivitiesAutonomyToTestCorrectionForm() {
    const formArrayControls = this.getSectionEvalskillForm().controls;
    formArrayControls.forEach((sectionControl, sectionIndex) => {
      const templateId = sectionControl.get('academic_skill_competence_template_id').value;
      // get template by filtering from competence_template_id
      const selectedTemplate = this.studentJobDescriptions.find((template) => {
        return template?.competence_template_id?._id && template.competence_template_id._id === templateId;
      });
      if (selectedTemplate?.missions_activities_autonomy?.length) {
        selectedTemplate.missions_activities_autonomy.forEach((autonomy, autonomyIndex) => {
          this.addMissionsActivitiesAutonomyForm(sectionIndex);
          this.getMissionsActivitiesAutonomyForm(sectionIndex).at(autonomyIndex).setValue(autonomy);
        })
      }
    });
  }

  setMissingCopyDocument(event) {
    if (event) {
      this.missingCopyDocument = event;
    }
  }

  setElementOfProofDocument(event) {
    if (event) {
      this.elementOfProofDocument = event;
    }
  }

  deleteMissingCopyDoc() {
    Swal.fire({
      type: 'question',
      title: this.translate.instant('JUSTIFY_S2.TITLE'),
      text: this.translate.instant('JUSTIFY_S2.TEXT'),
      showCancelButton: true,
      allowEscapeKey: true,
      confirmButtonText: this.translate.instant('JUSTIFY_S2.BUTTON_1'),
      cancelButtonText: this.translate.instant('JUSTIFY_S2.BUTTON_2'),
      footer: `<span style="margin-left: auto">JUSTIFY_S2</span>`,
    }).then((result) => {
      if (result.value) {
        this.resetMissingCopyDoc();
        Swal.fire({ type: 'success', title: 'Bravo!' });
      }
    });
  }

  resetMissingCopyDoc() {
    this.selectedFile = null;
    this.uploadDocForm = {};
    this.missingCopyDocument = null;
    this.testCorrectionForm.get('document_for_missing_copy').setValue([]);
  }

  resetElementOfProofDoc() {
    this.selectedFile = null;
    this.uploadDocForm = {};
    this.elementOfProofDocument = null;
    this.testCorrectionForm.get('element_of_proof_doc').setValue(null);
  }

  editMissingCopyDoc() {
    this.openUploadWindow();
  }

  setStudentJobDescriptionData() {
    // set student's job description data if test is auto/pro competence
    if (this.testData.type === 'academic_auto_evaluation' || this.testData.type === 'academic_pro_evaluation') {
      const selectedStudentData = this.studentList.find((student) => student._id === this.studentSelectDetail._id);
      if (
        selectedStudentData &&
        selectedStudentData.job_description_id &&
        selectedStudentData.job_description_id.block_of_template_competences &&
        selectedStudentData.job_description_id.block_of_template_competences.length
      ) {
        this.studentJobDescriptions = [];
        selectedStudentData.job_description_id.block_of_template_competences.forEach((blockTemplate) => {
          blockTemplate.competence_templates.forEach((competenceTemplate) => {
            this.studentJobDescriptions.push(competenceTemplate);
          });
        });
      } else {
        this.studentJobDescriptions = [];
      }
    }
  }

  groupSelected(event,isFromSubmitMarkS1?,isSaveFromSubmitMarkS1?) {
    if (this.selectedGroupData?._id !== event?._id) {
      this.resetSelectedTabIndex();
    }
    this.testCorrectionForm.get('student').reset();
    this.selectedGroupData = event;
    this.isStudent = false;
    this.isGroup = true;
    const tempGroupList = _.cloneDeep(event);
    const tempResult = [];
    if (event) {
      const foundStudent = _.find(this.groupList, (grp) => grp._id === event._id);
      this.groupSelect = event.name;
      this.groupModel = event.name;
      this.test_group_id = event._id;

      if (foundStudent && foundStudent.students) {
        foundStudent.students.forEach((data) => {
          tempResult.push({
            testCorrectionId: data.individual_test_correction_id ? data.individual_test_correction_id : null,
            _id: data.student_id._id,
            first_name: data.student_id.first_name,
            last_name: data.student_id.last_name,
            civility: data.student_id.civility,
            doc: null,
            missing_copy: false,
            is_do_not_participated: data.is_do_not_participated ? data.is_do_not_participated : false,
            is_justified: null,
            score: null,
            company:
              data.student_id.companies && data.student_id.companies.length ? this.getCompanyAndMentor(data.student_id.companies) : null,
            specialization_id: data?.specialization?._id,
            correctionGrid: data.individual_test_correction_id && data.individual_test_correction_id.correction_grid ? data.individual_test_correction_id.correction_grid : null
          });
        });
      }

      this.studentList = tempResult;

      // Get all studentlist
      const tempStudent = [];
      this.groupList.forEach((groupData) => {
        if (groupData.students && groupData.students.length) {
          groupData.students.forEach((data) => {
            tempStudent.push({
              testCorrectionId: data.individual_test_correction_id ? data.individual_test_correction_id : null,
              _id: data.student_id._id,
              first_name: data.student_id.first_name,
              last_name: data.student_id.last_name,
              doc: null,
              missing_copy: false,
              is_justified: null,
              is_do_not_participated:
                data && data.student_id && data.student_id.is_do_not_participated ? data.student_id.is_do_not_participated : false,
              score: null,
              groupId: groupData._id,
              company:
                data.student_id.companies && data.student_id.companies.length ? this.getCompanyAndMentor(data.student_id.companies) : null,
              specialization_id: data?.student_id?.specialization?._id,
              correctionGrid: data.individual_test_correction_id && data.individual_test_correction_id.correction_grid ? data.individual_test_correction_id.correction_grid : null
            });
          });
        }
      });
      this.studentOfAllGroupList = tempStudent;

      if (event.groupTestCorrectionId) {
        this.isWaitingForResponse = true;
        this.subs.sink = this.testCorrectionService.getOneGroupTestCorrection(event.groupTestCorrectionId).subscribe((resp) => {
          this.isWaitingForResponse = false;
          let patchData = this.formatDataBeforePatch(_.cloneDeep(resp));
          if (patchData?.correction_grid?.correction?.sections_evalskill?.length) {
            patchData.correction_grid.correction.sections_evalskill = patchData?.correction_grid?.correction?.sections_evalskill?.filter((section) => section?.is_selected)
          }
          this.getFilteredStudentListInGroup();
          this.dataUpdatedGroup(patchData,isFromSubmitMarkS1,isSaveFromSubmitMarkS1);
        });
        this.groupTestCorrectionId = event.groupTestCorrectionId;
      } else {
        this.groupTestCorrectionId = null;
        this.formReset();
        this.filteredStudentList = tempResult;
        this.filteredStudentList = _.orderBy(this.filteredStudentList, ['last_name'], ['asc']);
        this.filteredStudentList = this.filteredStudentList.sort((a, b) => {
          return a.last_name.toLowerCase().localeCompare(b.last_name.toLowerCase());
        });
        if(isSaveFromSubmitMarkS1){
          this.submittedTestCorrection()
        }
      }
    }
  }

  resetSelectedTabIndex() {
    const temp = _.cloneDeep(this.getSectionEvalskillForm()?.value)
    if (temp?.length) {
      this.selectedCompetenceIndex = temp?.findIndex((resp) => resp?.is_selected)
    }
  }

  formReset() {
    this.testCorrectionForm.reset();
    this.initTestCorrectionForm();
    if (this.testId) {
      this.populateTestData(this.testData);
    }
    if (this.taskId) {
      this.populateTestCorrectionFormWithTaskData();
      this.populateStudentList(this.taskData);
    }
    // add empty multiple_dates field inside subsection if date type "multiple_date"
    const testData = _.cloneDeep(this.testData);
    if (testData.date_type === 'multiple_date') {
      const sections: SectionEvalskill[] = testData.correction_grid.correction.sections_evalskill;
      sections.forEach((section, sectionIndex) => {
        if (section?.sub_sections?.length) {
          section.sub_sections.forEach((subSection, subSectionIndex) => {
            this.initMultipleDateForm(sectionIndex, subSectionIndex);
          });
        }
      });
    }
    this.testCorrectionForm.get('student').patchValue(this.selectedStudentId);
    this.testCorrectionForm.get('corrector').patchValue(this.selectedCorrectorId);
    this.firstForm = _.cloneDeep(this.testCorrectionForm.value);
  }

  refreshMultipleDateNotationGrid(isRefresh: boolean) {
    this.isRefreshMultipleDateNotationGrid = isRefresh;
  }

  refreshJuryNotationGrid(isRefresh: boolean) {
    this.isRefreshJuryNotationGrid = isRefresh;
  }

  updateSectionEvalskillFormData(sectionEvalskillData: any[]) {
    // patch sections_evalskill form per section and per subsection
    this.getSectionEvalskillForm().controls.forEach((secEvalForm, secEvalIdx) => {
      // use ref_id to populate data accurately to their form
      const secEvalRefId = secEvalForm.get('ref_id').value;
      const sectionData = sectionEvalskillData.find((sec) => sec.ref_id === secEvalRefId);
      if (sectionData) {
        const subSectionEvalskillData = sectionData?.sub_sections || [];
        if (sectionData?.comment) {
          sectionData.comment = this.getFullTextFromHtml(sectionData?.comment)
        }
        if (sectionData?.title) {
          sectionData.cleanTitle = this.getFullTextFromHtml(sectionData.title);
        }
        delete sectionData.sub_sections;
        secEvalForm.patchValue(sectionData);
        this.getSubSectionEvalskillForm(secEvalIdx).controls.forEach((subSecForm, subSecIdx) => {
          const subSecEvalRefId = subSecForm.get('ref_id').value;
          const subSectionData = subSectionEvalskillData.find((subsec) => subsec.ref_id === subSecEvalRefId);
          if (subSectionData) {
            if (subSectionData?.comments) {
              subSectionData.comments = this.getFullTextFromHtml(subSectionData?.comments)
            }
            if (subSectionData?.title) {
              subSectionData.cleanTitle = this.getFullTextFromHtml(subSectionData.title);
            }
            if (subSectionData?.directions) {
              subSectionData.cleanDirections = this.getFullTextFromHtml(subSectionData.directions);
            }
            subSecForm.patchValue(subSectionData);
          }
        });
      }
    });
  }

  /**
   * Function to add decimal digits to the total, additional total, and each section rating
   * The purpose is to prevent SWAL Unsaved Changes to be displayed after only clicking on the rating field
   * The approach is to make the initial form data (this.firstForm) to be the same with the data after NotationGridFormComponent.validateNumeric function is ran
   * @param testCorrectionData - Reference to the test correction data that is passed ms-student-list and ms-group-list component
   */
  applyDecimalDigitsToScores(testCorrectionData) {

    // For total, transform only those who are not a whole number
    if (typeof testCorrectionData?.correction_grid?.correction?.total === 'number' && testCorrectionData?.correction_grid?.correction?.total % 1 !== 0) {
      testCorrectionData.correction_grid.correction.total = +testCorrectionData.correction_grid.correction.total.toFixed(this.additionalDecimalDigits);
    }

    if (typeof testCorrectionData?.correction_grid?.correction?.additional_total === 'number') {
      testCorrectionData.correction_grid.correction.additional_total = +testCorrectionData.correction_grid.correction.additional_total.toFixed(this.additionalDecimalDigits);
    };

    if (testCorrectionData?.correction_grid?.correction?.sections?.length) {
      for (const section of testCorrectionData.correction_grid.correction.sections) {
        if (typeof section.rating === 'number') {
          section.rating = +section.rating.toFixed(this.additionalDecimalDigits);
        } else {
          section.rating = +Number(0).toFixed(this.additionalDecimalDigits);
        }

        if (typeof section?.section_extra_total === 'number') {
          section.section_extra_total = +section?.section_extra_total.toFixed(this.additionalDecimalDigits);
        } else {
          section.section_extra_total = +Number(0).toFixed(this.additionalDecimalDigits);
        }

        if (section?.sub_sections?.length) {
          for (const subSection of section.sub_sections) {
            // For sub section, transform only those who are not a whole number
            if (typeof subSection.rating === 'number' && subSection.rating % 1 !== 0) {
              subSection.rating = +subSection.rating.toFixed(this.additionalDecimalDigits);
            }
          }
        }
      }
    }
  }

  setIsJustified(event: MatSlideToggleChange) {
    this.testCorrectionForm.get('is_justified').setValue(event.checked ? 'yes' : 'no');
  }

  openUploadElementOfProof() {
    this.elementOfProofUploader.nativeElement.click();
  }

  openUploadWindow() {
    this.fileUploader.nativeElement.click();
  }

  addFile(fileInput: Event, type: string) {
    this.selectedFile = (<HTMLInputElement>fileInput.target).files[0];

    if (this.selectedFile) {
      this.uploadFile(type);
    }
  }

  getTodayDate() {
    const todayUTC = this.parseLocaltoUTC.transformDate(moment().format('DD/MM/YYYY'), '00:00');
    return todayUTC;
  }

  getTodayTime() {
    return '15:59';
  }

  uploadFile(type) {
    // convert selectedFile size in byte to GB by dividing the value by 1e+9
    const selectedFileSizeInGb = this.selectedFile.size / 1000000000;

    if (selectedFileSizeInGb < 1) {
      this.isWaitingForResponse = true;
      this.subs.sink = this.fileUploadService.singleUpload(this.selectedFile).subscribe(
        (resp) => {
          this.isWaitingForResponse = false;
          if (resp && resp.s3_file_name) {
            this.uploadDocForm.type_of_document = 'application/pdf';
            this.uploadDocForm.document_generation_type = type;
            this.uploadDocForm.s3_file_name = resp.s3_file_name;
            this.uploadDocForm.parent_rncp_title = this.titleData._id;
            if (this.testData.group_test) {
              this.uploadDocForm.document_name = `${this.titleData.short_name} ${this.testData.name} ${this.selectedGroupData.name}`;
              this.uploadDocForm.group_test_correction = this.groupTestCorrectionId;
            } else {
              this.uploadDocForm.document_name = `${this.titleData.short_name} ${this.testData.name} ${this.studentSelectDetail.last_name} ${this.studentSelectDetail.first_name}`;
              this.uploadDocForm.test_correction = this.testCorrectionId;
            }
            if (type === 'elementOfProof') {
              this.uploadDocForm.document_name = `${this.translate.instant('element_of_proof')} - ${this.testData.name}`;
              this.uploadDocForm.uploaded_for_student = this.testCorrectionForm.get('student').value;
            }
            this.uploadDocForm.publication_date = {
              publication_date: { date: this.getTodayDate(), time: this.getTodayTime() },
            };
            this.createAcadDoc(type);
          }
        },
        (err) => {
          this.isWaitingForResponse = false;
          Swal.fire({
            type: 'error',
            title: 'Error !',
            text: err && err['message'] ? err['message'] : err,
            confirmButtonText: 'OK',
          }).then((res) => {});
        },
      );
    } else {
      // all of code in else is only sweet alert and removing invalid file
    }
  }

  createAcadDoc(type: string) {
    this.subs.sink = this.acadKitService.createAcadDocJustify(this.uploadDocForm).subscribe((resp) => {
      if (type === 'missingCopy') {
        this.testCorrectionForm.get('document_for_missing_copy').patchValue([resp._id]);
        this.missingCopyDocument = resp;
      } else if (type === 'elementOfProof') {
        this.testCorrectionForm.get('element_of_proof_doc').patchValue(resp._id);
        this.elementOfProofDocument = resp;
      }
      Swal.fire({
        type: 'success',
        title: this.translate.instant('JUSTIFY_S1.TITLE'),
        text: this.translate.instant('JUSTIFY_S1.TEXT'),
        confirmButtonText: this.translate.instant('JUSTIFY_S1.BUTTON_1'),
        footer: `<span style="margin-left: auto">JUSTIFY_S1</span>`,
      });
    });
  }

  dataUpdated(event: TestCorrectionInput) {
    if (!event.correction_grid.header.fields.length) {
      this.resetHeaderForm();
    }
    if (!event.correction_grid.footer.fields.length) {
      this.resetFooterForm();
    }
    if (!event.correction_grid.correction.bonuses.length) {
      this.resetBonusForm();
    }
    if (!event.correction_grid.correction.penalties.length) {
      this.resetPenaltyForm();
    }
    if (!event.correction_grid.correction.sections.length) {
      this.resetSectionForm();
    }
    this.reMapSectionEvalSkillForm();
    if (event.correction_grid.correction?.sections?.length) {
      event.correction_grid.correction.sections.forEach((section, sectionIndex) => {
        if (section?.sub_sections?.length) {
          section.sub_sections.forEach((subSection, subSectionIndex) => {
            if (subSection?.comments) {
              subSection.comments = this.getFullTextFromHtml(subSection.comments);
            }
          })
        }
      })
    }
    if (event.correction_grid.correction?.sections_evalskill?.length) {
      const listEval = [
        'academic_auto_evaluation',
        'academic_pro_evaluation',
        'soft_skill_auto_evaluation',
        'soft_skill_pro_evaluation',
      ];
      event.correction_grid.correction.sections_evalskill
      .filter(
        section =>
          !section?.specialization_id ||
          !listEval?.includes(this.testData?.type) ||
          (listEval?.includes(this.testData?.type) && section?.specialization_id === this.studentSpecializationId),
      )
        .forEach((section, sectionIndex) => {
          if (section?.sub_sections?.length) {
            section.sub_sections.forEach((subsec, subsecIndex) => {
              // remove rating validator in subsection if is_criteria_evaluated false
              if (subsec.is_criteria_evaluated === false) {
                if (
                  this.getSubSectionEvalskillForm(sectionIndex) &&
                  this.getSubSectionEvalskillForm(sectionIndex).at(subsecIndex) &&
                  this.getSubSectionEvalskillForm(sectionIndex).at(subsecIndex).get('rating')
                ) {
                  this.getSubSectionEvalskillForm(sectionIndex).at(subsecIndex).get('rating').clearValidators();
                  this.getSubSectionEvalskillForm(sectionIndex).at(subsecIndex).get('rating').updateValueAndValidity();
                }
              }
              // assign multiple date data from API to subsection form if test date type is multiple date
              if (this.testData && this.testData.date_type === 'multiple_date') {
                if (subsec.multiple_dates && subsec.multiple_dates.length) {
                  this.getMultipleDatesSubSectionForm(sectionIndex, subsecIndex).clear();
                  subsec.multiple_dates.forEach((dateData, dateIndex) => {
                    this.addMultipleDatesSubSectionForm(sectionIndex, subsecIndex);
                    if (this.testData.correction_grid.correction.show_number_marks_column) {
                      const maxRating =  this.testData?.sections_evalskill?.length && this.testData?.sections_evalskill[sectionIndex]?.sub_sections?.length && this.testData?.sections_evalskill[sectionIndex]?.sub_sections[subsecIndex]?.maximum_rating? this.testData?.sections_evalskill[sectionIndex]?.sub_sections[subsecIndex]?.maximum_rating : 5
                      this.getMultipleDatesSubSectionForm(sectionIndex, subsecIndex)
                        .at(dateIndex)
                        .get('marks')
                        .setValidators([Validators.required,Validators.min(0),Validators.max(maxRating)]);
                    } else {
                      this.getMultipleDatesSubSectionForm(sectionIndex, subsecIndex)
                        .at(dateIndex)
                        .get('score_conversion_id')
                        .setValidators([Validators.required]);
                    }
                  });
                } else {
                  this.initMultipleDateForm(sectionIndex, subsecIndex);
                }
              }
            });
          }
        });
    }
    this.getExpectedDocumentForm().clear();
    if (event && event.expected_documents && event.expected_documents.length) {
      event.expected_documents.forEach((doc) => this.addExpectedDocumentForm());
    }
    if (!event.document_for_missing_copy || !event.document_for_missing_copy.length) {
      this.resetMissingCopyDoc();
    }
    if (!event.element_of_proof_doc) {
      this.resetElementOfProofDoc();
    }
    if (!event.date) {
      delete event.date;
    }

    // separate patch data with sections_evalskill because sections_evalskill form need to patched per section and per subsection
    if (event && event.correction_grid && event.correction_grid.correction && event.correction_grid.correction.sections_evalskill) {
      const sectionEvalskillData = event.correction_grid.correction.sections_evalskill;
      delete event.correction_grid.correction.sections_evalskill;
      this.updateSectionEvalskillFormData(sectionEvalskillData);
    }

    // apply decimal digits set from the test creation to the total, additional total, and section rating
    if (event?.correction_grid?.correction?.sections) {
      this.applyDecimalDigitsToScores(event)
    }

    this.testCorrectionForm.patchValue(event);
    this.testCorrectionForm.markAsPristine();
    this.testCorrectionForm.markAsUntouched();
    this.firstForm = _.cloneDeep(this.testCorrectionForm.value);
    this.getDataForm = this.testCorrectionForm.value;
  }

  dataUpdatedGroup(event: TestCorrectionInput,isFromSubmitMarkS1?,isSaveFromSubmitMarkS1?) {
    if (!event.correction_grid.header.fields.length) {
      this.resetHeaderForm();
    }
    if (!event.correction_grid.footer.fields.length) {
      this.resetFooterForm();
    }
    if (!event.correction_grid.correction.bonuses.length) {
      this.resetBonusForm();
    }
    if (!event.correction_grid.correction.penalties.length) {
      this.resetPenaltyForm();
    }
    if (!event.correction_grid.correction.sections.length) {
      this.resetSectionForm();
    }
    this.reMapSectionEvalSkillForm();
    if (event.correction_grid.correction?.sections_evalskill?.length) {
      event.correction_grid.correction.sections_evalskill.forEach((section, sectionIndex) => {
        if (section?.sub_sections?.length) {
          section.sub_sections.forEach((subsec, subsecIndex) => {
            // remove rating validator in subsection if is_criteria_evaluated false
            if (subsec.is_criteria_evaluated === false) {
              this.getSubSectionEvalskillForm(sectionIndex).at(subsecIndex).get('rating').clearValidators();
              this.getSubSectionEvalskillForm(sectionIndex).at(subsecIndex).get('rating').updateValueAndValidity();
            }
          });
        }
      });
    }

    this.getExpectedDocumentForm().clear();
    if (event && event.expected_documents && event.expected_documents.length) {
      event.expected_documents.forEach((doc) => this.addExpectedDocumentForm());
    }
    if (!event.document_for_missing_copy || !event.document_for_missing_copy.length) {
      this.resetMissingCopyDoc();
    }
    if (!event.element_of_proof_doc) {
      this.resetElementOfProofDoc();
    }
    if (!event.date) {
      delete event.date;
    }

    // separate patch data with sections_evalskill because sections_evalskill form need to patched per section and per subsection
    if (event && event.correction_grid && event.correction_grid.correction && event.correction_grid.correction.sections_evalskill) {
      const sectionEvalskillData = event.correction_grid.correction.sections_evalskill;
      delete event.correction_grid.correction.sections_evalskill;
      this.updateSectionEvalskillFormData(sectionEvalskillData);
    }

    // apply decimal digits set from the test creation to the total, additional total, and section rating
    if (event?.correction_grid?.correction?.sections) {
      this.applyDecimalDigitsToScores(event)
    }

    this.testCorrectionForm.patchValue(event);
    this.testCorrectionForm.markAsPristine();
    this.testCorrectionForm.markAsUntouched();
    this.firstForm = _.cloneDeep(this.testCorrectionForm.value);
    if(isFromSubmitMarkS1){
      this.selectedIndex('SUBMIT_MARK_S1')
    }else if(isSaveFromSubmitMarkS1){
      this.submittedTestCorrection()
    }
  }

  getFullTextFromHtml(html: string) {
    const el = document.createElement('div');
    html = html.replace('<p>', '');
    html = html.replace('</p>', '');
    el.innerHTML = html;
    let data = el.textContent || el.innerText || '';
    data = data.replace(/\s+/g, ' ');
    return data;
  }
  formUpdated(event: TestCorrectionInput) {
    const oldForm = _.cloneDeep(this.testCorrectionForm.value);
    this.initTestCorrectionForm();

    // populate the header field
    if (event) {
      if (
        event.correction_grid &&
        event.correction_grid.header &&
        event.correction_grid.header.fields &&
        event.correction_grid.header.fields.length
      ) {
        // create formarray
        event.correction_grid.header.fields.forEach((headerField, index) => {
          this.addHeaderFieldsFormArray();
          if (headerField.data_type === 'checkbox') {
            this.getHeaderFieldsFormArray().at(index).get('value').setValidators([Validators.requiredTrue]);
            this.getHeaderFieldsFormArray().at(index).get('value').updateValueAndValidity();
          }
        });
      }
    }

    // populate the footer field
    if (event) {
      if (
        event.correction_grid &&
        event.correction_grid.footer &&
        event.correction_grid.footer.fields &&
        event.correction_grid.footer.fields.length
      ) {
        // create formarray
        event.correction_grid.footer.fields.forEach((footerField, index) => {
          this.addFooterFieldsFormArray();
          if (footerField.data_type === 'checkbox') {
            this.getFooterFieldsFormArray().at(index).get('value').setValidators([Validators.requiredTrue]);
            this.getFooterFieldsFormArray().at(index).get('value').updateValueAndValidity();
          }
        });
      }
    }

    // populate the expected document field
    if (event && event.expected_documents && event.expected_documents.length) {
      this.addExpectedDocumentForm();
    }

    // populate the section and subsection field
    if (event) {
      if (event.correction_grid && event.correction_grid.correction) {
        if (event.correction_grid.correction.sections && event.correction_grid.correction.sections.length) {
          // create formarray
          event.correction_grid.correction.sections.forEach((section, sectionIndex) => {
            this.addSectionForm();
            if (this.testData?.correction_grid?.correction?.comment_for_each_section && (this.testData?.type === 'oral' || this.testData?.type === 'written')) {
              this.getSectionForm()?.at(sectionIndex)?.get('comment')?.setValidators([Validators.required]);
              this.getSectionForm()?.at(sectionIndex)?.get('comment')?.updateValueAndValidity();
            }
            if (section?.sub_sections?.length) {
              section.sub_sections.forEach((subSection, subSectionIndex) => {
                this.addSubSectionForm(sectionIndex);
                if (!event.missing_copy && this.testData.type !== 'academic_recommendation') {
                  if (this.testData?.correction_grid?.correction?.comment_for_each_sub_section && (this.testData?.type === 'oral' || this.testData?.type === 'written')) {
                    this.getSubSectionForm(sectionIndex).at(subSectionIndex).get('comments').setValidators([Validators.required]);
                    this.getSubSectionForm(sectionIndex).at(subSectionIndex).get('comments').updateValueAndValidity();
                  }
                  this.getSubSectionForm(sectionIndex).at(subSectionIndex).get('rating').setValidators([Validators.required]);
                  this.getSubSectionForm(sectionIndex).at(subSectionIndex).get('rating').updateValueAndValidity();
                } else if (!event.missing_copy && this.testData?.type === 'academic_recommendation') {
                  this.getSubSectionForm(sectionIndex).at(subSectionIndex).get('comments').setValidators([Validators.required]);
                  this.getSubSectionForm(sectionIndex).at(subSectionIndex).get('comments').updateValueAndValidity();
                }
              });
            }
          });
        }
        if (event.correction_grid.correction.sections_evalskill && event.correction_grid.correction.sections_evalskill.length) {
          // create formarray
          event.correction_grid.correction.sections_evalskill.forEach((section, sectionIndex) => {
            this.addSectionEvalskillForm();
            if (section?.sub_sections?.length) {
              section.sub_sections.forEach((subSection, subSectionIndex) => {
                this.addSubSectionEvalskillForm(sectionIndex);
                if (!event.missing_copy && subSection.is_selected) {
                  this.getSubSectionEvalskillForm(sectionIndex).at(subSectionIndex).get('rating').setValidators([Validators.required,Validators.min(0)]);
                  this.getSubSectionEvalskillForm(sectionIndex).at(subSectionIndex).get('rating').updateValueAndValidity();
                }
              });
            }
          });
        }
        if (event.correction_grid.correction.penalties && event.correction_grid.correction.penalties.length) {
          event.correction_grid.correction.penalties.forEach((penalty, penaltyIndex) => {
            this.addPenaltyFieldForm();
            this.getPenaltiesFieldForm().at(penaltyIndex).get('rating').setValidators([Validators.required]);
            this.getPenaltiesFieldForm().at(penaltyIndex).get('rating').updateValueAndValidity();
          });
        }
        if (event.correction_grid.correction.bonuses && event.correction_grid.correction.bonuses.length) {
          event.correction_grid.correction.bonuses.forEach((bonus, bonusIndex) => {
            this.addBonusFieldForm();
            this.getBonusesFieldForm().at(bonusIndex).get('rating').setValidators([Validators.required]);
            this.getBonusesFieldForm().at(bonusIndex).get('rating').updateValueAndValidity();
          });
        }
        if (this.testData && this.testData.correction_grid && this.testData.correction_grid.correction) {
          const correction: Correction = this.testData.correction_grid.correction;
          if (correction.show_final_comment) {
            this.getCorrectionForm().get('final_comment').setValidators([Validators.required]);
            this.getCorrectionForm().get('final_comment').updateValueAndValidity();
          }
        }
      }
    }
  }

  formUpdatedGroup(event: TestCorrectionInput) {
    const oldForm = _.cloneDeep(this.testCorrectionForm.value);
    this.initTestCorrectionForm();

    // populate the header field
    if (event) {
      if (
        event.correction_grid &&
        event.correction_grid.header &&
        event.correction_grid.header.fields &&
        event.correction_grid.header.fields.length
      ) {
        // create formarray
        event.correction_grid.header.fields.forEach((headerField, index) => {
          this.addHeaderFieldsFormArray();
          if (headerField.data_type === 'checkbox') {
            this.getHeaderFieldsFormArray().at(index).get('value').setValidators([Validators.requiredTrue]);
            this.getHeaderFieldsFormArray().at(index).get('value').updateValueAndValidity();
          }
        });
      }
    }

    // populate the footer field
    if (event) {
      if (
        event.correction_grid &&
        event.correction_grid.footer &&
        event.correction_grid.footer.fields &&
        event.correction_grid.footer.fields.length
      ) {
        // create formarray
        event.correction_grid.footer.fields.forEach((footerField, index) => {
          this.addFooterFieldsFormArray();
          if (footerField.data_type === 'checkbox') {
            this.getFooterFieldsFormArray().at(index).get('value').setValidators([Validators.requiredTrue]);
            this.getFooterFieldsFormArray().at(index).get('value').updateValueAndValidity();
          }
        });
      }
    }

    // populate the expected document field
    if (event && event.expected_documents && event.expected_documents.length) {
      this.addExpectedDocumentForm();
    }

    // populate the section and subsection field
    if (event) {
      if (event.correction_grid && event.correction_grid.correction) {
        if (event.correction_grid.correction.sections && event.correction_grid.correction.sections.length) {
          // create formarray
          event.correction_grid.correction.sections.forEach((section, sectionIndex) => {
            this.addSectionForm();
            if (this.testData?.correction_grid?.correction?.comment_for_each_section && (this.testData?.type === 'oral' || this.testData?.type === 'written')) {
              this.getSectionForm()?.at(sectionIndex)?.get('comment')?.setValidators([Validators.required]);
              this.getSectionForm()?.at(sectionIndex)?.get('comment')?.updateValueAndValidity();
            }
            if (section?.sub_sections?.length) {
              section.sub_sections.forEach((subSection, subSectionIndex) => {
                this.addSubSectionForm(sectionIndex);
                if (!event.missing_copy && !event.is_do_not_participated && this.testData.type !== 'academic_recommendation') {
                  this.getSubSectionForm(sectionIndex).at(subSectionIndex).get('rating').setValidators([Validators.required]);
                  this.getSubSectionForm(sectionIndex).at(subSectionIndex).get('rating').updateValueAndValidity();
                  if (this.testData?.correction_grid?.correction?.comment_for_each_sub_section && (this.testData?.type === 'oral' || this.testData?.type === 'written')) {
                    this.getSubSectionForm(sectionIndex).at(subSectionIndex).get('comments').setValidators([Validators.required]);
                    this.getSubSectionForm(sectionIndex).at(subSectionIndex).get('comments').updateValueAndValidity();
                  }
                } else if (!event.missing_copy && !event.is_do_not_participated && this.testData?.type === 'academic_recommendation') {
                  this.getSubSectionForm(sectionIndex).at(subSectionIndex).get('comments').setValidators([Validators.required]);
                  this.getSubSectionForm(sectionIndex).at(subSectionIndex).get('comments').updateValueAndValidity();
                }
              });
            }
          });
        }
        if (event.correction_grid.correction.sections_evalskill && event.correction_grid.correction.sections_evalskill.length) {
          // create formarray
          event.correction_grid.correction.sections_evalskill.forEach((section, sectionIndex) => {
            this.addSectionEvalskillForm();
            if (section?.sub_sections?.length) {
              section.sub_sections.forEach((subSection, subSectionIndex) => {
                this.addSubSectionEvalskillForm(sectionIndex);
                if (!event.missing_copy && !event.is_do_not_participated && subSection.is_selected) {
                  this.getSubSectionEvalskillForm(sectionIndex).at(subSectionIndex).get('rating').setValidators([Validators.required,Validators.min(0)]);
                  this.getSubSectionEvalskillForm(sectionIndex).at(subSectionIndex).get('rating').updateValueAndValidity();
                }
              });
            }
          });
        }
        if (event.correction_grid.correction.penalties && event.correction_grid.correction.penalties.length) {
          event.correction_grid.correction.penalties.forEach((penalty, penaltyIndex) => {
            this.addPenaltyFieldForm();
            this.getPenaltiesFieldForm().at(penaltyIndex).get('rating').setValidators([Validators.required]);
            this.getPenaltiesFieldForm().at(penaltyIndex).get('rating').updateValueAndValidity();
          });
        }
        if (event.correction_grid.correction.bonuses && event.correction_grid.correction.bonuses.length) {
          event.correction_grid.correction.bonuses.forEach((bonus, bonusIndex) => {
            this.addBonusFieldForm();
            this.getBonusesFieldForm().at(bonusIndex).get('rating').setValidators([Validators.required]);
            this.getBonusesFieldForm().at(bonusIndex).get('rating').updateValueAndValidity();
          });
        }
        if (this.testData && this.testData.correction_grid && this.testData.correction_grid.correction) {
          const correction: Correction = this.testData.correction_grid.correction;
          if (correction.show_final_comment) {
            this.getCorrectionForm().get('final_comment').setValidators([Validators.required]);
            this.getCorrectionForm().get('final_comment').updateValueAndValidity();
          }
        }
      }
    }
  }

  updateJustification(event: string) {
    if (event && event === 'student') {
      this.getFilteredStudentList();
    } else if (event && event === 'group') {
      this.getFilteredGroupList();
    }
  }

  populateFormFirstTime() {
    if (this.taskData && this.taskData.task_status === 'done') {
      // if task status is done, select the first student and auto populate the mark entry form with his data
      this.autoPopulateFormWithStudentTestCorrection(this.filteredStudentList[0].testCorrectionId);
      this.studentSelected(this.filteredStudentList[0]);
    } else {
      let nonCorrectedStudent = this.filteredStudentList.find((student) => student.score === null);
      let notResetIndex = false
      let currStudent;
      if(this.isSavedAfterMoveTab){
        if(this.filteredStudentList?.length){
          if(this.nextStudent){
            currStudent = this.filteredStudentList.find(stud => stud?._id === this.nextStudent?._id);
            this.previouslySavedAsDraftStudent = null
            this.nextStudent = null
          }else{
            currStudent = this.filteredStudentList.find(stud => stud?._id === this.testCorrectionForm.get('student').value);
            if(currStudent?.score){
              notResetIndex = true;
            }
          }
          nonCorrectedStudent = null;
        }
        this.isSavedAfterMoveTab = false;
      } else if (this.isSavedCurrentStudent && this.testCorrectionForm.invalid){
        if(this.filteredStudentList?.length){
          currStudent = this.filteredStudentList.find(stud => stud?._id === this.testCorrectionForm.get('student').value);
          nonCorrectedStudent = null;
        }
        this.isSavedCurrentStudent = false;
      }
      if (this.previouslySavedAsDraftStudent) {
        this.previouslySavedAsDraftStudent = null;
      } else if (nonCorrectedStudent) {
        // if there is any student that has no test correction data yet, set this student as selected
        this.studentSelect = this.displayStudentName(nonCorrectedStudent._id);
        this.testCorrectionForm.get('student').patchValue(nonCorrectedStudent._id);
        this.firstForm = _.cloneDeep(this.testCorrectionForm.value);
        this.studentSelected(nonCorrectedStudent);
        // add empty multiple_dates field inside subsection if date type "multiple_date"
        const testData = _.cloneDeep(this.testData);
        if (testData.date_type === 'multiple_date') {
          const sections: SectionEvalskill[] = testData.correction_grid.correction.sections_evalskill;
          sections.forEach((section, sectionIndex) => {
            if (section?.sub_sections?.length) {
              section.sub_sections.forEach((subSection, subSectionIndex) => {
                this.initMultipleDateForm(sectionIndex, subSectionIndex);
              });
            }
          });
        }
        // if student dont have score but already has test correction id
        if (nonCorrectedStudent.testCorrectionId) {
          this.autoPopulateFormWithStudentTestCorrection(nonCorrectedStudent.testCorrectionId);
        }
      } else {
        if(currStudent?.testCorrectionId){
          this.autoPopulateFormWithStudentTestCorrection(currStudent?.testCorrectionId);
          this.studentSelected(currStudent,notResetIndex);
        } else if (this.filteredStudentList.length && this.filteredStudentList[0].testCorrectionId) {
          // if all student's mark already inputted, select the first student and auto populate the mark entry form with his data
          this.autoPopulateFormWithStudentTestCorrection(this.filteredStudentList[0].testCorrectionId);
          this.studentSelected(this.filteredStudentList[0]);
        }
      }
    }
  }

  autoPopulateFormWithStudentTestCorrection(testCorrectionId: string,isFromSubmitMark?) {
    this.isWaitingForResponse = true;
    this.subs.sink = this.testCorrectionService.getTestCorrection(testCorrectionId).subscribe((resp) => {
      this.isWaitingForResponse = false;
      this.loadReady = true;
      let patchData = this.formatDataBeforePatch(_.cloneDeep(resp));
      if (patchData?.correction_grid?.correction?.sections_evalskill?.length) {
        patchData.correction_grid.correction.sections_evalskill = patchData?.correction_grid?.correction?.sections_evalskill?.filter((section) => section?.is_selected)
      }
      this.dataUpdated(patchData);
      this.studentSelect = this.displayStudentName(patchData.student);
      this.testCorrectionForm.get('student').patchValue(patchData.student);
      this.firstForm = _.cloneDeep(this.testCorrectionForm.value);
      this.testCorrectionId = testCorrectionId;
      if(isFromSubmitMark){
        this.selectedIndex('SUBMIT_MARK_S1')
      }
    });
  }

  autoPopulateFormWithGroupTestCorrection(groupTestCorrectionId: string) {
    this.isWaitingForResponse = true;
    this.subs.sink = this.testCorrectionService.getOneGroupTestCorrection(groupTestCorrectionId).subscribe((resp) => {
      this.isWaitingForResponse = false;
      let patchData = this.formatDataBeforePatch(_.cloneDeep(resp));
      if (patchData?.correction_grid?.correction?.sections_evalskill?.length) {
        patchData.correction_grid.correction.sections_evalskill = patchData?.correction_grid?.correction?.sections_evalskill?.filter((section) => section?.is_selected)
      }
      this.getFilteredStudentListInGroup();
      this.dataUpdatedGroup(patchData);
    });
    this.groupTestCorrectionId = groupTestCorrectionId;
  }

  selectStudentFromDropdown(studentData) {
    // populate selected student from student remaining dropdown. copy the code from student list component
    if (studentData && studentData.testCorrectionId) {
      this.refreshMultipleDateNotationGrid(true);
      this.refreshJuryNotationGrid(true);
      this.subs.sink = this.testCorrectionService.getTestCorrection(studentData.testCorrectionId).subscribe((resp) => {
        const patchData = this.formatDataBeforePatch(_.cloneDeep(resp));
        this.dataUpdated(patchData);
        this.refreshMultipleDateNotationGrid(false);
        this.refreshJuryNotationGrid(false);
      });
    } else {
      this.testCorrectionForm.get('student').patchValue(studentData._id);
    }
    this.studentSelected(studentData);
  }

  selectGroupFromDropdown(groupData) {
    // populate selected group from group remaining dropdown. copy the code from group list component
    if (groupData && groupData._id) {
      const groups = _.cloneDeep(this.filteredGroupList);
      const selectedGroup = groups.find((grp) => grp._id === groupData._id);
      this.groupSelected(selectedGroup);
    }
  }

  selectStudentOfGroupFromDropdown(studentData) {
    // populate selected student of a group from dropdown. copy the code from group list component
    if (studentData && studentData.testCorrectionId) {
      this.subs.sink = this.testCorrectionService.getTestCorrection(studentData.testCorrectionId).subscribe((resp) => {
        const patchData = this.formatDataBeforePatch(_.cloneDeep(resp));
        this.dataUpdated(patchData);
      });
    } else {
      this.testCorrectionForm.get('student').patchValue(studentData._id);
    }
    this.studentSelected(studentData);
  }

  getTranslatedDate(date) {
    if (date && date.date_utc && date.time_utc) {
      return this.parseUTCtoLocal.transformDate(date.date_utc, date.time_utc);
    } else {
      return '';
    }
  }

  setMissingCopyJustification() {
    // trigger this when saving
    if (this.checkIfTaskIsValidateTest()) {
      const justifyStatus = this.testCorrectionForm.get('is_justified').value;
      this.testCorrectionForm.get('is_justified').setValue(justifyStatus ? justifyStatus : 'no');
    }
  }

  checkCurrentCompetenceValidity(from?: 'SUBMIT_MARK_S1' | 'save-validate') {
    // *************** Need to remove validator when test data type is free_continuous_control
    const sections: TestCorrectionCorrectionGridCorrectionSectionInput[] = this.getSectionForm().value;
    if (this.testData?.type === 'free_continuous_control' && sections?.length) {
      this.removeValidationSectionAndSubSectionForFreeContinousControl()
    }

    if (this.showComptentyTab) {
      let clonedTestCorrectionForm = _.cloneDeep(this.testCorrectionForm);
      clonedTestCorrectionForm?.get('correction_grid')?.get('correction')?.removeControl('sections_evalskill');
      clonedTestCorrectionForm?.get('correction_grid')?.removeControl('footer');
      return clonedTestCorrectionForm?.valid && this.getSectionEvalskillForm()?.at(this.selectedCompetenceIndex)?.valid;
    } else if (from === 'SUBMIT_MARK_S1' || from === 'save-validate') {
      let clonedTestCorrectionForm = _.cloneDeep(this.testCorrectionForm);
      //************ Additional Validation to only remove the footer field when the type evaluation is score becuase this is regress the expertise
      if (this.testData?.type !== 'academic_recommendation') {
        clonedTestCorrectionForm?.get('correction_grid')?.removeControl('footer');
      }
      return clonedTestCorrectionForm?.valid;
    } else {
     return this.testCorrectionForm.valid;
    }
  }

  /**
   * Function to manually check the currently opened test correction validity
   * @returns {boolean} - True if there is invalid section in the test correction
   */
  checkAnyInvalidSection(sections?: any[]) {
    if (!sections) {
      sections = this.getSectionForm()?.value
    }
    if (!sections?.length) {
      return false;
    }
    return sections?.find(section =>
      section?.sub_sections?.some((subSection) => {
        let sectionIsValid = true;

        // Check for rating, but if its academic recommendation, then do not need check it as academic recommendation have no scoring
        if (
          (subSection?.rating === null || subSection?.rating === undefined || subSection?.rating === '') &&
          this.testData?.type !== 'academic_recommendation'
        ) {
          if (this.testData?.class_id?.type_evaluation === 'expertise' && subSection?.is_criteria_evaluated) {
            sectionIsValid = false;
          } else if (this.testData?.class_id?.type_evaluation === 'score') {
            sectionIsValid = false;
          }
        }

        if (this.testData?.correction_grid?.correction?.show_final_comment) {
          sectionIsValid = sectionIsValid && this.getCorrectionForm()?.getRawValue()?.final_comment;
        }

        if (this.testData?.correction_grid?.correction?.comment_for_each_section) {
          sectionIsValid = sectionIsValid && section?.comment;
        }

        if (this.testData?.correction_grid?.correction?.comment_for_each_sub_section) {
          sectionIsValid = sectionIsValid && subSection?.comments;
        }

        return !sectionIsValid;
      })
    )
  }

  getCurrentCompetenceStatus(currentIndex?): TCompetenceStatuses | null {
    if (!this.showComptentyTab) {
      return 'completed';
    }
    const index = currentIndex ? currentIndex : this.selectedCompetenceIndex;
    const currentCompetencies = this.getSectionEvalskillForm()?.at?.(index);
    if (currentCompetencies?.valid) {
      return 'completed';
    }
    const justificationControl = currentCompetencies?.get('comment');
    const criteriaControls = currentCompetencies?.get('sub_sections') as UntypedFormArray;
    const validCriteriaControlIsExist = criteriaControls?.controls?.find?.(control => control?.get('rating')?.valid || (control?.get('comments')?.valid && control?.get('comments')?.value));
    if (
      (!currentCompetencies?.valid && validCriteriaControlIsExist) ||
      (!currentCompetencies?.valid && justificationControl?.valid && justificationControl?.value)
    ) {
      return 'draft';
    }
    return 'not_started';
  }

  formatPayload() {
    this.setMissingCopyJustification();
    const data = _.cloneDeep(this.testCorrectionForm.value);

    // remove document expected data if student dont upload document expected yet
    if (data && data.expected_documents && data.expected_documents[0] && !data.expected_documents[0].document) {
      data.expected_documents = [];
    }

    // Remove unnessecary data from correction form
    if (data && data.correction_grid && data.correction_grid.correction) {
      if (data.correction_grid.correction.sections && data.correction_grid.correction.sections.length) {
        data.correction_grid.correction.sections.forEach((section) => {
          if (section && section.sub_sections && section.sub_sections.length) {
            section.sub_sections.forEach((sub_section) => {
              if (sub_section.marks_number && typeof sub_section.marks_number === 'string') {
                sub_section.marks_number = +sub_section.marks_number;
              }
              if (sub_section.jurys && sub_section.jurys.length) {
                sub_section.jurys.forEach((jury) => {
                  if (jury.marks && typeof jury.marks === 'string') {
                    jury.marks = Number(jury.marks);
                  }
                });
              }
              delete sub_section.showFullDirection;
              delete sub_section.showFullTitle;
              delete sub_section.cleanTitle;
              delete sub_section.cleanDirections;
            });
          }
          delete section.cleanTitle;
        });
      }
      if (data.correction_grid.correction.sections_evalskill && data.correction_grid.correction.sections_evalskill.length) {
        data.correction_grid.correction.sections_evalskill.forEach((section, sectionIndex) => {
          // Remove Unicode characters
          if (section && section.comment?.length) {
            const allKeyboardKeysRegex = new RegExp(/^[a-zA-Zà-üÀ-Ü0-9~`!@#\$%\^&\*\(\)_\-\+={\[\}\]\|\\:;"'<,>\.\?\/«“”—»–’…‧   ]*$/);
            const tempComment = _.cloneDeep(section.comment)
              .split('')
              .filter((letter) => allKeyboardKeysRegex.test(letter))
              .join('');
            section.comment = tempComment;
          }
          if (section && section.sub_sections && section.sub_sections.length) {
            section.sub_sections.forEach((sub_section) => {
              if (sub_section.marks_number && typeof sub_section.marks_number === 'string') {
                sub_section.marks_number = +sub_section.marks_number;
              }
              if (sub_section.jurys && sub_section.jurys.length) {
                sub_section.jurys.forEach((jury) => {
                  if (jury.marks && typeof jury.marks === 'string') {
                    jury.marks = Number(jury.marks);
                  }
                });
              }
              // if (sub_section.multiple_dates && sub_section.multiple_dates.length) {
              //   sub_section.multiple_dates.forEach(multipleDate => {
              //     delete multipleDate.tempTime;
              //   });
              // }
              delete sub_section.showFullDirection;
              delete sub_section.showFullTitle;
              delete sub_section.cleanTitle;
              delete sub_section.cleanDirections;
            });
          }
          if (this.testCorrectionId || this.groupTestCorrectionId) {
            if (sectionIndex === this.selectedCompetenceIndex) {
              section.competence_status = this.getCurrentCompetenceStatus();
            } else {
              section.competence_status = section.competence_status ? section.competence_status : 'not_started'
            }
          }

          delete section.cleanTitle;
          delete section.missionsActivitiesAutonomy;
        });
      }

      if (this.testData && this.testData.correction_type === 'cross_correction') {
        const studentList = _.cloneDeep(this.studentList);
        const studentData = studentList?.filter((list) => list?._id === data?.student);
        if (studentData && studentData.length) {
          data.school_id = studentData[0].school._id;
        }
      }
    }

    // Change header value
    if (
      data &&
      data.correction_grid &&
      data.correction_grid.header &&
      data.correction_grid.header.fields &&
      data.correction_grid.header.fields.length
    ) {
      data.correction_grid.header.fields.forEach((header_field) => {
        if (header_field && header_field.type) {
          const tempValue = header_field.value;

          switch (header_field.type) {
            case 'date':
              header_field.value = {
                date: this.parseLocaltoUTC.transformJavascriptDate(header_field.value) || {
                  date: '',
                  time: '',
                },
              };
              break;
            case 'text':
              header_field.value = {
                text: tempValue,
              };
              break;
            case 'number':
              header_field.value = {
                number: +tempValue,
              };
              break;
            case 'pfereferal':
              header_field.value = {
                pfereferal: tempValue,
              };
              break;
            case 'jurymember':
              header_field.value = {
                jury_member: tempValue,
              };
              break;
            case 'longtext':
              header_field.value = {
                long_text: tempValue,
              };
              break;
            case 'signature':
              header_field.value = {
                signature: tempValue,
              };
              break;
            case 'correctername':
              header_field.value = {
                correcter_name: tempValue,
              };
              break;
            case 'mentorname':
              header_field.value = {
                mentor_name: tempValue,
              };
              break;
            case 'etablishmentname':
              header_field.value = {
                etablishment_name: tempValue,
              };
              break;
            case 'studentname':
              header_field.value = {
                student_name: tempValue,
              };
              break;
            case 'eventName':
              header_field.value = {
                event_name: tempValue,
              };
              break;
            case 'dateRange':
              header_field.value = {
                date_range: this.parseLocaltoUTC.transformJavascriptDate(header_field.value) || {
                  date: '',
                  time: '',
                },
              };
              break;
            case 'dateFixed':
              header_field.value = {
                date_fixed: this.parseLocaltoUTC.transformJavascriptDate(header_field.value) || {
                  date: '',
                  time: '',
                },
              };
              break;
            case 'titleName':
              header_field.value = {
                title_name: tempValue,
              };
              break;
            case 'status':
              header_field.value = {
                status: tempValue,
              };
              break;
            case 'companyname':
              header_field.value = {
                company_name: tempValue,
              };
              break;
            case 'groupname':
              header_field.value = {
                group_name: tempValue,
              };
              break;
            default:
              break;
          }
        }
      });
    }

    // Change footer value
    if (
      data &&
      data.correction_grid &&
      data.correction_grid.footer &&
      data.correction_grid.footer.fields &&
      data.correction_grid.footer.fields.length
    ) {
      data.correction_grid.footer.fields.forEach((footer_field) => {
        if (footer_field && footer_field.type) {
          const tempValue = footer_field.value;

          switch (footer_field.type) {
            case 'date':
              footer_field.value = {
                date: this.parseLocaltoUTC.transformJavascriptDate(footer_field.value) || {
                  date: '',
                  time: '',
                },
              };
              break;
            case 'text':
              footer_field.value = {
                text: tempValue,
              };
              break;
            case 'number':
              footer_field.value = {
                number: +tempValue,
              };
              break;
            case 'pfereferal':
              footer_field.value = {
                pfereferal: tempValue,
              };
              break;
            case 'jurymember':
              footer_field.value = {
                jury_member: tempValue,
              };
              break;
            case 'longtext':
              footer_field.value = {
                long_text: tempValue,
              };
              break;
            case 'signature':
              footer_field.value = {
                signature: tempValue,
              };
              break;
            case 'correctername':
              footer_field.value = {
                correcter_name: tempValue,
              };
                // *************** need to handle "corrector" field with type "text". example implementation is on footer-section.component -> getCorrectorName()
                // const typeFirstForm = this.firstForm?.correction_grid?.footer?.fields?.find((firstForm) => firstForm?.type === 'correctername');
                // if (!footer_field?.value || footer_field?.value === typeFirstForm?.value ) {
                //   footer_field.value = {
                //     correcter_name: typeFirstForm?.value,
                //   };
                // } else {
                //   footer_field.value = {
                //     correcter_name: tempValue,
                //   };
                // }
              break;
            case 'mentorname':
              footer_field.value = {
                mentor_name: tempValue,
              };
              break;
            case 'etablishmentname':
              footer_field.value = {
                etablishment_name: tempValue,
              };
              break;
            case 'studentname':
              footer_field.value = {
                student_name: tempValue,
              };
              break;
            case 'eventName':
              footer_field.value = {
                event_name: tempValue,
              };
              break;
            case 'dateRange':
              footer_field.value = {
                date_range: this.parseLocaltoUTC.transformJavascriptDate(footer_field.value) || {
                  date: '',
                  time: '',
                },
              };
              break;
            case 'dateFixed':
              footer_field.value = {
                date_fixed: this.parseLocaltoUTC.transformJavascriptDate(footer_field.value) || {
                  date: '',
                  time: '',
                },
              };
              break;
            case 'titleName':
              footer_field.value = {
                title_name: tempValue,
              };
              break;
            case 'status':
              footer_field.value = {
                status: tempValue,
              };
              break;
            case 'companyname':
              footer_field.value = {
                company_name: tempValue,
              };
              break;
            case 'groupname':
              footer_field.value = {
                group_name: tempValue,
              };
              break;
            default:
              break;
          }
        }
      });
    }

    // if missing copy, set total and additional total to 0
    if ((data.missing_copy || data.is_do_not_participated) && data.correction_grid && data.correction_grid.correction) {
      data.correction_grid.correction.additional_total = 0;
      data.correction_grid.correction.total = 0;
      if (data.correction_grid.correction.sections && data.correction_grid.correction.sections.length) {
        data.correction_grid.correction.sections.forEach((section, index) => {
          section.section_extra_total = 0;
          section.rating = 0;
          section.comment = '';
          if (section && section.sub_sections && section.sub_sections.length) {
            section.sub_sections.forEach((subSection, subIndex) => {
              subSection.comments = '';
              subSection.marks_letter = '';
              subSection.marks_number = 0;
              subSection.rating = 0;
            });
          }
        });
      }

      if (data.correction_grid.correction.sections_evalskill && data.correction_grid.correction.sections_evalskill.length) {
        data.correction_grid.correction.sections_evalskill.forEach((section, index) => {
          section.rating = 0;
          section.comment = '';
          if (section && section.sub_sections && section.sub_sections.length) {
            section.sub_sections.forEach((subSection, subIndex) => {
              subSection.comments = '';
              subSection.marks_letter = '';
              subSection.marks_number = 0;
              subSection.rating = 0;
            });
          }
        });
      }
      if (data.correction_grid.correction.penalties && data.correction_grid.correction.penalties.length) {
        data.correction_grid.correction.penalties.forEach((penalty, index) => {
          data.correction_grid.correction.penalties[index].rating = 0;
        });
      }
      if (data.correction_grid.correction.bonuses && data.correction_grid.correction.bonuses.length) {
        data.correction_grid.correction.bonuses.forEach((bonus, index) => {
          data.correction_grid.correction.bonuses[index].rating = 0;
        });
      }
    }

    if (!data.document_for_missing_copy) {
      delete data.document_for_missing_copy;
    }

    if (!data.element_of_proof_doc) {
      delete data.element_of_proof_doc;
    }
    return data;
  }

  validateBeforeSaveGroupTest(actionAfterSave?: string) {
    // This function is to check if the group is "Save this score" and its already saved before hand, Meaning its the second-onward save.
    let validation = true;
    // Do validation check if its group test and the test correction is already saved before, meaning its the second-onward saved.
    if (this.testData && this.testData.group_test && this.checkCurrentCompetenceValidity()) {
      const payload = _.cloneDeep(this.formatPayload());

      // If is_saved true, meaning its already saved before. Need to display SWAL confirmation.
      if (payload?.is_saved && !this.currentCompetencyComparison()) {
        validation = false;
        let timeDisabled = 5;
        Swal.fire({
          title: this.translate.instant('GROUP_SAVE_ALERT.TITLE', { groupName: this.selectedGroupData ? this.selectedGroupData.name : '' }),
          text: this.translate.instant('GROUP_SAVE_ALERT.TEXT'),
          type: 'warning',
          allowEscapeKey: true,
          showCancelButton: true,
          confirmButtonText: this.translate.instant('GROUP_SAVE_ALERT.BUTTON_1'),
          cancelButtonText: this.translate.instant('GROUP_SAVE_ALERT.BUTTON_2'),
          allowOutsideClick: false,
          allowEnterKey: false,
          footer: `<span style="margin-left: auto">GROUP_SAVE_ALERT</span>`,
          onOpen: () => {
            Swal.disableConfirmButton();
            const confirmBtnRef = Swal.getConfirmButton();
            const intVal = setInterval(() => {
              timeDisabled -= 1;
              confirmBtnRef.innerText = this.translate.instant('GROUP_SAVE_ALERT.BUTTON_1') + ` (${timeDisabled})`;
            }, 1000);

            this.timeOutVal = setTimeout(() => {
              confirmBtnRef.innerText = this.translate.instant('GROUP_SAVE_ALERT.BUTTON_1');
              Swal.enableConfirmButton();
              clearInterval(intVal);
              clearTimeout(this.timeOutVal);
            }, timeDisabled * 1000);
          },
        }).then((res) => {
          clearTimeout(this.timeOutVal);
          if (res.value) {
            this.saveGroupTestCorrection();
          }
        });
      } else {
        this.saveGroupTestCorrection();
      }
    } else {
      this.saveGroupTestCorrection();
    }
  }
  isAllCompleted(payload){
    let value = false
    if(payload?.correction_grid?.correction?.sections_evalskill?.length && this.showComptentyTab){
      value = true
      payload?.correction_grid?.correction?.sections_evalskill.forEach(section=>{
        if(section.competence_status!=='completed'){
          value = false
        }
      })
    }
    return value;
  }

  saveTestCorrection(actionAfterSave?: string) {
    //*************** Update payload to Add Param Task Id to check if Task is deleted or not
    const payload = {
      ..._.cloneDeep(this.formatPayload()),
      task_id: this.taskId,
    };

    let compStatus = [];
    let statusNotStartedorDraft = [];
    this.isSavedAfterMoveTab = false;
    this.isSavedCurrentStudent = false;
    this.isSavedFromSubmitMarkS1 = false

    if (payload) {
      payload.correction_grid.correction.additional_total = payload.correction_grid.correction.additional_total=== null && (this.testData?.type === 'free_continuous_control' || this.testData?.controlled_test)? null : Number(payload.correction_grid.correction.additional_total);
      payload.correction_grid.correction.total_jury_avg_rating = Number(payload.correction_grid.correction.total_jury_avg_rating);
      payload.correction_grid.correction.total = Number(payload.correction_grid.correction.total);
      payload.correction_grid.correction.sections.forEach((element, sectionIndex) => {
        if (payload?.correction_grid?.correction?.sections[sectionIndex]) {
          payload.correction_grid.correction.sections[sectionIndex].section_extra_total = Number(element.section_extra_total);
          payload.correction_grid.correction.sections[sectionIndex].coefficient = Number(element.coefficient);
          payload.correction_grid.correction.sections[sectionIndex].rating = Number(element.rating);
          payload.correction_grid.correction.sections[sectionIndex].sub_sections.forEach((elementSub, subSectionIndex) => {
            payload.correction_grid.correction.sections[sectionIndex].sub_sections[subSectionIndex].rating =
              elementSub?.rating || elementSub?.rating === 0 ? Number(elementSub.rating) : null;
          });
        }
      });
      payload.correction_grid.correction.sections_evalskill.forEach((element, sectionIndex) => {
        if (payload?.correction_grid?.correction?.sections_evalskill[sectionIndex]) {
          payload.correction_grid.correction.sections_evalskill[sectionIndex].rating = element.rating ? Number(element.rating) : null;
          payload.correction_grid.correction.sections_evalskill[sectionIndex].sub_sections.forEach((elementSub, subSectionIndex) => {
            payload.correction_grid.correction.sections_evalskill[sectionIndex].sub_sections[subSectionIndex].rating =
              elementSub?.rating || elementSub?.rating === 0 ? Number(elementSub.rating) : null;
            if (
              payload.correction_grid.correction.sections_evalskill[sectionIndex].sub_sections[subSectionIndex].multiple_dates &&
              payload.correction_grid.correction.sections_evalskill[sectionIndex].sub_sections[subSectionIndex].multiple_dates.length
            ) {
              payload.correction_grid.correction.sections_evalskill[sectionIndex].sub_sections[subSectionIndex].multiple_dates.forEach(
                (date, dateIndex) => {
                  if (date?.marks || date.marks === 0) {
                    date.marks = Number(date.marks);
                  }
                },
              );
              // when saving data, sort from earliest date to latest date
              if (this.taskData) {
                payload.correction_grid.correction.sections_evalskill[sectionIndex].sub_sections[subSectionIndex].multiple_dates =
                  payload.correction_grid.correction.sections_evalskill[sectionIndex].sub_sections[subSectionIndex].multiple_dates.reverse();
              }
            } else {
              delete payload.correction_grid.correction.sections_evalskill[sectionIndex].sub_sections[subSectionIndex].multiple_dates;
            }
          });
          if (this.testCorrectionForm.get('missing_copy').value || (this.testCorrectionForm.get('is_do_not_participated').value && !this.isGroup && this.isStudent) || !this.showComptentyTab) {
            element.competence_status = 'completed'
          }
          if(element?.is_selected){
            compStatus.push(element?.competence_status);
          };
        }
      });


      if(compStatus?.length){
        compStatus?.forEach((respStatus) => {
          if(respStatus === 'draft' || respStatus === 'not_started') statusNotStartedorDraft.push(respStatus);
        });
      };

      if (payload?.correction_grid?.footer?.fields?.length) {
        const isSignatureFound = payload?.correction_grid?.footer?.fields?.find((foot) => foot?.type === 'signature');
        const signatureValue = payload?.correction_grid?.footer?.fields?.find((foot) => foot?.type === null);
        let newFooter = _.cloneDeep(payload?.correction_grid?.footer?.fields)?.filter((foot) => foot?.type);
        if (!isSignatureFound && signatureValue) {
          newFooter?.push({
            type: 'signature',
            label: 'Signature',
            data_type: 'checkbox',
            align: 'right',
            value: {
              date: null,
              text: null,
              number: null,
              pfereferal: null,
              jury_member: null,
              long_text: null,
              signature: signatureValue?.value?.signature || signatureValue?.value,
              correcter_name: null,
              mentor_name: null
            }
          })

        }
        payload.correction_grid.footer.fields = newFooter;
      }

      //**************** check if there is corrector or not in footer
       if(payload?.correction_grid?.footer?.fields){
        const correctorPayload = payload?.correction_grid?.footer?.fields?.find((payloadType) => payloadType?.type === 'correctername');
        const correctorPayloadIndex = payload?.correction_grid?.footer?.fields?.findIndex((payloadType) => payloadType?.type === 'correctername');
        if(correctorPayload && correctorPayloadIndex>=0){
          const tempPayloadCorrector = {
            align: correctorPayload?.align,
            data_type: correctorPayload?.data_type,
            label: correctorPayload?.label,
            type: correctorPayload?.type,
            value: correctorPayload?.value?.correcter_name
          }
          this.getFooterFieldsFormArray()?.at(correctorPayloadIndex)?.patchValue([tempPayloadCorrector]);
        }

        const signaturePayload = payload?.correction_grid?.footer?.fields?.find((payloadType) => payloadType?.type === 'signature');
        const signaturePayloadIndex = payload?.correction_grid?.footer?.fields?.findIndex((payloadType) => payloadType?.type === 'signature');
        if(signaturePayload && signaturePayloadIndex>=0){
          const tempPayloadSignature = {
            align: signaturePayload?.align,
            data_type: signaturePayload?.data_type,
            label: signaturePayload?.label,
            type: signaturePayload?.type,
            value: signaturePayload?.value?.signature
          }
          this.getFooterFieldsFormArray()?.at(signaturePayloadIndex)?.patchValue(tempPayloadSignature);
        }
        this.getFooterFieldsFormArray().updateValueAndValidity();
      }

      const studentAutoEvaluationTypes = [
        'academic_auto_evaluation',
        'academic_pro_evaluation',
        'soft_skill_auto_evaluation',
        'soft_skill_pro_evaluation',
      ]

      const footerIsValid = this.getFooterFieldsFormArray().valid;
      if (this.testData?.controlled_test || this.testData?.type === 'free_continuous_control') {
        const additionalTotalValue = this.getCorrectionForm().get('additional_total').value
        payload.is_saved = typeof additionalTotalValue === 'number' || Boolean(additionalTotalValue)
      } else if (this.competencyTabValidation()) {
        payload.is_saved = statusNotStartedorDraft?.length < 1 && footerIsValid;
      } else if (studentAutoEvaluationTypes.includes(this.testData?.type)) {
        payload.is_saved = !this.checkAnyInvalidSection(this.getSectionEvalskillForm().value) && footerIsValid;
      } else {
        payload.is_saved = !this.checkAnyInvalidSection() && footerIsValid;
      }
      payload.is_saved_as_draft = true;
      if (this.isSaveValidated()) {
        this.isSaveThisScore = true;
        this.disabledSaveThisScore = true;
      } else {
        this.isSaveThisScore = false;
      }

      if (statusNotStartedorDraft?.length >= 1) {
        this.previouslySavedAsDraftStudent = _.cloneDeep(this.studentSelectDetail);
      }
      if (this.firstForm?.missing_copy && this.firstForm?.is_justified === null && payload?.is_justified === null && this.isTaskValidateTest) {
        payload.is_justified = 'no'
      }

      if (this.testCorrectionId) {
        // update test correction
        this.isWaitingForResponse = true;
        this.subs.sink = this.testCorrectionService.updateTestCorrection(this.testCorrectionId, payload).subscribe(
          (resp) => {
            this.isDataSaved = true;
            this.isDataSubmit = false;
            this.isWaitingForResponse = false;
            this.autoPopulateFormWithStudentTestCorrection(this.testCorrectionId);
            // this.dataUpdated(payload, 'saveTestCorrection')
            if (resp) {
              if (actionAfterSave === 'validate') {
                // *************** first we refresh pdf data in frontend
                this.generatePdfData();
                // *************** after data refreshed, iswaitingpdf emitted, then we validate test correction
                this.subs.sink = this.isWaitingPdf$
                  .pipe(
                    filter((value) => value === false),
                    take(1),
                  )
                  .subscribe(() => {
                    this.validateTestCorrection();
                  });
              } else if (actionAfterSave === 'save-validate') {
                this.saveAndValidateTestCorrection()
              } else {
                if (actionAfterSave === 'SUBMIT_MARK_S2') {
                  this.sendUserActivity('click_on_button_save', {user: this.userFullName, test_name: this.testData?.name});
                  Swal.fire({
                    type: 'success',
                    title: this.translate.instant('SUBMIT_MARK_S2.TITLE'),
                    html: this.translate.instant('SUBMIT_MARK_S2.TEXT'),
                    footer: `<span style="margin-left: auto">SUBMIT_MARK_S2</span>`,
                    confirmButtonText: this.translate.instant('SUBMIT_MARK_S2.BUTTON_1'),
                    allowEscapeKey: true,
                    allowOutsideClick: false,
                    allowEnterKey: false,
                  }).then(() => {
                    this.selectedCompetenceIndex = typeof this.nextCompetenceIndex === 'number' ? this.nextCompetenceIndex : this.selectedCompetenceIndex;
                    this.nextCompetenceIndex = null
                    if (this.testData && this.testData.group_test) {
                      const result = _.findIndex(this.groupList, (groupFromList) => groupFromList._id === this.nextGroup?._id);
                      this.groupSelected(this.filteredGroupList[result]);
                    } else {
                      this.isSavedAfterMoveTab = true
                      this.getFilteredStudentList();
                    }
                    this.generatePdfData();
                  });
                }else if(actionAfterSave === 'SUBMIT_MARK_S1'){
                  if (this.testData && this.testData.group_test && this.checkIfTaskIsValidateTest()) {
                    const result = _.findIndex(this.groupList, (groupFromList) => groupFromList._id === this.selectedGroupData._id);

                    this.groupSelected(this.filteredGroupList[result],false,true);
                  } else {
                    this.isSavedFromSubmitMarkS1 = true
                    this.getFilteredStudentList();
                  }
                  this.generatePdfData();
                } else {
                  let student = ''
                  if(this.studentList?.length){
                    const currStudent = this.studentList.find(student => student?._id === payload?.student)
                    if(currStudent){
                      student = (currStudent?.civility && currStudent?.civility!=='neutral' ? this.translate.instant(currStudent?.civility) + " " : "" ) +currStudent?.first_name + " " + currStudent?.last_name
                    }
                  }
                  const swalText = this.isAllCompleted(payload) ? 'CORR_S10':'CORR_S1';
                  this.sendUserActivity('click_on_button_save', {user: this.userFullName, test_name: this.testData?.name});
                  swal
                  .fire({
                    type: 'success',
                    title: this.translate.instant(`${swalText}.TITLE`),
                    html: swalText === 'CORR_S10'?  this.translate.instant('CORR_S10.TEXT',{student}) :  this.translate.instant('CORR_S1.TEXT'),
                    footer: `<span style="margin-left: auto">${swalText}</span>`,
                    confirmButtonText: this.translate.instant(`${swalText}.BTN`),
                    allowEscapeKey: false,
                    allowEnterKey: false,
                    allowOutsideClick: false,
                  })
                  .then(() => {
                    if (this.testData && this.testData.group_test && this.checkIfTaskIsValidateTest()) {
                      const result = _.findIndex(this.groupList, (groupFromList) => groupFromList._id === this.selectedGroupData._id);

                      this.groupSelected(this.filteredGroupList[result]);
                    } else {
                      this.isSavedCurrentStudent = true;
                      this.getFilteredStudentList();
                    }
                    this.generatePdfData();
                  });
                }
              }
            }
          },
          (err) => {
            this.isWaitingForResponse = false;
            this.authService.postErrorLog(err);
            const msg = err?.message;
            if (msg?.includes('Corrector is already change')) {
              this.isChangedCorrector = true;
              const testName = this.testData?.name;
              const subjectName = this.testData?.subject_id?.subject_name;
              const acadirName =
                this.translate.instant(this.historyLastUpdated?.last_access_by?.civility) +
                ' ' +
                this.historyLastUpdated?.last_access_by?.first_name +
                ' ' +
                this.historyLastUpdated?.last_access_by?.last_name?.toLowerCase();
              Swal.fire({
                type: 'info',
                title: this.translate.instant('CHANGE_S2.TITLE', {
                  testName,
                  subjectName,
                }),
                html: this.translate.instant('CHANGE_S2.TEXT', {
                  testName,
                  subjectName,
                  acadirName,
                }),
                allowOutsideClick: false,
                allowEscapeKey: false,
                footer: `<span style="margin-left: auto">CHANGE_S2</span>`,
                confirmButtonText: this.translate.instant('CHANGE_S2.BUTTON_2'),
              }).then(() => {
                this.router.navigate(['/rncpTitles']);
              });
            }
          },
        );
      } else {
        // create test correction
        this.isWaitingForResponse = true;
        this.subs.sink = this.testCorrectionService.createTestCorrection(payload).subscribe(
          (resp) => {
            this.isDataSaved = true;
            this.isDataSubmit = false;
            this.isWaitingForResponse = false;
            this.firstForm = _.cloneDeep(this.testCorrectionForm.value);
            this.testCorrectionId = resp?._id;
            let student = ''
            if (this.studentList?.length) {
              const currStudent = this.studentList.find(student => student?._id === payload?.student)
              if (currStudent) {
                student = (currStudent?.civility && currStudent?.civility!=='neutral' ? this.translate.instant(currStudent?.civility) + " " : "" ) + currStudent?.first_name + " " + currStudent?.last_name
              }
            }
            swal
              .fire({
                type: 'success',
                title: this.translate.instant('CORR_S10.TITLE'),
                text: this.translate.instant('CORR_S10.TEXT', { student }),
                confirmButtonText: this.translate.instant('CORR_S10.BTN'),
                allowOutsideClick: false,
              })
              .then(() => {
                if (this.isGroup && this.testData && this.testData.group_test && this.checkIfTaskIsValidateTest()) {
                  this.groupSelected(this.filteredGroupList[0]);
                } else {
                  this.getFilteredStudentList();
                }
                this.generatePdfData();
              });
          },
          (err) => {
            this.isWaitingForResponse = false;
            this.authService.postErrorLog(err);
            const msg = err?.message;
            if (msg?.includes('Corrector is already change')) {
              this.isChangedCorrector = true;
              const testName = this.testData?.name;
              const subjectName = this.testData?.subject_id?.subject_name;
              const acadirName =
                this.translate.instant(this.historyLastUpdated?.last_access_by?.civility) +
                ' ' +
                this.historyLastUpdated?.last_access_by?.first_name +
                ' ' +
                this.historyLastUpdated?.last_access_by?.last_name?.toLowerCase();
              Swal.fire({
                type: 'info',
                title: this.translate.instant('CHANGE_S2.TITLE', {
                  testName,
                  subjectName,
                }),
                html: this.translate.instant('CHANGE_S2.TEXT', {
                  testName,
                  subjectName,
                  acadirName,
                }),
                allowOutsideClick: false,
                allowEscapeKey: false,
                footer: `<span style="margin-left: auto">CHANGE_S2</span>`,
                confirmButtonText: this.translate.instant('CHANGE_S2.BUTTON_2'),
              }).then(() => {
                this.router.navigate(['/rncpTitles']);
              });
            }
          },
        );
      }
    }
  }

  generatePdfData() {
    // to create pdf detail html so we can have pdf when click detail button
    if (this.testData && this.testData.group_test) {
      this.pdfGroupDetailRef.assignStudentsToGroup();
    } else {
      this.pdfDetailRef.getAllTestCorrection();
    }
  }

  saveGroupTestCorrection(actionAfterSave?: string) {
    const payload = {
      ..._.cloneDeep(this.formatPayload()),
      task_id: this.taskId,
    };

    let compStatus = [];
    let statusNotStartedorDraft = [];
    this.isSavedFromSubmitMarkS1 = false
    if (payload) {
      payload.correction_grid.correction.additional_total = Number(payload.correction_grid.correction.additional_total);
      payload.correction_grid.correction.total_jury_avg_rating = Number(payload.correction_grid.correction.total_jury_avg_rating);
      payload.correction_grid.correction.total = Number(payload.correction_grid.correction.total);
      payload.correction_grid.correction.sections.forEach((element, sectionIndex) => {
        if (element) {
          payload.correction_grid.correction.sections[sectionIndex].section_extra_total = Number(element.section_extra_total);
          payload.correction_grid.correction.sections[sectionIndex].coefficient = Number(element.coefficient);
          payload.correction_grid.correction.sections[sectionIndex].rating = Number(element.rating);
          payload.correction_grid.correction.sections[sectionIndex].sub_sections.forEach((elementSub, subSectionIndex) => {
            payload.correction_grid.correction.sections[sectionIndex].sub_sections[subSectionIndex].rating = Number(elementSub.rating);
          });
        }
      });
      payload.correction_grid.correction.sections_evalskill.forEach((element, sectionIndex) => {
        if (element) {
          payload.correction_grid.correction.sections_evalskill[sectionIndex].rating = Number(element.rating);
          payload.correction_grid.correction.sections_evalskill[sectionIndex].sub_sections.forEach((elementSub, subSectionIndex) => {
            payload.correction_grid.correction.sections_evalskill[sectionIndex].sub_sections[subSectionIndex].rating =
              elementSub?.rating || elementSub?.rating === 0 ? Number(elementSub.rating) : null;
            if (
              payload.correction_grid.correction.sections_evalskill[sectionIndex].sub_sections[subSectionIndex].multiple_dates &&
              payload.correction_grid.correction.sections_evalskill[sectionIndex].sub_sections[subSectionIndex].multiple_dates.length
            ) {
              payload.correction_grid.correction.sections_evalskill[sectionIndex].sub_sections[subSectionIndex].multiple_dates.forEach(
                (date, dateIndex) => {
                  if (date?.marks || date.marks === 0) {
                    date.marks = Number(date.marks);
                  }
                },
              );
              // when saving data, sort from earliest date to latest date
              payload.correction_grid.correction.sections_evalskill[sectionIndex].sub_sections[subSectionIndex].multiple_dates =
                payload.correction_grid.correction.sections_evalskill[sectionIndex].sub_sections[subSectionIndex].multiple_dates.reverse();
            } else {
              delete payload.correction_grid.correction.sections_evalskill[sectionIndex].sub_sections[subSectionIndex].multiple_dates;
            }
          });

          if (this.testCorrectionForm.get('missing_copy').value || (this.testCorrectionForm.get('is_do_not_participated').value && !this.isGroup && this.isStudent) || !this.showComptentyTab) {
            element.competence_status = 'completed'
          }
          if(element?.is_selected){
            compStatus.push(element?.competence_status);
          };
        }
      });

      if(compStatus?.length){
        compStatus?.forEach((respStatus) => {
          if(respStatus === 'draft' || respStatus === 'not_started') statusNotStartedorDraft.push(respStatus);
        });
      };

      if (payload?.correction_grid?.footer?.fields?.length) {
        const isSignatureFound = payload?.correction_grid?.footer?.fields?.find((foot) => foot?.type === 'signature');
        const signatureValue = payload?.correction_grid?.footer?.fields?.find((foot) => foot?.type === null);
        let newFooter = _.cloneDeep(payload?.correction_grid?.footer?.fields)?.filter((foot) => foot?.type);
        if (!isSignatureFound && signatureValue) {
          newFooter?.push({
            type: 'signature',
            label: 'Signature',
            data_type: 'checkbox',
            align: 'right',
            value: {
              date: null,
              text: null,
              number: null,
              pfereferal: null,
              jury_member: null,
              long_text: null,
              signature: signatureValue?.value?.signature || signatureValue?.value,
              correcter_name: null,
              mentor_name: null
            }
          })

        }
        payload.correction_grid.footer.fields = newFooter;
      }

      //**************** check if there is corrector or not in footer
      if(payload?.correction_grid?.footer?.fields){
        const correctorPayload = payload?.correction_grid?.footer?.fields?.find((payloadType) => payloadType?.type === 'correctername');
        const correctorPayloadIndex = payload?.correction_grid?.footer?.fields?.findIndex((payloadType) => payloadType?.type === 'correctername');
        if(correctorPayload && correctorPayloadIndex>=0){
          const tempPayloadCorrector = {
            align: correctorPayload?.align,
            data_type: correctorPayload?.data_type,
            label: correctorPayload?.label,
            type: correctorPayload?.type,
            value: correctorPayload?.value?.correcter_name
          }
          this.getFooterFieldsFormArray()?.at(correctorPayloadIndex)?.patchValue([tempPayloadCorrector]);
        }

        // Some corrector name fields has type of 'text' instead of 'correctername'
        const correctorAsTextPayload = payload?.correction_grid?.footer?.fields?.find((footer) => footer?.type === 'text' && footer?.label?.match(/corrector|correcteur/i));
        const correctorAsTextPayloadIndex = payload?.correction_grid?.footer?.fields?.findIndex((footer) => footer?.type === 'text' && footer?.label?.match(/corrector|correcteur/i));
        if(correctorAsTextPayload && correctorAsTextPayloadIndex>=0){
          const tempPayloadCorrector = {
            align: correctorAsTextPayload?.align,
            data_type: correctorAsTextPayload?.data_type,
            label: correctorAsTextPayload?.label,
            type: correctorAsTextPayload?.type,
            value: correctorAsTextPayload?.value?.correcter_name
          }
          this.getFooterFieldsFormArray()?.at(correctorAsTextPayloadIndex)?.patchValue([tempPayloadCorrector]);
        }

        const signaturePayload = payload?.correction_grid?.footer?.fields?.find((payloadType) => payloadType?.type === 'signature');
        const signaturePayloadIndex = payload?.correction_grid?.footer?.fields?.findIndex((payloadType) => payloadType?.type === 'signature');
        if(signaturePayload && signaturePayloadIndex>=0){
          const tempPayloadSignature = {
            align: signaturePayload?.align,
            data_type: signaturePayload?.data_type,
            label: signaturePayload?.label,
            type: signaturePayload?.type,
            value: signaturePayload?.value?.signature
          }
          this.getFooterFieldsFormArray()?.at(signaturePayloadIndex)?.patchValue(tempPayloadSignature);
        }
        this.getFooterFieldsFormArray().updateValueAndValidity();
      }

      const studentAutoEvaluationTypes = [
        'academic_auto_evaluation',
        'academic_pro_evaluation',
        'soft_skill_auto_evaluation',
        'soft_skill_pro_evaluation',
      ]

      const footerIsValid = this.getFooterFieldsFormArray().valid;
      if (this.testData?.controlled_test || this.testData?.type === 'free_continuous_control') {
        const additionalTotalValue = this.getCorrectionForm().get('additional_total').value
        payload.is_saved = typeof additionalTotalValue === 'number' || Boolean(additionalTotalValue)
      } else if (this.competencyTabValidation()) {
        payload.is_saved = statusNotStartedorDraft?.length < 1 && footerIsValid;
      } else if (studentAutoEvaluationTypes.includes(this.testData?.type)) {
        payload.is_saved = !this.checkAnyInvalidSection(this.getSectionEvalskillForm().value) && footerIsValid;
      } else {
        payload.is_saved = !this.checkAnyInvalidSection() && footerIsValid;
      }
      payload.is_saved_as_draft = true;
      if (this.isSaveValidated()) {
        this.isSaveThisScore = true;
        this.disabledSaveThisScore = true;
      } else {
        this.isSaveThisScore = false;
      }
      payload.test_group_id = this.test_group_id;
      delete payload.student;
      if (this.firstForm?.missing_copy && this.firstForm?.is_justified === null && payload?.is_justified === null && this.isTaskValidateTest) {
        payload.is_justified = 'no'
      }

      if (this.groupTestCorrectionId) {
        this.isWaitingForResponse = true;
        this.subs.sink = this.testCorrectionService.updateGroupTestCorrection(this.groupTestCorrectionId, payload).subscribe(
          resp => {
            this.isWaitingForResponse = false;
            this.autoPopulateFormWithGroupTestCorrection(this.groupTestCorrectionId);
            // this.dataUpdatedGroup(payload)
            if (resp) {
              if (actionAfterSave === 'validate') {
                this.validateTestCorrection();
              } else if (actionAfterSave === 'save-validate') {
                this.saveAndValidateTestCorrection();
              } else {
                if (actionAfterSave === 'SUBMIT_MARK_S2') {
                  this.sendUserActivity('click_on_button_save', { user: this.userFullName, test_name: this.testData?.name });
                  Swal.fire({
                    type: 'success',
                    title: this.translate.instant('SUBMIT_MARK_S2.TITLE'),
                    html: this.translate.instant('SUBMIT_MARK_S2.TEXT'),
                    footer: `<span style="margin-left: auto">SUBMIT_MARK_S2</span>`,
                    confirmButtonText: this.translate.instant('SUBMIT_MARK_S2.BUTTON_1'),
                    allowEscapeKey: true,
                    allowOutsideClick: false,
                    allowEnterKey: false,
                  }).then(() => {
                    this.selectedCompetenceIndex =
                      typeof this.nextCompetenceIndex === 'number' ? this.nextCompetenceIndex : this.selectedCompetenceIndex;
                    this.nextCompetenceIndex = null;
                    this.getFilteredGroupList();
                    this.populateGroupList();
                  });
                } else if (actionAfterSave === 'SUBMIT_MARK_S1') {
                  this.getFilteredGroupList(true);
                  this.populateGroupList();
                } else {
                    let student = this.studentSelect ? this.studentSelect : '';
                    const swalText = this.isAllCompleted(payload) ? 'CORR_S10' : 'CORR_S1';
                    this.sendUserActivity('click_on_button_save', { user: this.userFullName, test_name: this.testData?.name });
                    swal
                      .fire({
                        type: 'success',
                        title: this.translate.instant(`${swalText}.TITLE`),
                        html:
                          swalText === 'CORR_S10'
                            ? this.translate.instant('CORR_S10.TEXT', { student })
                            : this.translate.instant('CORR_S1.TEXT'),
                        footer: `<span style="margin-left: auto">${swalText}</span>`,
                        confirmButtonText: this.translate.instant(`${swalText}.BTN`),
                        allowEscapeKey: false,
                        allowEnterKey: false,
                        allowOutsideClick: false,
                      })
                      .then(() => {
                        this.getFilteredGroupList(false, resp);
                        this.testCorrectionForm.markAllAsTouched();
                      });
                   }
              }
            }
          },
          err => {
            this.isWaitingForResponse = false;
            this.authService.postErrorLog(err);
            const msg = err?.message;
            if (msg?.includes('Corrector is already change')) {
              this.isChangedCorrector = true;
              const testName = this.testData?.name;
              const subjectName = this.testData?.subject_id?.subject_name;
              const acadirName =
                this.translate.instant(this.historyLastUpdated?.last_access_by?.civility) +
                ' ' +
                this.historyLastUpdated?.last_access_by?.first_name +
                ' ' +
                this.historyLastUpdated?.last_access_by?.last_name?.toLowerCase();
              Swal.fire({
                type: 'info',
                title: this.translate.instant('CHANGE_S2.TITLE', {
                  testName,
                  subjectName,
                }),
                html: this.translate.instant('CHANGE_S2.TEXT', {
                  testName,
                  subjectName,
                  acadirName,
                }),
                allowOutsideClick: false,
                allowEscapeKey: false,
                footer: `<span style="margin-left: auto">CHANGE_S2</span>`,
                confirmButtonText: this.translate.instant('CHANGE_S2.BUTTON_2'),
              }).then(() => {
                this.router.navigate(['/rncpTitles']);
              });
            }
          },
        );
      }
      /* } else {
        this.isWaitingForResponse = true;
        this.subs.sink = this.testCorrectionService.createGroupTestCorrection(payload).subscribe(
          (resp) => {
            this.groupTestCorrectionId = resp._id;
            this.isWaitingForResponse = false;
            this.firstForm = _.cloneDeep(this.testCorrectionForm.value);
            if (resp) {
              swal
                .fire({
                  type: 'success',
                  title: 'Bravo',
                  text: this.translate.instant('Test correction is updated'),
                })
                .then(() => {
                  this.getFilteredGroupList();
                  this.populateGroupList();
                });
            }
          },
          (err) => {
            this.isWaitingForResponse = false;
            this.authService.postErrorLog(err);
            const msg = err?.message;
            if (msg?.includes('Corrector is already change')) {
              this.isChangedCorrector = true;
              const testName = this.testData?.name;
              const subjectName = this.testData?.subject_id?.subject_name;
              const acadirName =
                this.translate.instant(this.historyLastUpdated?.last_access_by?.civility) +
                ' ' +
                this.historyLastUpdated?.last_access_by?.first_name +
                ' ' +
                this.historyLastUpdated?.last_access_by?.last_name?.toLowerCase();
              Swal.fire({
                type: 'info',
                title: this.translate.instant('CHANGE_S2.TITLE', {
                  testName,
                  subjectName,
                }),
                html: this.translate.instant('CHANGE_S2.TEXT', {
                  testName,
                  subjectName,
                  acadirName,
                }),
                allowOutsideClick: false,
                allowEscapeKey: false,
                footer: `<span style="margin-left: auto">CHANGE_S2</span>`,
                confirmButtonText: this.translate.instant('CHANGE_S2.BUTTON_2'),
              }).then(() => {
                this.router.navigate(['/rncpTitles']);
              });
            }
          },
        );
      } */
    }
  }

  displayStudentName(id): string {
    if (id) {
      const foundStudent = _.find(this.studentList, (student) => student._id === id);
      if (foundStudent) {
        const studentName = foundStudent.last_name.toUpperCase() + ' ' + foundStudent.first_name;
        this.testCorrectionForm.get('student').patchValue(id);
        return studentName;
      } else {
        return id;
      }
    } else {
      return '';
    }
  }

  displayGroupName(id): string {
    if (id) {
      const foundGroup = _.find(this.groupList, (name) => name._id === id);
      if (foundGroup) {
        this.test_group_id = foundGroup._id;
        const groupName = foundGroup.name;
        return groupName;
      } else {
        return id;
      }
    } else {
      return '';
    }
  }

  openVoiceRecog() {
    this.dialog
      .open(SpeechToTextDialogComponent, {
        minWidth: '400px',
        minHeight: '250px',
        panelClass: 'certification-rule-pop-up',
        disableClose: true,
      })
      .afterClosed()
      .subscribe((resp) => {});
  }

  openTestDetail() {
    this.dialog.open(TestDetailsComponent, {
      width: '600px',
      disableClose: true,
      data: this.testData,
    });
  }

  formatDataBeforePatch(data) {
    // Change header value
    if (
      data &&
      data.correction_grid &&
      data.correction_grid.header &&
      data.correction_grid.header.fields &&
      data.correction_grid.header.fields.length
    ) {
      data.correction_grid.header.fields.forEach((header_field) => {
        if (header_field && header_field.type) {
          // const tempValue = header_field.value;
          switch (header_field.type) {
            case 'date':
              header_field.value = this.parseUTCtoLocal.transformDateToJavascriptDate(
                header_field.value.date.date,
                header_field.value.date.time,
              );
              break;
            case 'text':
              header_field.value = header_field.value.text;
              break;
            case 'number':
              header_field.value = header_field.value.number;
              break;
            case 'pfereferal':
              header_field.value = header_field.value.pfereferal;
              break;
            case 'jurymember':
              header_field.value = header_field.value.jury_member;
              break;
            case 'longtext':
              header_field.value = header_field.value.long_text;
              break;
            case 'signature':
              header_field.value = header_field.value.signature;
              break;
            case 'correctername':
              header_field.value = header_field?.value?.correcter_name;
              break;
            case 'mentorname':
              header_field.value = header_field.value.mentor_name;
              break;
            case 'etablishmentname':
              header_field.value = header_field.value.etablishment_name;
              break;
            case 'studentname':
              header_field.value = header_field.value.student_name;
              break;
            case 'eventName':
              header_field.value = header_field.value.event_name;
              break;
            case 'dateRange':
              header_field.value = this.parseUTCtoLocal.transformDateToJavascriptDate(
                header_field.value.date_range.date,
                header_field.value.date_range.time,
              );
              break;
            case 'dateFixed':
              header_field.value = this.parseUTCtoLocal.transformDateToJavascriptDate(
                header_field.value.date_fixed.date,
                header_field.value.date_fixed.time,
              );
              break;
            case 'titleName':
              header_field.value = header_field.value.title_name;
              break;
            case 'status':
              header_field.value = header_field.value.status;
              break;
            case 'companyname':
              header_field.value = header_field.value.company_name;
              break;
            case 'groupname':
              header_field.value = header_field.value.group_name;
              break;
            default:
              break;
          }
        }
      });
    }

    // Change footer value
    if (
      data &&
      data.correction_grid &&
      data.correction_grid.footer &&
      data.correction_grid.footer.fields &&
      data.correction_grid.footer.fields.length
    ) {
      data.correction_grid.footer.fields.forEach((footer_field) => {
        if (footer_field && !footer_field.data_type) {
          footer_field.data_type = 'text';
        }
        if (footer_field && footer_field.type) {
          // const tempValue = footer_field.value;
          switch (footer_field.type) {
            case 'date':
              footer_field.value = this.parseUTCtoLocal.transformDateToJavascriptDate(
                footer_field.value.date.date,
                footer_field.value.date.time,
              );
              break;
            case 'text':
              // *************** need to handle "corrector" field with type "text". example implementation is on footer-section.component -> getCorrectorName()
              if (!footer_field?.value?.text && footer_field.label.match(/correcteur|corrector/i)) {
                footer_field.value = data?.corrector?.last_name + ' ' + data?.corrector?.first_name;
              } else {
                footer_field.value = footer_field.value.text;
              }
              break;
            case 'number':
              footer_field.value = footer_field.value.number;
              break;
            case 'pfereferal':
              footer_field.value = footer_field.value.pfereferal;
              break;
            case 'jurymember':
              footer_field.value = footer_field.value.jury_member;
              break;
            case 'longtext':
              footer_field.value = footer_field.value.long_text;
              break;
            case 'signature':
              footer_field.value = footer_field.value.signature;
              break;
            case 'correctername':
              if (data?.corrector?.last_name && data?.corrector?.first_name && !footer_field?.value?.correcter_name) {
                footer_field.value = data?.corrector?.last_name + ' ' + data?.corrector?.first_name;
              } else {
                footer_field.value = footer_field?.value?.correcter_name;
              }
              break;
            case 'mentorname':
              footer_field.value = footer_field.value.mentor_name;
              break;
            case 'etablishmentname':
              footer_field.value = footer_field.value.etablishment_name;
              break;
            case 'studentname':
              footer_field.value = footer_field.value.student_name;
              break;
            case 'eventName':
              footer_field.value = footer_field.value.event_name;
              break;
            case 'dateRange':
              footer_field.value = this.parseUTCtoLocal.transformDateToJavascriptDate(
                footer_field.value.date_range.date,
                footer_field.value.date_range.time,
              );
              break;
            case 'dateFixed':
              footer_field.value = this.parseUTCtoLocal.transformDateToJavascriptDate(
                footer_field.value.date_fixed.date,
                footer_field.value.date_fixed.time,
              );
              break;
            case 'titleName':
              footer_field.value = footer_field.value.title_name;
              break;
            case 'status':
              footer_field.value = footer_field.value.status;
              break;
            case 'companyname':
              footer_field.value = footer_field.value.company_name;
              break;
            case 'groupname':
              footer_field.value = footer_field.value.group_name;
              break;
            default:
              break;
          }
        } else {
          if ((footer_field?.value?.signature || footer_field?.value?.signature === false) && !footer_field?.type) {
            footer_field.value = footer_field.value.signature;
          }
        }
      });
    }

    if (data.test && data.test._id) {
      data.test = data.test._id;
    }

    if (data.corrector && data.corrector._id) {
      data.corrector = data.corrector._id;
    } else {
      delete data.corrector;
    }

    if (data.student && data.student._id) {
      data.student = data.student._id;
    }

    if (data.school_id && data.school_id._id) {
      data.school_id = data.school_id._id;
    }

    if (data && data.expected_documents && data.expected_documents.length) {
      data.expected_documents.forEach((doc) => {
        if (doc && doc.document && doc.document._id) {
          doc.document = doc.document._id;
        }
      });
    }

    if (data && data.document_for_missing_copy && data.document_for_missing_copy.length) {
      this.setMissingCopyDocument(data.document_for_missing_copy[0]);
      data.document_for_missing_copy = data.document_for_missing_copy.map((mc) => mc._id);
    }

    if (data && data.element_of_proof_doc && data.element_of_proof_doc._id) {
      this.setElementOfProofDocument(data.element_of_proof_doc);
      data.element_of_proof_doc = data.element_of_proof_doc._id;
    }

    if (
      data &&
      data.correction_grid &&
      data.correction_grid.correction &&
      data.correction_grid.correction.sections &&
      data.correction_grid.correction.sections.length
    ) {
      data.correction_grid.correction.sections.forEach((section) => {
        if (section?.title) {
          section.cleanTitle = this.getFullTextFromHtml(section.title)
        }
        if (section?.sub_sections?.length) {
          section.sub_sections.forEach((subsec) => {
            if (subsec?.title) {
              subsec.cleanTitle = this.getFullTextFromHtml(subsec.title);
            }
            if (subsec?.directions) {
              subsec.cleanDirections = this.getFullTextFromHtml(subsec.directions);
            }
            if (subsec?.comments) {
              subsec.comments = this.getFullTextFromHtml(subsec.comments);
            }
            // remove directions from test correction data if it's empty
            if (!subsec.directions) {
              delete subsec.directions;
            }
          });
        }
      });
    }

    if (
      data &&
      data.correction_grid &&
      data.correction_grid.correction.sections_evalskill &&
      data.correction_grid.correction.sections_evalskill.length
    ) {
      data.correction_grid.correction.sections_evalskill.forEach((sec, secIndex) => {
        if (sec && sec.academic_skill_competence_template_id && sec.academic_skill_competence_template_id._id) {
          sec.academic_skill_competence_template_id = sec.academic_skill_competence_template_id._id;
        }
        if (sec && sec.soft_skill_competence_template_id && sec.soft_skill_competence_template_id._id) {
          sec.soft_skill_competence_template_id = sec.soft_skill_competence_template_id._id;
        }
        if (sec && sec.academic_skill_block_template_id && sec.academic_skill_block_template_id._id) {
          sec.academic_skill_block_template_id = sec.academic_skill_block_template_id._id;
        }
        if (sec && sec.soft_skill_block_template_id && sec.soft_skill_block_template_id._id) {
          sec.soft_skill_block_template_id = sec.soft_skill_block_template_id._id;
        }
        if (sec?.title) {
          sec.cleanTitle = this.getFullTextFromHtml(sec.title)
        }
        if (sec?.sub_sections?.length) {
          sec.sub_sections.forEach((subsec, subsecIndex) => {
            if (subsec?.title) {
              subsec.cleanTitle = this.getFullTextFromHtml(subsec.title)
            }
            if (subsec?.directions) {
              subsec.cleanDirections = this.getFullTextFromHtml(subsec.directions)
            }
            if (
              subsec &&
              subsec.academic_skill_criteria_of_evaluation_competence_id &&
              subsec.academic_skill_criteria_of_evaluation_competence_id._id
            ) {
              subsec.academic_skill_criteria_of_evaluation_competence_id = subsec.academic_skill_criteria_of_evaluation_competence_id._id;
            }
            if (
              subsec &&
              subsec.soft_skill_criteria_of_evaluation_competence_id &&
              subsec.soft_skill_criteria_of_evaluation_competence_id._id
            ) {
              subsec.soft_skill_criteria_of_evaluation_competence_id = subsec.soft_skill_criteria_of_evaluation_competence_id._id;
            }
            if (subsec && subsec.academic_skill_competence_template_id && subsec.academic_skill_competence_template_id._id) {
              subsec.academic_skill_competence_template_id = subsec.academic_skill_competence_template_id._id;
            }
            if (subsec && subsec.soft_skill_competence_template_id && subsec.soft_skill_competence_template_id._id) {
              subsec.soft_skill_competence_template_id = subsec.soft_skill_competence_template_id._id;
            }
            if (subsec.is_criteria_evaluated === null) {
              subsec.is_criteria_evaluated = true;
            }
            if (subsec && subsec.multiple_dates && subsec.multiple_dates.length) {
              const lastDateIndex = subsec.multiple_dates.length - 1;

              if (
                this.taskData &&
                this.taskData.due_date &&
                this.taskData.due_date.date &&
                this.taskData.due_date.date !== subsec.multiple_dates[lastDateIndex].date &&
                !this.checkIfTaskIsValidateTest()
              ) {
                subsec.multiple_dates.push({
                  date: this.taskData.due_date.date,
                  // tempTime: this.taskData.due_date.time,
                  marks: null,
                  observation: '',
                  score_conversion_id: '',
                });
                this.getSubSectionEvalskillForm(secIndex).at(subsecIndex).get('rating').clearValidators();
                this.getSubSectionEvalskillForm(secIndex).at(subsecIndex).get('rating').updateValueAndValidity();
              } else {
                // data already saved before. so enable the submit button
                this.isDataSaved = true;
                this.isDataSubmit = true;
              }
              // sort from latest date to earliest date so user can easier to access the field and inputting mark
              subsec.multiple_dates = subsec.multiple_dates.reverse();
              this.setMultipleDatesFormData(subsec.multiple_dates);
            } else {
              const unCorrectedStudent = this.filteredStudentList?.find(student => !student?.score && student?.score !== 0)
              if (!unCorrectedStudent) {
                this.isDataSaved = true;
                this.isDataSubmit = true;
              }
            }
          });
        }
      });
    }

    return data;
  }

  formatDataBeforePatchGroup(data) {
    // Change header value
    if (
      data &&
      data.correction_grid &&
      data.correction_grid.header &&
      data.correction_grid.header.fields &&
      data.correction_grid.header.fields.length
    ) {
      data.correction_grid.header.fields.forEach((header_field) => {
        if (header_field && header_field.type) {
          // const tempValue = header_field.value;
          switch (header_field.type) {
            case 'date':
              header_field.value = this.parseUTCtoLocal.transformDateToJavascriptDate(
                header_field.value.date.date,
                header_field.value.date.time,
              );
              break;
            case 'text':
              header_field.value = header_field.value.text;
              break;
            case 'number':
              header_field.value = header_field.value.number;
              break;
            case 'pfereferal':
              header_field.value = header_field.value.pfereferal;
              break;
            case 'jurymember':
              header_field.value = header_field.value.jury_member;
              break;
            case 'longtext':
              header_field.value = header_field.value.long_text;
              break;
            case 'signature':
              header_field.value = header_field.value.signature;
              break;
            case 'correctername':
              header_field.value = header_field?.value?.correcter_name;
              break;
            case 'mentorname':
              header_field.value = header_field.value.mentor_name;
              break;
            case 'etablishmentname':
              header_field.value = header_field.value.etablishment_name;
              break;
            case 'studentname':
              header_field.value = header_field.value.student_name;
              break;
            case 'eventName':
              header_field.value = header_field.value.event_name;
              break;
            case 'dateRange':
              header_field.value = this.parseUTCtoLocal.transformDateToJavascriptDate(
                header_field.value.date_range.date,
                header_field.value.date_range.time,
              );
              break;
            case 'dateFixed':
              header_field.value = this.parseUTCtoLocal.transformDateToJavascriptDate(
                header_field.value.date_fixed.date,
                header_field.value.date_fixed.time,
              );
              break;
            case 'titleName':
              header_field.value = header_field.value.title_name;
              break;
            case 'status':
              header_field.value = header_field.value.status;
              break;
            case 'companyname':
              header_field.value = header_field.value.company_name;
              break;
            case 'groupname':
              header_field.value = header_field.value.group_name;
              break;
            default:
              break;
          }
        }
      });
    }

    // Change footer value
    if (
      data &&
      data.correction_grid &&
      data.correction_grid.footer &&
      data.correction_grid.footer.fields &&
      data.correction_grid.footer.fields.length
    ) {
      data.correction_grid.footer.fields.forEach((footer_field) => {
        if (footer_field && !footer_field.data_type) {
          footer_field.data_type = 'text';
        }
        if (footer_field && footer_field.type) {
          // const tempValue = footer_field.value;
          switch (footer_field.type) {
            case 'date':
              footer_field.value = this.parseUTCtoLocal.transformDateToJavascriptDate(
                footer_field.value.date.date,
                footer_field.value.date.time,
              );
              break;
            case 'text':
              // *************** need to handle "corrector" field with type "text". example implementation is on footer-section.component -> getCorrectorName()
              if (footer_field.label.includes('correcteur') || footer_field.label.includes('corrector')) {
                footer_field.value = data?.corrector?.last_name + ' ' + data?.corrector?.first_name;
              } else {
                footer_field.value = footer_field.value.text;
              }
              break;
            case 'number':
              footer_field.value = footer_field.value.number;
              break;
            case 'pfereferal':
              footer_field.value = footer_field.value.pfereferal;
              break;
            case 'jurymember':
              footer_field.value = footer_field.value.jury_member;
              break;
            case 'longtext':
              footer_field.value = footer_field.value.long_text;
              break;
            case 'signature':
              footer_field.value = footer_field.value.signature;
              break;
            case 'correctername':
              if (data?.corrector?.last_name && data?.corrector?.first_name && !footer_field?.value?.correcter_name) {
                footer_field.value = data?.corrector?.last_name + ' ' + data?.corrector?.first_name;
              } else {
                footer_field.value = footer_field?.value?.correcter_name;
              }
              break;
            case 'mentorname':
              footer_field.value = footer_field.value.mentor_name;
              break;
            case 'etablishmentname':
              footer_field.value = footer_field.value.etablishment_name;
              break;
            case 'studentname':
              footer_field.value = footer_field.value.student_name;
              break;
            case 'eventName':
              footer_field.value = footer_field.value.event_name;
              break;
            case 'dateRange':
              footer_field.value = this.parseUTCtoLocal.transformDateToJavascriptDate(
                footer_field.value.date_range.date,
                footer_field.value.date_range.time,
              );
              break;
            case 'dateFixed':
              footer_field.value = this.parseUTCtoLocal.transformDateToJavascriptDate(
                footer_field.value.date_fixed.date,
                footer_field.value.date_fixed.time,
              );
              break;
            case 'titleName':
              footer_field.value = footer_field.value.title_name;
              break;
            case 'status':
              footer_field.value = footer_field.value.status;
              break;
            case 'companyname':
              footer_field.value = footer_field.value.company_name;
              break;
            case 'groupname':
              footer_field.value = footer_field.value.group_name;
              break;
            default:
              break;
          }
        }
      });
    }

    if (data.test && data.test._id) {
      data.test = data.test._id;
    }

    if (data.test_group_id && data.test_group_id._id) {
      data.test_group_id = data.test_group_id._id;
    }

    if (data.corrector && data.corrector._id) {
      data.corrector = data.corrector._id;
    } else {
      delete data.corrector;
    }

    if (data.student && data.student._id) {
      data.student = data.student._id;
    }

    if (data.school_id && data.school_id._id) {
      data.school_id = data.school_id._id;
    }

    if (data && data.expected_documents && data.expected_documents.length) {
      data.expected_documents.forEach((doc) => {
        if (doc && doc.document && doc.document._id) {
          doc.document = doc.document._id;
        }
      });
    }

    if (data && data.document_for_missing_copy && data.document_for_missing_copy.length) {
      this.setMissingCopyDocument(data.document_for_missing_copy[0]);
      data.document_for_missing_copy = data.document_for_missing_copy.map((mc) => mc._id);
    }

    if (data && data.element_of_proof_doc && data.element_of_proof_doc._id) {
      this.setElementOfProofDocument(data.element_of_proof_doc);
      data.element_of_proof_doc = data.element_of_proof_doc._id;
    }

    if (
      data &&
      data.correction_grid &&
      data.correction_grid.correction &&
      data.correction_grid.correction.sections &&
      data.correction_grid.correction.sections.length
    ) {
      data.correction_grid.correction.sections.forEach((section) => {
        if (section?.sub_sections?.length) {
          section.sub_sections.forEach((subsec) => {
            // remove directions from test correction data if it's empty
            if (!subsec.directions) {
              delete subsec.directions;
            }
          });
        }
      });
    }

    if (
      data &&
      data.correction_grid &&
      data.correction_grid.correction.sections_evalskill &&
      data.correction_grid.correction.sections_evalskill.length
    ) {
      data.correction_grid.correction.sections_evalskill.forEach((sec) => {
        if (sec && sec.academic_skill_competence_template_id && sec.academic_skill_competence_template_id._id) {
          sec.academic_skill_competence_template_id = sec.academic_skill_competence_template_id._id;
        }
        if (sec && sec.soft_skill_competence_template_id && sec.soft_skill_competence_template_id._id) {
          sec.soft_skill_competence_template_id = sec.soft_skill_competence_template_id._id;
        }
        if (sec && sec.academic_skill_block_template_id && sec.academic_skill_block_template_id._id) {
          sec.academic_skill_block_template_id = sec.academic_skill_block_template_id._id;
        }
        if (sec && sec.soft_skill_block_template_id && sec.soft_skill_block_template_id._id) {
          sec.soft_skill_block_template_id = sec.soft_skill_block_template_id._id;
        }
        if (sec?.sub_sections?.length) {
          sec.sub_sections.forEach((subsec) => {
            if (
              subsec &&
              subsec.academic_skill_criteria_of_evaluation_competence_id &&
              subsec.academic_skill_criteria_of_evaluation_competence_id._id
            ) {
              subsec.academic_skill_criteria_of_evaluation_competence_id = subsec.academic_skill_criteria_of_evaluation_competence_id._id;
            }
            if (
              subsec &&
              subsec.soft_skill_criteria_of_evaluation_competence_id &&
              subsec.soft_skill_criteria_of_evaluation_competence_id._id
            ) {
              subsec.soft_skill_criteria_of_evaluation_competence_id = subsec.soft_skill_criteria_of_evaluation_competence_id._id;
            }
            if (subsec && subsec.academic_skill_competence_template_id && subsec.academic_skill_competence_template_id._id) {
              subsec.academic_skill_competence_template_id = subsec.academic_skill_competence_template_id._id;
            }
            if (subsec && subsec.soft_skill_competence_template_id && subsec.soft_skill_competence_template_id._id) {
              subsec.soft_skill_competence_template_id = subsec.soft_skill_competence_template_id._id;
            }
            if (subsec.is_criteria_evaluated === null) {
              // delete subsec.is_criteria_evaluated;
              subsec.is_criteria_evaluated = false;
            }
          });
        }
      });
    }

    return data;
  }



  checkNotValid() {}

  /**
   * Function to check validity of corrector name and signature if exist
   * @returns {boolean} - validity, true means valid
   */
  checkFooterValidity(): boolean {
    if (!this.testCorrectionForm.get('correction_grid')?.get('footer')) {
      return true;
    }
    const footerFields = this.getFooterFieldsFormArray();
    const footerControls = Array.isArray(footerFields?.controls) ? footerFields.controls : [];
    const correctorNameControl = footerControls.find(control => control?.get('type')?.value === 'correctername' || (control?.get('type')?.value === 'text' && control?.get('label')?.value?.match(/corrector|correcteur/i)));
    if (correctorNameControl && !correctorNameControl?.valid) {
      return false;
    }
    const signatureControl = footerControls.find(control => control?.get('type')?.value === 'signature');
    if (signatureControl && !signatureControl?.valid) {
      return false;
    }
    return true;
  }

  mutateSubmitTestCorrection() {
    this.isWaitingForResponse = true;
    if (this.testData && this.testData.correction_type === 'cross_correction' && !this.taskId) {
      const studentPdfResults = this.getStudentPdfResults();
      this.subs.sink = this.testCorrectionService
        .submitMarkEntryCrossCorrectionFromAcadKit(
          this.testData.parent_rncp_title._id,
          this.schoolId,
          this.testId,
          this.testData.class_id._id,
          this.translate.currentLang,
          studentPdfResults,
        )
        .subscribe(
          (res) => {
            this.isWaitingForResponse = false;
            this.sendUserActivity('click_on_button_submit', {user: this.currentUser?.last_name + ' ' + this.currentUser?.first_name, test_name: this.testData?.name})
            Swal.fire({
              type: 'success',
              title: this.translate.instant('TESTCORRECTIONS.MESSAGE.ALLCORRECTIONSSUBMITTEDTitle'),
              allowEscapeKey: true,
              html: this.translate.instant('TESTCORRECTIONS.MESSAGE.ALLCORRECTIONSSUBMITTED'),
              confirmButtonText: this.translate.instant('TESTCORRECTIONS.MESSAGE.ALLCORRECTIONSSUBMITTEDBtn'),
              footer: `<span style="margin-left: auto">SUBMIT_MARK_S4</span>`,
            }).then((result) => {
              this.router.navigate(['/']);
            });
          },
          (err) => (this.isWaitingForResponse = false),
        );
    } else if (
      this.testData.correction_type === 'cross_correction' &&
      this.taskId &&
      this.testData.parent_rncp_title &&
      this.testData.class_id
    ) {
      // *************** Submit for cross correction, also need to generate the PDF
      const studentPdfResults = this.getStudentPdfResults();
      this.subs.sink = this.testCorrectionService
        .submitMarkEntryCrossCorrection(
          this.taskId,
          this.testData.parent_rncp_title._id,
          this.testData.class_id._id,
          this.translate.currentLang,
          studentPdfResults,
        )
        .subscribe(
          (resp) => {
            if (resp) {
              this.sendUserActivity('click_on_button_submit', {user: this.currentUser?.last_name + ' ' + this.currentUser?.first_name, test_name: this.testData?.name})
              Swal.fire({
                type: 'success',
                title: this.translate.instant('TESTCORRECTIONS.MESSAGE.ALLCORRECTIONSSUBMITTEDTitle'),
                allowEscapeKey: true,
                html: this.translate.instant('TESTCORRECTIONS.MESSAGE.ALLCORRECTIONSSUBMITTED'),
                confirmButtonText: this.translate.instant('TESTCORRECTIONS.MESSAGE.ALLCORRECTIONSSUBMITTEDBtn'),
                footer: `<span style="margin-left: auto">SUBMIT_MARK_S4</span>`,
              }).then((result) => {
                this.router.navigate(['/'])
              });
            }
          },
          (err) => (this.isWaitingForResponse = false),
        );
    } else if (this.testData.type === 'memoire_oral') {
      // submit test correction for jury organization
      this.submitJuryOrganizationMarkEntry();
    } else if (this.testCorrectionForm.get('final_retake').value) {
      // submit test correction for final retake test
      this.submitFinalRetakeMarkEntry();
    } else if (this.testData.type === 'academic_recommendation') {
      // submit test correction for jury organization
      const studentPdfResults = this.getStudentPdfResults();
      this.subs.sink = this.testCorrectionService
        .submitMarkEntryAcadRec(this.testId, this.schoolId, this.taskId, studentPdfResults)
        .subscribe(
          (resp) => {
            if (resp) {
              if (this.taskData && this.taskData.task_status === 'todo') {
                this.subs.sink = this.testCorrectionService.markDoneTask(this.taskId, this.translate.currentLang).subscribe((response) => {
                  if (response) {
                    this.isWaitingForResponse = false;
                    this.firstForm = _.cloneDeep(this.testCorrectionForm.value);
                    this.triggerSwalSubmit();
                  }
                });
              } else {
                this.isWaitingForResponse = false;
                this.firstForm = _.cloneDeep(this.testCorrectionForm.value);
                this.triggerSwalSubmit();
              }
            }
          },
          (err) => {
            this.isWaitingForResponse = false;
            this.authService.postErrorLog(err);
            const msg = err?.message;
            if (msg?.includes('Corrector is already change')) {
              this.isChangedCorrector = true;
              const testName = this.testData?.name;
              const subjectName = this.testData?.subject_id?.subject_name;
              const acadirName =
                this.translate.instant(this.historyLastUpdated?.last_access_by?.civility) +
                ' ' +
                this.historyLastUpdated?.last_access_by?.first_name +
                ' ' +
                this.historyLastUpdated?.last_access_by?.last_name?.toLowerCase();
              Swal.fire({
                type: 'info',
                title: this.translate.instant('CHANGE_S2.TITLE', {
                  testName,
                  subjectName,
                }),
                html: this.translate.instant('CHANGE_S2.TEXT', {
                  testName,
                  subjectName,
                  acadirName,
                }),
                allowOutsideClick: false,
                allowEscapeKey: false,
                footer: `<span style="margin-left: auto">CHANGE_S2</span>`,
                confirmButtonText: this.translate.instant('CHANGE_S2.BUTTON_2'),
              }).then(() => {
                this.router.navigate(['/rncpTitles']);
              });
            }
          },
        );
    } else if (this.testData.type === 'preparation_center_eval_soft_skill') {
      this.subs.sink = this.testCorrectionService.submitMarkEntry(this.testId, this.schoolId, this.taskId).subscribe(
        (resp) => {
          if (resp) {
            this.triggerSwalSubmit();
            this.validateTestCorrection();
          }
        },
        (err) => {
          this.isWaitingForResponse = false;
          this.authService.postErrorLog(err);
          const msg = err?.message;
          if (msg?.includes('Corrector is already change')) {
            this.isChangedCorrector = true;
            const testName = this.testData?.name;
            const subjectName = this.testData?.subject_id?.subject_name;
            const acadirName =
              this.translate.instant(this.historyLastUpdated?.last_access_by?.civility) +
              ' ' +
              this.historyLastUpdated?.last_access_by?.first_name +
              ' ' +
              this.historyLastUpdated?.last_access_by?.last_name?.toLowerCase();
            Swal.fire({
              type: 'info',
              title: this.translate.instant('CHANGE_S2.TITLE', {
                testName,
                subjectName,
              }),
              html: this.translate.instant('CHANGE_S2.TEXT', {
                testName,
                subjectName,
                acadirName,
              }),
              allowOutsideClick: false,
              allowEscapeKey: false,
              footer: `<span style="margin-left: auto">CHANGE_S2</span>`,
              confirmButtonText: this.translate.instant('CHANGE_S2.BUTTON_2'),
            }).then(() => {
              this.router.navigate(['/rncpTitles']);
            });
          }
        },
      );
    } else {
      // submit test correction for normal test
      this.subs.sink = this.testCorrectionService.submitMarkEntry(this.testId, this.schoolId, this.taskId).subscribe(
        (resp) => {
          if (resp) {
            if (this.taskData && this.taskData.task_status === 'todo') {
              this.subs.sink = this.testCorrectionService.markDoneTask(this.taskId, this.translate.currentLang).subscribe((response) => {
                if (response) {
                  this.isWaitingForResponse = false;
                  this.firstForm = _.cloneDeep(this.testCorrectionForm.value);
                  this.triggerSwalSubmit();
                  if (this.testData.type === 'preparation_center_eval_soft_skill') {
                    this.validateTestCorrection();
                  }
                }
              });
            } else {
              this.isWaitingForResponse = false;
              this.firstForm = _.cloneDeep(this.testCorrectionForm.value);
              this.triggerSwalSubmit();
              if (this.testData.type === 'preparation_center_eval_soft_skill') {
                this.validateTestCorrection();
              }
            }
          }
        },
        (err) => {
          this.isWaitingForResponse = false;
          this.authService.postErrorLog(err);
          const msg = err?.message;
          if (msg?.includes('Corrector is already change')) {
            this.isChangedCorrector = true;
            const testName = this.testData?.name;
            const subjectName = this.testData?.subject_id?.subject_name;
            const acadirName =
              this.translate.instant(this.historyLastUpdated?.last_access_by?.civility) +
              ' ' +
              this.historyLastUpdated?.last_access_by?.first_name +
              ' ' +
              this.historyLastUpdated?.last_access_by?.last_name?.toLowerCase();
            Swal.fire({
              type: 'info',
              title: this.translate.instant('CHANGE_S2.TITLE', {
                testName,
                subjectName,
              }),
              html: this.translate.instant('CHANGE_S2.TEXT', {
                testName,
                subjectName,
                acadirName,
              }),
              allowOutsideClick: false,
              allowEscapeKey: false,
              footer: `<span style="margin-left: auto">CHANGE_S2</span>`,
              confirmButtonText: this.translate.instant('CHANGE_S2.BUTTON_2'),
            }).then(() => {
              this.router.navigate(['/rncpTitles']);
            });
          }
        },
      );
    }
  }

  submitFinalRetakeMarkEntry() {
    this.subs.sink = this.testCorrectionService.submitFinalRetakeMarkEntry(this.testId, this.schoolId, this.taskId).subscribe((resp) => {
      if (resp) {
        this.isWaitingForResponse = false;
        this.firstForm = _.cloneDeep(this.testCorrectionForm.value);
        this.triggerSwalSubmit();
      }
    });
  }

  submitJuryOrganizationMarkEntry() {
    this.subs.sink = this.testCorrectionService
      .SubmitMarksEntryForJury(
        this.testId,
        this.schoolId,
        this.taskId,
        this.testCorrectionForm.get('jury_organization_id').value,
        this.testCorrectionForm.get('jury_member_id').value,
      )
      .subscribe((resp) => {
        if (resp) {
          this.isWaitingForResponse = false;
          this.firstForm = _.cloneDeep(this.testCorrectionForm.value);
          this.triggerSwalSubmit();
        }
      });
  }

  triggerSwalSubmit() {
    if (this.testData.correction_type === 'certifier') {
      swal
        .fire({
          type: 'success',
          title: this.translate.instant('SUCCESS'),
          html: this.translate.instant('TESTCORRECTIONS.MESSAGE.CORR_S8.TEXT'),
          confirmButtonText: this.translate.instant('TESTCORRECTIONS.MESSAGE.CORR_S8.BTN_OK'),
          allowEscapeKey: false,
          allowEnterKey: false,
          allowOutsideClick: false,
          footer: `<span style="margin-left: auto">CORR_S8</span>`,
        })
        .then(() => {
          this.routeToDashBoard();
        });
    } else {
      if (this.permissions.getPermission('ADMTC Director') || this.permissions.getPermission('ADMTC Admin')) {
        this.sendUserActivity('click_on_button_submit', {user: this.currentUser?.last_name + ' ' + this.currentUser?.first_name, test_name: this.testData?.name})
        swal
          .fire({
            type: 'success',
            title: this.translate.instant('TESTCORRECTIONS.MESSAGE.ALLCORRECTIONSSUBMITTEDTitle'),
            html: this.translate.instant('TESTCORRECTIONS.MESSAGE.ALLCORRECTIONSSUBMITTEDADMTC'),
            confirmButtonText: this.translate.instant('TESTCORRECTIONS.MESSAGE.ALLCORRECTIONSSUBMITTEDBtn'),
            allowEscapeKey: false,
            allowEnterKey: false,
            allowOutsideClick: false,
            footer: `<span style="margin-left: auto">SUBMIT_MARK_S3</span>`,
          })
          .then(() => {
            this.routeToDashBoard();
          });
      } else if (this.permissions.getPermission('Student')) {
        this.sendUserActivity('click_on_button_submit', {user: this.currentUser?.last_name + ' ' + this.currentUser?.first_name, test_name: this.testData?.name})
        swal
          .fire({
            type: 'success',
            title: this.translate.instant('TESTCORRECTIONS.MESSAGE.ALLCORRECTIONSSUBMITTEDTitle'),
            html: this.translate.instant('TESTCORRECTIONS.MESSAGE.ALLCORRECTIONSSUBMITTED'),
            confirmButtonText: this.translate.instant('TESTCORRECTIONS.MESSAGE.ALLCORRECTIONSSUBMITTEDBtn'),
            allowEscapeKey: false,
            allowEnterKey: false,
            allowOutsideClick: false,
            footer: `<span style="margin-left: auto">SUBMIT_MARK_S4</span>`,
          })
          .then(() => {
            this.routeToTaskTable();
          });
      } else {
        this.sendUserActivity('click_on_button_submit', {user: this.currentUser?.last_name + ' ' + this.currentUser?.first_name, test_name: this.testData?.name})
        swal
          .fire({
            type: 'success',
            title: this.translate.instant('TESTCORRECTIONS.MESSAGE.ALLCORRECTIONSSUBMITTEDTitle'),
            html: this.translate.instant('TESTCORRECTIONS.MESSAGE.ALLCORRECTIONSSUBMITTED'),
            confirmButtonText: this.translate.instant('TESTCORRECTIONS.MESSAGE.ALLCORRECTIONSSUBMITTEDBtn'),
            allowEscapeKey: false,
            allowEnterKey: false,
            allowOutsideClick: false,
            footer: `<span style="margin-left: auto">SUBMIT_MARK_S4</span>`,
          })
          .then(() => {
            this.routeToDashBoard();
          });
      }
    }
  }

  saveAndValidateTestCorrection() {
    if ((this.testData?.type === 'free_continuous_control' || this.testData?.controlled_test) && !this.testCorrectionForm.get('missing_copy').value) {
      const total = this.getCorrectionForm().get('additional_total').value
      if (typeof total !== 'number' || total < 0 || total > 20) {
        Swal.fire({
          type: 'warning',
          title: this.translate.instant('SUBMIT_MARK_S1.TITLE'),
          html: this.translate.instant('SUBMIT_MARK_S1.TEXT'),
          footer: `<span style="margin-left: auto">SUBMIT_MARK_S1</span>`,
          confirmButtonText: this.translate.instant('SUBMIT_MARK_S1.BUTTON_1'),
          allowEscapeKey: true,
          showCancelButton: false,
          allowOutsideClick: false,
          allowEnterKey: false,
        }).then(() => {
          this.clickSubmitCorrection = true;
          this.testCorrectionForm.markAllAsTouched();
          this.checkInvalid('SUBMIT_MARK_S1')
        });
        return;
      }
    } else if (!this.testCorrectionForm.get('missing_copy').value) {
      if (
        !this.checkCurrentCompetenceValidity('save-validate') ||
        this.checkAnyInvalidSection() ||
        !this.checkDocExpected() ||
        !this.checkCompetencyStatusAllStudent()
      ) {
        Swal.fire({
          type: 'warning',
          title: this.translate.instant('SUBMIT_MARK_S1.TITLE'),
          html: this.translate.instant('SUBMIT_MARK_S1.TEXT'),
          footer: `<span style="margin-left: auto">SUBMIT_MARK_S1</span>`,
          confirmButtonText: this.translate.instant('SUBMIT_MARK_S1.BUTTON_1'),
          allowEscapeKey: true,
          showCancelButton: false,
          allowOutsideClick: false,
          allowEnterKey: false,
        }).then(() => {
          this.clickSubmitCorrection = true;
          this.testCorrectionForm.markAllAsTouched();
          this.checkInvalid('SUBMIT_MARK_S1')
        });
        return;
      }
    }

    let fetchTestCorForValidation = this.competencyTabValidation();
    // *************** the checking via competency tab is not exactly correct. As we need to check for test correction also;
    if (this.testData?.type === 'free_continuous_control' || this.testData?.controlled_test) {
      fetchTestCorForValidation = true;
    }
    const correctorId = this.selectedCorrector ? this.selectedCorrectorId : null;
    const queries = []
    if (fetchTestCorForValidation) {
      queries.push(
        this.testCorrectionService.getAllTestCorrectionsForDialogSignature(this.testId, this.schoolId, correctorId)
      )
    }
    if ((fetchTestCorForValidation && this.testData?.group_test) || (this.testData?.group_test && this.testData?.class_id?.type_evaluation === 'score')) {
      queries.push(
        this.testCorrectionService.getAllGroupTestCorrectionsForDialogSignature(this.testId, this.schoolId)
      )
    }
    if (!fetchTestCorForValidation && !this.testData?.group_test) {
      queries.push(
        of([])
      )
    }
    this.subs.sink = forkJoin(queries).pipe(
      take(1),
      tap(() => this.isWaitingForResponse = false),
    ).subscribe(
      ([individualCorrections, groupCorrections]) => {
        // *************** There is no argument to filter based on corrector in getallgrouptestcorrection, so need to filter in FE.
        // *************** After BE implement correctorID filter in getallgrouptestcorrection, update the query and remove these lines of codes.
        let groupCorrectionList : any[] = _.cloneDeep(groupCorrections);
        if (this.selectedCorrectorId && groupCorrectionList) {
          groupCorrectionList = groupCorrectionList.filter(groupCor => {
            if (this.selectedCorrectorId !== this.currentUser?._id) {
              return this.selectedCorrectorId === groupCor?.corrector?._id;
            } else {
              return !this.permissions.getPermission('Corrector') || this.currentUser?._id === groupCor?.corrector?._id;
            }
          });
        }

        let corrections = [].concat(
          Array.isArray(individualCorrections) ? individualCorrections : [],
          Array.isArray(groupCorrectionList) ? groupCorrectionList : [],
        )

        // ***************  Start of section of code is to filter out test correction that really displayed in test correction
        let testCorrectionIds = [];
        if (this.isGroup) {
          this.filteredGroupList.forEach(groupTestCor => {
            if (groupTestCor?.groupTestCorrectionId) {
              testCorrectionIds.push(groupTestCor?.groupTestCorrectionId);
            }
          });
        } else if (!this.isGroup) {
          this.filteredStudentList.forEach(studentTestCor => {
            if (studentTestCor?.testCorrectionId) {
              testCorrectionIds.push(studentTestCor?.testCorrectionId);
            }
          });
        }

        corrections = corrections.filter((correction) => {
          if (testCorrectionIds.includes(correction?._id)) {
            return correction;
          }
        });
        // ***************  End of section of code is to filter out test correction that really displayed in test correction

        let invalidReason: null | 'invalid-competence' | 'invalid-footer' = null;
        if (!this.competencyTabValidation() && !(this.testData?.group_test && this.testData?.class_id?.type_evaluation === 'score') && !(this.testData?.type === 'free_continuous_control' || this.testData?.controlled_test)) {
          invalidReason = null;
        } else if (this.testData?.type !== 'free_continuous_control' && !this.testData?.controlled_test && !this.testCorrectionForm.get('missing_copy').value && (!this.checkCurrentCompetenceValidity('SUBMIT_MARK_S1') || this.checkAnyInvalidSection())) {
          invalidReason = 'invalid-competence';
        } else if (Array.isArray(corrections)) {
          for (const correction of corrections) {
            if (invalidReason) {
              break;
            }

            let invalidCompetence = false
            if (this.testData?.type === 'free_continuous_control' || this.testData?.controlled_test) {
              const total = correction?.correction_grid?.correction?.additional_total;
              if (typeof total !== 'number' || total < 0 || total > 20) {
                invalidReason = 'invalid-competence'
              }
            } else if (this.testData?.group_test && this.testData?.class_id?.type_evaluation === 'score') {
              if (correction?.correction_grid?.correction?.sections?.length) {
                invalidCompetence = this.checkAnyInvalidSection(correction.correction_grid.correction.sections);
              }

              if (
                !correction?._id ||
                correction?.missing_copy ||
                (this.testCorrectionId === correction._id && !invalidCompetence) ||
                correction?.is_do_not_participated
              ) {
                continue;
              }

              if (Array.isArray(correction?.correction_grid?.correction?.sections)) {
                for (const section of correction.correction_grid.correction.sections) {
                  if (section?.sub_sections?.length) {
                    for (const subSection of section?.sub_sections) {
                      if (invalidReason) {
                        break;
                      }

                      if (subSection?.rating === null || subSection?.rating === undefined || subSection?.rating === '') {
                        invalidReason = 'invalid-competence';
                      }

                      if (!invalidReason && this.testData?.correction_grid?.correction?.show_final_comment && !correction?.correction_grid?.correction?.final_comment) {
                        invalidReason = 'invalid-competence';
                      }

                      if (!invalidReason && this.testData?.correction_grid?.correction?.comment_for_each_section && !section?.comment) {
                        invalidReason = 'invalid-competence';
                      }

                      if (!invalidReason && this.testData?.correction_grid?.correction?.comment_for_each_sub_section && !subSection?.comments) {
                        invalidReason = 'invalid-competence';
                      }
                    }
                  }
                }
              }
            } else {
              if(this.showComptentyTab && this.getSectionEvalskillForm()?.value?.length){
                invalidCompetence = this.getSectionEvalskillForm()?.value?.find(section => section?.competence_status !== 'completed') ? true : false
              }

              /**
               *
               * Continue to the next test correction data if one of the following condition is met
               *
               * - No test correction identifier (broken data)
               * - Test correction is marked as missing copy
               * - The test correction data is the one currently opened individual test correction and it is already valid
               * - The student do not participate in the evaluation
               */
              if (
                !correction?._id ||
                correction?.missing_copy ||
                (this.testCorrectionId === correction._id && !invalidCompetence && !this.isGroup) ||
                correction?.is_do_not_participated
              ) {
                continue;
              }

              // ************** A sanity check to make sure the `sections_evalskill` is an array.
              // ************** No need to check for its length since a loop of empty array is the same as doing nothing
              if (Array.isArray(correction?.correction_grid?.correction?.sections_evalskill)) {
                for (const section of correction.correction_grid.correction.sections_evalskill) {
                  // *************** If there is already a reason of the invalidity then no need to do further check
                  if (invalidReason) {
                    break;
                  }

                  // *************** Skip check if the section is not selected
                  if (!section?.is_selected) {
                    continue;
                  }

                  // *************** This will trigger SUBMIT_MARK_S1 eventually
                  if (section?.competence_status !== 'completed') {
                    invalidReason = 'invalid-competence';
                  }
                }
              }
            }
          }
          for (const correction of corrections) {
            if (invalidReason) {
              break;
            }

            if (!this.checkFooterValidity()) {
              invalidReason = 'invalid-footer';
              break;
            }

            if (
              !correction?._id ||
              this.testCorrectionId === correction._id ||
              correction?.is_do_not_participated
            ) {
              continue;
            }

            if (Array.isArray(correction?.correction_grid?.footer?.fields)) {
              const invalidFooter = correction.correction_grid.footer.fields.find((field: any) =>
                (field?.type === 'corretername' && !field?.value?.correcter_name) ||
                (field?.type === 'text' && !field?.value?.text) ||
                (field?.type === 'signature' && !field?.value?.signature)
              );
              if (invalidFooter) {
                invalidReason = 'invalid-footer';
              }
            }
          }
        }

        if (invalidReason === 'invalid-competence') {
          Swal.fire({
            type: 'warning',
            title: this.translate.instant('SUBMIT_MARK_S1.TITLE'),
            html: this.translate.instant('SUBMIT_MARK_S1.TEXT'),
            footer: `<span style="margin-left: auto">SUBMIT_MARK_S1</span>`,
            confirmButtonText: this.translate.instant('SUBMIT_MARK_S1.BUTTON_1'),
            allowEscapeKey: true,
            showCancelButton: false,
            allowOutsideClick: false,
            allowEnterKey: false,
          }).then(() => {
            this.clickSubmitCorrection = true;
            this.testCorrectionForm.markAllAsTouched();
            this.checkInvalid('SUBMIT_MARK_S1')
          });
        } else if (invalidReason === 'invalid-footer') {
          this.openDialogCorrectorSignature('validate');
        } else {
          this.decideSaveOrValidateTestCorrection();
        }
      },
      (error) => {
        const msg = String(error?.message)
        Swal.fire({
          type: 'error',
          title: this.translate.instant('Sorry'),
          html: this.translate.instant(msg),
          confirmButtonText: this.translate.instant('OK'),
        });
      },
    )
  }

  decideSaveOrValidateTestCorrection() {
    if (this.isGroup && this.testData.group_test) {
      // save for group in group test mark entry
      this.subs.sink = this.showPerStudentPDFDialog().subscribe((res) => {
        this.isWaitingForResponse = false;
        if (res) {
          this.dialogData = res;
          if (this.comparisonSaveThisScore()) {
            this.validateTestCorrection();
          } else {
            this.saveGroupTestCorrection('validate');
          }
        }
      });
    } else if (this.isStudent && this.testData.group_test) {
      // save for student in group test mark entry
      this.subs.sink = this.showPerStudentPDFDialog().subscribe((res) => {
        this.isWaitingForResponse = false;
        if (res) {
          this.dialogData = res;
          if (this.comparisonSaveThisScore()) {
            this.validateTestCorrection();
          } else {
            this.saveTestCorrection('validate');
          }
        }
      });
    } else {
      // save for individual student mark entry
      // this.showPerStudentPDFDialog();
      this.saveTestCorrection('validate');
    }
  }

  validateTestCorrection() {
    let timeDisabledinSec = 6;
    swal
      .fire({
        type: 'warning',
        title: this.translate.instant('TESTCORRECTIONS.MESSAGE.Validate_S1.TITLE'),
        html: this.translate.instant('TESTCORRECTIONS.MESSAGE.Validate_S1.TEXT', {
          TestName: this.testData.name,
          RNCPTitle: this.titleData.short_name,
        }),
        confirmButtonText: this.translate.instant('TESTCORRECTIONS.MESSAGE.Validate_S1.BTN_OK'),
        showCancelButton: true,
        allowOutsideClick: false,
        cancelButtonText: this.translate.instant('TESTCORRECTIONS.MESSAGE.Validate_S1.BTN_CANCEL'),
        footer: `<span style="margin-left: auto">Validate_S1</span>`,
        onOpen: () => {
          swal.disableConfirmButton();
          const confirmButtonRef = swal.getConfirmButton();

          // TimerLoop for derementing timeDisabledinSec
          const intervalVar = setInterval(() => {
            timeDisabledinSec -= 1;
            confirmButtonRef.innerText = this.translate.instant('TESTCORRECTIONS.MESSAGE.Validate_S1.BTN_OK') + `(${timeDisabledinSec})`;
          }, 1000);
          const timeoutVar = setTimeout(() => {
            (confirmButtonRef.innerText = this.translate.instant('TESTCORRECTIONS.MESSAGE.Validate_S1.BTN_OK')), swal.enableConfirmButton();
            clearInterval(intervalVar);
            clearTimeout(timeoutVar);
          }, timeDisabledinSec * 1000);
        },
      })
      .then((result) => {
        if (result.value) {
          if (this.testData.group_test) {
            this.isWaitingForResponse = true;
            this.subs.sink = this.testCorrectionService
              .validateStudentMissingCopyForGroup(this.testId, this.schoolId)
              .subscribe((respValidate) => {
                if (respValidate) {
                  const groupPdfResults = this.getGroupPdfResults();
                  this.subs.sink = this.testCorrectionService
                    .validatesMarkEntryPDF(
                      this.testId,
                      this.schoolId,
                      this.dialogData.pdf_result,
                      this.dialogData.pdf_results_students_in_group,
                    )
                    .subscribe((resp) => {
                      if (resp) {
                        if (this.taskId && this.taskData.task_status === 'todo') {
                          this.subs.sink = this.testCorrectionService
                            .markDoneTask(this.taskId, this.translate.currentLang)
                            .subscribe((response) => {
                              this.firstForm = _.cloneDeep(this.testCorrectionForm.value);
                              this.isWaitingForResponse = false;
                              if (response) {
                                this.triggerSwalValidate();
                              }
                            });
                        } else {
                          this.firstForm = _.cloneDeep(this.testCorrectionForm.value);
                          this.isWaitingForResponse = false;
                          // generate pdf here
                          this.triggerSwalValidate();
                        }
                      }
                    });
                }
              });
          } else {
            const studentPdfResults = this.getStudentPdfResults();

            this.isWaitingForResponse = true;
            if (this.testData && this.testData.is_retake_test) {
              // submit test correction for final retake test
              this.validateFinalRetakeMarkEntryPDF(studentPdfResults);
            } else {
              this.subs.sink = this.testCorrectionService.validatesMarkEntryPDF(this.testId, this.schoolId, studentPdfResults).subscribe(
                (resp) => {
                  if (resp) {
                    if (this.taskId && this.taskData.task_status === 'todo') {
                      this.subs.sink = this.testCorrectionService
                        .markDoneTask(this.taskId, this.translate.currentLang)
                        .subscribe((response) => {
                          this.firstForm = _.cloneDeep(this.testCorrectionForm.value);
                          this.isWaitingForResponse = false;
                          if (response) {
                            this.triggerSwalValidate();
                          }
                        });
                    } else {
                      this.firstForm = _.cloneDeep(this.testCorrectionForm.value);
                      this.isWaitingForResponse = false;
                      // generate pdf here
                      this.triggerSwalValidate();
                    }
                  }
                },
                (err) => {
                  this.isWaitingForResponse = false;

                  if (err.message.includes('GraphQL error: sorry there is still at least one document missing to be upload')) {
                    swal.fire({
                      type: 'error',
                      title: this.translate.instant('TESTCORRECTIONS.SWAL_VALIDATE_MISSING_DOC.TITLE'),
                      html: this.translate.instant('TESTCORRECTIONS.SWAL_VALIDATE_MISSING_DOC.TEXT'),
                      footer: `<span style="margin-left: auto">SWAL_VALIDATE_MISSING_DOC</span>`,
                      confirmButtonText: this.translate.instant('TESTCORRECTIONS.SWAL_VALIDATE_MISSING_DOC.BTN_OK'),
                      showCancelButton: false,
                      allowOutsideClick: false,
                    });
                  } else {
                    Swal.fire({
                      type: 'error',
                      title: 'Error',
                      text: err.message,
                      confirmButtonText: this.translate.instant('OK'),
                    });
                  }
                },
              );
            }
          }
        }
      });
  }

  validateFinalRetakeMarkEntry(studentPdfResults) {
    this.subs.sink = this.testCorrectionService
      .validateFinalRetakeTestCorrection(this.testId, this.schoolId, studentPdfResults)
      .subscribe((resp) => {
        if (resp) {
          this.firstForm = _.cloneDeep(this.testCorrectionForm.value);
          this.isWaitingForResponse = false;
          // generate pdf here
          this.triggerSwalValidate();
        }
      });
  }

  validateFinalRetakeMarkEntryPDF(studentPdfResults) {
    this.subs.sink = this.testCorrectionService
      .validateFinalRetakeMarkEntryPDF(this.testId, this.schoolId, studentPdfResults)
      .subscribe((resp) => {
        if (resp) {
          this.firstForm = _.cloneDeep(this.testCorrectionForm.value);
          this.isWaitingForResponse = false;
          // generate pdf here
          this.triggerSwalValidate();
        }
      });
  }

  getStudentPdfResults() {
    const studentResults = this.filteredStudentList.map((student) => ({
      document_name: `${student.last_name} ${student.first_name}`,
      html: this.pdfDetailRef.generateStudentPdfHtml(student._id),
      test_correction: student.testCorrectionId,
      student: student._id,
      corrector: this.testCorrectionForm.get('corrector').value,
    }));

    return studentResults;
  }

  getStudentPdfResultsMentor() {
    const studentResults = this.filteredStudentList
      .filter((list) => list._id === this.selectedStudentId)
      .map((student) => ({
        document_name: `${student.last_name} ${student.first_name}`,
        html: this.pdfDetailRef.generateStudentPdfHtml(student._id, 'mark'),
        test_correction: student.testCorrectionId,
        student: student._id,
        corrector: this.testCorrectionForm.get('corrector').value,
      }));

    return studentResults;
  }

  getGroupPdfResults() {
    const groupResults = this.filteredGroupList.map((grp) => ({
      document_name: `${grp.name}`,
      html: this.pdfGroupDetailRef.generateGroupPdfHtml(grp._id),
      test_correction: grp.groupTestCorrectionId,
      group: grp._id,
      corrector: this.testCorrectionForm.get('corrector').value,
    }));

    return groupResults;
  }

  triggerSwalValidate() {
    this.sendUserActivity('click_on_button_validate', {user: this.currentUser?.last_name + ' ' + this.currentUser?.first_name, test_name: this.testData?.name})
    swal
      .fire({
        type: 'success',
        title: this.translate.instant('TESTCORRECTIONS.MESSAGE.VALIDATE-SUBMIT-TITLE'),
        allowEscapeKey: true,
        text: this.translate.instant('TESTCORRECTIONS.MESSAGE.VALIDATE-SUBMIT-TEXT'),
        confirmButtonText: this.translate.instant('TESTCORRECTIONS.MESSAGE.VALIDATE-SUBMIT-OK'),
        footer: `<span style="margin-left: auto">VALIDATE-SUBMIT</span>`,
      })
      .then(() => {
        this.routeToDashBoard();
      });
  }

  isSaveValidated() {
    // for now, remove validation that disable the notation grid form when validating group test
    // if (this.testCorrectionForm.get('missing_copy').value) {
    //   return true;
    // }
    if (this.showComptentyTab) {
      return this.getSectionEvalskillForm()?.at(this.selectedCompetenceIndex)?.valid
    } else {
      return this.testCorrectionForm?.get('correction_grid')?.get('correction')?.valid;
    }
    // later if we need that validation again, just uncomment code below
    // if (this.isGroup && this.testData && this.testData.group_test && this.checkIfTaskIsValidateTest()) {
    //   return false;
    // } else {
    //   return this.testCorrectionForm.valid;
    // }
  }

  isSubmitMentorValidated() {
    let allow = false;
    if (this.isDataSaved && this.testCorrectionForm?.get('correction_grid')?.get('correction').valid && !this.isDataSubmit) {
      allow = true;
    }
    return allow;
  }

  isValidateGroupTestGroup() {
    // for now, remove validation that disable the notation grid form when validating group test
    return false;
    // later if we need that validation again, just uncomment code below
    // if (this.isGroup && this.testData && this.testData.group_test && this.checkIfTaskIsValidateTest()) {
    //   return true;
    // } else {
    //   return false;
    // }
  }
  isValidatedByAcadirOrCertAdmin() {
    this.disabledCke = false;
    if (this.testData) {
      const schoolCorrectionStatus: { school: { _id: string }; correction_status: string }[] = this.testData?.correction_status_for_schools;
      if (schoolCorrectionStatus?.length) {
        const correctionStatus = schoolCorrectionStatus.find((correction) => correction?.school?._id === this.schoolId);
        // ***************** Condition Below to avoid Acadir and Cert Admin Modify Test Mark Entry that already validated by they self
        if (
          correctionStatus &&
          ((this.isAcadir && ['validated_by_acad_dir', 'validated_by_certi_admin'].includes(correctionStatus?.correction_status)) ||
            (this.isCertifierAdmin && ['validated_by_acad_dir', 'validated_by_certi_admin'].includes(correctionStatus?.correction_status)))
        ) {
          this.disabledCke = true;
        }
        // ***************** Condition Below to avoid Acadir and Cert Admin Modify Test Mark Entry that already validated
        // ***************** and for correction type admtc
        if (
          correctionStatus &&
          ((this.isAcadir && correctionStatus?.correction_status === 'corrected' && this.testData?.correction_type === 'admtc') ||
            (this.isCertifierAdmin && correctionStatus?.correction_status === 'corrected' && this.testData?.correction_type === 'admtc'))
        ) {
          this.disabledCke = true;
        }
      }
    }
  }

  validForm() {}

  isSubmitValidated() {
    let validate = true;
    if (this.filteredStudentList && this.filteredStudentList.length) {
      if (
        (this.testData.date_type === 'multiple_date' && this.testData.correction_type === 'student') ||
        (this.testData.date_type === 'multiple_date' &&
          this.testData.type === 'preparation_center_eval_soft_skill' &&
          this.testData.correction_type === 'prep_center')
      ) {
        // condition for test type academic_auto_evaluation or soft_skill_auto_evaluation
        validate = this.testCorrectionForm?.get('correction_grid')?.get('correction')?.valid && this.isDataSaved;
      } else if (
        this.testData.date_type === 'multiple_date' &&
        this.testData.type !== 'preparation_center_eval_soft_skill' &&
        this.testData.correction_type === 'prep_center'
      ) {
        // condition for test type academic_pro_evaluation or soft_skill_pro_evaluation
        validate = this.testCorrectionForm?.get('correction_grid')?.get('correction')?.valid && this.isAllStudentInputLatestMultipleDate;
      } else if (
        (this.testData.date_type === 'marks' && this.testData.correction_type === 'student') ||
        (this.testData.date_type === 'marks' &&
          this.testData.type === 'preparation_center_eval_soft_skill' &&
          this.testData.correction_type === 'prep_center')
      ) {
        validate = this.testCorrectionForm?.get('correction_grid')?.get('correction')?.valid && this.isDataSaved;
      }

      for (const student of this.filteredStudentList) {
        // Check if all student already input mark. if any student has no score yet, return false to disable the button
        if (student && student.score !== 0 && !student.score && !student.missing_copy && !student.is_do_not_participated) {
          validate = false;
          break;
        }
        // Check if the test has document expected for student or for each student, the student has to upload doc or missing copy the mark
        if (
          this.isTestHasDocumentExpected &&
          (!student.doc || (student.doc && !student.doc.length)) &&
          !student.missing_copy &&
          !student.is_do_not_participated
        ) {
          validate = false;
          break;
        }
      }
    }

    return validate;
  }

  isGroupSubmitValidated() {
    let validate = true;
    const signatureFieldIndex = this.testData?.correction_grid?.footer?.fields?.findIndex((field) => field?.type === 'signature')
    if (this.filteredGroupList && this.filteredGroupList.length) {
      for (const groupData of this.filteredGroupList) {
        // Check if all groupData already input mark. if any groupData has no score yet, return false to disable the button
        if (groupData && groupData.score !== 0 && !groupData.score && !groupData.missing_copy && !groupData.is_do_not_participated) {
          validate = false;
          break;
        }

        // *************** check if there's signature field and it's not checked
        if (signatureFieldIndex && signatureFieldIndex > -1 && !groupData?.correctionGrid?.footer?.fields[signatureFieldIndex]?.value?.signature) {
          validate = false;
          break;
        }

        // Check if the test has document expected for groupData or for each groupData,
        // the groupData has to upload doc or missing copy the mark
        if (
          this.isTestHasDocumentExpected &&
          (!groupData.doc || (groupData.doc && !groupData.doc.length)) &&
          !groupData.missing_copy &&
          !groupData.is_do_not_participated
        ) {
          validate = false;
          break;
        }
      }
    }
    return validate;
  }

  isValidateValidated() {
    let validate = true;
    if (this.testData.group_test) {
      if (this.dataFilledStudentOfAllGroupList && this.dataFilledStudentOfAllGroupList.length) {
        for (const student of this.dataFilledStudentOfAllGroupList) {
          if (student && !student.testCorrectionId) {
            validate = false;
            break;
          }
          if (student && student.is_do_not_participated) {
            validate = true;
            break;
          }
          if (student && student.missing_copy && !student.is_justified) {
            validate = false;
            break;
          }
        }
      }
    } else {
      if (this.filteredStudentList && this.filteredStudentList.length) {
        for (const student of this.filteredStudentList) {
          if (student && !student.testCorrectionId) {
            validate = false;
            break;
          }
          if (student && student.is_do_not_participated) {
            validate = true;
            break;
          }
          if (student && student.missing_copy && !student.is_justified) {
            validate = false;
            break;
          }
        }
      }
    }
    return validate;
  }

  /**
   * Function to determine if the current task is a task for marks entry or not.
   * Depends on `taskData`, `testData`, and `schoolId` so make sure to call it after they are populated.
   * @returns {boolean} Whether the task is a task for marks entry or not/
   */
  checkIfTaskIsMarkEntry() {
    let validate = false;
    if (this.taskData && (this.taskData.description === 'Marks Entry' || this.taskData.type === 'final_retake_marks_entry')) {
      validate = true;
    }
    if (!this.taskData) {
      const schoolCorrectionStatus: { school: { _id: string }; correction_status: string }[] = this.testData.correction_status_for_schools;
      const correctionStatus = schoolCorrectionStatus.find((correction) => correction.school._id === this.schoolId);
      // if there is no correction status for this school yet, then show the button
      if (!correctionStatus || this.testData.type === 'academic_recommendation') {
        validate = true;
      }
    }
    return validate;
  }

  /**
   * Function to determine if the current task is a task for validating the test or not.
   * Depends on `taskData`, `testData`, `schoolId`, `isAcadir`, and `isCertifierAdmin` so make sure to call it after they are populated.
   * @returns {boolean} Whether the task is a task for validating the test or not/
   */
  checkIfTaskIsValidateTest() {
    let validate = false;
    if (
      this.taskData &&
      (this.taskData.description === 'Validate Test' ||
        this.taskData.type === 'validate_test_correction_for_final_retake' ||
        this.taskData.type === 'validate_jury_organization' ||
        this.taskData.type === 'certifier_validation') &&
      this.testData.type !== 'academic_recommendation'
    ) {
      validate = true;
    }
    // if there is no task data, which mean we open it from folder 06 acadkit,
    // then get the correction status from correction_status data in correction_status_for_schools
    if (!this.taskData) {
      const schoolCorrectionStatus: { school: { _id: string }; correction_status: string }[] = this.testData.correction_status_for_schools;
      const correctionStatus = schoolCorrectionStatus.find((correction) => correction.school._id === this.schoolId);
      if (
        correctionStatus &&
        correctionStatus.correction_status &&
        correctionStatus.correction_status !== 'pending' &&
        this.testData.type !== 'academic_recommendation'
      ) {
        // ***************** Condition Below to avoid Acadir and Cert Admin Modify Test Mark Entry that already validated by they self
        if (
          !(this.isAcadir && ['validated_by_acad_dir', 'validated_by_certi_admin'].includes(correctionStatus.correction_status)) &&
          !(this.isCertifierAdmin && ['validated_by_acad_dir', 'validated_by_certi_admin'].includes(correctionStatus.correction_status))
        ) {
          validate = true;
        }
      }
      // ***************** Condition Below to avoid Acadir and Cert Admin Modify Test Mark Entry that already validated
      // ***************** and for correction type admtc
      if (
        correctionStatus &&
        ((this.isAcadir && correctionStatus?.correction_status === 'corrected' && this.testData?.correction_type === 'admtc') ||
          (this.isCertifierAdmin && correctionStatus?.correction_status === 'corrected' && this.testData?.correction_type === 'admtc'))
      ) {
        validate = false;
      }
    }
    return validate;
  }

  // Used to wait for PDF to be populated
  isWaitingPDFDone(event) {
    if (event && event === 'start') {
      this.isWaitingPdf = true;
      this.isWaitingPdfSource.next(true);
    } else if (event && event === 'done' && this.isWaitingPdf) {
      setTimeout((time) => {
        this.isWaitingPdf = false;
        this.isWaitingPdfSource.next(false);
      }, 500);
    }
  }

  routeToDashBoard() {
    this.router.navigate(['/rncpTitles', this.titleId, 'dashboard']);
  }

  routeToTaskTable() {
    this.router.navigate(['/task']);
  }

  mutateMissingCopyValidation(event: MatCheckboxChange) {
    if (event.checked) {
      const student_ids = this.isGroup ? null : this.studentList.map((student) => student._id);
      const group_id = this.isGroup ? this.test_group_id : null;

      this.subs.sink = this.testCorrectionService.getDocumentExpectedDueDatePassed(this.testId, student_ids, group_id).subscribe((resp) => {
        const isDocumentExpectedDueDatePassed = resp;

        if (!isDocumentExpectedDueDatePassed) {
          Swal.fire({
            type: 'info',
            title: this.translate.instant('MISSING_COPY_S1.TITLE'),
            html: this.translate.instant('MISSING_COPY_S1.TEXT'),
            footer: `<span style="margin-left: auto">MISSING_COPY_S1</span>`,
            showCancelButton: false,
            confirmButtonText: this.translate.instant('MISSING_COPY_S1.BUTTON_1'),
            allowOutsideClick: false,
          });

          this.testCorrectionForm.get('missing_copy').patchValue(false);
          this.testCorrectionForm.get('is_do_not_participated').patchValue(false);
          return;
        }
      });

      this.testCorrectionForm.get('is_do_not_participated').patchValue(false);
    }

    const sections: TestCorrectionCorrectionGridCorrectionSectionInput[] = this.getSectionForm().value;
    sections.forEach((section, sectionIndex) => {
      if (event.checked) {
        this.getSectionForm().at(sectionIndex).get('rating').clearValidators();
        this.getSectionForm().at(sectionIndex).get('rating').updateValueAndValidity();
      } else {
        if (this.testData.type !== 'academic_recommendation') {
          this.getSectionForm().at(sectionIndex).get('rating').setValidators([Validators.required]);
          this.getSectionForm().at(sectionIndex).get('rating').updateValueAndValidity();
        }
      }
      if (section.sub_sections && section.sub_sections.length) {
        section.sub_sections.forEach((subSection, subSectionIndex) => {
          // if missing copy true, then remove required validation
          if (event.checked) {
            this.getSubSectionForm(sectionIndex).at(subSectionIndex).get('rating').clearValidators();
            this.getSubSectionForm(sectionIndex).at(subSectionIndex).get('rating').updateValueAndValidity();
            this.getSubSectionForm(sectionIndex).at(subSectionIndex).get('comments').clearValidators();
            this.getSubSectionForm(sectionIndex).at(subSectionIndex).get('comments').updateValueAndValidity();
          } else {
            // if missing copy false and not academic recommendation, then add required validation
            if (this.testData.type === 'academic_recommendation') {
              this.getSubSectionForm(sectionIndex).at(subSectionIndex).get('comments').setValidators([Validators.required]);
              this.getSubSectionForm(sectionIndex).at(subSectionIndex).get('comments').updateValueAndValidity();
            } else {
              this.getSubSectionForm(sectionIndex).at(subSectionIndex).get('rating').setValidators([Validators.required]);
              this.getSubSectionForm(sectionIndex).at(subSectionIndex).get('rating').updateValueAndValidity();
            }
          }
        });
      }
    });
    const sectionEvalskill: TestCorrectionCorrectionGridCorrectionSectionEvalskillInput[] = this.getSectionEvalskillForm().value;
    sectionEvalskill.forEach((section, sectionIndex) => {
      if (section.sub_sections && section.sub_sections.length) {
        section.sub_sections.forEach((subSection, subSectionIndex) => {
          // if missing copy true, then remove required validation
          if (event.checked) {
            this.getSubSectionEvalskillForm(sectionIndex).at(subSectionIndex).get('rating').clearValidators();
            this.getSubSectionEvalskillForm(sectionIndex).at(subSectionIndex).get('rating').updateValueAndValidity();
          } else if (subSection.is_selected) {
            // if missing copy false, then add required validation
            this.getSubSectionEvalskillForm(sectionIndex).at(subSectionIndex).get('rating').setValidators([Validators.required,Validators.min(0)]);
            this.getSubSectionEvalskillForm(sectionIndex).at(subSectionIndex).get('rating').updateValueAndValidity();
          }
        });
      }
    });
    const correction: TestCorrectionCorrectionGridCorrectionInput = this.getCorrectionForm().value;
    if (correction.penalties && correction.penalties.length) {
      correction.penalties.forEach((penalty, penaltyIndex) => {
        if (event.checked) {
          this.getPenaltiesFieldForm().at(penaltyIndex).get('rating').clearValidators();
          this.getPenaltiesFieldForm().at(penaltyIndex).get('rating').updateValueAndValidity();
        } else {
          this.getPenaltiesFieldForm().at(penaltyIndex).get('rating').setValidators([Validators.required]);
          this.getPenaltiesFieldForm().at(penaltyIndex).get('rating').updateValueAndValidity();
        }
      });
    }
    if (correction.bonuses && correction.bonuses.length) {
      correction.bonuses.forEach((bonus, bonusIndex) => {
        if (event.checked) {
          this.getBonusesFieldForm().at(bonusIndex).get('rating').clearValidators();
          this.getBonusesFieldForm().at(bonusIndex).get('rating').updateValueAndValidity();
        } else {
          this.getBonusesFieldForm().at(bonusIndex).get('rating').setValidators([Validators.required]);
          this.getBonusesFieldForm().at(bonusIndex).get('rating').updateValueAndValidity();
        }
      });
    }

    // to update competence status to "draft"
    this.cdr.detectChanges();

    // to enable save as draft if student the first time is missing copy
    if (this.firstForm.missing_copy) {
      if (!event.checked) {
        sectionEvalskill?.forEach((section, sectionIndex) => {
          const status = this.getCurrentCompetenceStatus(sectionIndex)
          this.getSectionEvalskillForm()?.at(sectionIndex)?.get('competence_status')?.patchValue(status);
        });
        this.tempCurrentSectionTabForm = this.getSectionEvalskillForm()?.at(this.selectedCompetenceIndex)?.value;
        this.testCorrectionForm.get('is_saved').patchValue(false);
      } else {
        sectionEvalskill?.forEach((section, sectionIndex) => {
          this.getSectionEvalskillForm()?.at(sectionIndex)?.get('competence_status')?.patchValue('completed');
        });
        this.tempCurrentSectionTabForm = this.getSectionEvalskillForm()?.at(this.selectedCompetenceIndex)?.value;
        this.testCorrectionForm.get('is_saved').patchValue(this.firstForm.is_saved);
      }
    }
  }

  mutateDoNotParticipateValidation(event: MatCheckboxChange) {
    if (event.checked) {
      this.testCorrectionForm.get('missing_copy').patchValue(false);
    }

    const sections: TestCorrectionCorrectionGridCorrectionSectionInput[] = this.getSectionForm().value;
    sections.forEach((section, sectionIndex) => {
      if (event.checked) {
        this.getSectionForm().at(sectionIndex).get('rating').patchValue(0);
        this.getSectionForm().at(sectionIndex).get('rating').clearValidators();
        this.getSectionForm().at(sectionIndex).get('rating').updateValueAndValidity();
      } else {
        this.getSectionForm().at(sectionIndex).get('rating').patchValue(null);
        if (this.testData.type !== 'academic_recommendation') {
          this.getSectionForm().at(sectionIndex).get('rating').setValidators([Validators.required]);
          this.getSectionForm().at(sectionIndex).get('rating').updateValueAndValidity();
        }
      }
      if (section.sub_sections && section.sub_sections.length) {
        section.sub_sections.forEach((subSection, subSectionIndex) => {
          // if do not participate is true, then remove required validation
          if (event.checked) {
            this.getSubSectionForm(sectionIndex).at(subSectionIndex).get('rating').patchValue(0);
            this.getSubSectionForm(sectionIndex).at(subSectionIndex).get('rating').clearValidators();
            this.getSubSectionForm(sectionIndex).at(subSectionIndex).get('rating').updateValueAndValidity();
            this.getSubSectionForm(sectionIndex).at(subSectionIndex).get('comments').clearValidators();
            this.getSubSectionForm(sectionIndex).at(subSectionIndex).get('comments').updateValueAndValidity();
          } else {
            // if do not participate false and not academic recommendation, then add required validation
            this.getSubSectionForm(sectionIndex).at(subSectionIndex).get('rating').patchValue(null);
            if (this.testData.type === 'academic_recommendation') {
              this.getSubSectionForm(sectionIndex).at(subSectionIndex).get('comments').setValidators([Validators.required]);
              this.getSubSectionForm(sectionIndex).at(subSectionIndex).get('comments').updateValueAndValidity();
            } else {
              this.getSubSectionForm(sectionIndex).at(subSectionIndex).get('rating').setValidators([Validators.required]);
              this.getSubSectionForm(sectionIndex).at(subSectionIndex).get('rating').updateValueAndValidity();
            }
          }
        });
      }
    });
    const sectionEvalskill: TestCorrectionCorrectionGridCorrectionSectionEvalskillInput[] = this.getSectionEvalskillForm().value;
    sectionEvalskill.forEach((section, sectionIndex) => {
      if (section.sub_sections && section.sub_sections.length) {
        section.sub_sections.forEach((subSection, subSectionIndex) => {
          // if do not participate true, then remove required validation
          if (event.checked) {
            this.getSubSectionEvalskillForm(sectionIndex).at(subSectionIndex).get('rating').patchValue(0);
            this.getSubSectionEvalskillForm(sectionIndex).at(subSectionIndex).get('rating').clearValidators();
            this.getSubSectionEvalskillForm(sectionIndex).at(subSectionIndex).get('rating').updateValueAndValidity();
          } else if (subSection.is_selected) {
            // if do not participate false, then add required validation
            this.getSubSectionEvalskillForm(sectionIndex).at(subSectionIndex).get('rating').patchValue(null);
            this.getSubSectionEvalskillForm(sectionIndex).at(subSectionIndex).get('rating').setValidators([Validators.required,Validators.min(0)]);
            this.getSubSectionEvalskillForm(sectionIndex).at(subSectionIndex).get('rating').updateValueAndValidity();
          } else {
            this.getSubSectionEvalskillForm(sectionIndex).at(subSectionIndex).get('rating').patchValue(null);
          }
        });
      }
    });
    const correction: TestCorrectionCorrectionGridCorrectionInput = this.getCorrectionForm().value;
    if (correction.penalties && correction.penalties.length) {
      correction.penalties.forEach((penalty, penaltyIndex) => {
        if (event.checked) {
          this.getPenaltiesFieldForm().at(penaltyIndex).get('rating').patchValue(0);
          this.getPenaltiesFieldForm().at(penaltyIndex).get('rating').clearValidators();
          this.getPenaltiesFieldForm().at(penaltyIndex).get('rating').updateValueAndValidity();
        } else {
          this.getPenaltiesFieldForm().at(penaltyIndex).get('rating').patchValue(null);
          this.getPenaltiesFieldForm().at(penaltyIndex).get('rating').setValidators([Validators.required]);
          this.getPenaltiesFieldForm().at(penaltyIndex).get('rating').updateValueAndValidity();
        }
      });
    }
    if (correction.bonuses && correction.bonuses.length) {
      correction.bonuses.forEach((bonus, bonusIndex) => {
        if (event.checked) {
          this.getBonusesFieldForm().at(bonusIndex).get('rating').patchValue(0);
          this.getBonusesFieldForm().at(bonusIndex).get('rating').clearValidators();
          this.getBonusesFieldForm().at(bonusIndex).get('rating').updateValueAndValidity();
        } else {
          this.getBonusesFieldForm().at(bonusIndex).get('rating').patchValue(null);
          this.getBonusesFieldForm().at(bonusIndex).get('rating').setValidators([Validators.required]);
          this.getBonusesFieldForm().at(bonusIndex).get('rating').updateValueAndValidity();
        }
      });
    }

    // to update competence status to "draft"
    this.cdr.detectChanges();

    // to enable save as draft if student the first time is do not participate
    if (this.firstForm.is_do_not_participated) {
      if (!event.checked) {
        sectionEvalskill?.forEach((section, sectionIndex) => {
          this.getSectionEvalskillForm()?.at(sectionIndex)?.get('competence_status')?.patchValue('draft');
        });
        this.tempCurrentSectionTabForm = this.getSectionEvalskillForm()?.at(this.selectedCompetenceIndex)?.value;
        this.testCorrectionForm.get('is_saved').patchValue(false);
      } else {
        sectionEvalskill?.forEach((section, sectionIndex) => {
          this.getSectionEvalskillForm()?.at(sectionIndex)?.get('competence_status')?.patchValue('completed');
        });
        this.tempCurrentSectionTabForm = this.getSectionEvalskillForm()?.at(this.selectedCompetenceIndex)?.value;
        this.testCorrectionForm.get('is_saved').patchValue(this.firstForm.is_saved);
      }
    }
  }

  downloadPDFSummary() {
    const ele = document.getElementById('pdfdoc');
    let html = PRINTSTYLES;
    html = html + ele.innerHTML;
    // ele.style.visibility = 'hidden';
    ele.innerHTML = html;
    ele.className = 'apple';
    const filename = 'Summary-' + this.titleData.short_name + ' - ' + this.testData.name;
    const landscape = false;
    this.subs.sink = this.transcriptBuilderService.generatePdf(html, filename).subscribe((res: any) => {
      const link = document.createElement('a');
      link.setAttribute('type', 'hidden'); // make it hidden if needed
      link.download = res.filename;
      link.href = environment.PDF_SERVER_URL + res.filePath;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      link.remove();
    });
  }


  getFilteredGroupList(isSaveFromSubmitMarkS1?, goToNextGroup?) {
    if (this.testData && this.testData.group_test) {
      this.isWaitingForResponse = true;
      this.subs.sink = this.testCorrectionService.getAllGroupTestCorrection(this.testId, this.schoolId).subscribe(response => {
        this.isWaitingForResponse = false;
        const tempGroupList = _.cloneDeep(this.groupList);
        const tempResult = [];
        if (response && response.length) {
          response.forEach(testCorrection => {
            const found = _.find(tempGroupList, groupList => groupList._id === testCorrection.test_group_id._id);
            let temporaryResult;
            if (found) {
              temporaryResult = {
                groupTestCorrectionId: testCorrection._id,
                _id: found._id,
                name: found.name,
                doc: testCorrection.expected_documents,
                missing_copy: testCorrection.missing_copy ? testCorrection.missing_copy : false,
                is_do_not_participated: testCorrection.is_do_not_participated ? testCorrection.is_do_not_participated : false,
                is_justified: testCorrection.is_justified ? testCorrection.is_justified : null,
                score: this.getScore(testCorrection),
                company: null,
                correctorId: testCorrection && testCorrection.corrector ? testCorrection.corrector._id : null,
                correctionGrid: testCorrection?.correction_grid,
              };

              if (testCorrection?.correction_grid?.correction?.sections_evalskill?.length) {
                temporaryResult = {
                  ...temporaryResult,
                  correctionGrid: {
                    ...testCorrection.correction_grid,
                    correction: {
                      ...testCorrection.correction_grid.correction,
                      sections_evalskill: testCorrection.correction_grid.correction.sections_evalskill.filter(
                        section => section?.is_selected,
                      ),
                    },
                  },
                };
              }
              // **************** Add additional map process to clean html data on the comment field after change the ckeditor to textarea
              if (temporaryResult?.correctionGrid?.correction?.sections_evalskill?.length) {
                temporaryResult?.correctionGrid?.correction?.sections_evalskill.forEach((element, idx) => {
                  if (element?.comment) {
                    temporaryResult.correctionGrid.correction.sections_evalskill[idx].comment = this.getFullTextFromHtml(element?.comment);
                  }
                });
              }

              tempResult.push(temporaryResult);
            }
          });

          tempGroupList.forEach(data => {
            const found = _.find(tempResult, tempGroup => tempGroup._id === data._id);
            if (!found) {
              tempResult.push({
                groupTestCorrectionId: null,
                _id: data._id,
                name: data.name,
                doc: null,
                missing_copy: false,
                is_justified: null,
                is_do_not_participated: false,
                score: null,
                company: null,
                correctorId: null,
              });
            }
          });
        } else {
          this.groupData.forEach(data => {
            tempResult.push({
              groupTestCorrectionId: null,
              _id: data._id,
              name: data.name,
              doc: null,
              missing_copy: false,
              is_do_not_participated: false,
              is_justified: null,
              score: null,
              company: null,
              correctorId: null,
            });
          });
        }
        this.filteredGroupList = tempResult;
        if (isSaveFromSubmitMarkS1) {
          const currGroup = this.filteredGroupList?.find(group => group?._id === this.selectedGroupData?._id);
          if (currGroup) {
            this.groupSelected(currGroup, false, isSaveFromSubmitMarkS1);
          } else {
            this.submittedTestCorrection();
          }
        } else if (goToNextGroup) {
          this.handleRedirectToNextGroup(goToNextGroup);
        } else {
          this.firstSelectGroup();
        }
      });
    }
  }

  populateGroupList() {
    const data = _.cloneDeep(this.taskData);
    if (this.testData && this.testData.group_test) {
      if (data && (data.description === 'Marks Entry' || data.type === 'final_retake_marks_entry')) {
        const correctorAssigned = this.getCorrectorAssigned(data);
        const selectedCorrector = _.find(
          correctorAssigned,
          (corrector) =>
            corrector.corrector_id !== null &&
            corrector.corrector_id._id === data.user_selection.user_id._id &&
            corrector.school_id._id === this.schoolId,
        );
        if (selectedCorrector) {
          this.groupList = selectedCorrector.test_groups;
          this.groupData = selectedCorrector.test_groups;
          this.selectedCorrector = selectedCorrector;

          if (this.selectedCorrector && this.selectedCorrector.corrector_id && this.selectedCorrector.corrector_id._id) {
            const selectorID = this.selectedCorrector.corrector_id._id;
            this.selectedCorrectorId = selectorID;
            this.testCorrectionForm.get('corrector').patchValue(this.selectedCorrectorId);
          }
          this.getFilteredGroupList();
        }
      } else if (this.checkIfTaskIsValidateTest()) {
        this.getAllGroupByTestIdAndGroupId();
      }
    }
  }

  getAllGroupByTestIdAndGroupId() {
    this.isWaitingForResponse = true;
    this.subs.sink = this.testCorrectionService.getAllGroup(this.testId, this.schoolId).subscribe((resp) => {
      this.isWaitingForResponse = false;
      this.groupList = resp;
      this.groupData = resp;
      this.getFilteredGroupList();
    });
  }

  firstSelectGroup() {
    if (this.testData && this.testData.group_test) {
      const unCorrectedGroup = _.filter(this.filteredGroupList, (dataGroup) => dataGroup.score === null);
      const sortedUnCorrectedGroups = _.sortBy(unCorrectedGroup, 'name');
      const unCompletedCompetece = this.getSectionEvalskillForm()?.value?.find((competence) => competence?.competence_status === 'draft' || competence?.competence_status === 'not_started' || competence?.competence_status === null)
      if (this.nextGroup?._id) {
        this.groupSelected(this.nextGroup)
      } else if (unCompletedCompetece && this.selectedGroupData) {
        this.studentSelect = this.displayGroupName(this.selectedGroupData._id);
        this.groupSelected(this.selectedGroupData);
      } else if (sortedUnCorrectedGroups && sortedUnCorrectedGroups.length) {
        this.studentSelect = this.displayGroupName(sortedUnCorrectedGroups[0]._id);
        this.groupSelected(sortedUnCorrectedGroups[0]);
      } else {
        // this.isWaitingForResponse = true;
        // this.subs.sink = this.testCorrectionService
        //   .getOneGroupTestCorrection(this.filteredGroupList[0].groupTestCorrectionId)
        //   .subscribe((resp) => {
        //     this.isWaitingForResponse = false;
        //     const patchData = this.formatDataBeforePatch(_.cloneDeep(resp));
        //     this.formUpdated(patchData);
        //   });
        this.studentSelect = this.displayGroupName(this.filteredGroupList[0]._id);
        this.groupSelected(this.filteredGroupList[0]);
      }
    }
  }

  headerFormatFields(data) {
    if (data.correction_grid.header.fields) {
      const dataTest = _.filter(
        data.correction_grid.header.fields,
        (dataa: any) =>
          dataa.type !== 'etablishmentname' &&
          dataa.type !== 'studentname' &&
          dataa.type !== 'groupname' &&
          dataa.type !== 'mentorname' &&
          dataa.type !== 'companyname' &&
          dataa.type !== 'eventName' &&
          dataa.type !== 'dateRange' &&
          dataa.type !== 'dateFixed' &&
          dataa.type !== 'titleName' &&
          dataa.type !== 'status',
      );
      this.testData.correction_grid.header.fields = dataTest;
    }
  }

  footerFormatFields(data) {
    if (data.correction_grid.footer.fields) {
      const dataTest = _.filter(
        data.correction_grid.footer.fields,
        (dataa: any) =>
          dataa.type !== 'etablishmentname' &&
          dataa.type !== 'studentname' &&
          dataa.type !== 'groupname' &&
          dataa.type !== 'eventName' &&
          dataa.type !== 'dateRange' &&
          dataa.type !== 'dateFixed' &&
          dataa.type !== 'titleName' &&
          dataa.type !== 'status',
      );
      this.testData.correction_grid.footer.fields = dataTest;
    }
  }

  getOneGroupTest() {
    if (this.testData && this.testData.group_test) {
      this.subs.sink = this.testCorrectionService.GetOneTestGroup(this.groupId).subscribe((resp) => {});
    }
  }

  checkIfTestValidated() {
    let result = null;

    if (
      ['certifier', 'prep_center', 'academic_director', 'student'].includes(this.testData?.correction_type) &&
      Array.isArray(this.testData?.correction_status_for_schools)
    ) {
      result = this.testData?.correction_status_for_schools.find((data) => {
        return data?.school?._id === this.schoolId && ['validated_by_acad_dir', 'validated_by_certi_admin'].includes(data?.correction_status);
      });
    } else if (this.isAcadir || this.isAcadAdmin) {
      result = true;
    }

    return Boolean(result);
  }

  checkTestDocumentExpected(): boolean {
    let result = false;

    if (this.testData && this.testData.expected_documents && this.testData.expected_documents.length) {
      for (const expected_document of this.testData.expected_documents) {
        if (
          (expected_document && expected_document.is_for_all_student) ||
          (expected_document && expected_document.is_for_all_group) ||
          (expected_document.document_user_type && expected_document.document_user_type.name === 'Student')
        ) {
          result = true;
          break;
        }
      }
    }
    return result;
  }

  showPerStudentPDFDialog() {
    this.isWaitingForResponse = true;
    return this.dialog
      .open(PdfGroupDetailDialogComponent, {
        data: {
          testId: this.testData._id,
          schoolId: this.schoolData._id,
          testData: this.testData,
          filteredGroupList: this.filteredGroupList,
          schoolData: this.schoolData,
          studentList: this.dataFilledStudentOfAllGroupList,
          titleData: this.titleData,
          maximumFinalMark: this.maximumFinalMark,
        },
      })
      .afterClosed();
  }

  getTestDetailPdf(withIdentity: boolean) {
    this.pdfTestDetailComponent.downloadPDF(withIdentity)
  }

  getPdfPersonalizedInOneDoc() {
    if (this.testData.group_test) {
      this.pdfGroupDetailRef.downloadPdfDetail();
    } else {
      this.pdfDetailRef.downloadPdfDetail();
    }
  }

  getPdfPersonalizedInZip() {
    const titleName = this.titleData && this.titleData.short_name ? this.titleData.short_name : '';
    const testName = this.testData && this.testData.name ? this.testData.name : '';
    const schoolName = this.schoolData && this.schoolData.short_name ? this.schoolData.short_name : '';
    if (this.testData.group_test) {
      const groupPdfResults = this.getGroupPdfResults().map((pdf) => {
        return {
          document_name: pdf.document_name,
          html: pdf.html,
          landscape:
            this.testData && this.testData.correction_grid && this.testData.correction_grid.orientation === 'landscape' ? true : false,
        };
      });
      const payload = {
        pdfs: groupPdfResults,
        zip_name: `${titleName} - ${testName} - ${schoolName}`,
        test_id: this.testId,
        lang: this.translate.currentLang,
      };

      this.subs.sink = this.testCorrectionService.getPdfPersonalizedInZip(payload).subscribe((resp) => {
        if (resp) {
          Swal.fire({
            type: 'success',
            title: this.translate.instant('PROEVAL_S4.TITLE'),
            html: this.translate.instant('PROEVAL_S4.TEXT'),
            confirmButtonText: this.translate.instant('PROEVAL_S4.BUTTON'),
            footer: `<span style="margin-left: auto">PROEVAL_S4</span>`,
          });
        }
      });
    } else {
      const studentPdfResults = this.getStudentPdfResults().map((pdf) => {
        return {
          document_name: pdf.document_name,
          html: pdf.html,
          landscape:
            this.testData && this.testData.correction_grid && this.testData.correction_grid.orientation === 'landscape' ? true : false,
        };
      });

      const payload = {
        pdfs: studentPdfResults,
        zip_name: `${titleName} - ${testName} - ${schoolName}`,
        test_id: this.testId,
        lang: this.translate.currentLang,
      };

      this.subs.sink = this.testCorrectionService.getPdfPersonalizedInZip(payload).subscribe((resp) => {
        if (resp) {
          Swal.fire({
            type: 'success',
            title: this.translate.instant('PROEVAL_S4.TITLE'),
            html: this.translate.instant('PROEVAL_S4.TEXT'),
            confirmButtonText: this.translate.instant('PROEVAL_S4.BUTTON'),
            footer: `<span style="margin-left: auto">PROEVAL_S4</span>`,
          });
        }
      });
    }
  }

  /**
   * A function to get the final mark with coefficient computation formula, memoized.
   * Memoized with @Cacheable decorator so it won't be called over and over again from the template if the parameter is same
   * @returns String observable to be subscribed in the template
   */
  @Cacheable()
  getFinalMarkText(
    sectionsRef: TestCorrectionCorrectionGridCorrectionSectionInput[],
    penalties: TestCorrectionCorrectionGridCorrectionPenaltyBonusInput[],
    bonuses: TestCorrectionCorrectionGridCorrectionPenaltyBonusInput[],
  ) {
    if (
      sectionsRef?.length &&
      this.testData?.correction_grid?.correction?.display_section_coefficient &&
      this.testData?.correction_grid?.correction?.section_coefficient?.section_additional_max_score &&
      typeof this.testData.correction_grid?.correction?.section_coefficient?.section_decimal_place === 'number'
    ) {
      const clonedSection = sectionsRef.map((section: any, index) => {
        section.maximum_score_from_sub_sections = 0
        this.testData.correction_grid.correction?.sections?.[index]?.sub_sections?.forEach(subSection => {
          section.maximum_score_from_sub_sections += subSection?.maximum_rating;
        })
        return section;
      })
      const maxScore = this.testData.correction_grid.correction.section_coefficient.section_additional_max_score;
      const decimalPoint = this.testData.correction_grid.correction.section_coefficient.section_decimal_place;
      let total = this.testUtilityService.calculateFinalTotalWithCoefficient(clonedSection, maxScore)

      penalties.forEach((penalty) => {
        const totalMinusPenalty = total - (penalty.rating ? +penalty.rating : 0);
        total = totalMinusPenalty >= 0 ? totalMinusPenalty : 0;
      });
      bonuses.forEach((bonus) => {
        const totalPlusBonus = total + (bonus.rating ? +bonus.rating : 0);
        total = totalPlusBonus <= this.maximumFinalMark ? totalPlusBonus : this.maximumFinalMark;
      });

      return of(`${total.toFixed(decimalPoint)} / ${maxScore}`);
    } else {
      return of('')
    }
  }

  @Cacheable()
  getFinalMarkFormula(
    sectionsRef: TestCorrectionCorrectionGridCorrectionSectionInput[],
    penalties: TestCorrectionCorrectionGridCorrectionPenaltyBonusInput[],
    bonuses: TestCorrectionCorrectionGridCorrectionPenaltyBonusInput[],
  ) {
    if (
      sectionsRef?.length &&
      this.testData?.correction_grid?.correction?.display_section_coefficient &&
      this.testData?.correction_grid?.correction?.section_coefficient?.section_additional_max_score &&
      typeof this.testData.correction_grid?.correction?.section_coefficient?.section_decimal_place === 'number'
    ) {
      const clonedSection = sectionsRef.map((section: any, index) => {
        section.maximum_score_from_sub_sections = 0
        this.testData.correction_grid.correction?.sections?.[index]?.sub_sections?.forEach(subSection => {
          section.maximum_score_from_sub_sections += subSection?.maximum_rating;
        })
        return section;
      })
      const maxScore = this.testData.correction_grid.correction.section_coefficient.section_additional_max_score;
      const decimalPoint = this.testData.correction_grid.correction.section_coefficient.section_decimal_place;
      const formula = clonedSection.map(section => {
        return `(${this.testUtilityService.calculateSectionTotalWithoutCoefficient(section, section.maximum_score_from_sub_sections, maxScore).toFixed(this.testData.correction_grid?.correction?.section_coefficient?.section_decimal_place)} * ${(+section.coefficient).toFixed(decimalPoint)})`;
      });
      const finalMarkFormulaWithoutBonusesAndPenalties = `(${formula.join(' + ')}) / ${this.testUtilityService.calculateTotalCoefficient(clonedSection)}`
      const bonusesAndPenalties = [
        ...penalties.map(penalty => penalty?.rating || 0).filter(Boolean).map(penalty => `- ${penalty}`),
        ...bonuses.map(bonus => bonus?.rating || 0).filter(Boolean).map(bonus => `+ ${bonus}`),
      ]
      if (bonusesAndPenalties?.length) {
        return of(`(${finalMarkFormulaWithoutBonusesAndPenalties}) ${bonusesAndPenalties.join(' ')}`)
      }
      return of(finalMarkFormulaWithoutBonusesAndPenalties);
    } else {
      return of('')
    }
  }

  @Cacheable()
  getAdditionalFinalMarkFormula(
    sectionsRef: TestCorrectionCorrectionGridCorrectionSectionInput[],
    penalties: TestCorrectionCorrectionGridCorrectionPenaltyBonusInput[],
    bonuses: TestCorrectionCorrectionGridCorrectionPenaltyBonusInput[],
  ) {

    if (
      sectionsRef?.length &&
      this.testData?.correction_grid?.correction?.display_section_coefficient &&
      this.testData?.correction_grid?.correction?.section_coefficient?.section_additional_max_score &&
      typeof this.testData.correction_grid?.correction?.section_coefficient?.section_decimal_place === 'number'
    ) {
      const clonedSection = sectionsRef.map((section: any, index) => {
        section.maximum_score_from_sub_sections = 0
        this.testData.correction_grid.correction?.sections?.[index]?.sub_sections?.forEach(subSection => {
          section.maximum_score_from_sub_sections += subSection?.maximum_rating;
        })
        return section;
      })
      const additionalMaxScore = this.testData.correction_grid.correction.total_zone.additional_max_score;
      const maxScore = this.testData.correction_grid.correction.section_coefficient.section_additional_max_score;
      const decimalPoint = this.testData.correction_grid.correction.section_coefficient.section_decimal_place;
      const formula = clonedSection.map(section => {
        return `(${this.testUtilityService.calculateSectionTotalWithoutCoefficient(section, section.maximum_score_from_sub_sections, maxScore).toFixed(this.testData.correction_grid?.correction?.section_coefficient?.section_decimal_place)} * ${(+section.coefficient).toFixed(decimalPoint)})`;
      });
      const finalMarkFormulaWithoutBonusesAndPenalties = `(${formula.join(' + ')}) / ${this.testUtilityService.calculateTotalCoefficient(clonedSection)}`
      const bonusesAndPenalties = [
        ...penalties.map(penalty => penalty?.rating || 0).filter(Boolean).map(penalty => `- ${penalty}`),
        ...bonuses.map(bonus => bonus?.rating || 0).filter(Boolean).map(bonus => `+ ${bonus}`),
      ]
      if (bonusesAndPenalties?.length) {
        return of(`((${finalMarkFormulaWithoutBonusesAndPenalties}) ${bonusesAndPenalties.join(' ')}) * (${maxScore} / ${additionalMaxScore})`)
      }
      return of(`(${finalMarkFormulaWithoutBonusesAndPenalties}) * (${maxScore} / ${additionalMaxScore})`)
    } else {
      return of('')
    }
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  /*
    Down here are the formArray function such as add, remove, get.
  */
  getCorrectionForm() {
    return this.testCorrectionForm.get('correction_grid').get('correction') as UntypedFormGroup;
  }

  getHeaderFieldsFormArray(): UntypedFormArray {
    return this.testCorrectionForm.get('correction_grid').get('header').get('fields') as UntypedFormArray;
  }

  addHeaderFieldsFormArray() {
    this.getHeaderFieldsFormArray().push(this.initHeaderFooterFieldsForm());
  }

  removeHeaderFieldsFormArray(index) {
    this.getHeaderFieldsFormArray().removeAt(index);
  }

  getFooterFieldsFormArray(): UntypedFormArray {
    return this.testCorrectionForm.get('correction_grid').get('footer').get('fields') as UntypedFormArray;
  }

  addFooterFieldsFormArray() {
    this.getFooterFieldsFormArray().push(this.initHeaderFooterFieldsForm());
  }

  removeFooterFieldsFormArray(index) {
    this.getFooterFieldsFormArray().removeAt(index);
  }

  getSectionForm() {
    return this.getCorrectionForm().get('sections') as UntypedFormArray;
  }

  addSectionForm() {
    this.getSectionForm().push(this.initSectionForm());
  }

  removeSectionForm(index: number) {
    this.getSectionForm().removeAt(index);
  }

  resetHeaderForm() {
    this.getHeaderFieldsFormArray().controls.forEach((header) => {
      header.get('value').setValue(null);
    });
  }

  resetFooterForm() {
    this.getFooterFieldsFormArray().controls.forEach((footer) => {
      footer.get('value').setValue(null);
    });
  }

  resetBonusForm() {
    this.getBonusesFieldForm().controls.forEach((bonus) => {
      bonus.get('rating').setValue(null);
    });
  }

  resetPenaltyForm() {
    this.getPenaltiesFieldForm().controls.forEach((penalty) => {
      penalty.get('rating').setValue(null);
    });
  }

  resetSectionForm() {
    this.getSectionForm().controls.forEach((section, secIndex) => {
      section.get('rating').setValue(null);
      section.get('comment').setValue('');
      this.getSubSectionForm(secIndex).controls.forEach((subsec, subsecIndex) => {
        subsec.get('rating').setValue(null);
        subsec.get('score_conversion_id').setValue(null);
        subsec.get('comments').setValue('');
        this.getJurysSubSectionForm(secIndex, subsecIndex).controls.forEach((jury, juryIndex) => {
          jury.get('marks').setValue(null);
          jury.get('score_conversion_id').setValue(null);
        });
      });
    });
  }

  getSubSectionForm(sectionIndex: number) {
    return this.getSectionForm().at(sectionIndex).get('sub_sections') as UntypedFormArray;
  }

  addSubSectionForm(sectionIndex: number) {
    this.getSubSectionForm(sectionIndex).push(this.initSubSectionForm());
  }

  removeSubSectionForm(sectionIndex: number, subSectionIndex: number) {
    this.getSubSectionForm(sectionIndex).removeAt(subSectionIndex);
  }

  getSectionEvalskillForm() {
    return this.getCorrectionForm().get('sections_evalskill') as UntypedFormArray;
  }

  addSectionEvalskillForm() {
    this.getSectionEvalskillForm().push(this.initSectionEvalskillForm());
  }

  removeSectionEvalskillForm(index: number) {
    this.getSectionEvalskillForm().removeAt(index);
  }

  getMissionsActivitiesAutonomyForm(sectionIndex: number) {
    return this.getSectionEvalskillForm().at(sectionIndex).get('missionsActivitiesAutonomy') as UntypedFormArray;
  }

  addMissionsActivitiesAutonomyForm(sectionIndex: number) {
    this.getMissionsActivitiesAutonomyForm(sectionIndex).push(this.initMissionsActivitiesAutonomyForm())
  }

  reMapSectionEvalSkillForm() {
    this.getSectionEvalskillForm().clear();
    if (this.testData?.correction_grid?.correction?.sections_evalskill?.length) {
      const sections: SectionEvalskill[] = this.testData.correction_grid.correction.sections_evalskill;
      const listEval = [
        'academic_auto_evaluation',
        'academic_pro_evaluation',
        'soft_skill_auto_evaluation',
        'soft_skill_pro_evaluation',
      ];
      sections
      .filter(
        section =>
          !section?.specialization_id ||
          !listEval?.includes(this.testData?.type) ||
          (listEval?.includes(this.testData?.type) && section?.specialization_id === this.studentSpecializationId),
      )
        .forEach((section, sectionIndex) => {
          // add title to notation grid form table
          this.addSectionEvalskillForm();
          this.getSectionEvalskillForm().at(sectionIndex).get('ref_id').setValue(section.ref_id);
          this.getSectionEvalskillForm().at(sectionIndex).get('is_selected').setValue(section.is_selected);
          this.getSectionEvalskillForm().at(sectionIndex).get('title').setValue(section.title);
          this.getSectionEvalskillForm().at(sectionIndex).get('cleanTitle').setValue(this.getFullTextFromHtml(section.title));
          if (section.academic_skill_competence_template_id && section.academic_skill_competence_template_id._id) {
            this.getSectionEvalskillForm()
              .at(sectionIndex)
              .get('academic_skill_competence_template_id')
              .setValue(section.academic_skill_competence_template_id._id);
            const templateId = section.academic_skill_competence_template_id._id;
            // get template by filtering from competence_template_id
            const selectedTemplate = this.studentJobDescriptions.find((template) => {
              return template?.competence_template_id?._id && template.competence_template_id._id === templateId;
            });
            if (selectedTemplate?.missions_activities_autonomy?.length) {
              selectedTemplate.missions_activities_autonomy.forEach((autonomy, autonomyIndex) => {
                this.addMissionsActivitiesAutonomyForm(sectionIndex);
                this.getMissionsActivitiesAutonomyForm(sectionIndex).at(autonomyIndex).setValue(autonomy);
              })
            }
          }
          if (section.soft_skill_competence_template_id && section.soft_skill_competence_template_id._id) {
            this.getSectionEvalskillForm()
              .at(sectionIndex)
              .get('soft_skill_competence_template_id')
              .setValue(section.soft_skill_competence_template_id._id);
          }
          if (section?.sub_sections?.length) {
            section.sub_sections.forEach((subSection, subSectionIndex) => {
              // add text and direction value to notation grid form table
              this.addSubSectionEvalskillForm(sectionIndex);
              this.getSubSectionEvalskillForm(sectionIndex).at(subSectionIndex).get('ref_id').setValue(subSection.ref_id);
              this.getSubSectionEvalskillForm(sectionIndex).at(subSectionIndex).get('is_selected').setValue(subSection.is_selected);
              this.getSubSectionEvalskillForm(sectionIndex).at(subSectionIndex).get('title').setValue(subSection.title);
              this.getSubSectionEvalskillForm(sectionIndex).at(subSectionIndex).get('directions').setValue(subSection.direction);
              this.getSubSectionEvalskillForm(sectionIndex).at(subSectionIndex).get('cleanTitle').setValue(subSection.title);
              this.getSubSectionEvalskillForm(sectionIndex).at(subSectionIndex).get('cleanDirections').setValue(subSection.direction);
              // add jury subsection form array if test type is jury organization
              this.testData.jury_max = 3; // hard coded as 3 in admtc v1
              this.testData.jury_max = 3;
              if ((this.testData.type === 'memoire_oral_non_jury' || this.testData.type === 'memoire_oral') && this.testData.jury_max >= 0) {
                for (let i = 0; i < this.testData.jury_max; i++) {
                  this.addJurysSubSectionForm(sectionIndex, subSectionIndex);
                }
              }
              if (
                subSection.academic_skill_criteria_of_evaluation_competence_id &&
                subSection.academic_skill_criteria_of_evaluation_competence_id._id
              ) {
                this.getSubSectionEvalskillForm(sectionIndex)
                  .at(subSectionIndex)
                  .get('academic_skill_criteria_of_evaluation_competence_id')
                  .setValue(subSection.academic_skill_criteria_of_evaluation_competence_id._id);
              }
              if (subSection.is_selected) {
                this.getSubSectionEvalskillForm(sectionIndex).at(subSectionIndex).get('rating').setValidators([Validators.required,Validators.min(0)]);
                this.getSubSectionEvalskillForm(sectionIndex).at(subSectionIndex).get('rating').updateValueAndValidity();
              }
              if (this.testData.date_type === 'multiple_date') {
                this.initMultipleDateForm(sectionIndex, subSectionIndex);
              }
            });
          }
        });
    }
  }

  resetSectionEvalskillForm() {
    // **************************************************************************
    // this function is to handle when user already upload document expected before inputting mark in mark entry.
    // when user already upload document expected before inputting mark in mark entry, the section become empty.
    // so need to fill the section and subsection data from test creation data.
    // **************************************************************************
    // this.getSectionEvalskillForm().controls.forEach((section, secIndex) => {
    //   section.get('rating').setValue(null);
    //   section.get('comment').setValue('');
    //   this.getSubSectionEvalskillForm(secIndex).controls.forEach((subsec, subsecIndex) => {
    //     subsec.get('rating').setValue(null);
    //     subsec.get('score_conversion_id').setValue(null);
    //     subsec.get('comments').setValue('');
    //     if (this.testData.date_type === 'multiple_date') {
    //       this.initMultipleDateForm(secIndex, subsecIndex);
    //     }
    //     this.getJurysSubSectionForm(secIndex, subsecIndex).controls.forEach((jury, juryIndex) => {
    //       jury.get('marks').setValue(null);
    //       jury.get('score_conversion_id').setValue(null);
    //     });
    //   });
    // });
  }

  initMultipleDateForm(sectionIndex: number, subsectionIndex: number) {
    // add initial multiple date form based on task's due_date
    this.getMultipleDatesSubSectionForm(sectionIndex, subsectionIndex).clear();
    let date = moment().format('DD/MM/YYYY')
    if (this.taskData && this.taskData.due_date && this.taskData.due_date.date) {
      date = this.taskData.due_date.date;
    }
    this.addMultipleDatesSubSectionForm(sectionIndex, subsectionIndex);
    this.getMultipleDatesSubSectionForm(sectionIndex, subsectionIndex).at(0).get('date').setValue(date);
    this.getMultipleDatesSubSectionForm(sectionIndex, subsectionIndex).at(0).get('marks').setValue(null);
    if (this.testData.correction_grid.correction.show_number_marks_column) {
      const maxRating =  this.testData?.sections_evalskill?.length && this.testData?.sections_evalskill[sectionIndex]?.sub_sections?.length && this.testData?.sections_evalskill[sectionIndex]?.sub_sections[subsectionIndex]?.maximum_rating? this.testData?.sections_evalskill[sectionIndex]?.sub_sections[subsectionIndex]?.maximum_rating : 5
      this.getMultipleDatesSubSectionForm(sectionIndex, subsectionIndex).at(0).get('marks').setValidators([Validators.required,Validators.min(0),Validators.max(maxRating)]);
    } else {
      this.getMultipleDatesSubSectionForm(sectionIndex, subsectionIndex)
        .at(0)
        .get('score_conversion_id')
        .setValidators([Validators.required]);
    }
    const multipleDatesData = this.getMultipleDatesSubSectionForm(sectionIndex, subsectionIndex).value;
    this.setMultipleDatesFormData(multipleDatesData);
    this.getSubSectionEvalskillForm(sectionIndex).at(subsectionIndex).get('rating').clearValidators();
    this.getSubSectionEvalskillForm(sectionIndex).at(subsectionIndex).get('rating').updateValueAndValidity();
  }

  updateMultipleDateFormArray(multipleDates: any[]) {
    if (multipleDates && multipleDates.length) {
      this.setMultipleDatesFormData(multipleDates);
    }
  }

  getSubSectionEvalskillForm(sectionIndex: number) {
    return this.getSectionEvalskillForm().at(sectionIndex).get('sub_sections') as UntypedFormArray;
  }

  addSubSectionEvalskillForm(sectionIndex: number) {
    this.getSubSectionEvalskillForm(sectionIndex).push(this.initSubSectionEvalskillForm());
  }

  removeSubSectionEvalskillForm(sectionIndex: number, subSectionIndex: number) {
    this.getSubSectionEvalskillForm(sectionIndex).removeAt(subSectionIndex);
  }

  getPenaltiesFieldForm() {
    return this.getCorrectionForm().get('penalties') as UntypedFormArray;
  }

  addPenaltyFieldForm() {
    this.getPenaltiesFieldForm().push(this.initBonusPenaltyFieldForm());
  }

  removePenaltyFieldForm(index: number) {
    this.getPenaltiesFieldForm().removeAt(index);
  }

  getBonusesFieldForm() {
    return this.getCorrectionForm().get('bonuses') as UntypedFormArray;
  }

  addBonusFieldForm() {
    this.getBonusesFieldForm().push(this.initBonusPenaltyFieldForm());
  }

  removeBonusFieldForm(index: number) {
    this.getBonusesFieldForm().removeAt(index);
  }

  getExpectedDocumentForm() {
    return this.testCorrectionForm.get('expected_documents') as UntypedFormArray;
  }

  addExpectedDocumentForm() {
    this.getExpectedDocumentForm().push(this.initExpectedDocumentForm());
  }

  removeExpectedDocumentForm(index: number) {
    this.getExpectedDocumentForm().removeAt(index);
  }

  getJurysSubSectionForm(sectionIndex: number, subSectionIndex: number) {
    if (this.testData.block_type === 'competence' || this.testData.block_type === 'soft_skill') {
      return this.getSubSectionEvalskillForm(sectionIndex).at(subSectionIndex).get('jurys') as UntypedFormArray;
    } else {
      return this.getSubSectionForm(sectionIndex).at(subSectionIndex).get('jurys') as UntypedFormArray;
    }
  }

  addJurysSubSectionForm(sectionIndex: number, subSectionIndex: number) {
    this.getJurysSubSectionForm(sectionIndex, subSectionIndex).push(this.initJurysSubSectionForm());
  }

  removeJurysSubSectionForm(sectionIndex: number, subSectionIndex: number, juryIndex: number) {
    this.getJurysSubSectionForm(sectionIndex, subSectionIndex).removeAt(juryIndex);
  }

  getMultipleDatesSubSectionForm(sectionIndex: number, subSectionIndex: number) {
    return this.getSubSectionEvalskillForm(sectionIndex).at(subSectionIndex).get('multiple_dates') as UntypedFormArray;
  }

  addMultipleDatesSubSectionForm(sectionIndex: number, subSectionIndex: number) {
    this.getMultipleDatesSubSectionForm(sectionIndex, subSectionIndex).push(this.initMultipleDatesSubSectionForm());
  }

  removeMultipleDatesSubSectionForm(sectionIndex: number, subSectionIndex: number, juryIndex: number) {
    this.getMultipleDatesSubSectionForm(sectionIndex, subSectionIndex).removeAt(juryIndex);
  }

  addMultipleDatesForm() {
    this.multipleDatesFormArray.push(this.initMultipleDatesSubSectionForm());
  }

  setMultipleDatesFormData(multipleDatesData: MultipleDateCorrection[]) {
    this.multipleDatesFormArray.clear();
    multipleDatesData.forEach((dateData) => {
      this.addMultipleDatesForm();
    });
    if (!this.taskData) {
      multipleDatesData = multipleDatesData.reverse();
    }
    this.multipleDatesFormArray.patchValue(multipleDatesData);
  }

  getJuryEnabledList() {
    return this.testCorrectionForm.get('jury_enabled_list') as UntypedFormArray;
  }

  addJuryEnabledList(index) {
    this.getJuryEnabledList().push(this.initJuryEnabledList(index));
  }

  removeJuryEnabledList(index: number) {
    this.getJuryEnabledList().removeAt(index);
  }
  /*
    End of formArray functions
  */

  getDataChanges() {
    const lastForm = _.cloneDeep(this.testCorrectionForm.value);

    return _.isEqual(this.firstForm, lastForm);
  }

  canDeactivate(): Observable<boolean> | Promise<boolean> | boolean {
    let validation = true;

    // The actual validation, by comparing data saved and current data in the form
    if (this.getDataChanges()) {
      validation = true;
    } else {
      validation = false;
    }

    // Passing the validation into the canExitService, if we return true, meaning user are allowed to go, otherwise user will stay
    if (!validation && !this.emptyTask && !this.isChangedCorrector && !this.isCannotBeEdited) {
      return new Promise((resolve, reject) => {
        Swal.fire({
          type: 'warning',
          title: this.translate.instant('TMTC_S01.TITLE'),
          text: this.translate.instant('TMTC_S01.TEXT'),
          confirmButtonText: this.translate.instant('TMTC_S01.BUTTON_1'),
          showCancelButton: true,
          cancelButtonText: this.translate.instant('TMTC_S01.BUTTON_2'),
          allowEscapeKey: false,
          allowOutsideClick: false,
          footer: `<span style="margin-left: auto">TMTC_S01</span>`,
        }).then((result) => {
          if (result.value) {
            this.swalSubmitMarksEntryUnsaved();
            setTimeout(()=>{
              resolve(true)
            },2000)
          } else {
            resolve(true);
          }
        });
      });
    } else {
      return true;
    }
  }

  getAllTestCorrection() {
    if (this.testData?.correction_type === 'cross_correction') {
      const student_ids = [];
      if (this.studentList && this.studentList.length) {
        this.studentList.forEach((student) => {
          student_ids.push(student._id);
        });
      }
      // if there is task data (open mark entry page from pending task or task table), execute this block of code
      this.subs.sink = this.testCorrectionService
        .getAllCompleteTestCorrectionWithStudent(this.testId, student_ids)
        .subscribe((response) => {
          this.originalStudentList = [];
          const data = response;
          if (this.filteredStudentList) {
            this.filteredStudentList.forEach((student) => {
              // find correction grid data and assign it to student
              const correction = data.find((corr) => corr.student && corr.student._id && corr.student._id === student._id);
              this.originalStudentList.push({ ...student, correction_grid: correction ? correction.correction_grid : null });
            });
          }
          this.isAllStudentInputLatestMultipleDate = this.checkIsAllStudentInputLatestMultipleDate();
        });
    } else {
      // If task is mark entry and its for auto evaluation. thats mean its only for 1 student. Filter out the student in getalltestcorrection
      const autoEvaluation = ['academic_auto_evaluation', 'soft_skill_auto_evaluation']
      let studentIds = [];
      if (autoEvaluation.includes(this.testData?.type) && this.taskData?.description === 'Marks Entry') {
        if (this.studentList && this.studentList.length) {
          this.studentList.forEach((student) => {
            studentIds.push(student._id);
          });
        }
      }

      this.subs.sink = this.testCorrectionService.getAllCompleteTestCorrection(this.testData._id, this.schoolData._id, studentIds).subscribe((resp) => {
        this.originalStudentList = [];
        const data = resp;
        if (this.filteredStudentList) {
          this.filteredStudentList.forEach((student) => {
            // find correction grid data and assign it to student
            const correction = data.find((corr) => corr.student && corr.student._id && corr.student._id === student._id);
            this.originalStudentList.push({ ...student, correction_grid: correction ? correction.correction_grid : null });
          });
        }
        this.isAllStudentInputLatestMultipleDate = this.checkIsAllStudentInputLatestMultipleDate();
      });
    }
  }

  checkIsAllStudentInputLatestMultipleDate(): boolean {
    let isAllStudentHasMark = true;
    for (const student of this.originalStudentList) {
      if (!student.testCorrectionId || !student.correction_grid) {
        isAllStudentHasMark = false;
        break;
      } else {
        for (const section of student.correction_grid.correction.sections_evalskill) {
          if (section?.sub_sections?.length) {
            for (const subsec of section.sub_sections) {
              const multipleDates = _.cloneDeep(subsec.multiple_dates);
              // find task's due date in student's multiple date mark.
              // ex: if task's due date is "20/11/2020", but student dont have mark in date "20/11/2020"
              // then disable the submit button
              const isDateExist = multipleDates.find((dateData: MultipleDateCorrection) => this.taskData.due_date.date === dateData.date);
              if (!isDateExist) {
                isAllStudentHasMark = false;
                break;
              }
            }
          }
        }
      }
    }
    return isAllStudentHasMark;
  }

  getContainerWidth() {
    let offsetWidth = this.notationGridContainer?.nativeElement?.offsetWidth;
    // minus 20 becase there is padding and border. padding 8px and border 2px for each side.
    offsetWidth = offsetWidth ? +offsetWidth - 20 : 0;
    return offsetWidth;
  }

  getFooterContainerHeight() {
    let offsetHeight = this.footerContainer?.nativeElement?.offsetHeight;
    offsetHeight = offsetHeight ? +offsetHeight : 0;
    return offsetHeight;
  }

  // *************** To Get Height window screen and put in style css height
  getAutomaticHeight() {
    if (
      this.testData.correction_grid.header.fields &&
      this.testData.correction_grid.header.fields.length &&
      this.testData.correction_grid.footer.fields &&
      this.testData.correction_grid.footer.fields.length < 1 &&
      !this.testData.correction_grid.correction.show_final_comment
    ) {
      this.myInnerHeight = window.innerHeight - 271;
      return this.myInnerHeight;
    } else if (
      this.testData.correction_grid.footer.fields &&
      this.testData.correction_grid.footer.fields.length &&
      this.testData.correction_grid.header.fields &&
      this.testData.correction_grid.header.fields.length < 1 &&
      !this.testData.correction_grid.correction.show_final_comment
    ) {
      this.myInnerHeight = window.innerHeight - 271;
      return this.myInnerHeight;
    } else if (
      this.testData.correction_grid.header.fields &&
      this.testData.correction_grid.header.fields.length &&
      this.testData.correction_grid.footer.fields &&
      this.testData.correction_grid.footer.fields.length &&
      !this.testData.correction_grid.correction.show_final_comment
    ) {
      this.myInnerHeight = window.innerHeight - 321;
      return this.myInnerHeight;
    } else if (
      this.testData.correction_grid.header.fields &&
      this.testData.correction_grid.header.fields.length &&
      this.testData.correction_grid.footer.fields &&
      this.testData.correction_grid.footer.fields.length &&
      this.testData.correction_grid.correction.show_final_comment
    ) {
      this.myInnerHeight = window.innerHeight - 391;
      return this.myInnerHeight;
    } else if (
      this.testData.correction_grid.header.fields &&
      this.testData.correction_grid.header.fields.length &&
      this.testData.correction_grid.footer.fields &&
      this.testData.correction_grid.footer.fields.length < 1 &&
      this.testData.correction_grid.correction.show_final_comment
    ) {
      // this.myInnerHeight = window.innerHeight - 328;
      this.myInnerHeight = window.innerHeight - 299;
      return this.myInnerHeight;
    } else if (
      this.testData.correction_grid.header.fields &&
      this.testData.correction_grid.header.fields.length < 1 &&
      this.testData.correction_grid.footer.fields &&
      this.testData.correction_grid.footer.fields.length &&
      this.testData.correction_grid.correction.show_final_comment
    ) {
      // this.myInnerHeight = window.innerHeight - 328;
      this.myInnerHeight = window.innerHeight - 335;
      return this.myInnerHeight;
    } else if (
      this.testData.correction_grid.header.fields &&
      this.testData.correction_grid.header.fields.length < 1 &&
      this.testData.correction_grid.footer.fields &&
      this.testData.correction_grid.footer.fields.length < 1 &&
      this.testData.correction_grid.correction.show_final_comment
    ) {
      this.myInnerHeight = window.innerHeight - 284;
      return this.myInnerHeight;
    } else {
      this.myInnerHeight = window.innerHeight - 228;
      return this.myInnerHeight;
    }
  }

  /**
   * Function to check whether current competency marks are changed
   * @returns {boolean} - Comparison result, true means nothing changed
   */
  currentCompetencyComparison(): boolean {
    if (this.showComptentyTab) {
      return _.isEqual(
        this.firstForm?.correction_grid?.correction?.sections_evalskill?.[this.selectedCompetenceIndex],
        this.getSectionEvalskillForm()?.at(this.selectedCompetenceIndex)?.value,
      )
    } else {
      return _.isEqual(
        this.firstForm,
        this.testCorrectionForm?.value,
      )
    }
  }

  comparison() {
    const initialForm = JSON.stringify(this.firstForm);
    const currentForm = JSON.stringify(this.testCorrectionForm?.value);

    let firstSelectedStudentCorrection;
    let modifiedSelectedStudentCorrection;

    if (this.firstForm?.missing_copy && this.firstForm?.is_justified === null) {
      return false;
    }

    if (this.showComptentyTab){
      firstSelectedStudentCorrection = JSON.stringify(this.firstForm?.correction_grid?.correction?.sections_evalskill[this.selectedCompetenceIndex]);
      modifiedSelectedStudentCorrection = JSON.stringify(this.getSectionEvalskillForm()?.at?.(this.selectedCompetenceIndex)?.value);
      if ((initialForm === currentForm) && (firstSelectedStudentCorrection === modifiedSelectedStudentCorrection)) {
        return true;
      } else {
        return false;
      }
    } else {
      if (initialForm === currentForm) {
        return true;
      } else {
        return false;
      }
    }
  }


  comparisonSaveThisScore() {
    const initialForm = JSON.stringify(this.firstForm);
    const currentForm = JSON.stringify(this.testCorrectionForm?.value);

    let firstSelectedStudentCorrection;
    let modifiedSelectedStudentCorrection;

    if (this.showComptentyTab){
      firstSelectedStudentCorrection = JSON.stringify(this.firstForm?.correction_grid?.correction?.sections_evalskill[this.selectedCompetenceIndex])
      modifiedSelectedStudentCorrection = JSON.stringify(this.getSectionEvalskillForm()?.at?.(this.selectedCompetenceIndex)?.value);
      if (
        ((initialForm === currentForm) && (firstSelectedStudentCorrection === modifiedSelectedStudentCorrection)) &&
        this.testCorrectionForm?.value?.is_saved &&
        !this.testCorrectionForm.get('missing_copy').value &&
        !this.testCorrectionForm.get('is_do_not_participated').value
      ) {
        return true;
      } else {
        return false;
      }
    } else {
      if (
        (initialForm === currentForm) &&
        this.testCorrectionForm?.value?.is_saved &&
        !this.testCorrectionForm.get('missing_copy').value &&
        !this.testCorrectionForm.get('is_do_not_participated').value
      ) {
        return true;
      } else {
        return false;
      }
    }
  }

  mutateSubmitTestCorrectionMentor() {
    const studentPdfResults = this.getStudentPdfResultsMentor();

    this.isWaitingForResponse = true;
    // submit test correction for normal test
    this.subs.sink = this.testCorrectionService.submitMarkEntryMentor(this.testId, this.schoolId, studentPdfResults).subscribe(
      (ressp) => {
        if (ressp) {
          this.isDataSubmit = true;
          this.isWaitingForResponse = false;
          this.firstForm = _.cloneDeep(this.testCorrectionForm.value);
          this.sendUserActivity('click_on_button_submit', {user: this.currentUser?.last_name + ' ' + this.currentUser?.first_name, test_name: this.testData?.name})
          swal
            .fire({
              type: 'success',
              title: this.translate.instant('TESTCORRECTIONS.MESSAGE.ALLCORRECTIONSSUBMITTEDTitle'),
              html: this.translate.instant('TESTCORRECTIONS.MESSAGE.ALLCORRECTIONSSUBMITTED'),
              confirmButtonText: this.translate.instant('TESTCORRECTIONS.MESSAGE.ALLCORRECTIONSSUBMITTEDBtn'),
              allowOutsideClick: false,
              footer: `<span style="margin-left: auto">SUBMIT_MARK_S4</span>`,
            })
            .then(() => {
              this.subs.sink = this.testCorrectionService.getTest(this.testId, this.schoolId, this.isEvalProAuto).subscribe((test) => {
                if (test) {
                  this.getDataFromParam();
                  this.getFilteredStudentList();
                }
              });
            });
        }
      },
      (err) => {
        this.isWaitingForResponse = false;
        this.authService.postErrorLog(err);
        const msg = err?.message;
        if (msg?.includes('Corrector is already change')) {
          this.isChangedCorrector = true;
          const testName = this.testData?.name;
          const subjectName = this.testData?.subject_id?.subject_name;
          const acadirName =
            this.translate.instant(this.historyLastUpdated?.last_access_by?.civility) +
            ' ' +
            this.historyLastUpdated?.last_access_by?.first_name +
            ' ' +
            this.historyLastUpdated?.last_access_by?.last_name?.toLowerCase();
          Swal.fire({
            type: 'info',
            title: this.translate.instant('CHANGE_S2.TITLE', {
              testName,
              subjectName,
            }),
            html: this.translate.instant('CHANGE_S2.TEXT', {
              testName,
              subjectName,
              acadirName,
            }),
            allowOutsideClick: false,
            allowEscapeKey: false,
            footer: `<span style="margin-left: auto">CHANGE_S2</span>`,
            confirmButtonText: this.translate.instant('CHANGE_S2.BUTTON_2'),
          }).then(() => {
            this.router.navigate(['/rncpTitles']);
          });
        }
      },
    );
  }
  checkDocExpected(){
    let validate = true
    let testCorrectionData;
    if (!this.testData.group_test && this.filteredStudentList?.length) {
      testCorrectionData = this.filteredStudentList;
    } else if (this.testData.group_test && this.filteredGroupList.length) {
      testCorrectionData = this.filteredGroupList;
    }

    if (testCorrectionData && testCorrectionData?.length) {
      for (const data of testCorrectionData) {
        // Check if the test has document expected for student / group, or for each student / group, the student / group has to upload doc or missing copy the mark
        if (
          this.isTestHasDocumentExpected &&
          (!data?.doc || !data?.doc.length) &&
          !data?.missing_copy &&
          !data?.is_do_not_participated
        ) {
          validate = false;
          break;
        }
        // Check if all student / group, already input mark. if any student / group has no score yet, return false to disable the button
        if ((this.testData?.type === 'free_continuous_control' || this.testData?.controlled_test) && data?.score !== 0 && !data?.score && !data?.missing_copy && !data?.is_do_not_participated) {
          validate = false;
          break;
        }
      }
    }
    return validate
  }

  /**
   * Function to check the validity of test with type `academic_recommendation`
   * @returns {boolean} True if the test is valid or if it is not academic recommendation
   */
  checkIfAcademicRecommendationIsValid(): boolean {
    if (this.testData?.type === 'academic_recommendation') {
      const correction = this.testCorrectionForm.getRawValue();
      let correctionIsValid = true;

      // ************** A sanity check to make sure the `sections` is an array.
      // ************** No need to check for its length since a loop of empty array is the same as doing nothing
      if (Array.isArray(correction?.correction_grid?.correction?.sections)) {
        for (const section of correction.correction_grid.correction.sections) {
          // *************** If there is already a reason of the invalidity then no need to do further check
          if (!correctionIsValid) {
            break;
          }

          // ************** A sanity check to make sure the `sub_sections` is an array.
          // ************** No need to check for its length since a loop of empty array is the same as doing nothing
          if (Array.isArray(section?.sub_sections)) {

            // *************** Check each criteria inside competence to make sure the comments are already inputted
            for (const subSection of section?.sub_sections) {
              // *************** If there is already a reason of the invalidity then no need to do further check
              if (!correctionIsValid) {
                break;
              }

              // ************** Test with type of academic recommendation only requires the comment per criteria (sub section) to be inputted
              // ************** If there is no comment yet, then we put the reason of invalidity with 'invalid-competence'
              if (!subSection?.comments) {
                correctionIsValid = false;
              }
            }
          }
        }
      }

      // *************** If the test is marked as missing copy, then the correction is valid
      if (!correctionIsValid && correction?.missing_copy) {
        correctionIsValid = true;
      }

      // *************** If the student marked as not participating in the test, then the correction is valid
      if (!correctionIsValid && correction?.is_do_not_participated) {
        correctionIsValid = true;
      }

      return correctionIsValid;
    } else {
      // *************** If the test is not academic recommendation, then we return `true` as it is only checks for test academic recommendation
      return true;
    }
  }

  /** Function to check the `competence_status` of all `sections_evalskill` in all student/group test corrections if the test correction has competency tabs or else the `sections` score validity */
  checkCompetencyStatusAllStudent() {
    let validate = true;
    let testCorrectionData;
    if (!this.testData?.group_test && this.filteredStudentList?.length) {
      testCorrectionData = this.filteredStudentList;
    } else if (this.testData?.group_test && this.filteredGroupList?.length) {
      testCorrectionData = this.filteredGroupList;
    }

    // *************** We only check the competence_status if the test has competency tab
    if (this.competencyTabValidation() && testCorrectionData?.length) {
      for (const data of testCorrectionData) {
        if (
          data?.correctionGrid?.correction?.sections_evalskill?.length &&
          data?.correctionGrid?.correction?.sections_evalskill?.some(resp => resp?.competence_status !== 'completed')
        ) {
          validate = false;
          break;
        }
      }
    } else if (this.testData?.class_id?.type_evaluation === 'score' && testCorrectionData?.length) {
      for (const data of testCorrectionData) {
        if (!data?.missing_copy && typeof data?.score !== 'number') {
          validate = false;
          break
        }
      }
    }
    return validate;
  }

  /** Function to select group or student. The `data` could be `FilteredGroupList` or `FilteredStudentList` */
  selectGroupStudent(data: any, isGroupTest: boolean) {
    if (isGroupTest && data?._id) {
      this.studentSelect = this.displayGroupName(data._id);
      this.groupSelected(data, true);
    } else if (data?.testCorrectionId) {
      this.studentSelected(data, true);
      this.autoPopulateFormWithStudentTestCorrection(data.testCorrectionId, true);
    }
  }

  selectedIndex(source: string){
    if(this.showComptentyTab && this.getSectionEvalskillForm()?.value?.length){
      const form = _.cloneDeep(this.getSectionEvalskillForm())
      const sectionIndex = form?.value.findIndex(section => section?.competence_status !== 'completed')
      this.selectedCompetenceIndex = sectionIndex>=0 ? sectionIndex : this.selectedCompetenceIndex
    }
    setTimeout(()=>{
      this.checkMissingField()
      if (source === 'SUBMIT_MARK_S1') {
        this.testCorrectionForm.markAllAsTouched()
      }
    })
  }
  checkInvalid(source: string = ''){
    let nonCorrectedStudent;
    let unCorrectedGroup
    let isGroupTest = false
    if(this.isGroup){
      unCorrectedGroup = this.filteredGroupList?.find((dataGroup) => dataGroup.score === null);
      isGroupTest = true
      nonCorrectedStudent = null
    }else{
      nonCorrectedStudent = this.filteredStudentList?.find((student) => student.score === null);
      isGroupTest = false
      unCorrectedGroup = null
    }
    if(this.checkCurrentCompetenceValidity() && this.testData?.group_test && !unCorrectedGroup && !nonCorrectedStudent){
      if(isGroupTest && !unCorrectedGroup){
        nonCorrectedStudent = this.filteredStudentList?.find((student) => student.score === null);
        isGroupTest = false
      }else if(!isGroupTest && !nonCorrectedStudent){
        unCorrectedGroup = this.filteredGroupList?.find((dataGroup) => dataGroup.score === null);
        isGroupTest = true
      }
    }
    if(unCorrectedGroup && isGroupTest){
      this.selectGroupStudent(unCorrectedGroup,isGroupTest)
    }else if(nonCorrectedStudent && !isGroupTest){
      this.selectGroupStudent(nonCorrectedStudent,isGroupTest)
    }else{
      this.selectedIndex(source)
    }
  }
  checkMissingField(){
    let invalidControl = null

    if(this.showComptentyTab && this.getSectionEvalskillForm()?.value?.length && this.getSectionEvalskillForm()?.invalid){
      const sectionForm = this.getSectionEvalskillForm().at(this.selectedCompetenceIndex)
      const justificationControl = sectionForm?.get('comment');
      const criteriaControls = sectionForm?.get('sub_sections') as UntypedFormArray;
      const invalidRating = criteriaControls?.controls?.find(criteria => criteria?.get('rating')?.invalid)
      if(invalidRating){
        invalidControl = this.el.nativeElement.querySelector('[formcontrolname="rating"].ng-invalid');
      }
      if(!invalidControl && !invalidRating && justificationControl?.invalid && !justificationControl?.value){
        const ckEditorInvalid = this.el.nativeElement.querySelectorAll('.ng-invalid>.ck-editor__editable');
        invalidControl = ckEditorInvalid?.length ? ckEditorInvalid[0] : null
      }
    }else if(!this.showComptentyTab && this.getSectionEvalskillForm()?.value?.length && this.getSectionEvalskillForm()?.invalid){
      for (const section of this.getSectionEvalskillForm().controls) {
        const justificationControl = section?.get('comment');
        const criteriaControls = section?.get('sub_sections') as UntypedFormArray;
        if(criteriaControls?.length && criteriaControls?.invalid){
          for(const criteria of criteriaControls?.controls){
            if(this.testData.date_type === 'multiple_date' && criteria?.get('multiple_dates')?.value?.length && criteria?.get('multiple_dates')?.invalid){
              const multipleDates = criteria?.get('multiple_dates') as UntypedFormArray;
              for(const date of multipleDates?.controls){
                invalidControl = date?.get('marks')?.invalid
                  ? this.el.nativeElement.querySelector('[formcontrolname="marks"].ng-invalid')
                  : date?.get('observation')?.invalid
                  ? this.el.nativeElement.querySelector('[formcontrolname="observation"].ng-invalid')
                  : null

                if(invalidControl){
                  break
                }
              }
            }
            if(!invalidControl && criteria?.get('rating')?.invalid){
              invalidControl = this.el.nativeElement.querySelector('[formcontrolname="rating"].ng-invalid');
            }

            if(invalidControl){
              break
            }
          }
        }
        if(!invalidControl && justificationControl?.invalid){
          const formName = this.testData.date_type === 'multiple_date' ? '[formcontrolname="comment"].ng-invalid': '.ng-invalid>.ck-editor__editable'
          const ckEditorInvalid = this.el.nativeElement.querySelectorAll(formName);
          invalidControl = ckEditorInvalid?.length ? ckEditorInvalid[0] : null
        }
        if(invalidControl){
          break
        }
      }
    }else if((this.testData?.type === 'free_continuous_control' || this.testData?.controlled_test) && this.getCorrectionForm()?.get('additional_total')?.invalid){
      invalidControl = this.el.nativeElement.querySelector('[formcontrolname="additional_total"].ng-invalid')
    }else if(this.getSectionForm()?.value?.length && this.getSectionForm()?.invalid){
      for (const section of this.getSectionForm().controls) {
        const justificationControl = section?.get('comment');
        const criteriaControls = section?.get('sub_sections') as UntypedFormArray;
        if(criteriaControls?.length && criteriaControls?.invalid){
          for(const criteria of criteriaControls?.controls){
            const fieldName = criteria?.get('rating')?.invalid ? '[formcontrolname="rating"].ng-invalid' : this.testData?.type === 'academic_recommendation' && criteria?.get('comments')?.invalid ? '.ng-invalid>.ck-editor__editable' : this.testData?.type !== 'academic_recommendation' && criteria?.get('comments')?.invalid ? '[formcontrolname="comments"].ng-invalid' : null
            invalidControl = fieldName ? this.el.nativeElement.querySelector(fieldName) : null
            if(invalidControl){
              break
            }
          }
        }
        if(!invalidControl && justificationControl?.invalid){
          invalidControl = this.el.nativeElement.querySelector('[formcontrolname="comment"].ng-invalid');
        }
        if(invalidControl){
          break
        }
      }
    }
    if(!invalidControl){
      // Footer & Header
      const footerHeaderInvalid = this.testCorrectionForm?.get('correction_grid')?.get('correction')?.get('final_comment')?.invalid
        ? this.el.nativeElement.querySelector('[formcontrolname="final_comment"].ng-invalid')
        : ((this.getFooterFieldsFormArray()?.value?.length && this.getFooterFieldsFormArray().invalid) || (this.getHeaderFieldsFormArray()?.value?.length && this.getHeaderFieldsFormArray()?.invalid)) ? this.el.nativeElement.querySelector('input[formcontrolname="value"].ng-invalid')
        : null
      const invalidOtherForm = this.el.nativeElement.querySelector('.ng-invalid[formcontrolname]');
      invalidControl = footerHeaderInvalid && (this.showComptentyTab || this.getSectionEvalskillForm()?.value?.length || (this.testData?.type === 'free_continuous_control' || this.testData?.controlled_test) || this.testData?.type === 'academic_recommendation') ? footerHeaderInvalid : invalidOtherForm? invalidOtherForm : footerHeaderInvalid
    }
    if (invalidControl) {
      setTimeout(()=>{
        invalidControl.focus()
    },500)
    }
  }

  submitTestCorrection() {
    this.isSavedFromSubmitMarkS1 = false
    // *************** Need remove validation inside sections and sub section if the test data have type free_continuous_control
    const sections: TestCorrectionCorrectionGridCorrectionSectionInput[] = this.getSectionForm().value;
    if (this.testData?.type === 'free_continuous_control' && sections?.length) {
      this.removeValidationSectionAndSubSectionForFreeContinousControl()
    }

    if(!this.comparison()){
      if(this.isGroup){
        this.saveGroupTestCorrection('SUBMIT_MARK_S1')
      }else{
        this.saveTestCorrection('SUBMIT_MARK_S1')
      }
    }else{
      this.submittedTestCorrection();
    }
  }

  saveBeforeValidateTestCorrection() {
    this.isSavedFromSubmitMarkS1 = false
    if(!this.comparison()){
      if(this.isGroup){
        this.saveGroupTestCorrection('save-validate')
      }else{
        this.saveTestCorrection('save-validate')
      }
    } else{
      this.saveAndValidateTestCorrection();
    }
  }

  submittedTestCorrection() {
    this.isSavedFromSubmitMarkS1 = false
    if ((this.testData?.type === 'free_continuous_control' || this.testData?.controlled_test) && !this.testCorrectionForm.get('missing_copy').value) {
      const total = this.getCorrectionForm().get('additional_total').value
      if (typeof total !== 'number' || total < 0 || total > 20) {
        Swal.fire({
          type: 'warning',
          title: this.translate.instant('SUBMIT_MARK_S1.TITLE'),
          html: this.translate.instant('SUBMIT_MARK_S1.TEXT'),
          footer: `<span style="margin-left: auto">SUBMIT_MARK_S1</span>`,
          confirmButtonText: this.translate.instant('SUBMIT_MARK_S1.BUTTON_1'),
          allowEscapeKey: true,
          showCancelButton: false,
          allowOutsideClick: false,
          allowEnterKey: false,
        }).then(() => {
          this.clickSubmitCorrection = true;
          this.testCorrectionForm.markAllAsTouched();
          this.checkInvalid('SUBMIT_MARK_S1')
        });
        return;
      }
    } else if (!this.testCorrectionForm.get('missing_copy').value) {
      if (
        !this.checkCurrentCompetenceValidity('SUBMIT_MARK_S1') ||
        this.checkAnyInvalidSection() ||
        !this.checkDocExpected() ||
        !this.checkCompetencyStatusAllStudent() ||
        !this.checkIfAcademicRecommendationIsValid()
      ) {
        Swal.fire({
          type: 'warning',
          title: this.translate.instant('SUBMIT_MARK_S1.TITLE'),
          html: this.translate.instant('SUBMIT_MARK_S1.TEXT'),
          footer: `<span style="margin-left: auto">SUBMIT_MARK_S1</span>`,
          confirmButtonText: this.translate.instant('SUBMIT_MARK_S1.BUTTON_1'),
          allowEscapeKey: true,
          showCancelButton: false,
          allowOutsideClick: false,
          allowEnterKey: false,
        }).then(() => {
          this.clickSubmitCorrection = true;
          this.testCorrectionForm.markAllAsTouched();
          this.checkInvalid('SUBMIT_MARK_S1')
        });
        return;
      }
    }

    let fetchTestCorForValidation = this.competencyTabValidation();
    // *************** the checking via competency tab is not exactly correct. As we need to check for test correction also;
    if (this.testData?.type === 'free_continuous_control' || this.testData?.controlled_test) {
      fetchTestCorForValidation = true;
    }

    const correctorId = this.selectedCorrectorId || null;
    const queries = []
    if (fetchTestCorForValidation || this.testData?.class_id?.type_evaluation === 'score') {
      queries.push(
        this.testCorrectionService.getAllTestCorrectionsForDialogSignature(this.testId, this.schoolId, correctorId)
      )
    }
    if ((fetchTestCorForValidation && this.testData?.group_test) || (this.testData?.group_test && this.testData?.class_id?.type_evaluation === 'score')) {
      queries.push(
        this.testCorrectionService.getAllGroupTestCorrectionsForDialogSignature(this.testId, this.schoolId)
      )
    }
    if (this.testData?.type === 'academic_recommendation') {
      // *************** Get all of the students id from the student list and add sanity check by filtering it with boolean function
      const studentIdList = this.filteredStudentList.map(student => student._id).filter(Boolean);
      queries.push(
        this.testCorrectionService.getAllTestCorrectionsForDialogSignature(this.testId, this.schoolId, undefined, studentIdList),
      );
    }
    if (!fetchTestCorForValidation && !this.testData?.group_test) {
      queries.push(
        of([])
      )
    }
    this.isWaitingForResponse = true;
    this.subs.sink = forkJoin(queries).pipe(
      take(1),
      tap(() => this.isWaitingForResponse = false),
    ).subscribe(
      ([individualCorrections, groupCorrections]) => {

        // *************** There is no argument to filter based on corrector in getallgrouptestcorrection, so need to filter in FE.
        // *************** After BE implement correctorID filter in getallgrouptestcorrection, update the query and remove these lines of codes.
        let groupCorrectionList : any[] = _.cloneDeep(groupCorrections);
        if (this.selectedCorrectorId && groupCorrectionList) {
          groupCorrectionList = groupCorrectionList.filter(groupCor => {
            if (this.selectedCorrectorId !== this.currentUser?._id) {
              return this.selectedCorrectorId === groupCor?.corrector?._id;
            } else {
              return !this.permissions.getPermission('Corrector') || this.currentUser?._id === groupCor?.corrector?._id;
            }
          });
        }

        let corrections = [].concat(
          Array.isArray(individualCorrections) ? individualCorrections : [],
          Array.isArray(groupCorrectionList) ? groupCorrectionList : [],
        )

       // ***************  Start of section of code is to filter out test correction that really displayed in test correction
       let testCorrectionIds = [];
       if (this.isGroup) {
         this.filteredGroupList.forEach(groupTestCor => {
           if (groupTestCor?.groupTestCorrectionId) {
             testCorrectionIds.push(groupTestCor?.groupTestCorrectionId);
           }
         });
       } else if (!this.isGroup) {
         this.filteredStudentList.forEach(studentTestCor => {
           if (studentTestCor?.testCorrectionId) {
             testCorrectionIds.push(studentTestCor?.testCorrectionId);
           }
         });
       }

       corrections = corrections.filter((correction) => {
         if (testCorrectionIds.includes(correction?._id)) {
           return correction;
         }
       });
       // ***************  End of section of code is to filter out test correction that really displayed in test correction

        let invalidReason: null | 'invalid-competence' | 'invalid-footer' = null;
        if (
          !this.competencyTabValidation() &&
          !(this.testData?.class_id?.type_evaluation === 'score') &&
          !(this.testData?.type === 'academic_recommendation') &&
          !(this.testData?.type === 'free_continuous_control' || this.testData?.controlled_test)
        ) {
          invalidReason = null;
        } else if (
          this.testData?.type !== 'free_continuous_control' &&
          !this.testData?.controlled_test &&
          !this.testCorrectionForm.get('missing_copy').value &&
          !(this.testData?.type === 'academic_recommendation') &&
          (!this.checkCurrentCompetenceValidity('SUBMIT_MARK_S1') || this.checkAnyInvalidSection())
        ) {
          invalidReason = 'invalid-competence';
        } else if (Array.isArray(corrections)) {
          // *************** Looping to check sections and only sections validity
          for (const correction of corrections) {
            if (invalidReason) {
              break;
            }

            let invalidCompetence = false;
            if (this.testData?.type === 'free_continuous_control' || this.testData?.controlled_test) {
              const total = correction?.correction_grid?.correction?.additional_total;
              if (typeof total !== 'number' || total < 0 || total > 20) {
                invalidReason = 'invalid-competence'
              }
            } else if (this.testData?.class_id?.type_evaluation === 'score') {
              if (correction?.correction_grid?.correction?.sections?.length) {
                invalidCompetence = this.checkAnyInvalidSection(correction.correction_grid.correction.sections);
              }

              if (
                !correction?._id ||
                correction?.missing_copy ||
                (this.testCorrectionId === correction._id && !invalidCompetence) ||
                correction?.is_do_not_participated
              ) {
                continue;
              }

              // *************** When is not free_continuous_control need to check inside the sections
              if (Array.isArray(correction?.correction_grid?.correction?.sections) && correction?.correction_grid?.correction?.sections?.length && this.testData?.type !== 'free_continuous_control') {
                for (const section of correction.correction_grid.correction.sections) {
                  if (section?.sub_sections?.length) {
                    for (const subSection of section?.sub_sections) {
                      if (invalidReason) {
                        break;
                      }

                      if (subSection?.rating === null || subSection?.rating === undefined || subSection?.rating === '') {
                        invalidReason = 'invalid-competence';
                      }

                      if (!invalidReason && this.testData?.correction_grid?.correction?.show_final_comment && !correction?.correction_grid?.correction?.final_comment) {
                        invalidReason = 'invalid-competence';
                      }

                      if (!invalidReason && this.testData?.correction_grid?.correction?.comment_for_each_section && !section?.comment) {
                        invalidReason = 'invalid-competence';
                      }

                      if (!invalidReason && this.testData?.correction_grid?.correction?.comment_for_each_sub_section && !subSection?.comments) {
                        invalidReason = 'invalid-competence';
                      }
                    }
                  }
                }
              } else if (this.testData?.type !== 'free_continuous_control' && !this.testData?.controlled_test) {
                // If the sections is empty and the type is not continuous control, then we know that the sections data is not valid (broken)
                // Hence, we put the invalid reason as invalid-competence
                invalidReason = 'invalid-competence';
              }
            } else if (this.testData?.class_id?.type_evaluation === 'expertise' && this.testData?.type === 'academic_recommendation') {
              /**
               *
               * Continue to the next test correction data if one of the following condition is met
               *
               * - No test correction identifier (broken data)
               * - Test correction is marked as missing copy
               * - The test correction data is the one currently opened individual test correction and it is already valid
               * - The student do not participate in the evaluation
               */
              if (
                !correction?._id ||
                correction?.missing_copy ||
                (this.testCorrectionId === correction._id && !invalidCompetence && !this.isGroup) ||
                correction?.is_do_not_participated
              ) {
                continue;
              }

              // ************** A sanity check to make sure the `sections` is an array.
              // ************** No need to check for its length since a loop of empty array is the same as doing nothing
              if (Array.isArray(correction?.correction_grid?.correction?.sections)) {
                for (const section of correction.correction_grid.correction.sections) {
                  // *************** If there is already a reason of the invalidity then no need to do further check
                  if (invalidReason) {
                    break;
                  }

                  // ************** A sanity check to make sure the `sub_sections` is an array.
                  // ************** No need to check for its length since a loop of empty array is the same as doing nothing
                  if (Array.isArray(section?.sub_sections)) {

                    // *************** Check each criteria inside competence to make sure the comments are already inputted
                    for (const subSection of section?.sub_sections) {
                      // *************** If there is already a reason of the invalidity then no need to do further check
                      if (invalidReason) {
                        break;
                      }

                      // ************** Test with type of academic recommendation only requires the comment per criteria (sub section) to be inputted
                      // ************** If there is no comment yet, then we put the reason of invalidity with 'invalid-competence'
                      if (!subSection?.comments) {
                        invalidReason = 'invalid-competence';
                      }
                    }
                  }

                }
              }
            } else {
              if (this.showComptentyTab && this.getSectionEvalskillForm()?.value?.length) {
                invalidCompetence = this.getSectionEvalskillForm()?.value?.find(section => section?.competence_status !== 'completed') ? true : false
              }

              /**
               *
               * Continue to the next test correction data if one of the following condition is met
               *
               * - No test correction identifier (broken data)
               * - Test correction is marked as missing copy
               * - The test correction data is the one currently opened individual test correction and it is already valid
               * - The student do not participate in the evaluation
               */
              if (
                !correction?._id ||
                correction?.missing_copy ||
                (this.testCorrectionId === correction._id && !invalidCompetence && !this.isGroup) ||
                correction?.is_do_not_participated
              ) {
                continue;
              }

              // ************** A sanity check to make sure the `sections_evalskill` is an array.
              // ************** No need to check for its length since a loop of empty array is the same as doing nothing
              if (Array.isArray(correction?.correction_grid?.correction?.sections_evalskill)) {
                for (const section of correction.correction_grid.correction.sections_evalskill) {
                  // *************** If there is already a reason of the invalidity then no need to do further check
                  if (invalidReason) {
                    break;
                  }

                  // *************** Skip check if the section is not selected
                  if (!section?.is_selected) {
                    continue;
                  }

                  // *************** This will trigger SUBMIT_MARK_S1 eventually
                  if (section?.competence_status !== 'completed') {
                    invalidReason = 'invalid-competence';
                  }
                }
              }
            }
          }

          // *************** Looping to check footer and only footer validity
          for (const correction of corrections) {
            if (invalidReason) {
              break;
            }

            if (!this.checkFooterValidity()) {
              invalidReason = 'invalid-footer';
              break;
            }

            if (
              !correction?._id ||
              this.testCorrectionId === correction._id ||
              correction?.is_do_not_participated
            ) {
              continue;
            }

            if (Array.isArray(correction?.correction_grid?.footer?.fields)) {
              const invalidFooter = correction.correction_grid.footer.fields.find((field: any) =>
                (field?.type === 'corretername' && !field?.value?.correcter_name) ||
                (field?.type === 'text' && !field?.value?.text) ||
                (field?.type === 'signature' && !field?.value?.signature)
              );
              if (invalidFooter) {
                invalidReason = 'invalid-footer';
              }
            }
          }
        }

        if (invalidReason === 'invalid-competence') {
          Swal.fire({
            type: 'warning',
            title: this.translate.instant('SUBMIT_MARK_S1.TITLE'),
            html: this.translate.instant('SUBMIT_MARK_S1.TEXT'),
            footer: `<span style="margin-left: auto">SUBMIT_MARK_S1</span>`,
            confirmButtonText: this.translate.instant('SUBMIT_MARK_S1.BUTTON_1'),
            allowEscapeKey: true,
            showCancelButton: false,
            allowOutsideClick: false,
            allowEnterKey: false,
          }).then(() => {
            this.clickSubmitCorrection = true;
            this.testCorrectionForm.markAllAsTouched();
            this.checkInvalid()
          });
        } else if (invalidReason === 'invalid-footer') {
          this.openDialogCorrectorSignature('submit');
        } else if (this.testData?.type === 'academic_pro_evaluation' || this.testData?.type === 'soft_skill_pro_evaluation') {
          this.mutateSubmitTestCorrectionMentor();
        } else if (this.testData?.type !== 'academic_pro_evaluation' && this.testData?.type !== 'soft_skill_pro_evaluation') {
          this.mutateSubmitTestCorrection();
        }
      },
      (error) => {
        const msg = String(error?.message)
        Swal.fire({
          type: 'error',
          title: this.translate.instant('Sorry'),
          html: this.translate.instant(msg),
          confirmButtonText: this.translate.instant('OK'),
        });
      },
    )
  }

  openDialogCorrectorSignature(nextAction: 'submit' | 'validate') {
    const footers = this.testCorrectionForm?.get('correction_grid')?.get('footer')?.get('fields')?.value
    const correctorName = (Array.isArray(footers) ? footers : []).find(footer => footer.type === 'correctername' || (footer.type === 'text' && (footer?.label?.includes('correcteur') || footer?.label?.includes('corrector'))))?.value
    const signature = (Array.isArray(footers) ? footers : []).find(footer => footer.type === 'signature')?.value

    this.subs.sink = this.dialog.open(SignatureCorrectorDialogComponent, {
      autoFocus: false,
      panelClass: 'certification-rule-pop-up',
      disableClose: true,
      maxWidth: '730px',
      data: {
        testId: this.testId,
        schoolId: this.schoolId || this.testCorrectionForm?.get('school_id')?.value,
        correctorId: this.selectedCorrector?.corrector_id?._id ? this.selectedCorrector?.corrector_id?._id : null,
        correctorName,
        signature,
        testCorrectionId : this.testCorrectionId
      }
    }).afterClosed().pipe(take(1)).subscribe((result) => {
      if (result) {
        this.clickSubmitCorrection = true;
        if(footers?.length && result){
          const correctorIndex = footers.findIndex(footer => footer.type === 'correctername' || (footer.type === 'text' && (footer?.label?.includes('correcteur') || footer?.label?.includes('corrector'))))
          const signatureIndex = footers.findIndex(footer => footer.type === 'signature')
          if(correctorIndex>=0){
            this.getFooterFieldsFormArray()?.at(correctorIndex)?.get('value')?.patchValue(result?.correctorValue)
          }
          if(signatureIndex>=0){
            this.getFooterFieldsFormArray()?.at(signatureIndex)?.get('value')?.patchValue(result?.signatureValue)
          }
        }
        if (nextAction === 'submit') {
          this.submitTestCorrection();
        } else if (nextAction === 'validate') {
          this.decideSaveOrValidateTestCorrection()
        }
      }
    })
  }

  getMarkEntryHelp() {
    this.tutorialService.setTutorialView(this.tutorialData);
    if (this.coreService.sidenavOpen) {
      this.coreService.sidenavOpen = !this.coreService.sidenavOpen;
    }
    this.coreService.sidenavTutorialOpen = true;
    this.coreService.toggle('');
  }

  getInAppTutorial() {
    const type =
      this.taskData?.type === 'calendar_step'
        ? this.taskData?.description
        : this.taskData?.type === 'admtc_correction'
        ? 'ADMTC Correction'
        : this.taskData?.type === 'certifier_marks_entry'
        ? 'Certifier Mark Entry'
        : this.taskData?.type === 'certifier_validation'
        ? 'Certifier Validation'
        : this.taskData?.type;
    this.currentUser = this.authService.getCurrentUser();
    this.isPermission = this.authService.getPermission();
    if (this.currentUser?._id && this.isPermission?.length > 0) {
      this.subs.sink = this.tutorialService.getOneUser(this.currentUser._id).subscribe((resp) => {
        const currentEntity = _.cloneDeep(resp);
        const currentUserEntity = currentEntity.entities.find((resps) => resps.type.name === this.isPermission[0]);
        if (currentUserEntity) {
          this.subs.sink = this.tutorialService.GetAllInAppTutorialsByModule(type, currentUserEntity?.type?.name).subscribe(
            (list) => {
              if (list && list.length) {
                this.dataTutorial = list;
                const tutorialData = this.dataTutorial.find((tutorial) => {
                  return tutorial.is_published === true && tutorial.module === type;
                });
                this.tutorialData = tutorialData;
                if (this.tutorialData) {
                  this.isTutorialAdded = true;
                } else {
                  this.isTutorialAdded = false;
                }
              }
            },
            (err) => {
              if (err && err['message'] && err['message'].includes('Network error: Http failure response for')) {
                Swal.fire({
                  type: 'warning',
                  title: this.translate.instant('BAD_CONNECTION.Title'),
                  html: this.translate.instant('BAD_CONNECTION.Text'),
                  confirmButtonText: this.translate.instant('BAD_CONNECTION.Button'),
                  allowOutsideClick: false,
                  allowEnterKey: false,
                  allowEscapeKey: false,
                  footer: `<span style="margin-left: auto">BAD_CONNECTION</span>`,
                });
              } else {
                Swal.fire({
                  type: 'info',
                  title: this.translate.instant('SORRY'),
                  text: err && err['message'] ? this.translate.instant(err['message'].replaceAll('GraphQL error: ', '')) : err,
                  confirmButtonText: this.translate.instant('DISCONNECT_SCHOOL.BUTTON3'),
                });
              }
            },
          );
        }
      });
    }
  }

  getCurrentTab() {
    this.tempCurrentSectionTabForm = this.getSectionEvalskillForm()?.at?.(this.selectedCompetenceIndex)?.value
    if(this.tempCurrentSectionTabForm?.competence_status === 'draft'){
      this.getSectionEvalskillForm()?.at?.(this.selectedCompetenceIndex)?.markAllAsTouched();
    }
  }

  checkUnsavedSection(tab: MatTab, tabHeader: MatTabHeader, idx: number){
    this.nextCompetenceIndex = null
    if (!this.currentCompetencyComparison()) {
      Swal.fire({
        type: 'warning',
        title: this.translate.instant('TMTC_S01.TITLE'),
        text: this.translate.instant('TMTC_S01.TEXT'),
        footer: `<span style="margin-left: auto">TMTC_S01</span>`,
        confirmButtonText: this.translate.instant('TMTC_S01.BUTTON_1'),
        showCancelButton: true,
        cancelButtonText: this.translate.instant('TMTC_S01.BUTTON_2'),
        allowEscapeKey: false,
        allowOutsideClick: false,
      }).then((result) => {
        if (result?.value) {
          this.nextCompetenceIndex = idx
          this.swalSubmitMarksEntryUnsaved();
        } else {
          this.getSectionEvalskillForm()?.at?.(this.selectedCompetenceIndex).patchValue(this.tempCurrentSectionTabForm);
          this.getCorrectionForm().get('additional_total').setValue(this.firstForm.correction_grid.correction.additional_total);
          this.getCorrectionForm().get('total').setValue(this.firstForm.correction_grid.correction.total);
          if (this.tempCurrentSectionTabForm?.competence_status === 'not_started' && !this.clickSubmitCorrection) {
            this.getSectionEvalskillForm()?.at?.(this.selectedCompetenceIndex)?.markAsUntouched();
          }
          return true && MatTabGroup.prototype._handleClick.apply(this.competenceMatGroup, [tab, tabHeader, idx]);
        }
      });
    } else {
      if (this.tempCurrentSectionTabForm?.competence_status === 'not_started' && !this.clickSubmitCorrection) {
        this.getSectionEvalskillForm()?.at?.(this.selectedCompetenceIndex)?.markAsUntouched();
      }
      return true && MatTabGroup.prototype._handleClick.apply(this.competenceMatGroup, [tab, tabHeader, idx]);
    }
  }


  /**
   * Function to save the test correction if the user choose to save in swal TMTC_S01
   * @param $event - Optional, contains the actual emitted data and the source of the emission, can be from student list, group list, and student list in group list.
   */
  swalSubmitMarksEntryUnsaved(
    $event?: {
      data: any
      source: 'student' | 'group'
    }
  ) {
    if ($event?.source === 'group') {
      this.nextGroup = $event?.data || null;
    } else if ($event?.source === 'student') {
      this.nextStudent = $event?.data || null;
    }
    if(this.isGroup){
      this.saveGroupTestCorrection('SUBMIT_MARK_S2');
    } else {
      this.saveTestCorrection('SUBMIT_MARK_S2');
    };
  }

  ngAfterViewChecked(): void {
    if (this.competenceMatGroup) {
      this.competenceMatGroup._handleClick = this.checkUnsavedSection.bind(this);
    }
  }

  openImportTemplate(type) {
    const inputOptions = {
      comma: this.translate.instant('IMPORT_FILE_S1.COMMA'),
      semicolon: this.translate.instant('IMPORT_FILE_S1.SEMICOLON')
    };
    Swal.fire({
      type: 'question',
      allowOutsideClick: false,
      title: this.translate.instant('IMPORT_FILE_S1.TITLE'),
      allowEscapeKey: true,
      confirmButtonText: this.translate.instant('IMPORT_FILE_S1.OK'),
      input: 'radio',
      inputOptions: inputOptions,
      showCancelButton: true,
      cancelButtonText: this.translate.instant('DASHBOARD_DELETE.Cancel'),
      cancelButtonColor: '#f44336',
      footer: `<span style="margin-left: auto">IMPORT_FILE_S1</span>`,
      inputValue: this.translate && this.translate.currentLang === 'fr' ? ';' : '',
      inputValidator: (value) => {
        return new Promise((resolve, reject) => {
          if (value) {
            resolve('');
          } else {
            reject(this.translate.instant('IMPORT_FILE_S1.INVALID'));
          }
        });
      },
      onOpen: () => {
        const confirmButtonRef = Swal.getConfirmButton();
        confirmButtonRef.setAttribute('disabled', 'true');
        const inputs = Swal.getContent().querySelectorAll('input[name=swal2-radio][type=radio]')
        inputs.forEach(input => {
          input.addEventListener('change', $event => {
            confirmButtonRef.removeAttribute('disabled');
          });
        });
      },
    }).then((separator) => {
      if (separator.value && type === 'template') {
        this.downloadCSVTemplate(separator?.value);
      }

      if (separator.value && type === 'import') {
        this.openImportMarkDialog(separator?.value);
      }
    });
  }

  downloadCSVTemplate(fileType) {
    let dataImport;
    let url = environment.apiUrl;
    url = url.replace('graphql', '');
    const element = document.createElement('a');
    const lang = this.translate.currentLang.toLowerCase();
    const importMarkEntryTemplate = 'downloadMarkEntryTemplate';

    if(this.testData?.group_test){
      const testGroupData = _.cloneDeep(this.filteredGroupList);
      dataImport = testGroupData?.map((test) => { return test?.groupTestCorrectionId});
      dataImport = JSON.stringify(dataImport);
    } else {
      const testData = _.cloneDeep(this.filteredStudentList);
      dataImport = testData?.map((test) => { return test?.testCorrectionId });
      dataImport = JSON.stringify(dataImport);
    }

    const fullURL = url + importMarkEntryTemplate + '/' + lang + '/' + fileType + '/' + this.testId + '/' + this.schoolId + '/' + this.testData?.group_test + '/' + dataImport;

    element.href = fullURL;
    element.target = '_blank';
    element.download = 'Template Import CSV';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }

  openImportMarkDialog(fileType) {
    this.dialog
      .open(ImportMarkDialogComponent, {
        width: '500px',
        minHeight: '200px',
        panelClass: 'certification-rule-pop-up',
        disableClose: true,
        data: {
          testId: this.testId,
          delimeter: fileType,
          schoolId: this.schoolId,
          isGroup: this.testData.group_test,
          correctorId: this.selectedCorrectorId
        }
      })
      .afterClosed()
      .subscribe((resp) => {
        if (resp) {
          window.location.reload();
        }
    });
  }

  competencyTabValidation(){
    if(
      (this.testData?.block_type === 'competence' ||
      this.testData?.block_type === 'soft_skill' ) &&
      (this.testData?.type !== 'free_continuous_control' && !this.testData?.controlled_test) &&
      this.testData?.type !== 'memoire_oral_non_jury' &&
      this.testData?.type !== 'memoire_oral' &&
      this.testData?.type !== 'academic_recommendation' &&
      this.testData?.type !== 'academic_auto_evaluation' &&
      this.testData?.type !== 'academic_pro_evaluation' &&
      this.testData?.type !== 'soft_skill_auto_evaluation' &&
      this.testData?.type !== 'soft_skill_pro_evaluation' &&
      this.testData?.date_type !== 'multiple_date'
    ) {
      return true;
    } else {
      return false;
    }
  }


  /**
   * Validates the type and date type of the test data for import operations.
   *
   * @returns {boolean} - Returns true if the test data type is not one of the specified invalid types
   * and the date type is not 'multiple_date', otherwise returns false.
   *
   * This function checks if the type of `testData` does not match any of the specified types
   * ('memoire_oral_non_jury', 'memoire_oral', 'academic_recommendation', 'academic_auto_evaluation',
   * 'academic_pro_evaluation', 'soft_skill_auto_evaluation', 'soft_skill_pro_evaluation') and if the
   * date type is not 'multiple_date'. If these conditions are met, it returns true indicating that
   * the test data is valid for import; otherwise, it returns false.
   */
  importFunctionValidation() {
    if (
      this.testData?.type !== 'memoire_oral_non_jury' &&
      this.testData?.type !== 'memoire_oral' &&
      this.testData?.type !== 'academic_recommendation' &&
      this.testData?.type !== 'academic_auto_evaluation' &&
      this.testData?.type !== 'academic_pro_evaluation' &&
      this.testData?.type !== 'soft_skill_auto_evaluation' &&
      this.testData?.type !== 'soft_skill_pro_evaluation' &&
      this.testData?.date_type !== 'multiple_date'
    ) {
      return true;
    } else {
      return false;
    }
  }


  checkPermissionSubmitTest() {
    let userData = this.currentUserData?.filter(
      (respUser) =>
        respUser?.assigned_rncp_title?._id === this.titleId &&
        respUser?.school?._id === this.taskData?.school?._id &&
        respUser?.class?._id === this.taskData?.class_id?._id,
    );
    if (this.taskData?.task_status === 'done') {
      if (userData?.some((resp) => resp?.type?._id === '5a2e1ecd53b95d22c82f9554')) {
        this.isCannotBeEdited = false;
      } else if(userData?.some((resp) => resp?.type?._id === '5a2e1ecd53b95d22c82f9559')) {
        this.isCannotBeEdited = true;
      } else {
        this.isCannotBeEdited = false;
      }
    } else {
      this.isCannotBeEdited = false;
    }
  }

  getCurrentUser(){
    this.isWaitingForResponse = true;
    this.subs.sink = this.authService.getUserById(this.currentUser?._id).subscribe((resp) => {
      this.isWaitingForResponse = false;
      if(resp){
        this.currentUserData = resp?.entities;
        this.checkPermissionSubmitTest();
      }
    },
    (err) => {
      this.isWaitingForResponse = false;
      Swal.fire({
        type: 'error',
        title: 'Error !',
        text: err && err['message'] ? err['message'] : err,
        confirmButtonText: 'OK',
      });
    });
  }

  sendUserActivity(origin: string, dataDescription?: any) {
    const activities: any[] = [
      {
        originButton: 'click_on_button_save',
        action: 'USER_ACTIVITY.Corrector save the score from Mark Entry page',
        type_of_activity: 'specific_action',
        data_description: dataDescription
      },
      {
        originButton: 'click_on_button_validate',
        action: 'USER_ACTIVITY.Validate the score from Mark Entry page',
        type_of_activity: 'specific_action',
        data_description: dataDescription
      },
      {
        originButton: 'click_on_button_submit',
        action: 'USER_ACTIVITY.Corrector submit the score from Mark Entry page',
        type_of_activity: 'specific_action',
        data_description: dataDescription
      },
    ];

    const payload = this.userActivity.generatePayloadActivity(origin, activities, []);
    this.subs.sink = this.userActivity.createUserActivity(payload).subscribe();
  }

  // *************** Handle go to next group when save as draft clicked in group test correction
  handleRedirectToNextGroup(resp) {
    let result = _.findIndex(this.filteredGroupList, (groupFromList) => groupFromList.groupTestCorrectionId === resp?._id);
    if (result >= 0) {
      if (result < this.filteredGroupList?.length - 1) {
        result += 1;
        this.groupSelected(this.filteredGroupList[result], false, false)
      } else {
        this.groupSelected(this.filteredGroupList[result], false, false)
      }
    }
  }

  // *************** Function for removing dynamic validator required in rating inside section and sub section for free continous control test type
  removeValidationSectionAndSubSectionForFreeContinousControl() {
    const sections: TestCorrectionCorrectionGridCorrectionSectionInput[] = this.getSectionForm().value;
    sections.forEach((section, sectionIndex) => {
        this.getSectionForm().at(sectionIndex).get('rating').clearValidators();
        this.getSectionForm().at(sectionIndex).get('rating').updateValueAndValidity();
      if (section.sub_sections && section.sub_sections.length) {
        section.sub_sections.forEach((subSection, subSectionIndex) => {
            this.getSubSectionForm(sectionIndex).at(subSectionIndex).get('rating').clearValidators();
            this.getSubSectionForm(sectionIndex).at(subSectionIndex).get('rating').updateValueAndValidity();
        });
      }
    });
  }
}

type TCompetenceStatuses = 'not_started' | 'draft' | 'completed'
