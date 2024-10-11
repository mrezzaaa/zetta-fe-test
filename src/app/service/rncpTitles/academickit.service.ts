import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Apollo } from 'apollo-angular';
import { AcadKitFolder, NavigationPath } from 'app/rncp-titles/dashboard/academic-kit.model';
import { TestCreationPayloadData, TestCreationRespData } from 'app/test/test-creation/test-creation.model';
import gql from 'graphql-tag';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, startWith, switchMap, tap, withLatestFrom } from 'rxjs/operators';
import { AuthService } from '../auth-service/auth.service';
import { TFormatAcademicKitOptionParam } from './academickit.service.types';
import { NgxPermissionsService } from 'ngx-permissions';
import * as moment from 'moment';
import { UtilityService } from '../utility/utility.service';
import { ParseUtcToLocalPipe } from 'app/shared/pipes/parse-utc-to-local.pipe';

declare var _: any;
@Injectable({
  providedIn: 'root',
})
export class AcademicKitService {
  private readonly rootFolderName = [
    '01. ADMISSIONS',
    '02. ANNALES EPREUVES',
    '03. BOITE A OUTILS',
    '04. ORGANISATION',
    '05. PROGRAMME',
    '06. EPREUVES DE LA CERTIFICATION',
    '07. CERTIFICATION MANAGEMENT',
  ];

  folder03 = '03. BOITE A OUTILS'; // name for root folder 03
  folder06 = '06. EPREUVES DE LA CERTIFICATION'; // name for root folder 06
  folder07 = '07. CERTIFICATION MANAGEMENT'; // name for root folder 07

  // destinationFolderId is used for saving id where we want to move folder into. it used in move folder dialog component
  private destinationFolderIdSource = new BehaviorSubject<{ _id: string; folder_name: string }>(null);
  public destinationFolderId$ = this.destinationFolderIdSource.asObservable();

  // moveFolderBreadcrumb is used for saving breadcrumb navigation path. it used in move folder dialog component
  private moveFolderBreadcrumbSource = new BehaviorSubject<NavigationPath[]>(null);
  public moveFolderBreadcrumb$ = this.moveFolderBreadcrumbSource.asObservable();

  // to trigger refresh on academic kit
  refreshAcadKitSource = new BehaviorSubject<boolean>(false);
  isAcadKitRefreshed$ = this.refreshAcadKitSource.asObservable();
  refreshAcadKitSourceEdit = new BehaviorSubject<boolean>(false);
  isAcadKitRefreshedEdit$ = this.refreshAcadKitSourceEdit.asObservable();
  loadingSubject = new BehaviorSubject<boolean>(false);
  loadingObservable = this.loadingSubject.asObservable();

  //selected class in dashboard
  selectedClass$ = new BehaviorSubject<any>(null);

  // to store folder location history on academic kit
  folderLocationHistory = [];
  
  
  public selectedTabSource: BehaviorSubject<string> = new BehaviorSubject<string>(null);
  selectedTabSource$ = this.selectedTabSource.asObservable();

  setSelectedTab(value: string) {
    this.selectedTabSource.next(value);
  }

  setSelectedClass(classObject) {
    this.selectedClass$.next(classObject);
  }

  getSelectedClass() {
    return this.selectedClass$.getValue();
  }

  setDestinationFolder(folder: { _id: string; folder_name: string }) {
    this.destinationFolderIdSource.next(folder);
  }

  setMoveFolderBreadcrumb(path: NavigationPath[]) {
    this.moveFolderBreadcrumbSource.next(path);
  }

  refreshAcadKit(status: boolean) {
    this.refreshAcadKitSource.next(status);
  }
  refreshAcadKitEdit(status: boolean) {
    this.refreshAcadKitSourceEdit.next(status);
  }

  isRootFolder03(folder: AcadKitFolder) {
    const folderName = folder?.folder_name;
    return folder?.is_default_folder && folderName.includes(this.folder03);
  }

  isRootFolder06(folder: AcadKitFolder) {
    const folderName = folder?.folder_name;
    return folder?.is_default_folder && folderName.includes(this.folder06);
  }

  isRootFolder07(folder: AcadKitFolder) {
    const folderName = folder?.folder_name;
    return folder?.is_default_folder && folderName.includes(this.folder07);
  }

  constructor(
    private apollo: Apollo,
    private translate: TranslateService,
    private auth: AuthService,
    private parseUtcToLocal: ParseUtcToLocalPipe,
    private permissions: NgxPermissionsService,
    private utilService: UtilityService,
  ) {}

  /**
   * --------------------
   * Private Methods
   * --------------------
   */

  private _getFolderIndexByName(name: string) {
    const index = this.rootFolderName.indexOf(name);
    if (index > -1) {
      // Correct index found, return index + 1 to reflect the index in the name
      return index + 1;
    } else {
      // Incorrect index found, return as it is
      return index;
    }
  }

  private _markQualityFormFolders(folderRef: any) {
    folderRef.is_quality_form_folder = folderRef?.folder_name?.trim() === 'Quality Form';
    if (folderRef.is_quality_form_folder) {
      const processId = folderRef?.form_process_id?._id;
      const user = this.auth.getCurrentUser();
      const userId = user._id;
      const userTypeId = user.entities[0].type._id;
      folderRef.quality_form_link = `/form-fill?formId=${processId}&formType=quality_form&userId=${userId}&userTypeId=${userTypeId}`;
    }
    if (folderRef?.sub_folders_id?.length) {
      for (const subFolder of folderRef.sub_folders_id) {
        this._markQualityFormFolders(subFolder);
      }
    }
  }

  /**
   * Function to translate folder name recursively
   * @param folderRef - Folder object, pass by reference
   */
  private _translateFolderAndSubFoldersName(folderRef: any, data: any = {}) {
    // This is a map to get related localization key for a folder name
    // Example: Follow up is Folder.Follow up
    const MAP_FOLDER_NAME_LOCALIZATION_KEY: { [key: string]: string } = {
      'Certifier Rule for Student': 'Certifier Rule for Student',
      'Certification Rules for Preparation Centres': 'Folder.Certification Rules for Preparation Centres',
      'Follow up': 'Folder.Follow up',
      'Enquête Employabilité': 'Folder.Enquête Employabilité',
      'Derogation_or_dispense': 'Folder.Derogation_or_dispense',
      'Corrector Assignment': 'Folder.Corrector Assignment',
    };

    if (MAP_FOLDER_NAME_LOCALIZATION_KEY?.[folderRef?.folder_name]) {
      folderRef.folder_name_localization_key = MAP_FOLDER_NAME_LOCALIZATION_KEY[folderRef?.folder_name];
    } else if (folderRef?.folder_name?.trim() === 'Quality Form') {
      if (typeof data?.quality_folder_index !== 'number') {
        data.quality_folder_index = 0;
      }

      if (data.quality_folder_index === 0) {
        folderRef.folder_name_localization_key = 'Folder.Quality Form';
      } else {
        folderRef.folder_name_localization_key = 'Folder.Quality Form With Index';
        folderRef.folder_name_localization_variables = { index: data.quality_folder_index };
      }
      data.quality_folder_index += 1;
    }

    if (Array.isArray(folderRef?.sub_folders_id)) {
      for (const subFolder of folderRef?.sub_folders_id) {
        this._translateFolderAndSubFoldersName(subFolder, data);
      }
    }
  }

  /**
   * Function to filter sub folders of a folder using their school based on the current user's school
   * @param folderRef - Folder object, pass by reference
   * @param filteredUserEntities - Optional parameter of the filtered user entities so recursive function can be more efficient
   * @returns nothing
   */
  private _filterSubFoldersByUserSchool(folderRef: any, filteredUserEntities?: any[]): void {
    const loggedInUserType = ['Academic Director', 'Academic Admin', 'PC School Director'].find(
      name => !!this.permissions.getPermission(name),
    );

    // Do not filter if the logged in user is not one of the users declared above
    if (!loggedInUserType) {
      return;
    }

    if (!filteredUserEntities?.length) {
      filteredUserEntities = this.auth.getLocalStorageUser().entities.filter(entity => {
        const name = entity?.type?.name;
        return loggedInUserType && loggedInUserType === name;
      });
    }

    const entityMadeUniqueBySchool = _.uniqBy(filteredUserEntities, 'school.short_name');

    // Filter sub folders based on the school related to the user who logged in if it is either Academic Admin, Academic Director, or PC School Director
    if (filteredUserEntities?.length && Array.isArray(folderRef.sub_folders_id)) {
      folderRef.sub_folders_id = folderRef.sub_folders_id.filter(
        (folder: any) => (!this.isRootFolder07(folderRef) && !folder?.school?._id) || folder?.school?._id === entityMadeUniqueBySchool?.[0]?.school?._id,
      );

      for (const subFolder of folderRef.sub_folders_id) {
        this._filterSubFoldersByUserSchool(subFolder, filteredUserEntities);
      }
    }
  }

  private _isDocumentTimePassedCurrentTime(document: any, isFolder06: boolean, type?) {
    let validate = false;

    if (document) {
      const test = document.parent_test ? document.parent_test : null;
      const timeToday = moment();

      // ************** Dont display added document inside folder result of 06
      if (isFolder06 && document.document_generation_type === 'uploadedFromTestCreation' && type !== 'addedDocument') {
        return false;
      }

      // ************** ADMTC will always able to see the document regardless the user or the publication time
      if (this.utilService.isUserEntityADMTC()) {
        return true;
      }

      // ************** Always display test result in folder 06
      if (isFolder06 && type === 'testResult') {
        return true;
      }

      // ************** Check if user is the correct WHO in the test creation tab 3, but for folder 03 all PC Staff is bypassed only checking the date time.
      // if (!(this.isFolder03 && this.utilService.isUserLoginPCStaff())) {

      const data = this.utilService.checkIsCurrentUserAssigned(document.published_for_user_types_id);

      if (!data) {
        return false;
      }
      // }

      if (document && document.publication_date) {
        if (document.publication_date.type === 'fixed') {
          const timePublication = this.parseUtcToLocal.transformDateInDateFormat(
            document.publication_date.publication_date.date,
            document.publication_date.publication_date.time,
          );
          if (timeToday.isSameOrAfter(timePublication)) {
            validate = true;
          }
        } else if (document.publication_date.type === 'relative') {
          if ((test && test.date_type === 'marks') || test.date_type === 'different') {
            let timePublication = this.parseUtcToLocal.transformDateInDateFormat(test.date.date_utc, test.date.time_utc);
            if (document.publication_date.relative_time) {
              const localDate = this.parseUtcToLocal.transformDate(test.date.date_utc, test.date.time_utc);
              const localRelativeTime = this.parseUtcToLocal.transform(document.publication_date.relative_time);
              timePublication = moment(localDate + localRelativeTime, 'DD/MM/YYYYHH:mm');
            }

            const schools = this.utilService.getUserAllAssignedSchool();
            let school = '';
            if (schools && schools.length) {
              school = schools[0];
            }
            if (test.date_type === 'different') {
              const tempDateSchool = test.schools;
              const foundSchool = tempDateSchool.find(
                schoolData => schoolData && schoolData.school_id && schoolData.school_id._id && schoolData.school_id._id === school,
              );
              if (foundSchool && foundSchool.test_date) {
                let schoolTime = foundSchool.test_date.time_utc;
                if (document.publication_date.relative_time) {
                  schoolTime = document.publication_date.relative_time;
                  const localDate = this.parseUtcToLocal.transformDate(foundSchool.test_date.date_utc, foundSchool.test_date.time_utc);
                  const localRelativeTime = this.parseUtcToLocal.transform(document.publication_date.relative_time);

                  timePublication = moment(localDate + localRelativeTime, 'DD/MM/YYYYHH:mm');
                } else {
                  timePublication = this.parseUtcToLocal.transformDateInDateFormat(
                    foundSchool.test_date.date_utc,
                    foundSchool.test_date.time_utc,
                  );
                }
              }

              if (document.publication_date_for_schools && document.publication_date_for_schools.length) {
                const foundSchoolPublish = document.publication_date_for_schools.find(
                  schoolData => schoolData && schoolData.school && schoolData.school._id && schoolData.school._id === school,
                );

                if (foundSchoolPublish && foundSchoolPublish.date) {
                  // timePublication = this.parseUTCtoLocal.transformDateInDateFormat(
                  //   foundSchoolPublish.date.date,
                  //   foundSchoolPublish.date.time,
                  // );
                  // if (document.publication_date.relative_time) {
                  const localDate = this.parseUtcToLocal.transformDate(foundSchoolPublish.date.date, foundSchoolPublish.date.time);
                  const localRelativeTime = this.parseUtcToLocal.transform(foundSchoolPublish.date.time);
                  timePublication = moment(localDate + localRelativeTime, 'DD/MM/YYYYHH:mm');
                  // if (document.publication_date.before) {
                  //   timePublication = publication.subtract(document.publication_date.day, 'd');
                  // } else {
                  //   timePublication = publication.add(document.publication_date.day, 'd');
                  // }
                  // timePublication = moment(publication, 'ddd MMM D YYYY HH:mm:ss');

                  let allow = false;
                  if (timeToday.isSameOrAfter(timePublication)) {
                    allow = true;
                  } else {
                    allow = false;
                  }
                  return allow;
                  // }
                }
              }
            }

            if (document.publication_date.before) {
              timePublication = timePublication.subtract(document.publication_date.day, 'd');
            } else {
              timePublication = timePublication.add(document.publication_date.day, 'd');
            }

            if (timeToday.isSameOrAfter(timePublication)) {
              validate = true;
            }
          } else if (test && test.date_type === 'fixed') {
            let timePublication = this.parseUtcToLocal.transformDateInDateFormat(test.date.date_utc, test.date.time_utc).add(3, 'days');

            if (document.publication_date.relative_time) {
              const localDate = this.parseUtcToLocal.transformDate(test.date.date_utc, test.date.time_utc);
              const localRelativeTime = this.parseUtcToLocal.transform(document.publication_date.relative_time);
              timePublication = moment(localDate + localRelativeTime, 'DD/MM/YYYYHH:mm');
            }

            if (document.publication_date.before) {
              timePublication = timePublication.subtract(document.publication_date.day, 'd');
            } else {
              timePublication = timePublication.add(document.publication_date.day, 'd');
            }

            if (timeToday.isSameOrAfter(timePublication)) {
              validate = true;
            }
          }
        }
      } else if (isFolder06 && document.document_generation_type !== 'uploadedFromTestCreation') {
        validate = true;
      }
    }

    return validate;
  }

