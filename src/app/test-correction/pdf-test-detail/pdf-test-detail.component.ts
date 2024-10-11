// *************** Angular Imports ***************
import { DatePipe, NgClass, NgForOf, NgIf, NgStyle } from "@angular/common";
import { Component, ElementRef, Input, OnChanges, SimpleChanges, ViewChild } from "@angular/core";

// *************** Third-Party Library Imports ***************
import { TranslateModule, TranslateService } from "@ngx-translate/core";
import { cloneDeep } from 'lodash';
import { take } from "rxjs/operators";
import { SubSink } from "subsink";

// *************** Application Services Imports ***************
import { TestCreationService } from "app/service/test/test-creation.service";
import { TranscriptBuilderService } from "app/service/transcript-builder/transcript-builder.service";

// *************** Application Modules & Component Imports ***************
import { SharedModule } from "app/shared/shared.module";
import { environment } from "environments/environment";

// *************** Application Models and Settings Imports ***************
import { TestCreationDocInput, TestCreationPayloadData } from "app/test/test-creation/test-creation.model";
import { PRINTSTYLES } from "assets/scss/theme/doc-style";

// *************** Utilities and Pipes Imports ***************
import { ParseUtcToLocalPipe } from "app/shared/pipes/parse-utc-to-local.pipe";


@Component({
  selector: 'ms-pdf-test-detail',
  templateUrl: './pdf-test-detail.component.html',
  standalone: true,
  imports: [NgIf, NgForOf, NgStyle, NgClass, TranslateModule, SharedModule],
  providers: [ParseUtcToLocalPipe],
})
export class PdfTestDetailComponent implements OnChanges {
  // *************** Decorator Variables ***************
  @Input('testData') inputTestData: TestCreationPayloadData;
  @Input('titleData') rncpTitle: any;
  @Input('schoolData') schoolData: any;
  @ViewChild('pagesElement') documentPagesRef: ElementRef<HTMLDivElement>;

// *************** Private Variables ***************
  private subs = new SubSink();

// *************** Misc Variables ***************
  addedDocuments: TestCreationDocInput[] = [];
  datePipe: DatePipe;
  docFooterText: string = '';
  pageSectionsArray: any[] = [[]];
  pages: number = 0;
  students: number[] = [];
  test: TestCreationPayloadData = null;

  constructor(
    private parseUtcToLocalPipe: ParseUtcToLocalPipe,
    private testCreationService: TestCreationService,
    private transcriptBuilderService: TranscriptBuilderService,
    private translate: TranslateService,
  ) {}

