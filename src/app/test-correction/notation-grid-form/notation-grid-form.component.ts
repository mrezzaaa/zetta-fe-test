import { Component, OnInit, Input, ViewChild, OnDestroy } from '@angular/core';

import * as DecoupledEditor from 'assets/ckeditor5-custom/ckeditor.js'
import { UntypedFormGroup, Validators, UntypedFormBuilder, UntypedFormArray } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSelectChange } from '@angular/material/select';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Observable } from 'apollo-link';
import { SubSink } from 'subsink';
import {
  TestCorrectionCorrectionGridCorrectionSectionInput,
  TestCorrectionCorrectionGridCorrectionSubSectionInput,
  TestCorrectionCorrectionGridCorrectionPenaltyBonusInput,
} from '../test-correction.model';
import { Correction, TestCreationRespData, ScoreConversion } from 'app/test/test-creation/test-creation.model';
import { CdkTextareaAutosize } from '@angular/cdk/text-field';
import { SpeechToTextDialogComponent } from 'app/shared/components/speech-to-text-dialog/speech-to-text-dialog.component';
import { Cacheable } from 'ngx-cacheable';
import { of } from 'rxjs';
import { TestUtilityService } from 'app/service/test/test-utility.service';

@Component({
  selector: 'ms-notation-grid-form',
  templateUrl: './notation-grid-form.component.html',
  styleUrls: ['./notation-grid-form.component.scss'],
})
export class NotationGridFormComponent implements OnInit, OnDestroy {
  private testDataDecimalDigits = 0;
  private subs = new SubSink();
  @ViewChild('autosize', { static: false }) autosize: CdkTextareaAutosize;
  @Input() testCorrectionForm: UntypedFormGroup;
  @Input() testData: TestCreationRespData;

  // table variables
  @ViewChild(MatPaginator, { static: true }) paginator: MatPaginator;
  @ViewChild(MatSort, { static: true }) sort: MatSort;
  dataSource = new MatTableDataSource([]);
  displayedColumns: string[] = [];
  filterColumns: string[] = [];

  // CKEditor Config
  Editor = DecoupledEditor;
  config = {
    toolbar: ['bold', 'italic', 'Underline'],
  };

  // utility variable
  isWaitingForResponse = false;
  correctionData: Correction;
  maximumFinalMark: number;
  myInnerHeight = 960;
  myInnerWidth = 730;
  sectionWidth: any;
  directiveWidth: any;
  markScoreWidth: any;
  markLetterWidth: any;
  markPharseWidth: any;
  commentWidth: any;

  onReady(editor) {

    editor.ui.getEditableElement().parentElement.insertBefore(editor.ui.view.toolbar.element, editor.ui.getEditableElement());
  }

  constructor(private testUtilityService: TestUtilityService, public dialog: MatDialog) {}

  ngOnInit() {
    this.addTableColumn();
    this.getColumnSectionWidth();
  }

  // *************** To Get Width Comment Column and put in style css height
  getAutomaticWidth() {
    this.myInnerWidth = window.innerWidth - 642;
    return this.myInnerWidth;
  }

  addTableColumn() {
    if (this.testData && this.testData.correction_grid && this.testData.correction_grid.correction) {
      this.correctionData = this.testData.correction_grid.correction;
      if (this.correctionData.sections.length) {
        this.displayedColumns.push('section');
      }
      if (this.correctionData.show_direction_column) {
        this.displayedColumns.push('directives');
      }
      if (this.correctionData.show_number_marks_column) {
        this.displayedColumns.push('markNumber');
      }
      if (this.correctionData.show_letter_marks_column) {
        this.displayedColumns.push('markLetter');
      }
      if (this.correctionData.show_phrase_marks_column) {
        this.displayedColumns.push('markPhrase');
      }
      if (this.correctionData.comment_for_each_sub_section) {
        this.displayedColumns.push('comment');
      }
    }
  }

  getCorrectionForm() {
    return this.testCorrectionForm.get('correction_grid').get('correction') as UntypedFormGroup;
  }