  private _mapFolderTestAndDocuments(folderRef: any, options?: TFormatAcademicKitOptionParam): void {
    // Map documents and put them in their place
    if (Array.isArray(folderRef?.documents)) {
      const taskBuilderDocuments = [];
      const nonTaskBuilderDocuments = [];
      const manuallyAddedDocuments = [];
      const elementOfProofDocuments = [];
      const expectedDocuments = [];

      for (const document of folderRef.documents) {
        if (document?.type_of_document === 'task_builder') {
          taskBuilderDocuments.push(document);
        } else if (document?.type_of_document) {
          nonTaskBuilderDocuments.push(document);
        }
        if (document?.document_generation_type === 'elementOfProof' && document?.uploaded_for_student) {
          if (
            !elementOfProofDocuments.find(proofDocument => proofDocument?.uploaded_for_student?._id === document?.uploaded_for_student?._id)
          ) {
            // Use unshift so the latest element of proof will be in the top of the list
            elementOfProofDocuments.unshift(document);
          }
        }
        // if document has no document_expected_id and parent_test, it mean this document come from manual task
        if (!document?.document_expected_id && !document?.parent_test) {
          manuallyAddedDocuments.push(document);
        }

        // *************** EVOL ADMTC 0076 : Hide folder document expected from the folder corrector assignment
        if (document?.parent_test?.expected_documents?.length && folderRef?.folder_name !== 'Corrector Assignment') {
          for (const parentTestExpectedDocument of document.parent_test.expected_documents) {
            if (!expectedDocuments.find(expectedDocument => expectedDocument?._id === parentTestExpectedDocument?._id)) {
              expectedDocuments.push({ ...parentTestExpectedDocument, documents: [] });
            }
          }
        }
      }

      for (const expectedDocument of expectedDocuments) {
        expectedDocument.is_for_student = Boolean(folderRef.documents?.[0]?.uploaded_for_student);
        expectedDocument.is_for_group = Boolean(folderRef.documents?.[0]?.uploaded_for_group);

        for (const document of folderRef.documents) {
          if (document?.document_generation_type === 'documentExpected') {
            if (!document?.parent_test && expectedDocument?.document_name === 'Documents' && expectedDocument?.is_manual_expected) {
              expectedDocument.documents.push(document);
            } else if (document?.document_expected_id?._id === expectedDocument?._id) {
              expectedDocument.documents.push(document);
            } else if (document?.document_name?.includes(expectedDocument?.document_name)) {
              expectedDocument.documents.push(document);
            }
          }
        }
      }

      folderRef.task_builder_documents = taskBuilderDocuments;
      folderRef.non_task_builder_documents = nonTaskBuilderDocuments;
      folderRef.manually_added_documents = manuallyAddedDocuments;
      folderRef.element_of_proof_documents = elementOfProofDocuments;
      folderRef.test_expected_documents = expectedDocuments;
    }

    if (Array.isArray(folderRef?.tests)) {
      const testAddedDocuments = [];
      for (const test of folderRef?.tests) {
        if (folderRef?.documents?.length) {
          for (const document of folderRef.documents) {
            // Populate test result documents
            if (document?.parent_test?._id === test?._id && document?.document_generation_type !== 'documentExpected') {
              test.documents.push(document);
            }
          }
        }

        if (test?.documents?.length) {
          for (const document of test.documents) {
            if (options?.folder_index !== 6) {
              test.documents = test.documents.filter(testDocument =>
                this._isDocumentTimePassedCurrentTime(testDocument, false, 'addedDocument'),
              );
            }

            if (
              document?.document_generation_type &&
              document?.document_generation_type === 'uploadedFromTestCreation' &&
              this._isDocumentTimePassedCurrentTime(document, options?.folder_index === 6, 'addedDocument') &&
              !testAddedDocuments.find(existingDocument => existingDocument?._id === document?._id)
            ) {
              testAddedDocuments.push(document);
            }
          }
        }
      }
      folderRef.test_added_documents = testAddedDocuments;
    }

    if (Array.isArray(folderRef?.grand_oral_pdfs)) {
      const grandOralPdfDocuments = [];

      for (const pdf of folderRef.grand_oral_pdfs) {
        if (pdf?.type_of_document === 'grand_oral_pdf' && pdf?.status === 'active') {
          grandOralPdfDocuments.push(pdf);
        }
      }

      folderRef.grand_oral_pdf_documents = grandOralPdfDocuments;
    }

    if (Array.isArray(folderRef?.dossier_bilan_pdfs)) {
      const dossierBilanPdfDocuments = [];

      for (const pdf of folderRef.dossier_bilan_pdfs) {
        if (pdf?.type_of_document === 'dossier_bilan_pdf' && pdf?.status === 'active') {
          dossierBilanPdfDocuments.push(pdf);
        }
      }

      folderRef.dossier_bilan_pdf_documents = dossierBilanPdfDocuments;
    }

    if (Array.isArray(folderRef?.grand_oral_result_pdfs)) {
      folderRef.grand_oral_result_documents = folderRef.grand_oral_result_pdfs.filter(
        (result: any) => result?.type_of_document === 'grand_oral_result_pdf' && result?.status === 'active',
      );
    }

    if (Array.isArray(folderRef?.cv_docs)) {
      folderRef.cv_docs = folderRef.cv_docs.filter(document => document?.status === 'active');
    }

    if (Array.isArray(folderRef?.presentation_docs)) {
      folderRef.presentation_docs = folderRef.presentation_docs.filter(document => document?.status === 'active');
    }
    if (Array.isArray(folderRef?.dossier_bilan_passport_docs)) {
      folderRef.dossier_bilan_passport_docs = folderRef.dossier_bilan_passport_docs.filter(document => document?.status === 'active');
    }
  }

  private _sortFolderTestAndDocuments(folderRef: any): void {
    // Replace text of grand oral with the jury process name
    if (folderRef?.sub_folders_id?.length) {
      const grandOralFolderIndex = folderRef.sub_folders_id.findIndex(folder => {
        return folder?.is_grand_oral_folder && folder?.jury_id?.type === 'grand_oral';
      });
      if (grandOralFolderIndex > -1 && folderRef?.class_id?.jury_process_name) {
        const START_WITH_GRAND_ORAL_INSENSITIVE = /^grand oral/i;
        const subFolderRef = folderRef.sub_folders_id[grandOralFolderIndex];
        subFolderRef.folder_name = String(subFolderRef.folder_name)
          .trim()
          .replace(START_WITH_GRAND_ORAL_INSENSITIVE, subFolderRef?.class_id?.jury_process_name);
      }
      const retakeGrandOralFolders = folderRef.sub_folders_id.filter(folder => {
        return folder?.is_grand_oral_folder && folder?.jury_id?.type === 'retake_grand_oral';
      });
      if (retakeGrandOralFolders?.length && folderRef?.class_id?.jury_process_name) {
        for (const folder of retakeGrandOralFolders) {
          const START_WITH_RETAKE_GRAND_ORAL_INSENSITIVE = /^(rattrapage grand oral|retake grand oral)/i;
          folder.folder_name = String(folder.folder_name)
            .trim()
            .replace(START_WITH_RETAKE_GRAND_ORAL_INSENSITIVE, ['rattrapage', folderRef?.class_id?.jury_process_name].join(' '));
        }
      }
    }

    // sort data.sub_folders_id. except for data with folder name "Certification Rules for Preparation Centres" it must be on the top (first)
    if (folderRef?.sub_folders_id?.length) {
      folderRef.sub_folders_id.sort((sub_folder_a, sub_folder_b) => {
        if (!sub_folder_a.folder_name || !sub_folder_b.folder_name) {
          return 0;
        }
        const nameA = sub_folder_a.folder_name.toLowerCase().trim();
        const nameB = sub_folder_b.folder_name.toLowerCase().trim();

        if (nameA < nameB) {
          return -1;
        }
        if (nameA > nameB) {
          return 1;
        }
        return 0;
      });

      let nameCertRules = 'Certification Rules for Preparation Centres';
      nameCertRules = nameCertRules.toLowerCase().trim();

      let certRulesIndex = null;
      const certRulesData = folderRef.sub_folders_id.find((sub_folder, index) => {
        if (sub_folder?.folder_name.toLowerCase().trim() === nameCertRules) {
          certRulesIndex = index;
        }
        return sub_folder?.folder_name.toLowerCase().trim() === nameCertRules;
      });

      if (certRulesData && (certRulesIndex || certRulesIndex === 0)) {
        folderRef.sub_folders_id.splice(certRulesIndex, 1);
        folderRef.sub_folders_id.unshift(certRulesData);
        certRulesIndex = null;
      }

      // *************** Put ES sub folder on the top of sub folders list within 07 folder
      if (this.isRootFolder07(folderRef)) {
        // *************** ES sub folder is the only sub folder within 07 folder that doesn't have school._id
        const employabilitySurveyFolderIndex = folderRef.sub_folders_id?.findIndex(sub_folder => sub_folder && !sub_folder?.school);
        if (employabilitySurveyFolderIndex >= 0) {
          const employabilitySurveyFolder = folderRef?.sub_folders_id?.splice(employabilitySurveyFolderIndex, 1)?.[0]
          folderRef?.sub_folders_id?.splice(0, 0, employabilitySurveyFolder)
        }
      }
    }
    // Sort tests
    if (folderRef?.tests?.length) {
      folderRef.tests.sort((test_a, test_b) => {
        if (!test_a.name || !test_b.name) {
          return 0;
        }
        const nameA = test_a.name.toLowerCase().trim();
        const nameB = test_b.name.toLowerCase().trim();
        if (nameA < nameB) {
          return -1;
        }
        if (nameA > nameB) {
          return 1;
        }
        return 0;
      });
    }

    // Sort documents
    this._sortDocuments(folderRef?.documents);
    this._sortDocuments(folderRef?.cv_docs);
    this._sortDocuments(folderRef?.presentation_docs);
    this._sortDocuments(folderRef?.dossier_bilan_passport_docs);
    this._sortDocuments(folderRef?.grand_oral_pdf_documents);
    this._sortDocuments(folderRef?.dossier_bilan_pdf_documents);
    this._sortDocuments(folderRef?.grand_oral_result_documents);
    this._sortDocuments(folderRef?.test_added_documents);
    this._sortDocuments(folderRef?.manually_added_documents);
    this._sortDocuments(folderRef?.task_builder_documents);
    this._sortDocuments(folderRef?.non_task_builder_documents);
    this._sortDocuments(folderRef?.element_of_proof_documents);
    this._sortDocuments(folderRef?.test_expected_documents);

    const derogationSummaryPDF = folderRef?.documents?.find(
      (doc: any) => String(doc?.type_of_document).trim() === 'derogation_dispense_summary',
    );

    if (derogationSummaryPDF) {
      derogationSummaryPDF.document_name = String(derogationSummaryPDF?.document_name).replace(/\.pdf$/, '');
      folderRef.documents = [
        derogationSummaryPDF,
        ...folderRef.documents.filter(doc => String(doc?.type_of_document).trim() !== 'derogation_dispense_summary'),
      ];
    }

    if (folderRef?.sub_folders_id?.length) {
      for (const subFolder of folderRef.sub_folders_id) {
        this._sortFolderTestAndDocuments(subFolder);
      }
    }
  }