  /**
   * Lifecycle hook called when one or more input properties change.
   * Initializes test creation data if it's the first change for specified inputs.
   * @param changes Object containing changes to input properties.
   */
  ngOnChanges(changes: SimpleChanges): void {
    // *************** Check if it's the first change for inputTestData, rncpTitle, and schoolData, and inputTestData has a valid _id
    if (
      changes['inputTestData']?.firstChange &&
      changes['rncpTitle']?.firstChange &&
      changes['schoolData']?.firstChange &&
      this.inputTestData?._id
    ) {
      // *************** Fetch test creation data from the service based on inputTestData and schoolData _id
      this.subs.sink = this.testCreationService
        .getTestCreationData(this.inputTestData._id, this.schoolData._id)
        .pipe(take(1))
        .subscribe(response => {
          // *************** Format and initialize test data from the response
          this.test = this.formatInitializationTestData(cloneDeep(response));
          // *************** Render data after initialization
          this.renderData();
        });
    }
  }
  /**
   * Renders data for the test document including footer text, page sections, and student details.
   * Handles specific rendering logic based on test type and correction grid configuration.
   */
  renderData() {
    const date = new Date();
    // *************** Constructing document footer text
    this.docFooterText =
      'ADMTC – ' +
      this.translate.instant('TEST.EVALUATIONGRID') +
      ' ' +
      (this.test && this.test.name ? this.test.name : '') +
      ' – ' +
      this.rncpTitle.short_name +
      ' – ' +
      date.getFullYear() +
      ' / ' +
      (date.getFullYear() + 1);

    // *************** Set default orientation if not defined
    if (this.test && !this.test?.correction_grid?.orientation) {
      this.test.correction_grid.orientation = 'portrait';
    }

    // *************** Determine sections based on test type
    let sections: any = this.test?.correction_grid?.correction?.sections;
    if (this.test?.block_type === 'competence' || this.test?.block_type === 'soft_skill') {
      sections = this.test?.correction_grid?.correction?.sections_evalskill;
    }

    // *************** Organize sections into pages based on page break markers
    this.pageSectionsArray = [[]];
    let pageArrayIndex = 0;
    for (let i = 0; i <= sections?.length - 1; i++) {
      const section = sections?.[i];
      if (this.pageSectionsArray?.[pageArrayIndex]) {
        this.pageSectionsArray[pageArrayIndex].push(section);
      } else {
        this.pageSectionsArray.push([section]);
      }
      if (section?.page_break && i !== sections?.length - 1) {
        pageArrayIndex = pageArrayIndex + 1;
        this.pageSectionsArray.push([]);
      }
    }

    // *************** Calculate total pages and retrieve associated documents
    this.pages = this.pageSectionsArray.length;
    this.addedDocuments = this.test?.documents;

    // *************** Prepare student details array based on group size from correction grid
    this.students =
      this.test?.correction_grid?.group_detail && this.test?.correction_grid?.group_detail?.no_of_student
        ? Array(this.test.correction_grid.group_detail.no_of_student)
        : [];
  }

  /**
   * Downloads a PDF document based on the content rendered on the screen.
   * Optionally includes identity information if specified.
   * @param isWithIdentity Whether to include identity information in the PDF.
   */
  downloadPDF(isWithIdentity: boolean) {
    const target = this.documentPagesRef?.nativeElement?.children;
    const outer = document.createElement('div');
    outer.innerHTML = '';
    let html = PRINTSTYLES;

    // *************** Build HTML content from document pages
    html += `<div class="ql-editor document-parent"><div>`;
    for (let idx = 0; idx < target?.length; idx++) {
      const element = target.item(idx);
      const wrap = document.createElement('div');
      const el = element.cloneNode(true) as HTMLDivElement;
      el.style.display = 'block';
      wrap.appendChild(el);
      html += wrap.innerHTML;
    }
    html += `</div></div>`;

    // *************** Optionally add identity information to the PDF
    if (isWithIdentity) {
      html += this.getLastPage();
    }

    // *************** Generate PDF using the transcript builder service
    const filename = this.rncpTitle?.short_name + '_' + this.test?.name;
    const landscape = this.test?.correction_grid?.orientation === 'landscape';
    this.transcriptBuilderService.generatePdf(html, filename, landscape).subscribe((res: any) => {
      // *************** Create a link element to download the generated PDF
      const element = document.createElement('a');
      element.href = environment.PDF_SERVER_URL + res?.filePath;
      element.target = '_blank';
      element.setAttribute('download', res?.filename);
      element.click();
    });
  }

