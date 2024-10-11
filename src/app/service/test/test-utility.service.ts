import { Injectable } from '@angular/core';

@Injectable()
export class TestUtilityService {
  /**
   * ---------------
   * Public Methods
   * ---------------
   */

  calculateTotalCoefficient(sectionsRef: any) {
    if (Array.isArray(sectionsRef) && sectionsRef?.length) {
      let totalCoefficient = 0;
      for (const section of sectionsRef) {
        totalCoefficient += +section?.coefficient;
        delete section.maximum_score_from_sub_sections;
      }
      return totalCoefficient;
    } else {
      return 0;
    }
  }

  /**
   * Function to calculate section rating respecting the coefficient
   * @param sectionRef Reference to the section data
   * @returns {number} Calculated section rating respecting the coefficient
   */
  calculateSectionTotalWithCoefficient(sectionRef: any, originalMaxScore: number, maxScore: number) {
    return (+sectionRef?.rating || 0) / originalMaxScore * maxScore * +sectionRef?.coefficient;
  }

  calculateSectionTotalWithoutCoefficient(sectionRef: any, originalMaxScore: number, maxScore: number) {
    return (+sectionRef?.rating || 0) / originalMaxScore * maxScore;
  }

  /**
   * Function to calculate total of section rating respecting the coefficient
   * @param sectionsRef Reference to the correction_grid.correction.sections array
   * @returns {number} Calculated sections rating respecting the coefficient
   */
  calculateFinalTotalWithCoefficient(sectionsRef: any, maxScore: number): number {
    if (Array.isArray(sectionsRef) && sectionsRef.length) {
      let totalCoefficient = 0;
      let totalRating = 0;

      for (const section of sectionsRef) {
        totalCoefficient += +section?.coefficient;
        totalRating += this.calculateSectionTotalWithCoefficient(section, section.maximum_score_from_sub_sections, maxScore);
        delete section.maximum_score_from_sub_sections;
      }
      return totalRating / totalCoefficient;
    } else {
      return 0;
    }
  }
}