  private _sortDocuments(documentRef: any): void {
    if (documentRef?.[0]?.uploaded_for_other_user) {
      documentRef.sort((currentDocument, nextDocument) => {
        if (!currentDocument?.uploaded_for_other_user?.last_name || !nextDocument?.uploaded_for_other_user?.last_name) {
          return 0;
        }
        const currentName = currentDocument.uploaded_for_other_user.last_name.toLowerCase().trim();
        const nextName = nextDocument.uploaded_for_other_user.last_name.toLowerCase().trim();
        if (currentName < nextName) {
          return -1;
        }
        if (currentName > nextName) {
          return 1;
        }
        return 0;
      });
    } else if (documentRef?.[0]?.uploaded_for_student) {
      documentRef.sort((currentDocument, nextDocument) => {
        if (!currentDocument?.uploaded_for_student?.last_name || !nextDocument?.uploaded_for_student?.last_name) {
          return 0;
        }
        const currentName = currentDocument.uploaded_for_student.last_name.toLowerCase().trim();
        const nextName = nextDocument.uploaded_for_student.last_name.toLowerCase().trim();
        if (currentName < nextName) {
          return -1;
        }
        if (currentName > nextName) {
          return 1;
        }
        return 0;
      });
    } else if (documentRef?.[0]?.uploaded_for_group) {
      documentRef.sort((currentDocument, nextDocument) => {
        if (!currentDocument?.uploaded_for_group?.name || !nextDocument?.uploaded_for_group?.name) {
          return 0;
        }
        const currentName = currentDocument.uploaded_for_group.name.toLowerCase().trim();
        const nextName = nextDocument.uploaded_for_group.name.toLowerCase().trim();
        if (currentName < nextName) {
          return -1;
        }
        if (currentName > nextName) {
          return 1;
        }
        return 0;
      });
    } else if (Array.isArray(documentRef)) {
      documentRef.sort((currentDocument, nextDocument) => {
        if (!currentDocument.document_name || !nextDocument.document_name) {
          return 0;
        }
        const currentName = currentDocument.document_name.toLowerCase().trim();
        const nextName = nextDocument.document_name.toLowerCase().trim();
        if (currentName < nextName) {
          return -1;
        }
        if (currentName > nextName) {
          return 1;
        }
        return 0;
      });
    }
  }

  /**
   * Function to filter and sort the folders and documents inside an academic kit folder
   * @param acadKitData - The data of academic kit returned from GetOneAcadKitSubFolder
   * @returns - Observable containing the formatted academic kit data
   */
  private _formatAcadKitData(acadKitData: any, options?: TFormatAcademicKitOptionParam) {
    const clonedAcadKitData = _.cloneDeep(acadKitData);
    const loggedInUserType = ['Academic Director', 'Academic Admin', 'PC School Director'].find(
      name => !!this.permissions.getPermission(name),
    );

    // Sanity check to make sure that documents is an array, otherwise populate it with an empty array
    if (!Array.isArray(clonedAcadKitData?.documents)) {
      clonedAcadKitData.documents = [];
    }

    // Cleaning deleted documents before formatting them
    clonedAcadKitData.documents = clonedAcadKitData.documents.filter(document => document?.status !== 'deleted');

    // Filter documents that are visible to the academic admin or academic director's school
    if (['Academic Admin', 'Academic Director'].includes(loggedInUserType) && options?.folder_index === 7) {
      clonedAcadKitData.documents = clonedAcadKitData.documents.filter(document => document.visible_to_school === true);
    }

    // Filter documents that has no parent test for folders other than 06. EPREUVES DE LA CERTIFICATION
    if (options?.folder_index !== 6) {
      clonedAcadKitData.documents = clonedAcadKitData.documents.filter(document => document.parent_test === null);
    }

    if (options?.folder_index === 3) {
      clonedAcadKitData.documents = clonedAcadKitData.documents.filter(
        document => !document?.published_for_user_types_id?.length || this._isDocumentTimePassedCurrentTime(document, false),
      );
    }

    // Populate form process latest status
    if (Array.isArray(clonedAcadKitData?.form_process_id?.steps)) {
      let status: 'submitted' | 'need_validation' | '' = 'submitted';
      for (const step of clonedAcadKitData.form_process_id.steps.reverse()) {
        if (step?.step_status === 'need_validation') {
          status = 'need_validation';
          break;
        } else if (step?.step_status !== 'accept' && step?.step_status !== 'need_validation') {
          status = '';
          break;
        }
      }
      clonedAcadKitData.form_process_id.latest_status = status;
    }

    // For Folder 07, if its a parent folder was opened, then we need to only display relevant school to the user
    if (!options?.is_root_folder && [6, 7].includes(options?.folder_index)) {
      this._filterSubFoldersByUserSchool(clonedAcadKitData);
    }

    // Populate sub_folder.folder_index based on the name if the folder is a sub folder of the root folder (01, 02, 03, etc)
    if (clonedAcadKitData?.sub_folders_id?.length) {
      for (const folder of clonedAcadKitData.sub_folders_id) {
        if (folder?.is_default_folder && folder?.folder_name) {
          folder.folder_index = this._getFolderIndexByName(folder.folder_name);
        }
      }
    }

    // Populate folder.folder_index based on the name if the folder is a sub folder of the root folder (01, 02, 03, etc)
    if (clonedAcadKitData?.is_default_folder && clonedAcadKitData?.folder_name) {
      clonedAcadKitData.folder_index = this._getFolderIndexByName(clonedAcadKitData.folder_name);
    }

    // Add flag is_quality_form_folder if the folder name is Quality Form before the folder name is translated
    this._markQualityFormFolders(clonedAcadKitData);

    // Add folder name localization key for specific folders that needs to be translated
    this._translateFolderAndSubFoldersName(clonedAcadKitData);

    // Map the tests and documents inside the folder and put them in their right place so a component can easily access them without the need to do mapping in the component
    this._mapFolderTestAndDocuments(clonedAcadKitData, options);

    // Sort the tests and documents inside the folder alphabetically based on the document recipient (group/student/other user) or based on the document name
    this._sortFolderTestAndDocuments(clonedAcadKitData);

    return clonedAcadKitData;
  }

  /**
   * --------------------
   * Public Methods
   * --------------------
   */