  /**
   * Constructs and returns the HTML content for the last page of the document.
   * Includes details such as test identity, test details, calendar steps, documents, and expected documents.
   * Utilizes translations for text content where applicable.
   * @returns HTML content formatted as a string for the last page of the document.
   */
  getLastPage(): string {
    let testDetails =
      `<div style="font-size: 14px; padding: 1rem; page-break-before: always;">` +
      `<h2>` +
      this.translate.instant('TEST.IDENTITY') +
      `</h2>` +
      `<p>` +
      this.translate.instant('TEST.TESTNAME') +
      ` : ` +
      this.test.name +
      `</p>` +
      `<p>` +
      this.translate.instant('TEST.TESTTYPE') +
      ` : ` +
      this.translate.instant('PARAMETERS-RNCP.TEST.TYPE.' + this.test?.type) +
      `</p>` +
      `<p>` +
      this.translate.instant('TEST.TESTDATE') +
      ` : ` +
      this.getTranslatedDate(this.test?.date) +
      `</p>` +
      `<p>` +
      this.translate.instant('TEST.DATETYPE') +
      ` : ` +
      this.translate.instant('TEST.DATETYPES.' + this.test?.date_type?.toUpperCase()) +
      `</p>` +
      `<p>` +
      `${this.test?.coefficient ? `${this.translate.instant('TEST.COEFFICIENT')} : ${this.test?.coefficient}` : ''}` +
      `</p>` +
      `<p>` +
      this.translate.instant('TEST.CORRECTIONTYPE') +
      ` : ` +
      this.translate.instant('TEST.CORRECTIONTYPES.' + this.test?.correction_type) +
      `</p>` +
      `<h2>` +
      this.translate.instant('TEST.CALENDERSTEPS') +
      `</h2>`;

    // *************** Append calendar steps details if available
    if (this.test?.calendar?.steps?.length > 0) {
      for (let i = 0; i < this.test.calendar.steps.length; i++) {
        let dateString = '';
        if (this.test?.calendar?.steps?.[i]?.date?.type === 'fixed') {
          dateString = this.getTranslatedDateDocument(this.test.calendar.steps[i].date?.['value']);
        } else {
          dateString =
            this.translate.instant(this.test?.calendar?.steps?.[i]?.date?.['before'] ? 'BEFORE' : 'AFTER') +
            ' ' +
            this.test?.calendar?.steps?.[i]?.date?.['day'] +
            ' ' +
            this.translate.instant('DAYS');
        }
        testDetails += `<p>` + (i + 1) + '.  ' + this.getTranslateWhat(this.test?.calendar?.steps?.[i]?.text) + ' : ' + dateString + `</p>`;
      }
    } else {
      testDetails += `<p>` + this.translate.instant('TEST.NOSTEPS') + `</p>`;
    }

    testDetails += `<h2>` + this.translate.instant('DOCUMENT.DOCUMENTS') + `</h2>`;

    // *************** Append documents details if available
    if (this.test?.documents?.length && typeof this.test?.documents?.[0] === 'object') {
      for (let i = 0; i < this.test.documents.length; i++) {
        let dateString = '';
        if (this.test?.documents?.[i]?.publication_date?.type === 'fixed') {
          dateString = this.getTranslatedDateDocument(this.test?.documents?.[i]?.publication_date?.['publication_date']);
        } else {
          dateString =
            this.translate.instant(this.test?.documents?.[i]?.publication_date?.['before'] ? 'BEFORE' : 'AFTER') +
            ' ' +
            this.test?.documents?.[i]?.publication_date?.['days'] +
            ' ' +
            this.translate.instant('DAYS');
        }
        testDetails +=
          `<p>` +
          (i + 1) +
          '.  ' +
          this.test?.documents?.[i]?.document_name +
          ' : ' +
          this.translate.instant('DOCUMENTTYPES.' + this.test?.documents?.[i]?.type_of_document?.toUpperCase()) +
          ' : ' +
          dateString +
          `</p>`;
      }
    } else {
      testDetails += `<p>` + this.translate.instant('DOCUMENT.NODOCUMENTS') + `</p>`;
    }

    testDetails += `<h2>` + this.translate.instant('TEST.DOCUMENTSEXPECTED') + `</h2>`;

    // *************** Append expected documents details if available
    if (this.test?.expected_documents?.length > 0) {
      for (let i = 0; i < this.test?.expected_documents?.length; i++) {
        let dateString = '';
        if (this.test?.expected_documents?.[i]?.deadline_date?.type === 'fixed') {
          dateString = this.getTranslatedDateDocument(this.test?.expected_documents?.[i]?.deadline_date?.['deadline']);
        } else {
          dateString =
            this.translate.instant(this.test?.expected_documents?.[i]?.deadline_date?.['before'] ? 'BEFORE' : 'AFTER') +
            ' ' +
            this.test?.expected_documents?.[i]?.deadline_date?.['day'] +
            ' ' +
            this.translate.instant('DAYS');
        }
        testDetails += `<p>` + (i + 1) + '.  ' + this.test?.expected_documents?.[i]?.document_name + ' : ' + dateString + `</p>`;
      }
    } else {
      testDetails += `<p>` + this.translate.instant('EXPECTEDDOCUMENT.NODOCUMENTS') + `</p>`;
    }
    testDetails += `</div>`;
    return testDetails;
  }