  getSectionForm() {
    return this.getCorrectionForm().get('sections') as UntypedFormArray;
  }

  getSubSectionForm(sectionIndex: number) {
    return this.getSectionForm().at(sectionIndex).get('sub_sections') as UntypedFormArray;
  }

  toggleTitle(sectionIndex: number, subSectionIndex: number, status: boolean) {
    this.getSubSectionForm(sectionIndex).at(subSectionIndex).get('showFullTitle').setValue(status);
  }

  toggleDirection(sectionIndex: number, subSectionIndex: number, status: boolean) {
    this.getSubSectionForm(sectionIndex).at(subSectionIndex).get('showFullDirection').setValue(status);
  }

  getJurysSubSectionForm(sectionIndex: number, subSectionIndex: number) {
    return this.getSubSectionForm(sectionIndex).at(subSectionIndex).get('jurys') as UntypedFormArray;
  }

  getPenaltiesFieldForm() {
    return this.getCorrectionForm().get('penalties') as UntypedFormArray;
  }

  getBonusesFieldForm() {
    return this.getCorrectionForm().get('bonuses') as UntypedFormArray;
  }

  validateNumeric(sectionIndex: number, subSectionIndex: number, maxRating: number) {
    if (maxRating) {
      const mark = +this.getSubSectionForm(sectionIndex).at(subSectionIndex).get('rating').value;

      if (mark > maxRating) {
        this.getSubSectionForm(sectionIndex).at(subSectionIndex).get('rating').setValue(maxRating);
      } else if (mark < 0) {
        this.getSubSectionForm(sectionIndex).at(subSectionIndex).get('rating').setValue(0);
      } else if (mark % 1 !== 0) {
        // if decimal number, set only 2 number behind comma
        const val = mark.toFixed(2);
        this.getSubSectionForm(sectionIndex).at(subSectionIndex).get('rating').setValue(val);
      }
      this.getTotalSectionMark(sectionIndex);

    }
  }

  getLetterPhraseMark(selectedScoreConversion: ScoreConversion, sectionIndex: number, subSectionIndex: number) {
    // calculate score: (score in score conversion table / maximum score) * sub section maximum score
    const selectedScore = selectedScoreConversion.score;
    const maximumScore = this.correctionData.sections[sectionIndex].maximum_rating;
    const subSectionMaxScore = this.correctionData?.sections?.[sectionIndex]?.sub_sections?.[subSectionIndex]?.maximum_rating;
    const total: number = (selectedScore / maximumScore) * subSectionMaxScore;

    // if whole number, display total without comma
    if (total % 1 === 0) {
      this.getSubSectionForm(sectionIndex).at(subSectionIndex).get('rating').setValue(total);
    } else {
      this.getSubSectionForm(sectionIndex).at(subSectionIndex).get('rating').setValue(total.toFixed(2));
    }
    this.getTotalSectionMark(sectionIndex);

  }

  getTotalSectionMark(sectionIndex: number) {
    this.testDataDecimalDigits = this.testData?.correction_grid?.correction?.display_section_coefficient
      ? this.testData.correction_grid.correction.section_coefficient?.section_decimal_place
      : 2
    const subSections: TestCorrectionCorrectionGridCorrectionSubSectionInput[] =
    this.getSectionForm().at(sectionIndex).get('sub_sections').value;

    let totalMark = 0;
    let sectionTotalMax = 0;
    subSections.forEach((subSection) => {
      totalMark = totalMark + (subSection.rating ? +subSection.rating : 0);
    });
    this.testData?.correction_grid?.correction?.sections?.[sectionIndex]?.sub_sections?.forEach(subSection => {
      sectionTotalMax += subSection?.maximum_rating;
    })
    this.getSectionForm().at(sectionIndex).get('rating').setValue(totalMark.toFixed(this.testDataDecimalDigits));
    if (this.testData?.correction_grid?.correction?.display_section_coefficient) {
      const sectionTotalMarkWithoutCoefficient = this.testUtilityService.calculateSectionTotalWithoutCoefficient(
        this.getSectionForm().at(sectionIndex).value,
        sectionTotalMax || 0,
        this.testData.correction_grid.correction?.section_coefficient?.section_additional_max_score,
      );
      this.getSectionForm().at(sectionIndex).get('section_extra_total').setValue(sectionTotalMarkWithoutCoefficient.toFixed(this.testDataDecimalDigits));
    }
    // calculate final mark only if user not check elimination (student not eliminated)
    this.getFinalMark();
  }