  getCreateDocumentTypes(): { value: string; name: string }[] {
    return [
      { value: 'guideline', name: 'Guideline' },
      { value: 'test', name: 'test' },
      { value: 'scoring-rules', name: 'Scoring Rule' },
      { value: 'other', name: 'other' },
      { value: 'image/png', name: 'Image/png' },
      { value: 'image/jpeg', name: 'Image/jpeg' },
      { value: 'application/pdf', name: 'Application/pdf' },
      { value: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', name: 'Application/Document' },
      { value: 'documentExpected', name: 'Document Expected' },
      { value: 'studentnotification', name: 'Student Notification' },
      { value: 'certiDegreeCertificate', name: 'CertiDegree Certificate' },
    ];
  }

  getDocumentTypes(): { value: string; name: string }[] {
    return [
      { value: 'Guidelines', name: 'Guidelines' },
      { value: 'guideline', name: 'Guideline' },
      { value: 'Test', name: 'Test' },
      { value: 'test', name: 'test' },
      { value: 'Scoring Rules', name: 'Scoring Rules' },
      { value: 'scoring-rules', name: 'Scoring Rule' },
      { value: 'Other', name: 'Other' },
      { value: 'OTHER', name: 'OTHER' },
      { value: 'other', name: 'other' },
      { value: 'Notification to Student', name: 'Notification to Student' },
      { value: 'documentExpected', name: 'Document Expected' },
      { value: 'image/png', name: 'Image/png' },
      { value: 'image/jpeg', name: 'Image/jpeg' },
      { value: 'application/pdf', name: 'Application/pdf' },
      { value: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', name: 'Application/Document' },
      { value: 'studentnotification', name: 'Student Notification' },
      { value: 'certiDegreeCertificate', name: 'CertiDegree Certificate' },
      { value: 'certification_rule', name: 'Certification Rule' },
      { value: 'student_upload_grand_oral_cv', name: 'Student Upload Grand Oral CV' },
      { value: 'student_upload_grand_oral_presentation', name: 'Student Upload Grand Oral Presentation' },
    ];
  }

  getDocumentAcadTypes(): { value: string; name: string }[] {
    return [
      { value: 'guideline', name: 'Guideline' },
      { value: 'test', name: 'Test' },
      { value: 'Scoring Rules', name: 'Scoring Rules' },
      { value: 'other', name: 'Other' },
      { value: 'Notification to Student', name: 'Notification to Student' },
      { value: 'documentExpected', name: 'Document Expected' },
      { value: 'image/png', name: 'Image/png' },
      { value: 'image/jpeg', name: 'Image/jpeg' },
      { value: 'application/pdf', name: 'Application/pdf' },
      { value: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', name: 'Application/Document' },
      { value: 'studentnotification', name: 'Student Notification' },
      { value: 'certiDegreeCertificate', name: 'CertiDegree Certificate' },
      { value: 'certification_rule', name: 'Certification Rule' },
      { value: 'student_upload_grand_oral_cv', name: 'Student Upload Grand Oral CV' },
      { value: 'student_upload_grand_oral_presentation', name: 'Student Upload Grand Oral Presentation' },
      { value: 'student_upload_dossier_bilan_passport', name: 'student_upload_dossier_bilan_passport' },
    ];
  }

  getFileTypes(): { value: string; name: string }[] {
    return [
      { value: 'docper', name: 'Document/Presentation' },
      { value: 'image', name: 'Image' },
      { value: 'video', name: 'Video' },
    ];
  }

  createEvent(data: any): Observable<any> {
    return this.apollo.mutate({
      mutation: gql`
        mutation CreateEvent($data: AcadEventInput) {
          CreateEvent(event_input: $data) {
            _id
            name
            from_date
            to_date
            schools {
              _id
            }
          }
        }
      `,
      variables: {
        data,
      },
    });
  }

  updateEvent(eventId: string, payload: any): Observable<any> {
    return this.apollo.mutate({
      mutation: gql`
        mutation UpdateEvent($eventId: ID!, $payload: AcadEventInput) {
          UpdateEvent(_id: $eventId, event_input: $payload) {
            _id
          }
        }
      `,
      variables: {
        eventId,
        payload,
      },
    });
  }

  getAllEvent(from_date?: string, to_date?: string, school?: string, className?: string): Observable<any> {
    return this.apollo
      .query({
        query: gql`
          query {
            GetAllEvents(filter:{from_date:"${from_date}", to_date:"${to_date}", school_name:"${school}", class_name:"${className}"}) {
              _id
              name
              from_date
              to_date
              schools {
                _id
                short_name
              }
              user_types {
                _id
                name
              }
              is_all_school
            }
          }
        `,
        fetchPolicy: 'network-only',
      })
      .pipe(
        map(resp => {
          return resp.data['GetAllEvents'];
        }),
      );
  }

  getAllEventWithParam(pagination, filter, sorting, titleId, classId) {
    return this.apollo
      .query({
        query: gql`
          query GetAllEvents(
            $pagination: PaginationInput
            $filter: AcadEventFilter
            $sorting: AcadEventSorting
            $rncp_title_id: ID
            $class_id: ID
          ) {
            GetAllEvents(pagination: $pagination, filter: $filter, sorting: $sorting, rncp_title_id: $rncp_title_id, class_id: $class_id) {
              _id
              name
              from_date
              to_date
              schools {
                _id
                short_name
              }
              class_id {
                _id
                name
              }
              user_types {
                _id
                name
              }
              is_all_school
              count_document
            }
          }
        `,
        fetchPolicy: 'network-only',
        variables: {
          pagination: pagination,
          filter: filter,
          sorting: sorting,
          rncp_title_id: titleId,
          class_id: classId,
        },
      })
      .pipe(map(resp => resp.data['GetAllEvents']));
  }

  getAllEventWithParamBySchool(pagination, filter, sorting, titleId) {
    return this.apollo
      .query({
        query: gql`
          query GetAllEvents($pagination: PaginationInput, $filter: AcadEventFilter, $sorting: AcadEventSorting, $rncp_title_id: ID) {
            GetAllEvents(pagination: $pagination, filter: $filter, sorting: $sorting, rncp_title_id: $rncp_title_id) {
              _id
              name
              from_date
              to_date
              schools {
                _id
                short_name
              }
              class_id {
                _id
                name
              }
              user_types {
                _id
                name
              }
              is_all_school
              count_document
            }
          }
        `,
        fetchPolicy: 'network-only',
        variables: {
          pagination: pagination,
          filter: filter,
          sorting: sorting,
          rncp_title_id: titleId,
        },
      })
      .pipe(map(resp => resp.data['GetAllEvents']));
  }

  checkEvent(titleId, classId, pagination = { limit: 1, page: 0 }) {
    return this.apollo
      .query({
        query: gql`
          query GetAllEvents($rncp_title_id: ID, $class_id: ID, $pagination: PaginationInput) {
            GetAllEvents(rncp_title_id: $rncp_title_id, class_id: $class_id, pagination: $pagination) {
              _id
            }
          }
        `,
        fetchPolicy: 'network-only',
        variables: {
          rncp_title_id: titleId,
          class_id: classId,
          pagination,
        },
      })
      .pipe(map(resp => resp.data['GetAllEvents']));
  }

  getFolderName(acad_kit_id) {
    return this.apollo
      .query({
        query: gql`
          query GetFolderName($acad_kit_id: ID) {
            GetFolderName(acad_kit_id: $acad_kit_id)
          }
        `,
        fetchPolicy: 'network-only',
        variables: {
          acad_kit_id,
        },
      })
      .pipe(map(resp => resp.data['GetFolderName']));
  }

  duplicateDocumentMultipleFolder(document_id, folder_destination_ids) {
    return this.apollo
      .mutate({
        mutation: gql`
          mutation DuplicateDocumentMultipleFolder($document_id: ID, $folder_destination_ids: [ID]) {
            DuplicateDocumentMultipleFolder(document_id: $document_id, folder_destination_ids: $folder_destination_ids) {
              _id
            }
          }
        `,
        variables: {
          document_id,
          folder_destination_ids,
        },
      })
      .pipe(map(resp => resp.data['DuplicateDocumentMultipleFolder ']));
  }

  getAllEventDropdown(filter, titleId) {
    return this.apollo
      .query({
        query: gql`
          query GetAllEvents($filter: AcadEventFilter, $rncp_title_id: ID) {
            GetAllEvents(filter: $filter, rncp_title_id: $rncp_title_id) {
              _id
              name
              count_document
            }
          }
        `,
        fetchPolicy: 'network-only',
        variables: {
          filter: filter,
          rncp_title_id: titleId,
        },
      })
      .pipe(map(resp => resp.data['GetAllEvents']));
  }

  deleteEvent(ID: String): Observable<any> {
    return this.apollo.mutate({
      mutation: gql`
      mutation{
        DeleteEvent(_id:"${ID}"){
          _id
        }
      }
      `,
    });
  }

  getClassDropDownList(rncpId: string): Observable<{ _id: string; name: string }[]> {
    return this.apollo
      .query({
        query: gql`
      query {
        GetClassDropdownList(rncp_id : "${rncpId}"){
          _id
          name
        }
      }
      `,
        fetchPolicy: 'network-only',
      })
      .pipe(
        map(resp => {
          return resp.data['GetClassDropdownList'];
        }),
      );
  }

  getClassDropDownListAlphaOrder(rncpId: string, sorting): Observable<any> {
    return this.apollo
      .query({
        query: gql`
          query getClassDropDownList($rncp_id: String, $sorting: ClassSortingInput) {
            getClassDropDownList(rncp_id: $rncp_id, sorting: $sorting) {
              _id
              name
            }
          }
        `,
        variables: {
          rncp_id: rncpId,
          sorting: sorting,
        },
      })
      .pipe(
        map(resp => {
          return resp.data['getClassDropDownList'];
        }),
      );
  }

  getAllUserTypes(): Observable<any> {
    return this.apollo
      .query({
        query: gql`
          query {
            GetAllUserTypes {
              _id
              name
              role
            }
          }
        `,
      })
      .pipe(
        map(resp => {
          return resp.data['GetAllUserTypes'];
        }),
      );
  }

  getSchoolDropDownList(rncpId: string): Observable<any> {
    return this.apollo
      .query({
        query: gql`
          query {
            GetSchoolDropdownList(rncp_title_id : "${rncpId}") {
              _id
              short_name
            }
          }
        `,
      })
      .pipe(
        map(resp => {
          return resp.data['GetSchoolDropdownList'];
        }),
      );
  }

  getSchoolDropDownListByClass(rncpId: string, classId): Observable<any> {
    return this.apollo
      .query({
        query: gql`
          query {
            GetSchoolDropdownList(rncp_title_id : "${rncpId}", class_id: "${classId}") {
              _id
              short_name
            }
          }
        `,
      })
      .pipe(
        map(resp => {
          return resp.data['GetSchoolDropdownList'];
        }),
      );
  }

  getTaskTypeDropdownList(rncpId: string, classId: string): Observable<any> {
    return this.apollo
      .query({
        query: gql`
          query GetTaskTypeDropdownList($rncpId: ID, $classId: ID) {
            GetTaskTypeDropdownList(rncp_id: $rncpId, class_id: $classId) {
              _id
              type
              description
            }
          }
        `,
        variables: { rncpId, classId },
        fetchPolicy: 'network-only',
      })
      .pipe(map(resp => resp.data['GetTaskTypeDropdownList']));
  }

  getTaskTypeDropdownListMyTask(): Observable<any> {
    return this.apollo
      .query({
        query: gql`
          query GetTaskTypeDropdownList {
            GetTaskTypeDropdownList {
              _id
              type
              description
            }
          }
        `,
        fetchPolicy: 'network-only',
      })
      .pipe(map(resp => resp.data['GetTaskTypeDropdownList']));
  }

  getSubjectEvaluationDropdownList(rncpId: string, classId: string): Observable<any> {
    return this.apollo
      .query({
        query: gql`
          query GetSubjectEvaluationDropdownList($rncpId: ID, $classId: ID) {
            GetSubjectEvaluationDropdownList(rncp_id: $rncpId, class_id: $classId) {
              test {
                subject_id {
                  subject_name
                }
              }
            }
          }
        `,
        variables: { rncpId, classId },
        fetchPolicy: 'network-only',
      })
      .pipe(map(resp => resp.data['GetSubjectEvaluationDropdownList']));
  }

  getSchoolDropDownListAlphaOrder(rncpId: string, sorting): Observable<any> {
    return this.apollo
      .query({
        query: gql`
          query GetSchoolDropdownList($rncp_title_id: String, $sorting: ClassSortingInput) {
            GetSchoolDropdownList(rncp_title_id: $rncp_title_id, sorting: $sorting) {
              _id
              short_name
            }
          }
        `,
        variables: {
          rncp_title_id: rncpId,
          sorting: sorting,
        },
      })
      .pipe(
        map(resp => {
          return resp.data['GetSchoolDropdownList'];
        }),
      );
  }

  getOneTestIdentity(ID: String): Observable<any> {
    return this.apollo
      .query({
        query: gql`
      query{
        GetOneTest(_id:"${ID}"){
          _id
          name
          max_score
          type
          coefficient
          date
          correction_type
          organiser
          date_type
          status
        }
      }
      `,
        fetchPolicy: 'network-only',
      })
      .pipe(
        map(resp => {
          return resp.data['GetOneTest'];
        }),
      );
  }

  getOneTestUploadedDocument(ID: String): Observable<any> {
    return this.apollo
      .query({
        query: gql`
      query{
        GetOneTest(_id:"${ID}"){
          documents{
            name
            file_name
            created_at
            publication_date{
              type
              before
              day
              publication_date{
                year
                month
                date
                hour
                minute
                time_zone
              }
            }
          }
        }
      }
      `,
        fetchPolicy: 'network-only',
      })
      .pipe(
        map(resp => {
          return resp.data['GetOneTest'];
        }),
      );
  }

  getOneTestExpectedDocument(ID: String): Observable<any> {
    return this.apollo
      .query({
        query: gql`
      query{
        GetOneTest(_id:"${ID}"){
          expected_documents{
            document_name
            deadline_date{
              deadline
              type
              before
              day
            }
          }
        }
      }
      `,
        fetchPolicy: 'network-only',
      })
      .pipe(
        map(resp => {
          return resp.data['GetOneTest'];
        }),
      );
  }

  setupBasicAcademicKit(class_id: string): Observable<any> {
    return this.apollo
      .mutate({
        mutation: gql`
      mutation {
        CreateBasicAcademicKit(class_id: "${class_id}"){
          _id
        }
      }
      `,
      })
      .pipe(map(resp => resp.data['CreateBasicAcademicKit']));
  }

  getAcademicKitOfSelectedClass(classId: string): Observable<any> {
    return this.apollo
      .query({
        query: gql`
      query {
        GetOneClass(_id: "${classId}") {
          academic_kit {
            categories {
              _id
              folder_name
              is_default_folder
              sub_folders_id {
                _id
                folder_name
                school {
                  _id
                }
              }
              documents {
                _id
                document_name
                document_generation_type
                publication_date_for_schools {
                  date {
                    date
                    time
                  }
                  school {
                    _id
                  }
                }
                task_id {
                  description
                }
                type_of_document
                s3_file_name
                published_for_student
                parent_class_id {
                  _id
                  name
                }
                parent_test {
                  is_published
                  expected_documents {
                    _id
                    document_name
                  }
                  date_type
                  date {
                    date_utc
                    time_utc
                  }
                  schools {
                    school_id {
                      _id
                    }
                    test_date {
                      date_utc
                      time_utc
                    }
                  }
                }
                uploaded_for_student {
                  first_name
                  last_name
                }
                uploaded_for_other_user {
                  first_name
                  last_name
                }
                document_expected_id {
                  _id
                  document_name
                }
                publication_date {
                  type
                  before
                  day
                  publication_date {
                    date
                    time
                  }
                  relative_time
                }
                published_for_user_types_id {
                  _id
                  name
                }
                parent_folder {
                  folder_name
                }
              }
              tests {
                _id
                name
                type
                group_test
                correction_type
                with_assign_corrector
                is_published
                documents {
                  _id
                  document_name
                  type_of_document
                  s3_file_name
                  published_for_student
                  publication_date_for_schools {
                    date {
                      date
                      time
                    }
                    school {
                      _id
                    }
                  }
                  document_generation_type
                  parent_class_id {
                    _id
                    name
                  }
                  uploaded_for_student {
                    first_name
                    last_name
                  }
                  uploaded_for_other_user {
                    first_name
                    last_name
                  }
                  uploaded_for_group {
                    _id
                    name
                  }
                  published_for_user_types_id {
                    _id
                    name
                  }
                  publication_date {
                    type
                    before
                    day
                    publication_date {
                      date
                      time
                    }
                    relative_time
                  }
                  parent_test {
                    is_published
                    expected_documents {
                      _id
                      document_name
                    }
                    date_type
                    date {
                      date_utc
                      time_utc
                    }
                    schools {
                      school_id {
                        _id
                      }
                      test_date {
                        date_utc
                        time_utc
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
      `,
        fetchPolicy: 'network-only',
      })
      .pipe(map(resp => resp.data['GetOneClass']));
  }

  getAllAcademicKit(titleId: string): Observable<any[]> {
    return this.apollo
      .query({
        query: gql`
      query {
        GetAllAcadKits(rncp_title: "${titleId}") {
          _id
          title
        }
      }
      `,
        fetchPolicy: 'network-only',
      })
      .pipe(map(resp => resp.data['GetAllAcadKits']));
  }

  getFormattedAcademicKitSubFoldersByClassId(classId: string, userTypeId: string, options?: TFormatAcademicKitOptionParam) {
    return this.apollo
      .query({
        query: gql`
          query GetAcademicKitOfSelectedClass($classId: ID!, $userTypeId: ID) {
            GetOneClass(_id: $classId) {
              _id
              name
              is_class_header
              jury_process_name
              academic_kit {
                categories {
                  _id
                  class {
                    _id
                    jury_process_name
                  }
                  cv_docs {
                    _id
                    document_generation_type
                    document_name
                    parent_folder {
                      _id
                      folder_name
                    }
                    parent_rncp_title {
                      _id
                      short_name
                    }
                    s3_file_name
                    status
                    type_of_document
                    uploaded_for_student {
                      _id
                      first_name
                      last_name
                    }
                  }
                  documents {
                    _id
                    createdAt
                    created_by {
                      _id
                      civility
                      first_name
                      last_name
                    }
                    document_expected_id {
                      _id
                      document_name
                    }
                    document_generation_type
                    document_name
                    parent_class_id {
                      _id
                      name
                    }
                    parent_folder {
                      _id
                      folder_name
                    }
                    parent_test {
                      _id
                      expected_documents {
                        _id
                        document_name
                        is_for_all_student
                        is_for_all_group
                      }
                      date {
                        date_utc
                        time_utc
                      }
                      date_type
                      is_published
                      schools {
                        school_id {
                          _id
                        }
                        test_date {
                          date_utc
                          time_utc
                        }
                      }
                    }
                    publication_date_for_schools {
                      date {
                        date
                        time
                      }
                      school {
                        _id
                        short_name
                        long_name
                      }
                    }
                    publication_date {
                      before
                      day
                      publication_date {
                        date
                        time
                      }
                      relative_time
                      type
                    }
                    published_for_student
                    published_for_user_types_id {
                      _id
                      name
                    }
                    school_id {
                      _id
                    }
                    status
                    s3_file_name
                    task_id {
                      description
                    }
                    type_of_document
                    updatedAt
                    uploaded_for_group {
                      _id
                      name
                    }
                    uploaded_for_other_user {
                      first_name
                      last_name
                    }
                    uploaded_for_student {
                      _id
                      first_name
                      last_name
                    }
                    visible_to_school
                  }
                  folder_description
                  folder_name
                  form_process_id {
                    _id
                    admission_status
                    steps {
                      _id
                      step_status
                      step_title
                      step_type
                      segments {
                        questions {
                          answer
                        }
                      }
                    }
                    user_id {
                      _id
                    }
                  }
                  grand_oral_pdfs {
                    _id
                    document_generation_type
                    document_name
                    jury_organization_id {
                      _id
                    }
                    parent_folder {
                      _id
                      folder_name
                    }
                    status
                    s3_file_name
                    type_of_document
                    uploaded_for_student {
                      _id
                      first_name
                      last_name
                    }
                  }
                  dossier_bilan_pdfs {
                    _id
                    document_generation_type
                    document_name
                    jury_organization_id {
                      _id
                    }
                    parent_folder {
                      _id
                      folder_name
                    }
                    dossier_bilan_followup_id {
                      _id
                      dossier_bilan_publish_to_student {
                        status
                      }
                    }
                    status
                    s3_file_name
                    type_of_document
                    uploaded_for_student {
                      _id
                      first_name
                      last_name
                    }
                  }
                  grand_oral_result_pdfs(logged_in_user_type_id: $userTypeId) {
                    _id
                    document_generation_type
                    document_name
                    jury_organization_id {
                      _id
                    }
                    parent_folder {
                      _id
                      folder_name
                    }
                    status
                    s3_file_name
                    type_of_document
                    uploaded_for_student {
                      _id
                      first_name
                      last_name
                    }
                  }
                  is_corrector_assignment_folder
                  is_default_folder
                  is_derogation_folder
                  is_grand_oral_folder
                  is_dossier_bilan_folder
                  dossier_bilan_id {
                    _id
                  }
                  is_visible
                  jury_id {
                    _id
                    type
                  }
                  parent_folder_id {
                    _id
                    folder_name
                    is_grand_oral_folder
                    is_dossier_bilan_folder
                    dossier_bilan_id {
                      _id
                    }
                    tests {
                      _id
                    }
                  }
                  parent_rncp_title {
                    _id
                  }
                  presentation_docs {
                    _id
                    document_generation_type
                    document_name
                    parent_folder {
                      _id
                      folder_name
                    }
                    parent_rncp_title {
                      _id
                      short_name
                    }
                    status
                    s3_file_name
                    type_of_document
                    uploaded_for_student {
                      _id
                      first_name
                      last_name
                    }
                  }
                  dossier_bilan_passport_docs {
                    _id
                    document_generation_type
                    document_name
                    parent_folder {
                      _id
                      folder_name
                    }
                    parent_rncp_title {
                      _id
                      short_name
                    }
                    status
                    s3_file_name
                    type_of_document
                    uploaded_for_student {
                      _id
                      first_name
                      last_name
                    }
                  }
                  school {
                    _id
                    long_name
                    short_name
                  }
                  sub_folders_id {
                    _id
                    createdAt
                    created_by {
                      _id
                      civility
                      first_name
                      last_name
                    }
                    cv_docs {
                      _id
                      document_generation_type
                      document_name
                      parent_folder {
                        _id
                        folder_name
                      }
                      parent_rncp_title {
                        _id
                        short_name
                      }
                      status
                      s3_file_name
                      type_of_document
                      uploaded_for_student {
                        _id
                        first_name
                        last_name
                      }
                    }
                    documents {
                      _id
                      created_by {
                        _id
                        civility
                        first_name
                        last_name
                      }
                      document_expected_id {
                        _id
                        document_name
                      }
                      document_name
                      document_generation_type
                      parent_class_id {
                        _id
                        name
                      }
                      parent_test {
                        _id
                        expected_documents {
                          _id
                          document_name
                        }
                        date {
                          date_utc
                          time_utc
                        }
                        date_type
                        is_published
                        schools {
                          school_id {
                            _id
                          }
                          test_date {
                            date_utc
                            time_utc
                          }
                        }
                      }
                      publication_date_for_schools {
                        date {
                          date
                          time
                        }
                        school {
                          _id
                          long_name
                          short_name
                        }
                      }
                      publication_date {
                        before
                        day
                        publication_date {
                          date
                          time
                        }
                        relative_time
                        type
                      }
                      published_for_student
                      published_for_user_types_id {
                        _id
                        name
                      }
                      parent_folder {
                        _id
                        folder_name
                      }
                      status
                      s3_file_name
                      task_id {
                        description
                      }
                      type_of_document
                      uploaded_for_group {
                        name
                      }
                      uploaded_for_other_user {
                        first_name
                        last_name
                      }
                      uploaded_for_student {
                        first_name
                        last_name
                      }
                      visible_to_school
                    }
                    folder_description
                    folder_name
                    grand_oral_pdfs {
                      _id
                    }
                    dossier_bilan_pdfs {
                      _id
                      dossier_bilan_followup_id {
                        _id
                        dossier_bilan_publish_to_student {
                          status
                        }
                      }
                    }
                    grand_oral_result_pdfs(logged_in_user_type_id: $userTypeId) {
                      _id
                    }
                    is_derogation_folder
                    is_corrector_assignment_folder
                    is_grand_oral_folder
                    is_dossier_bilan_folder
                    dossier_bilan_id {
                      _id
                    }
                    jury_id {
                      _id
                      type
                    }
                    presentation_docs {
                      _id
                      document_generation_type
                      document_name
                      parent_folder {
                        _id
                        folder_name
                      }
                      parent_rncp_title {
                        _id
                        short_name
                      }
                      status
                      s3_file_name
                      type_of_document
                      uploaded_for_student {
                        _id
                        first_name
                        last_name
                      }
                    }
                    dossier_bilan_passport_docs {
                      _id
                      document_generation_type
                      document_name
                      parent_folder {
                        _id
                        folder_name
                      }
                      parent_rncp_title {
                        _id
                        short_name
                      }
                      status
                      s3_file_name
                      type_of_document
                      uploaded_for_student {
                        _id
                        first_name
                        last_name
                      }
                    }
                    school {
                      _id
                    }
                    sub_folders_id {
                      _id
                      folder_name
                    }
                    task_id {
                      _id
                    }
                    tests {
                      _id
                    }
                    updatedAt
                  }
                  task_id {
                    _id
                  }
                  tests {
                    _id
                    correction_type
                    createdAt
                    created_by {
                      _id
                      civility
                      first_name
                      last_name
                    }
                    documents {
                      _id
                      document_generation_type
                      document_name
                      parent_class_id {
                        _id
                        name
                      }
                      parent_test {
                        _id
                        is_published
                        expected_documents {
                          _id
                          document_name
                        }
                        date {
                          date_utc
                          time_utc
                        }
                        date_type
                        expected_documents {
                          _id
                          document_name
                        }
                        is_published
                        schools {
                          school_id {
                            _id
                          }
                          test_date {
                            date_utc
                            time_utc
                          }
                        }
                      }
                      publication_date {
                        before
                        day
                        publication_date {
                          date
                          time
                        }
                        relative_time
                        type
                      }
                      publication_date_for_schools {
                        date {
                          date
                          time
                        }
                        school {
                          _id
                        }
                      }
                      published_for_student
                      published_for_user_types_id {
                        _id
                        name
                      }
                      status
                      s3_file_name
                      type_of_document
                      uploaded_for_group {
                        _id
                        name
                      }
                      uploaded_for_other_user {
                        first_name
                        last_name
                      }
                      uploaded_for_student {
                        first_name
                        last_name
                      }
                    }
                    evaluation_id {
                      result_visibility
                    }
                    group_test
                    is_published
                    name
                    type
                    updatedAt
                    with_assign_corrector
                  }
                }
              }
            }
          }
        `,
        variables: {
          classId,
          userTypeId,
        },
        fetchPolicy: 'network-only',
      })
      .pipe(
        map(resp => resp.data['GetOneClass']),
        withLatestFrom(this.translate.onLangChange.pipe(startWith(this.translate.currentLang))),
        switchMap(([respClass]) => {
          const classData = _.cloneDeep(respClass)
          if (!classData?.academic_kit?.categories) {
            classData.academic_kit.categories = [];
          }
          classData.academic_kit.categories = (Array.isArray(classData?.academic_kit?.categories)
            ? classData.academic_kit.categories
            : []
          ).map(category => {
            const index = this._getFolderIndexByName(category?.folder_name) as any;
            const option: TFormatAcademicKitOptionParam = {
              ...options,
              folder_index: index,
              is_root_folder: false,
            };
            return this._formatAcadKitData(category, option);
          });
          return of(classData);
        }),
      );
  }

  getFormattedAcademicKitSubFolders(acadKitId: string, userTypeId: string, options?: TFormatAcademicKitOptionParam) {
    return this.apollo
      .query({
        query: gql`
          query GetAcadKitSubFolder($acadKitId: ID!, $userTypeId: ID, $checkVisible: Boolean) {
            GetOneAcadKit(_id: $acadKitId, check_visible: $checkVisible) {
              _id
              class {
                _id
                jury_process_name
              }
              cv_docs {
                _id
                document_generation_type
                document_name
                parent_folder {
                  _id
                  folder_name
                }
                parent_rncp_title {
                  _id
                  short_name
                }
                s3_file_name
                status
                type_of_document
                uploaded_for_student {
                  _id
                  first_name
                  last_name
                }
              }
              documents {
                _id
                createdAt
                created_by {
                  _id
                  civility
                  first_name
                  last_name
                }
                document_expected_id {
                  _id
                  document_name
                }
                document_generation_type
                document_name
                parent_class_id {
                  _id
                  name
                }
                parent_folder {
                  _id
                  folder_name
                }
                parent_test {
                  _id
                  expected_documents {
                    _id
                    document_name
                    is_for_all_student
                    is_for_all_group
                  }
                  date {
                    date_utc
                    time_utc
                  }
                  date_type
                  is_published
                  schools {
                    school_id {
                      _id
                    }
                    test_date {
                      date_utc
                      time_utc
                    }
                  }
                }
                publication_date_for_schools {
                  date {
                    date
                    time
                  }
                  school {
                    _id
                    short_name
                    long_name
                  }
                }
                publication_date {
                  before
                  day
                  publication_date {
                    date
                    time
                  }
                  relative_time
                  type
                }
                published_for_student
                published_for_user_types_id {
                  _id
                  name
                }
                school_id {
                  _id
                }
                status
                s3_file_name
                task_id {
                  description
                }
                type_of_document
                updatedAt
                uploaded_for_group {
                  _id
                  name
                }
                uploaded_for_other_user {
                  first_name
                  last_name
                }
                uploaded_for_student {
                  _id
                  first_name
                  last_name
                }
                visible_to_school
                is_derogation_rejected_file
              }
              folder_description
              folder_name
              form_process_id {
                _id
                admission_status
                steps {
                  _id
                  step_status
                  step_title
                  step_type
                  segments {
                    questions {
                      answer
                    }
                  }
                }
                user_id {
                  _id
                }
              }
              grand_oral_pdfs {
                _id
                document_generation_type
                document_name
                jury_organization_id {
                  _id
                }
                parent_folder {
                  _id
                  folder_name
                }
                status
                s3_file_name
                type_of_document
                uploaded_for_student {
                  _id
                  first_name
                  last_name
                }
              }
              dossier_bilan_pdfs {
                _id
                document_generation_type
                document_name
                jury_organization_id {
                  _id
                }
                parent_folder {
                  _id
                  folder_name
                }
                dossier_bilan_followup_id {
                  _id
                  dossier_bilan_publish_to_student {
                    status
                  }
                }
                status
                s3_file_name
                type_of_document
                uploaded_for_student {
                  _id
                  first_name
                  last_name
                }
              }
              grand_oral_result_pdfs(logged_in_user_type_id: $userTypeId) {
                _id
                document_generation_type
                document_name
                jury_organization_id {
                  _id
                }
                parent_folder {
                  _id
                  folder_name
                }
                status
                s3_file_name
                type_of_document
                uploaded_for_student {
                  _id
                  first_name
                  last_name
                }
              }
              is_corrector_assignment_folder
              is_default_folder
              is_derogation_folder
              is_grand_oral_folder
              is_dossier_bilan_folder
              dossier_bilan_id {
                _id
              }
              is_visible
              jury_id {
                _id
                type
              }
              parent_folder_id {
                _id
                folder_name
                is_grand_oral_folder
                is_dossier_bilan_folder
                dossier_bilan_id {
                  _id
                }
                tests {
                  _id
                }
              }
              parent_rncp_title {
                _id
              }
              presentation_docs {
                _id
                document_generation_type
                document_name
                parent_folder {
                  _id
                  folder_name
                }
                parent_rncp_title {
                  _id
                  short_name
                }
                status
                s3_file_name
                type_of_document
                uploaded_for_student {
                  _id
                  first_name
                  last_name
                }
              }
              dossier_bilan_passport_docs {
                _id
                document_generation_type
                document_name
                parent_folder {
                  _id
                  folder_name
                }
                parent_rncp_title {
                  _id
                  short_name
                }
                status
                s3_file_name
                type_of_document
                uploaded_for_student {
                  _id
                  first_name
                  last_name
                }
              }
              school {
                _id
                long_name
                short_name
              }
              sub_folders_id {
                _id
                createdAt
                created_by {
                  _id
                  civility
                  first_name
                  last_name
                }
                cv_docs {
                  _id
                  document_generation_type
                  document_name
                  parent_folder {
                    _id
                    folder_name
                  }
                  parent_rncp_title {
                    _id
                    short_name
                  }
                  status
                  s3_file_name
                  type_of_document
                  uploaded_for_student {
                    _id
                    first_name
                    last_name
                  }
                }
                documents {
                  _id
                  created_by {
                    _id
                    civility
                    first_name
                    last_name
                  }
                  document_expected_id {
                    _id
                    document_name
                  }
                  document_name
                  document_generation_type
                  parent_class_id {
                    _id
                    name
                  }
                  parent_test {
                    _id
                    expected_documents {
                      _id
                      document_name
                    }
                    date {
                      date_utc
                      time_utc
                    }
                    date_type
                    is_published
                    schools {
                      school_id {
                        _id
                      }
                      test_date {
                        date_utc
                        time_utc
                      }
                    }
                  }
                  publication_date_for_schools {
                    date {
                      date
                      time
                    }
                    school {
                      _id
                      long_name
                      short_name
                    }
                  }
                  publication_date {
                    before
                    day
                    publication_date {
                      date
                      time
                    }
                    relative_time
                    type
                  }
                  published_for_student
                  published_for_user_types_id {
                    _id
                    name
                  }
                  parent_folder {
                    _id
                    folder_name
                  }
                  status
                  s3_file_name
                  task_id {
                    description
                  }
                  type_of_document
                  uploaded_for_group {
                    name
                  }
                  uploaded_for_other_user {
                    first_name
                    last_name
                  }
                  uploaded_for_student {
                    first_name
                    last_name
                  }
                  visible_to_school
                }
                folder_description
                folder_name
                grand_oral_pdfs {
                  _id
                }
                dossier_bilan_pdfs {
                  _id
                  dossier_bilan_followup_id {
                    _id
                    dossier_bilan_publish_to_student {
                      status
                    }
                  }
                }
                grand_oral_result_pdfs(logged_in_user_type_id: $userTypeId) {
                  _id
                }
                is_derogation_folder
                is_corrector_assignment_folder
                is_grand_oral_folder
                is_dossier_bilan_folder
                dossier_bilan_id {
                  _id
                }
                jury_id {
                  _id
                  type
                }
                presentation_docs {
                  _id
                  document_generation_type
                  document_name
                  parent_folder {
                    _id
                    folder_name
                  }
                  parent_rncp_title {
                    _id
                    short_name
                  }
                  status
                  s3_file_name
                  type_of_document
                  uploaded_for_student {
                    _id
                    first_name
                    last_name
                  }
                }
                dossier_bilan_passport_docs {
                  _id
                  document_generation_type
                  document_name
                  parent_folder {
                    _id
                    folder_name
                  }
                  parent_rncp_title {
                    _id
                    short_name
                  }
                  status
                  s3_file_name
                  type_of_document
                  uploaded_for_student {
                    _id
                    first_name
                    last_name
                  }
                }
                school {
                  _id
                }
                sub_folders_id {
                  _id
                  folder_name
                }
                task_id {
                  _id
                }
                tests {
                  _id
                }
                updatedAt
              }
              task_id {
                _id
              }
              tests {
                _id
                correction_type
                createdAt
                created_by {
                  _id
                  civility
                  first_name
                  last_name
                }
                documents {
                  _id
                  document_generation_type
                  document_name
                  parent_class_id {
                    _id
                    name
                  }
                  parent_test {
                    _id
                    is_published
                    expected_documents {
                      _id
                      document_name
                    }
                    date {
                      date_utc
                      time_utc
                    }
                    date_type
                    expected_documents {
                      _id
                      document_name
                    }
                    is_published
                    schools {
                      school_id {
                        _id
                      }
                      test_date {
                        date_utc
                        time_utc
                      }
                    }
                  }
                  publication_date {
                    before
                    day
                    publication_date {
                      date
                      time
                    }
                    relative_time
                    type
                  }
                  publication_date_for_schools {
                    date {
                      date
                      time
                    }
                    school {
                      _id
                    }
                  }
                  published_for_student
                  published_for_user_types_id {
                    _id
                    name
                  }
                  status
                  s3_file_name
                  type_of_document
                  uploaded_for_group {
                    _id
                    name
                  }
                  uploaded_for_other_user {
                    first_name
                    last_name
                  }
                  uploaded_for_student {
                    first_name
                    last_name
                  }
                }
                evaluation_id {
                  result_visibility
                }
                group_test
                is_published
                name
                type
                updatedAt
                with_assign_corrector
              }
            }
          }
        `,
        variables: {
          acadKitId,
          userTypeId,
          // True if it is folder 06
          checkVisible: options?.folder_index === 6,
        },
        fetchPolicy: 'network-only',
      })
      .pipe(
        map(response => response.data['GetOneAcadKit']),
        withLatestFrom(this.translate.onLangChange.pipe(startWith(this.translate.currentLang))),
        switchMap(([acadKitData]) => of(this._formatAcadKitData(acadKitData, options))),
      );
  }

  getAcademicKitSubfolders(acadKitId: string, userTypeId, check_visible?): Observable<any> {
    return this.apollo
      .query({
        query: gql`
      query ($check_visible: Boolean) {
        GetOneAcadKit(_id: "${acadKitId}", check_visible: $check_visible) {
          is_visible
          is_derogation_folder
          documents {
            _id
            status
            document_name
            type_of_document
            s3_file_name
            visible_to_school
            task_id {
              description
            }
            publication_date_for_schools {
              date {
                date
                time
              }
              school {
                _id
              }
            }
            published_for_student
            parent_class_id {
              _id
              name
            }
            parent_test {
              _id
              is_published
              expected_documents {
                _id
                document_name
                is_for_all_student
                is_for_all_group
              }
              date_type
              date {
                date_utc
                time_utc
              }
              schools {
                school_id {
                  _id
                }
                test_date {
                  date_utc
                  time_utc
                }
              }
            }
            uploaded_for_student {
              _id
              first_name
              last_name
            }
            uploaded_for_other_user {
              first_name
              last_name
            }
            uploaded_for_group {
              _id
              name
            }
            document_expected_id {
              _id
              document_name
            }
            publication_date {
              type
              before
              day
              publication_date {
                date
                time
              }
              relative_time
            }
            published_for_user_types_id {
              _id
              name
            }
            document_generation_type
            parent_folder {
              folder_name
            }
          }
          grand_oral_pdfs {
            _id
            document_name
            status
            type_of_document
            document_generation_type
            parent_folder {
              _id
              folder_name
            }
            s3_file_name
            uploaded_for_student {
              _id
              first_name
              last_name
            }
            jury_organization_id {
              _id
            }
          }
          dossier_bilan_pdfs {
            _id
            document_name
            status
            type_of_document
            document_generation_type
            parent_folder {
              _id
              folder_name
            }
            s3_file_name
            uploaded_for_student {
              _id
              first_name
              last_name
            }
            dossier_bilan_followup_id {
              _id
              dossier_bilan_publish_to_student {
                status
              }
            }
            jury_organization_id {
              _id
            }
          }
          grand_oral_result_pdfs(logged_in_user_type_id: "${userTypeId}") {
            _id
            document_name
            type_of_document
            document_generation_type
            status
            parent_folder {
              _id
              folder_name
            }
            s3_file_name
            uploaded_for_student {
              _id
              first_name
              last_name
            }
            jury_organization_id {
              _id
            }
          }
          cv_docs {
            _id
            document_name
            type_of_document
            document_generation_type
            status
            parent_folder {
              _id
              folder_name
            }
            parent_rncp_title {
              _id
              short_name
            }
            s3_file_name
            uploaded_for_student {
              _id
              first_name
              last_name
            }
          }
          presentation_docs {
            _id
            document_name
            type_of_document
            status
            document_generation_type
            parent_folder {
              _id
              folder_name
            }
            parent_rncp_title {
              _id
              short_name
            }
            s3_file_name
            uploaded_for_student {
              _id
              first_name
              last_name
            }
          }
          dossier_bilan_passport_docs {
            _id
            document_name
            type_of_document
            status
            document_generation_type
            parent_folder {
              _id
              folder_name
            }
            parent_rncp_title {
              _id
              short_name
            }
            s3_file_name
            uploaded_for_student {
              _id
              first_name
              last_name
            }
          }
          sub_folders_id {
            _id
            folder_name
            is_grand_oral_folder
            is_dossier_bilan_folder
            dossier_bilan_id {
              _id
            }
            school {
              _id
            }
            is_derogation_folder
            cv_docs {
              _id
              document_name
              type_of_document
              document_generation_type
              status
              parent_folder {
                _id
                folder_name
              }
              parent_rncp_title {
                _id
                short_name
              }
              s3_file_name
              uploaded_for_student {
                _id
                first_name
                last_name
              }
            }
            presentation_docs {
              _id
              document_name
              type_of_document
              status
              document_generation_type
              parent_folder {
                _id
                folder_name
              }
              s3_file_name
              uploaded_for_student {
                _id
                first_name
                last_name
              }
              parent_rncp_title {
                _id
                short_name
              }
            }
            dossier_bilan_passport_docs {
              _id
              document_name
              type_of_document
              status
              document_generation_type
              parent_folder {
                _id
                folder_name
              }
              s3_file_name
              uploaded_for_student {
                _id
                first_name
                last_name
              }
              parent_rncp_title {
                _id
                short_name
              }
            }
            jury_id {
              _id
              type
            }
              task_id {
              _id
            }
            is_corrector_assignment_folder
          }
          school {
            _id
          }
          class {
            _id
          }
          parent_rncp_title {
            _id
          }
          tests {
            _id
            name
            type
            group_test
            correction_type
            with_assign_corrector
            is_published
            evaluation_id {
              result_visibility
            }
            documents {
              _id
              status
              document_name
              type_of_document
              s3_file_name
              published_for_student
              publication_date_for_schools {
                date {
                  date
                  time
                }
                school {
                  _id
                }
              }
              document_generation_type
              parent_class_id {
                _id
                name
              }
              uploaded_for_student {
                first_name
                last_name
              }
              uploaded_for_other_user {
                first_name
                last_name
              }
              uploaded_for_group {
                _id
                name
              }
              published_for_user_types_id {
                _id
                name
              }
              publication_date {
                type
                before
                day
                publication_date {
                  date
                  time
                }
                relative_time
              }
              parent_test {
                is_published
                expected_documents {
                  _id
                  document_name
                }
                date_type
                date {
                  date_utc
                  time_utc
                }
                schools {
                  school_id {
                    _id
                  }
                  test_date {
                    date_utc
                    time_utc
                  }
                }
              }
            }
          }
          jury_id {
            _id
            type
          }
          form_process_id {
            _id
            admission_status
            steps {
              _id
              step_title
              step_status
              step_type
              segments {
                questions {
                  answer
                }
              }
            }
            user_id {
              _id
            }
          }
        }
      }
      `,
        fetchPolicy: 'network-only',
        variables: {
          check_visible: check_visible ? true : false,
        },
      })
      .pipe(map(resp => resp.data['GetOneAcadKit']));
  }

  getAcademicKitSubfoldersMoveDialog(acadKitId: string, check_visible?): Observable<any> {
    return this.apollo
      .query({
        query: gql`
      query ($check_visible: Boolean) {
        GetOneAcadKit(_id: "${acadKitId}", check_visible: $check_visible) {
          is_visible
          documents {
            _id
            status
            document_name
            type_of_document
            s3_file_name
            publication_date_for_schools {
              date {
                date
                time
              }
              school {
                _id
              }
            }
            published_for_student
            parent_class_id {
              _id
              name
            }
            parent_test {
              _id
              is_published
              expected_documents {
                _id
                document_name
                is_for_all_student
                is_for_all_group
              }
              date_type
              date {
                date_utc
                time_utc
              }
              schools {
                school_id {
                  _id
                }
                test_date {
                  date_utc
                  time_utc
                }
              }
            }
            uploaded_for_student {
              _id
              first_name
              last_name
            }
            uploaded_for_other_user {
              first_name
              last_name
            }
            uploaded_for_group {
              _id
              name
            }
            document_expected_id {
              _id
              document_name
            }
            publication_date {
              type
              before
              day
              publication_date {
                date
                time
              }
              relative_time
            }
            published_for_user_types_id {
              _id
              name
            }
            document_generation_type
            parent_folder {
              folder_name
            }
          }
          grand_oral_pdfs {
            _id
            document_name
            type_of_document
            document_generation_type
            parent_folder {
              _id
              folder_name
            }
            s3_file_name
            uploaded_for_student {
              _id
              first_name
              last_name
            }
            jury_organization_id {
              _id
            }
          }
          dossier_bilan_pdfs {
            _id
            document_name
            type_of_document
            document_generation_type
            parent_folder {
              _id
              folder_name
            }
            s3_file_name
            uploaded_for_student {
              _id
              first_name
              last_name
            }
            dossier_bilan_followup_id {
              _id
              dossier_bilan_publish_to_student {
                status
              }
            }
            jury_organization_id {
              _id
            }
          }
          sub_folders_id {
            _id
            folder_name
            is_grand_oral_folder
            is_dossier_bilan_folder
            dossier_bilan_id {
              _id
            }
            is_derogation_folder
            cv_docs {
              _id
              document_name
              type_of_document
              document_generation_type
              parent_folder {
                _id
                folder_name
              }
              s3_file_name
              uploaded_for_student {
                _id
                first_name
                last_name
              }
            }
            presentation_docs {
              _id
              document_name
              type_of_document
              document_generation_type
              parent_folder {
                _id
                folder_name
              }
              s3_file_name
              uploaded_for_student {
                _id
                first_name
                last_name
              }
            }
            dossier_bilan_passport_docs {
              _id
              document_name
              type_of_document
              document_generation_type
              parent_folder {
                _id
                folder_name
              }
              s3_file_name
              uploaded_for_student {
                _id
                first_name
                last_name
              }
            }
            jury_id {
              _id
            }
          }
          school {
            _id
          }
          class {
            _id
          }
          parent_rncp_title {
            _id
          }
          tests {
            _id
            name
            type
            group_test
            correction_type
            is_published
            evaluation_id {
              result_visibility
            }
            documents {
              _id
              status
              document_name
              type_of_document
              s3_file_name
              published_for_student
              publication_date_for_schools {
                date {
                  date
                  time
                }
                school {
                  _id
                }
              }
              document_generation_type
              parent_class_id {
                _id
                name
              }
              uploaded_for_student {
                first_name
                last_name
              }
              uploaded_for_other_user {
                first_name
                last_name
              }
              uploaded_for_group {
                _id
                name
              }
              published_for_user_types_id {
                _id
                name
              }
              publication_date {
                type
                before
                day
                publication_date {
                  date
                  time
                }
                relative_time
              }
              parent_test {
                is_published
                expected_documents {
                  _id
                  document_name
                }
                date_type
                date {
                  date_utc
                  time_utc
                }
                schools {
                  school_id {
                    _id
                  }
                  test_date {
                    date_utc
                    time_utc
                  }
                }
              }
            }
          }
          jury_id {
              _id
            }
        }
      }
      `,
        fetchPolicy: 'network-only',
        variables: {
          check_visible: check_visible ? true : false,
        },
      })
      .pipe(map(resp => resp.data['GetOneAcadKit']));
  }

  getAcademicKitParentFolder(acadKitId: string): Observable<any> {
    return this.apollo
      .query({
        query: gql`
      query {
        GetOneAcadKit(_id: "${acadKitId}") {
          parent_folder_id {
            _id
            folder_name
          }
        }
      }
      `,
        fetchPolicy: 'network-only',
      })
      .pipe(map(resp => resp.data['GetOneAcadKit']));
  }

  getAcademicKitDetail(acadKitId: string): Observable<any> {
    return this.apollo
      .query({
        query: gql`
      query {
        GetOneAcadKit(_id: "${acadKitId}") {
          _id
          folder_name
          folder_description
          is_default_folder
          parent_folder_id{
            _id
            folder_name
            sub_folders_id {
              _id
              folder_name
            }
          }
          sub_folders_id {
            _id
            folder_name
          }
          documents {
            _id
            document_name
            type_of_document
            s3_file_name
            published_for_student
            visible_to_school
            document_generation_type
            publication_date_for_schools {
              date {
                date
                time
              }
              school {
                _id
              }
            }
            parent_class_id {
              _id
              name
            }
          }
          tests {
            _id
            name
          }
        }
      }
      `,
        fetchPolicy: 'network-only',
      })
      .pipe(map(resp => resp.data['GetOneAcadKit']));
  }

  addAcademicKitFolder(data: any): Observable<any> {
    return this.apollo
      .mutate({
        mutation: gql`
          mutation CreateAcadKit($acadKitInput: AcadKitInput) {
            CreateAcadKit(kit_input: $acadKitInput) {
              _id
              folder_name
            }
          }
        `,
        variables: { acadKitInput: data },
      })
      .pipe(map(resp => resp.data['CreateAcadKit']));
  }

  updateAcademicKitFolder(folderId: string, data: any): Observable<any> {
    return this.apollo
      .mutate({
        mutation: gql`
          mutation UpdateAcadKit($acadKitId: ID!, $acadKitInput: AcadKitInput) {
            UpdateAcadKit(_id: $acadKitId, kit_input: $acadKitInput) {
              _id
              folder_name
            }
          }
        `,
        variables: {
          acadKitId: folderId,
          acadKitInput: data,
        },
      })
      .pipe(map(resp => resp.data['UpdateAcadKit']));
  }

  deleteAcademicKitFolder(folderId: string): Observable<any> {
    return this.apollo
      .mutate({
        mutation: gql`
      mutation {
        DeleteAcadKit(_id: "${folderId}") {
          _id
        }
      }
      `,
      })
      .pipe(map(resp => resp.data['DeleteAcadKit']));
  }

  duplicateAcademicKit(class_id: string, class_id_destination: string): Observable<any> {
    return this.apollo
      .mutate({
        mutation: gql`
      mutation {
        DuplicateAcadKit(class_id: "${class_id}", class_id_destination: "${class_id_destination}") {
          _id
        }
      }
      `,
      })
      .pipe(map(resp => resp.data['DuplicateAcadKit']));
  }

  createAcadDoc(data: any): Observable<{ _id: string; document_name: string }> {
    return this.apollo
      .mutate({
        mutation: gql`
          mutation CreateAcadDoc($data: AcadDocumentInput) {
            CreateAcadDoc(doc_input: $data) {
              _id
              document_name
            }
          }
        `,
        variables: {
          data: data,
        },
      })
      .pipe(map(resp => resp.data['CreateAcadDoc']));
  }

  AddDocumentToAcadKitZeroSix(schoolId: string, testId: string, documentId: string): Observable<any> {
    return this.apollo
      .mutate({
        mutation: gql`
      mutation {
        AddDocumentToAcadKitZeroSix(
          school_id: "${schoolId}"
          test_id: "${testId}"
          documents_id: "${documentId}"
        ) {
          _id
          folder_name
        }
      }
      `,
      })
      .pipe(map(resp => resp.data['AddDocumentToAcadKitZeroSix']));
  }

  createAcadDocJustify(data: any): Observable<any> {
    return this.apollo
      .mutate({
        mutation: gql`
          mutation CreateAcadDoc($data: AcadDocumentInput) {
            CreateAcadDoc(doc_input: $data) {
              _id
              document_name
              s3_file_name
            }
          }
        `,
        variables: {
          data: data,
        },
      })
      .pipe(map(resp => resp.data['CreateAcadDoc']));
  }

  addDocToAcadKit06(schoolId, testId, documentId): Observable<any> {
    return this.apollo
      .mutate({
        mutation: gql`
          mutation addDocToAcadKit06($school_id: ID!, $test_id: ID!, $documents_id: [ID]) {
            AddDocumentToAcadKitZeroSix(school_id: $school_id, test_id: $test_id, documents_id: $documents_id) {
              _id
              folder_name
            }
          }
        `,
        variables: {
          school_id: schoolId,
          test_id: testId,
          documents_id: documentId,
        },
      })
      .pipe(map(resp => resp.data['AddDocumentToAcadKitZeroSix']));
  }

  deleteAcadDoc(id: any): Observable<any> {
    return this.apollo
      .mutate({
        mutation: gql`
      mutation {
        DeleteAcadDoc(_id: "${id}") {
          _id
        }
      }`,
      })
      .pipe(map(resp => resp.data));
  }

  updateAcadDoc(_id: any, data: any): Observable<any> {
    return this.apollo
      .mutate({
        mutation: gql`
      mutation UpdateAcadDoc($data: AcadDocumentInput){
        UpdateAcadDoc(_id: "${_id}" doc_input: $data) {
          _id
          parent_folder {
            folder_name
          }
        }
      }`,
        variables: { data: data },
      })
      .pipe(map(resp => resp.data));
  }

  updateTest(testId: string, payload: TestCreationPayloadData): Observable<TestCreationRespData> {
    return this.apollo
      .mutate({
        mutation: gql`
          mutation UpdateTest($id: ID!, $input: TestInput) {
            UpdateTest(_id: $id, test_input: $input) {
              _id
              parent_category {
                folder_name
              }
            }
          }
        `,
        variables: {
          id: testId,
          input: payload,
        },
      })
      .pipe(map(resp => resp.data['UpdateTest']));
  }

  getTaskIdForAcadKit(filter: any, userLoginType?: string) {
    return this.apollo
      .query({
        query: gql`
          query GetAllTasks($filter: TaskFilterInput) {
            GetAllTasks(filter: $filter, ${userLoginType ? `user_login_type: "${userLoginType}"` : ``}) {
              _id
              test{
                _id
              }
            }
          }
        `,
        variables: {
          filter,
        },
        fetchPolicy: 'network-only',
      })
      .pipe(
        map(resp => {
          return resp.data['GetAllTasks'];
        }),
      );
  }

  getOneDoc(docId: string) {
    return this.apollo
      .query({
        query: gql`
          query {
            GetOneDoc(_id: "${docId}") {
              _id
              document_name
              s3_file_name
            }
          }
        `,
        fetchPolicy: 'network-only',
      })
      .pipe(
        map(resp => {
          return resp.data['GetOneDoc'];
        }),
      );
  }

  getExpectedDocumentDetails(docId: string) {
    return this.apollo
      .query({
        query: gql`
          query {
            GetOneDoc(_id: "${docId}") {
              _id
              document_name
              type_of_document
              document_title
              document_industry
              s3_file_name
              task_id{
                _id
                description
                due_date{
                  date
                  time
                }
                for_each_student
                student_id{
                  _id
                  first_name
                  last_name
                  civility
                }
                rncp{
                  _id
                  short_name
                }
                test{
                  _id
                  name
                }
                user_selection {
                  user_type_id{
                    _id
                    name
                  }
                  user_id {
                    student_id{
                      _id
                      first_name
                      last_name
                      civility
                    }
                  }
                }
              }
              document_expected_id{
                _id
                document_name
                file_type
                deadline_date{
                  type
                  before
                  day
                  deadline{
                    date
                    time
                  }
                }
              }
              parent_test {
                _id
                name
                is_published
              }
            }
          }
        `,
        fetchPolicy: 'network-only',
      })
      .pipe(
        map(resp => {
          return resp.data['GetOneDoc'];
        }),
      );
  }

  AddDocumentToAcadKitZeroSixManualTask(schoolId: string, documentId: string[], titleId: string, classId: string): Observable<any> {
    return this.apollo
      .mutate({
        mutation: gql`
          mutation AddDocumentZeroSixManual($school_id: ID!, $documents_id: [ID], $rncp_title: ID, $class_id: ID) {
            AddDocumentToAcadKitZeroSix(school_id: $school_id, documents_id: $documents_id, rncp_title: $rncp_title, class_id: $class_id) {
              _id
            }
          }
        `,
        variables: {
          school_id: schoolId,
          documents_id: documentId,
          rncp_title: titleId,
          class_id: classId,
        },
      })
      .pipe(map(resp => resp.data['AddDocumentToAcadKitZeroSix']));
  }

  getNumberofStudentandGroup(schoolId: string, class_id: string, test_id: string) {
    return this.apollo
      .query({
        query: gql`
        query {
          GetNumberOfStudents(school_id: "${schoolId}", class_id: "${class_id}", test_id: "${test_id}") {
            number_of_group
            number_of_student
          }
        }
      `,
        fetchPolicy: 'network-only',
      })
      .pipe(map(resp => resp.data['GetNumberOfStudents']));
  }

  getPresentationCvCount(jury_id, rncp_id, school_id) {
    return this.apollo
      .query({
        query: gql`
          query GetPresentationCvCount($jury_id: ID, $rncp_id: ID, $school_id: ID) {
            GetPresentationCvCount(jury_id: $jury_id, rncp_id: $rncp_id, school_id: $school_id) {
              cv {
                student_count
                to_show
              }
              presentation {
                student_count
                to_show
              }
            }
          }
        `,
        fetchPolicy: 'network-only',
        variables: {
          jury_id,
          rncp_id,
          school_id,
        },
      })
      .pipe(
        map(resp => {
          return resp.data['GetPresentationCvCount'];
        }),
      );
  }

  getDossierBilanPassportCount(dossier_bilan_id, rncp_id, school_id) {
    return this.apollo
      .mutate({
        mutation: gql`
          mutation GetDossierBilanPassportCount($dossier_bilan_id: ID, $rncp_id: ID, $school_id: ID) {
            GetDossierBilanPassportCount(dossier_bilan_id: $dossier_bilan_id, rncp_id: $rncp_id, school_id: $school_id) {
              passport {
                student_count
                to_show
              }
            }
          }
        `,
        variables: {
          dossier_bilan_id,
          rncp_id,
          school_id,
        },
      })
      .pipe(
        map(resp => {
          return resp.data['GetDossierBilanPassportCount'];
        }),
      );
  }

  validateOrRejectCvAndPresentation(doc_id, validation_status) {
    return this.apollo
      .mutate({
        mutation: gql`
          mutation ValidateOrRejectCvAndPresentation($doc_id: ID!, $validation_status: EnumTestCorrectionValidationStatus!, $lang: String) {
            ValidateOrRejectCvAndPresentation(doc_id: $doc_id, validation_status: $validation_status, lang: $lang) {
              _id
            }
          }
        `,
        variables: {
          doc_id,
          validation_status,
          lang: this.translate.currentLang,
        },
      })
      .pipe(map(resp => resp.data['ValidateOrRejectCvAndPresentation']));
  }

  getGrandOralPDF(jury_id, student_id, user_type_id) {
    return this.apollo
      .query({
        query: gql`
          query GetGrandOralPDF($jury_id: ID, $student_id: ID, $user_type_id: ID) {
            GetGrandOralPDF(jury_id: $jury_id, student_id: $student_id, user_type_id: $user_type_id)
          }
        `,
        fetchPolicy: 'network-only',
        variables: {
          jury_id,
          student_id,
          user_type_id,
        },
      })
      .pipe(
        map(resp => {
          return resp.data['GetGrandOralPDF'];
        }),
      );
  }

  getGrandOralPDFCount(jury_id, rncp_id, school_id) {
    return this.apollo
      .query({
        query: gql`
          query GetGrandOralPDFCount($jury_id: ID, $rncp_id: ID, $school_id: ID) {
            GetGrandOralPDFCount(jury_id: $jury_id, rncp_id: $rncp_id, school_id: $school_id) {
              grand_oral_pdf {
                student_count
              }
            }
          }
        `,
        fetchPolicy: 'network-only',
        variables: {
          jury_id,
          rncp_id,
          school_id,
        },
      })
      .pipe(
        map(resp => {
          return resp.data['GetGrandOralPDFCount'];
        }),
      );
  }

  downloadFolderDocumentsAsZip(sub_folder_id: string): Observable<any> {
    return this.apollo
      .mutate({
        mutation: gql`
          mutation DownloadFolderDocumentsAsZip($sub_folder_id: ID!) {
            DownloadFolderDocumentsAsZip(sub_folder_id: $sub_folder_id) {
              pathName
            }
          }
        `,
        variables: {
          sub_folder_id,
        },
      })
      .pipe(map(resp => resp.data['DownloadFolderDocumentsAsZip']));
  }

  regenerateGrandOralResultPdf(jury_id, school_id, class_id, rncp_title_id) {
    return this.apollo
      .mutate({
        mutation: gql`
          mutation RegenerateGrandOralResultPdf($jury_id: ID!, $school_id: ID!, $class_id: ID, $rncp_title_id: ID, $lang: String) {
            RegenerateGrandOralResultPdf(
              jury_id: $jury_id
              school_id: $school_id
              class_id: $class_id
              rncp_title_id: $rncp_title_id
              lang: $lang
            )
          }
        `,
        variables: {
          jury_id,
          school_id,
          class_id,
          rncp_title_id,
          lang: this.translate.currentLang,
        },
      })
      .pipe(map(resp => resp.data['RegenerateGrandOralResultPdf']));
  }

  getAllAcadKitForQuickSearch(pagination, payload, userTypeId) {
    return this.apollo
      .query({
        query: gql`
          query GetAllAcadKitForQuickSearch(
            $pagination: Pagination
            $rncp_title_id: ID
            $class_id: ID
            $document_name: String
            $userTypeId: ID
          ) {
            GetAllAcadKitForQuickSearch(
              pagination: $pagination
              rncp_title_id: $rncp_title_id
              class_id: $class_id
              document_name: $document_name
              user_type_id: $userTypeId
            ) {
              document_id
              document_name
              evaluation_name
              folder_name
              school_id {
                _id
                short_name
              }
              status
              parent_test
              visible_to_school
              count_document
              document {
                _id
                school_id {
                  _id
                }
                status
                document_name
                type_of_document
                s3_file_name
                published_for_student
                publication_date_for_schools {
                  date {
                    date
                    time
                  }
                  school {
                    _id
                  }
                }
                document_generation_type
                parent_class_id {
                  _id
                  name
                }
                uploaded_for_student {
                  first_name
                  last_name
                }
                uploaded_for_group {
                  name
                }
                uploaded_for_other_user {
                  first_name
                  last_name
                }
                uploaded_for_group {
                  _id
                  name
                }
                published_for_user_types_id {
                  _id
                  name
                }
                publication_date {
                  type
                  before
                  day
                  publication_date {
                    date
                    time
                  }
                  relative_time
                }
                parent_test {
                  _id
                  is_published
                  expected_documents {
                    _id
                    document_name
                  }
                  date_type
                  date {
                    date_utc
                    time_utc
                  }
                  schools {
                    school_id {
                      _id
                    }
                    test_date {
                      date_utc
                      time_utc
                    }
                  }
                }
              }
            }
          }
        `,
        variables: {
          pagination: pagination,
          rncp_title_id: payload.rncp_title_id,
          class_id: payload.class_id,
          document_name: payload.document_name,
          userTypeId,
        },
        fetchPolicy: 'network-only',
      })
      .pipe(map(resp => resp.data['GetAllAcadKitForQuickSearch']));
  }

  getAllAcademicKitForQuickSearchAll(payload, userTypeId) {
    return this.apollo
      .query({
        query: gql`
          query GetAllAcadKitForQuickSearch(
            $rncp_title_id: ID
            $class_id: ID
            $document_name: String
            $userTypeId: ID
            $filter: FilterInputAcadKitQuickSearch
          ) {
            GetAllAcadKitForQuickSearch(
              rncp_title_id: $rncp_title_id
              class_id: $class_id
              document_name: $document_name
              user_type_id: $userTypeId
              filter: $filter
            ) {
              folder_name
              document_name
              evaluation_name
              s3_file_name
              document_generation_type
              type_of_document
              test_type
              school_id {
                _id
                short_name
              }
              count_document
              row_id
              folder_id
              document_id
              evaluation_id
              created_by {
                _id
                civility
                first_name
                last_name
              }
              status
              parent_test
              visible_to_school
              created_at
              modified_at
              document {
                _id
                school_id {
                  _id
                }
                visible_to_school
                status
                document_name
                type_of_document
                s3_file_name
                published_for_student
                publication_date_for_schools {
                  date {
                    date
                    time
                  }
                  school {
                    _id
                  }
                }
                document_generation_type
                parent_class_id {
                  _id
                  name
                }
                uploaded_for_student {
                  first_name
                  last_name
                }
                uploaded_for_group {
                  name
                }
                uploaded_for_other_user {
                  first_name
                  last_name
                }
                uploaded_for_group {
                  _id
                  name
                }
                published_for_user_types_id {
                  _id
                  name
                }
                publication_date {
                  type
                  before
                  day
                  publication_date {
                    date
                    time
                  }
                  relative_time
                }
                parent_test {
                  _id
                  is_published
                  expected_documents {
                    _id
                    document_name
                  }
                  date_type
                  date {
                    date_utc
                    time_utc
                  }
                  schools {
                    school_id {
                      _id
                    }
                    test_date {
                      date_utc
                      time_utc
                    }
                  }
                }
              }
            }
          }
        `,
        variables: {
          rncp_title_id: payload.rncp_title_id,
          class_id: payload.class_id,
          document_name: payload.document_name,
          filter: payload.filter ? payload.filter : {},
          userTypeId,
        },
        fetchPolicy: 'network-only',
      })
      .pipe(map(resp => resp.data['GetAllAcadKitForQuickSearch']));
  }
}