  /**
   * Retrieves translated text based on the provided name for automatic tasks related to tests.
   * @param name The name of the automatic task to translate.
   * @returns Translated text for the specified automatic task, or an empty string if `name` is falsy.
   */
  getTranslateWhat(name: string): string {
    if (name) {
      const value = this.translate.instant('TEST.AUTOTASK.' + name.toUpperCase());
      return value !== 'TEST.AUTOTASK.' + name.toUpperCase() ? value : name;
    } else {
      return '';
    }
  }
  /**
   * Transforms and returns a localized date string from UTC or object format.
   * @param dateRaw The raw date input, either as an object or string.
   * @returns The formatted date string in 'EEE d MMM, y' format.
   */
  getTranslatedDate(dateRaw) {
    if (dateRaw?.date_utc && dateRaw?.time_utc) {
      return this.parseUtcToLocalPipe.transformDate(dateRaw.date_utc, dateRaw.time_utc);
    } else if (typeof dateRaw === 'object') {
      const date = new Date(dateRaw.year, dateRaw.month, dateRaw.date, dateRaw.hour, dateRaw.minute);
      this.datePipe = new DatePipe(this.translate.currentLang);
      return this.datePipe.transform(date, 'EEE d MMM, y');
    } else {
      let date = dateRaw;
      if (typeof date === 'number') {
        date = date.toString();
      }
      if (date.length === 8) {
        const year: number = parseInt(date.substring(0, 4));
        const month: number = parseInt(date.substring(4, 6));
        const day: number = parseInt(date.substring(6, 8));
        date = new Date(year, month, day);
      }
      this.datePipe = new DatePipe(this.translate.currentLang);
      return this.datePipe.transform(date, 'EEE d MMM, y');
    }
  }

  /**
   * Transforms and returns a localized date string for document from UTC or object format.
   * @param dateRaw The raw date input, either as an object or string.
   * @returns The formatted date string in 'EEE d MMM, y' format.
   */
  getTranslatedDateDocument(dateRaw) {
    if (dateRaw?.date && dateRaw?.time) {
      return this.parseUtcToLocalPipe.transformDate(dateRaw.date, dateRaw.time);
    } else if (typeof dateRaw === 'object') {
      const date = new Date(dateRaw.year, dateRaw.month, dateRaw.date, dateRaw.hour, dateRaw.minute);
      this.datePipe = new DatePipe(this.translate.currentLang);
      return this.datePipe.transform(date, 'EEE d MMM, y');
    } else {
      let date = dateRaw;
      if (typeof date === 'number') {
        date = date.toString();
      }
      if (date.length === 8) {
        const year: number = +date.substring(0, 4);
        const month: number = +date.substring(4, 6);
        const day: number = +date.substring(6, 8);
        date = new Date(year, month, day);
      }
      this.datePipe = new DatePipe(this.translate.currentLang);
      return this.datePipe.transform(date, 'EEE d MMM, y');
    }
  }