  getFinalMark() {
    this.getMaximumFinalMark();
    const DECIMAL_PLACE = this.testData?.correction_grid?.correction?.display_section_coefficient
      ? (this.testData?.correction_grid?.correction?.section_coefficient?.section_decimal_place || 0)
      : 2
    if (!this.getCorrectionForm().get('elimination').value) {
      const sections: TestCorrectionCorrectionGridCorrectionSectionInput[] = this.getSectionForm().value;
      const penalties: TestCorrectionCorrectionGridCorrectionPenaltyBonusInput[] = this.getPenaltiesFieldForm().value;
      const bonuses: TestCorrectionCorrectionGridCorrectionPenaltyBonusInput[] = this.getBonusesFieldForm().value;

      let total = 0;
      if (this.testData?.correction_grid?.correction?.display_section_coefficient) {
        total = this.testUtilityService.calculateFinalTotalWithCoefficient(
          sections.map((section: any, index) => {
            section.maximum_score_from_sub_sections = 0
            this.testData.correction_grid.correction?.sections?.[index]?.sub_sections?.forEach(subSection => {
              section.maximum_score_from_sub_sections += subSection?.maximum_rating;
            })
            return section;
          }),
          this.testData.correction_grid.correction?.section_coefficient?.section_additional_max_score,
        );
      } else {
        sections.forEach((section) => {
          total = total + (section.rating ? +section.rating : 0);
        });
      }
      penalties.forEach((penalty) => {
        const totalMinusPenalty = total - (penalty.rating ? +penalty.rating : 0);
        total = totalMinusPenalty >= 0 ? totalMinusPenalty : 0;
      });
      bonuses.forEach((bonus) => {
        const totalPlusBonus = total + (bonus.rating ? +bonus.rating : 0);
        total = totalPlusBonus <= this.maximumFinalMark ? totalPlusBonus : this.maximumFinalMark;
      });

      if (total % 1 === 0) {
        this.getCorrectionForm().get('total').setValue(total);
      } else {
        this.getCorrectionForm().get('total').setValue(total.toFixed(DECIMAL_PLACE));
      }
      this.getAdditionalTotal();
    }
  }

  getAdditionalTotal() {
    const finalMark = +this.getCorrectionForm().get('total').value
    let additionalTotal = 0;
    if (this.testData.correction_grid.correction.total_zone && this.testData.correction_grid.correction.total_zone.additional_max_score) {
      additionalTotal = (this.testData.correction_grid.correction.total_zone.additional_max_score / this.maximumFinalMark) * finalMark;
    } else {
      additionalTotal = (20 / this.maximumFinalMark) * finalMark;
    }
    const decimalPlace = this.testData.correction_grid.correction.total_zone.decimal_place;
    this.getCorrectionForm().get('additional_total').setValue(additionalTotal.toFixed(decimalPlace));
  }

  getMaximumFinalMark() {
    this.maximumFinalMark = 0;
    if (this.testData?.correction_grid?.correction?.display_section_coefficient) {
      this.maximumFinalMark = +this.testData.correction_grid.correction?.section_coefficient?.section_additional_max_score;
    } else {
      this.correctionData.sections.forEach((section) => {
        this.maximumFinalMark = this.maximumFinalMark + (section.maximum_rating ? +section.maximum_rating : 0);
      });
    }
  }

  openVoiceRecog(data, sectionIndex, subSectionIndex) {
    this.dialog
      .open(SpeechToTextDialogComponent, {
        width: '800px',
        minHeight: '300px',
        panelClass: 'certification-rule-pop-up',
        disableClose: true,
        data: this.getSubSectionForm(sectionIndex).at(subSectionIndex).get('comments').value,
      })
      .afterClosed()
      .subscribe((resp) => {

        this.getSubSectionForm(sectionIndex).at(subSectionIndex).get('comments').patchValue(resp);
      });
  }

  openSectionVoiceRecog(data, sectionIndex) {
    this.dialog
      .open(SpeechToTextDialogComponent, {
        width: '800px',
        minHeight: '300px',
        panelClass: 'certification-rule-pop-up',
        disableClose: true,
        data: this.getSectionForm().at(sectionIndex).get('comment').value,
      })
      .afterClosed()
      .subscribe((resp) => {

        this.getSectionForm().at(sectionIndex).get('comment').setValue(resp)
      });
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

  @Cacheable()
  getSectionRating(sectionRef, maxScore) {
    if (sectionRef?.coefficient) {
      return of(`${(+sectionRef?.section_extra_total).toFixed(this.testDataDecimalDigits)} / ${this.testData.correction_grid.correction.section_coefficient.section_additional_max_score}`)
    } else {
      return of(`${+sectionRef?.rating} / ${+maxScore}`)
    }
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  // *************** To Get Width Section Column and put in style css width
  getColumnSectionWidth() {
    if (this.testData && this.testData.correction_grid && this.testData.correction_grid.correction) {
      const correctionData = this.testData.correction_grid.correction;
      if (
        correctionData.sections.length &&
        correctionData.show_direction_column &&
        (correctionData.show_number_marks_column || correctionData.show_letter_marks_column || correctionData.show_phrase_marks_column) &&
        correctionData.comment_for_each_sub_section
      ) {
        this.sectionWidth = 25;
        this.directiveWidth = 35;
        this.markLetterWidth = 5;
        this.markPharseWidth = 10;
        this.markScoreWidth = 5;
        this.commentWidth = 30;
      } else if (
        correctionData.sections.length &&
        correctionData.show_direction_column &&
        (correctionData.show_number_marks_column || correctionData.show_letter_marks_column || correctionData.show_phrase_marks_column) &&
        !correctionData.comment_for_each_sub_section
      ) {
        this.sectionWidth = 45;
        this.directiveWidth = 45;
        this.markLetterWidth = 5;
        this.markPharseWidth = 10;
        this.markScoreWidth = 5;
      } else if (
        correctionData.sections.length &&
        correctionData.show_direction_column &&
        !(correctionData.show_number_marks_column || correctionData.show_letter_marks_column || correctionData.show_phrase_marks_column) &&
        !correctionData.comment_for_each_sub_section
      ) {
        this.sectionWidth = 45;
        this.directiveWidth = 45;
      } else if (
        correctionData.sections.length &&
        !correctionData.show_direction_column &&
        !(correctionData.show_number_marks_column || correctionData.show_letter_marks_column || correctionData.show_phrase_marks_column) &&
        correctionData.comment_for_each_sub_section
      ) {
        this.sectionWidth = 45;
        this.commentWidth = 45;
      } else if (
        correctionData.sections.length &&
        !correctionData.show_direction_column &&
        (correctionData.show_number_marks_column || correctionData.show_letter_marks_column || correctionData.show_phrase_marks_column) &&
        !correctionData.comment_for_each_sub_section
      ) {
        this.sectionWidth = 95;
        this.markLetterWidth = 5;
        this.markPharseWidth = 10;
        this.markScoreWidth = 5;
      } else if (
        correctionData.sections.length &&
        !correctionData.show_direction_column &&
        (correctionData.show_number_marks_column || correctionData.show_letter_marks_column || correctionData.show_phrase_marks_column) &&
        correctionData.comment_for_each_sub_section
      ) {
        this.sectionWidth = 45;
        this.markLetterWidth = 5;
        this.markPharseWidth = 10;
        this.markScoreWidth = 5;
        this.commentWidth = 45;
      } else if (
        correctionData.sections.length &&
        !correctionData.show_direction_column &&
        !(correctionData.show_number_marks_column || correctionData.show_letter_marks_column || correctionData.show_phrase_marks_column) &&
        !correctionData.comment_for_each_sub_section
      ) {
        this.sectionWidth = 100;
      } else if (
        correctionData.sections.length &&
        correctionData.show_direction_column &&
        !(correctionData.show_number_marks_column || correctionData.show_letter_marks_column || correctionData.show_phrase_marks_column) &&
        !correctionData.comment_for_each_sub_section
      ) {
        this.sectionWidth = 45;
        this.directiveWidth = 55;
      } else if (
        correctionData.sections.length &&
        !correctionData.show_direction_column &&
        !(correctionData.show_number_marks_column || correctionData.show_letter_marks_column || correctionData.show_phrase_marks_column) &&
        correctionData.comment_for_each_sub_section
      ) {
        this.sectionWidth = 45;
        this.commentWidth = 55;
      } else if (
        correctionData.sections.length &&
        correctionData.show_direction_column &&
        !(correctionData.show_number_marks_column || correctionData.show_letter_marks_column || correctionData.show_phrase_marks_column) &&
        correctionData.comment_for_each_sub_section
      ) {
        this.sectionWidth = 30;
        this.directiveWidth = 35;
        this.commentWidth = 35;
      }
    }
  }
  // *************** To Get Height window screen and put in style css height
  getAutomaticHeight() {
    if (this.testData.correction_grid.header.fields && 
      this.testData.correction_grid.header.fields.length &&
      this.testData.correction_grid.footer.fields &&
      this.testData.correction_grid.footer.fields.length < 1 &&
      !this.testData.correction_grid.correction.show_final_comment
      ) {
      this.myInnerHeight = window.innerHeight - 333;
      return this.myInnerHeight;
    } else if (
      this.testData.correction_grid.footer.fields &&
      this.testData.correction_grid.footer.fields.length &&
      this.testData.correction_grid.header.fields &&
      this.testData.correction_grid.header.fields.length < 1 &&
      !this.testData.correction_grid.correction.show_final_comment
    ) {
      this.myInnerHeight = window.innerHeight - 318;
      return this.myInnerHeight;
    } else if (
      this.testData.correction_grid.header.fields &&
      this.testData.correction_grid.header.fields.length &&
      this.testData.correction_grid.footer.fields &&
      this.testData.correction_grid.footer.fields.length &&
      !this.testData.correction_grid.correction.show_final_comment
    ) {
      this.myInnerHeight = window.innerHeight - 363;
      return this.myInnerHeight;
    } else if (
      this.testData.correction_grid.header.fields &&
      this.testData.correction_grid.header.fields.length &&
      this.testData.correction_grid.footer.fields &&
      this.testData.correction_grid.footer.fields.length &&
      this.testData.correction_grid.correction.show_final_comment
    ) {
      this.myInnerHeight = window.innerHeight - 433;
      return this.myInnerHeight;
    } else if (
      this.testData.correction_grid.header.fields &&
      this.testData.correction_grid.header.fields.length &&
      this.testData.correction_grid.footer.fields &&
      this.testData.correction_grid.footer.fields.length < 1 &&
      this.testData.correction_grid.correction.show_final_comment
    ) {
      this.myInnerHeight = window.innerHeight - 333;
      return this.myInnerHeight;
    } else if (
      this.testData.correction_grid.header.fields &&
      this.testData.correction_grid.header.fields.length < 1 &&
      this.testData.correction_grid.footer.fields &&
      this.testData.correction_grid.footer.fields.length &&
      this.testData.correction_grid.correction.show_final_comment
    ) {
      this.myInnerHeight = window.innerHeight - 378;
      return this.myInnerHeight;
    } else if (
      this.testData.correction_grid.header.fields &&
      this.testData.correction_grid.header.fields.length < 1 &&
      this.testData.correction_grid.footer.fields &&
      this.testData.correction_grid.footer.fields.length < 1 &&
      this.testData.correction_grid.correction.show_final_comment
    ) {
      this.myInnerHeight = window.innerHeight - 328;
      return this.myInnerHeight;
    } else {
      this.myInnerHeight = window.innerHeight - 333;
      return this.myInnerHeight;
    }
  }
}