  /**
   * Formats the initialization test data response to store necessary IDs and data for processing.
   * @param response The initial test data response to be formatted.
   * @returns The formatted test data response with stored IDs and data.
   */
  formatInitializationTestData(response) {
    if (response) {
      if (response.parent_rncp_title && response.parent_rncp_title._id) {
        response.parent_rncp_title = response.parent_rncp_title._id;
      }
      if (response.parent_category && response.parent_category._id) {
        response.parent_category = response.parent_category._id;
      }
      if (response.class_id && response.class_id._id) {
        response.class_id = response.class_id._id;
      }
      if (response.block_of_competence_condition_id && response.block_of_competence_condition_id._id) {
        response.block_of_competence_condition_id = response.block_of_competence_condition_id._id;
      }
      if (response.subject_id && response.subject_id._id) {
        response.subject_id = response.subject_id._id;
      }
      if (response.evaluation_id && response.evaluation_id._id) {
        response.evaluation_id = response.evaluation_id._id;
      }
      if (response.schools && response.schools.length) {
        response.schools.forEach(test_date => {
          if (test_date.school_id && test_date.school_id._id) {
            test_date.school_id = test_date.school_id._id;
          }
        });
      }
      if (response.documents && response.documents.length) {
        // *************** Store behavior subjects and clone added document data
        const tempAddedDocumentData = [];
        const tempDocumentsID = [];
        response.documents.forEach(addedDocument => {
          tempAddedDocumentData.push(cloneDeep(addedDocument));

          if (addedDocument && addedDocument._id) {
            tempDocumentsID.push(addedDocument._id);
          }
        });
        this.testCreationService.setAddedDocumentData(tempAddedDocumentData);
        response.documents = tempDocumentsID;
      }
      if (response.expected_documents && response.expected_documents.length) {
        response.expected_documents.forEach(expectedDocument => {
          if (expectedDocument.document_user_type && expectedDocument.document_user_type._id) {
            expectedDocument.document_user_type = expectedDocument.document_user_type._id;
          }
        });
      }
      // *************** Transform actor and sender IDs in calendar steps
      response.calendar.steps.forEach(task => {
        if (task.actor && task.actor._id) {
          task.actor = task.actor._id;
        }
        if (task.sender_type && task.sender_type._id) {
          task.sender_type = task.sender_type._id;
        }
        if (task.sender && task.sender._id) {
          task.senderData = task.sender;
          task.sender = task.senderData._id;
        }
      });
    }
    return response;
  }

  /**
   * Determines whether to show the bottom grid based on the index.
   * @param index The index to compare with `this.pages`.
   * @returns `true` if `this.pages` equals `index`, otherwise `false`.
   */
  showBottomGrid(index) {
    return this.pages === index;
  }

  /**
   * Returns a copy of `this.pageSectionsArray` excluding the first element.
   * @returns A copy of `this.pageSectionsArray` excluding the first element.
   */
  getArrayExceptFirst() {
    return this.pageSectionsArray.slice(1);
  }

  /**
   * Calculates and returns the width percentage for the title based on correction grid settings.
   * @returns The width percentage as a string ('30%', '35%', '40%', or '70%').
   */
  getTitleWidth() {
    const correction = this.test?.correction_grid?.correction;
    if (correction?.comment_for_each_sub_section) {
      if (correction?.show_direction_column) {
        if (correction?.show_letter_marks_column && correction?.show_number_marks_column) {
          return '30%';
        } else {
          return '35%';
        }
      } else {
        return '35%';
      }
    } else {
      if (correction?.show_direction_column) {
        if (correction?.show_letter_marks_column && correction?.show_number_marks_column) {
          return '35%';
        } else {
          return '40%';
        }
      } else {
        return '70%';
      }
    }
  }

  /**
   * Calculates and returns the maximum score based on test type or correction grid settings.
   * @returns The maximum score.
   */
  getMaxScore() {
    let maxScore = 0;
    if (this.test.type === 'free_continuous_control') {
      maxScore = 20;
    } else if (this.test.correction_grid.correction.display_section_coefficient) {
      maxScore = this.test.correction_grid.correction.section_coefficient.section_additional_max_score;
    } else {
      this.test.correction_grid.correction.sections.forEach((section) => {
        maxScore += section.maximum_rating;
      });
    }
    return maxScore;
  }

  /**
   * Returns the maximum custom score based on correction grid settings.
   * @returns The maximum custom score.
   */
  getMaxCustomScore() {
    return this.test.correction_grid.correction.total_zone.additional_max_score;
  }
}
