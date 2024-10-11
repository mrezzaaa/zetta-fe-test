import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { Cacheable } from 'ngx-cacheable';
import gql from 'graphql-tag';
import { map, switchMap } from 'rxjs/operators';
import { Apollo } from 'apollo-angular';
import { CoreService } from '../core/core.service';
import { AuthService } from '../auth-service/auth.service';
import * as _ from 'lodash';

@Injectable({
  providedIn: 'root',
})
export class TutorialService {
  public tutorialData: BehaviorSubject<any> = new BehaviorSubject<any>(null);
  public dataEditTutorial: BehaviorSubject<any> = new BehaviorSubject<any>(null);
  public tutorialStep: BehaviorSubject<number> = new BehaviorSubject<number>(0);
  public currentStep: BehaviorSubject<number> = new BehaviorSubject<number>(0);
  public juryName: BehaviorSubject<any> = new BehaviorSubject<any>(null);

  openTutorialBar(type, tutorialData) {
    this.setTutorialView(tutorialData);
    this.coreService.toggle(type);
  }

  getInAppTutorialByModule(moduleName: string, formFilling?: { currentUserId: string; currentUserTypeId: string; isFormFilling: boolean }) {
    const currentUser = this.authService.getCurrentUser();
    const isPermission = this.authService.getPermission();
    if (
      ((!currentUser?._id || !isPermission?.length) && !formFilling?.isFormFilling) ||
      (formFilling?.isFormFilling && !formFilling.currentUserId)
    ) {
      return new Observable((subscriber) => {
        subscriber.next(null);
      });
    }
    let currentUserId = '';
    if (formFilling?.isFormFilling) {
      currentUserId = formFilling?.currentUserId;
    } else {
      currentUserId = currentUser?._id;
    }

    return this.apollo
      .query({
        query: gql`
          query GetOneUser($_id: ID) {
            GetOneUser(_id: $_id) {
              _id
              entities {
                type {
                  _id
                  name
                }
              }
            }
          }
        `,
        variables: {
          _id: currentUserId,
        },
        fetchPolicy: 'network-only',
      })
      .pipe(
        switchMap((resp: any) => {
          const currentEntity = _.cloneDeep(resp.data['GetOneUser']);
          const currentUserEntity = currentEntity.entities.find((resps) =>
            !formFilling?.isFormFilling ? resps.type.name === isPermission[0] : resps.type._id === formFilling?.currentUserTypeId,
          );

          if (!currentUserEntity && !formFilling?.isFormFilling) {
            return new Observable((subscriber) => {
              subscriber.next(null);
            });
          }

          return this.apollo
            .watchQuery<any[]>({
              query: gql`
                query GetAllInAppTutorialByModule($filter: InAppTutorialFilterInput) {
                  GetAllInAppTutorial(filter: $filter) {
                    _id
                    module
                    sub_modules {
                      sub_module
                      items {
                        title
                        description
                      }
                    }
                    scenario_checklist_url
                    video_presentation
                    qa_checklist_url
                    count_document
                    video_url
                    is_published
                  }
                }
              `,
              variables: {
                filter: {
                  module: moduleName,
                  is_published: true,
                  user_types: currentUserEntity?.type?._id ? [currentUserEntity?.type?._id] : null,
                },
              },
              fetchPolicy: 'network-only',
            })
            .valueChanges.pipe(
              map((resp) => {
                const list = resp.data['GetAllInAppTutorial'];
                return list.find((tutorial) => {
                  return tutorial.is_published === true && tutorial.module === moduleName;
                });
              }),
            );
        }),
      );
  }

  setTutorialStep(value: number) {
    this.tutorialStep.next(value);
  }

  setCurrentStep(value: number) {
    this.currentStep.next(value);
  }

  setTutorialView(value: any) {
    this.tutorialData.next(value);
  }

  setTutorialEdit(value: any) {
    this.dataEditTutorial.next(value);
  }

  setJuryName(value: any) {
    this.juryName.next(value);
  }

  constructor(private httpClient: HttpClient, private apollo: Apollo, private coreService: CoreService, private authService: AuthService) {}

  @Cacheable()
  getModuleJson(): Observable<any[]> {
    return this.httpClient.get<any[]>('assets/data/module-menu.json');
  }

  GetOneInAppTutorial(filter): Observable<any[]> {
    return this.apollo
      .query<any[]>({
        query: gql`
          query {
            GetOneInAppTutorial(${filter}) {
              _id
              module
              sub_modules {
                sub_module
                items {
                  title
                  description
                }
              }
              scenario_checklist_url
              video_presentation
              video_url
              qa_checklist_url
              is_published
            }
          }
        `,
        fetchPolicy: 'network-only',
      })
      .pipe(map((resp) => resp.data['GetOneInAppTutorial']));
  }

  DeleteInAppTutorial(tutorialId): Observable<any> {
    return this.apollo
      .mutate({
        mutation: gql`
        mutation {
          DeleteInAppTutorial(_id: "${tutorialId}") {
              _id
            }
          }
        `,
        errorPolicy: 'all',
      })
      .pipe(map((resp) => resp.data['DeleteInAppTutorial']));
  }

  CreateInAppTutorial(payload): Observable<any> {
    return this.apollo
      .mutate({
        mutation: gql`
          mutation CreateInAppTutorial($in_app_tutorial_input: InAppTutorialInput!) {
            CreateInAppTutorial(in_app_tutorial_input: $in_app_tutorial_input) {
              _id
            }
          }
        `,
        variables: {
          in_app_tutorial_input: payload,
        },
        errorPolicy: 'all',
      })
      .pipe(map((resp) => resp.data['CreateInAppTutorial']));
  }

  UpdateInAppTutorial(tutorialId, payload): Observable<any> {
    return this.apollo
      .mutate({
        mutation: gql`
        mutation UpdateInAppTutorial($in_app_tutorial_input: InAppTutorialInput) {
          UpdateInAppTutorial(_id: "${tutorialId}", in_app_tutorial_input: $in_app_tutorial_input) {
              _id
            }
          }
        `,
        variables: {
          in_app_tutorial_input: payload,
        },
        errorPolicy: 'all',
      })
      .pipe(map((resp) => resp.data['UpdateInAppTutorial']));
  }

  getAllTutorial(pagination, sorting?: any, filter?: any, user_type_id?: any): Observable<any[]> {
    return this.apollo
      .query<any[]>({
        query: gql`
          query GetAllTutorials($pagination: PaginationInput, $sorting: TutorialSorting) {
            GetAllTutorials(pagination: $pagination, sorting: $sorting, ${filter}) {
              _id
              title
              description
              link
              message
              user_type_ids {
                _id
                name
              }
              status
              count_document
            }
          }
        `,
        variables: {
          pagination,
          sorting,
          user_type_id,
        },
        fetchPolicy: 'network-only',
      })
      .pipe(map((resp) => resp.data['GetAllTutorials']));
  }

  getAllTutorialPC(pagination, sorting?: any, filter?: any, user_type_id?: any): Observable<any[]> {
    return this.apollo
      .query<any[]>({
        query: gql`
          query GetAllTutorials($pagination: PaginationInput, $sorting: TutorialSorting) {
            GetAllTutorials(pagination: $pagination, sorting: $sorting, ${filter}, filterForPCAndCertifier: pc) {
              _id
              title
              description
              link
              message
              user_type_ids {
                _id
                name
              }
              status
              count_document
            }
          }
        `,
        variables: {
          pagination,
          sorting,
          user_type_id,
        },
        fetchPolicy: 'network-only',
      })
      .pipe(map((resp) => resp.data['GetAllTutorials']));
  }

  getTutorialNonOperator(pagination, sorting?: any, filter?: any, user_type_id?: any): Observable<any[]> {
    return this.apollo
      .query<any[]>({
        query: gql`
          query GetAllTutorials($pagination: PaginationInput, $sorting: TutorialSorting, $user_type_id: ID) {
            GetAllTutorials(pagination: $pagination, sorting: $sorting, ${filter}, user_type_id: $user_type_id) {
              _id
              title
              description
              link
              message
              user_type_ids {
                _id
                name
              }
              status
              count_document
            }
          }
        `,
        variables: {
          pagination,
          sorting,
          user_type_id,
        },
        fetchPolicy: 'network-only',
      })
      .pipe(map((resp) => resp.data['GetAllTutorials']));
  }

  checkIfModuleExitsForUsertype(module, user_types?: any): Observable<any> {
    return this.apollo
      .query<any[]>({
        query: gql`
          query CheckIfModuleExitsForUsertype($module: String, $user_types: [ID]) {
            CheckIfModuleExitsForUsertype(module: $module, user_types: $user_types)
          }
        `,
        variables: {
          module,
          user_types,
        },
        fetchPolicy: 'network-only',
      })
      .pipe(map((resp) => resp.data['CheckIfModuleExitsForUsertype']));
  }

  getOneTutorial(tutorialId): Observable<any[]> {
    return this.apollo
      .query<any[]>({
        query: gql`
          query {
            GetOneTutorial(_id: "${tutorialId}") {
              _id
              title
              description
              link
              message
              user_type_ids {
                _id
                name
              }
              status
              count_document
            }
          }
        `,
        fetchPolicy: 'network-only',
      })
      .pipe(map((resp) => resp.data['GetOneTutorial']));
  }

  getOperatorName(): Observable<any[]> {
    return this.apollo
      .query<any[]>({
        query: gql`
          query {
            GetAppPermission {
              group_name
            }
          }
        `,
        fetchPolicy: 'network-only',
      })
      .pipe(map((resp) => resp.data['GetAppPermission']));
  }

  deleteTutorial(tutorialId): Observable<any> {
    return this.apollo
      .mutate({
        mutation: gql`
        mutation {
            DeleteTutorial(_id: "${tutorialId}") {
              _id
              title
            }
          }
        `,
        errorPolicy: 'all',
      })
      .pipe(map((resp) => resp.data['DeleteTutorial']));
  }

  sendTutorial(loginType, payload): Observable<any> {
    return this.apollo
      .mutate({
        mutation: gql`
        mutation SendTutorial($send_tutorial_input: TutorialSendInput, $lang: String!) {
          SendTutorial(send_tutorial_input: $send_tutorial_input, user_login_type: "${loginType}", lang: $lang)
          }
        `,
        variables: {
          send_tutorial_input: payload,
          lang: localStorage.getItem('currentLang'),
        },
        errorPolicy: 'all',
      })
      .pipe(map((resp) => resp.data['SendTutorial']));
  }

  createTutorial(payload, subject): Observable<any> {
    return this.apollo
      .mutate({
        mutation: gql`
          mutation CreateTutorial($tutorial_input: TutorialInput!, $subject: String) {
            CreateTutorial(tutorial_input: $tutorial_input, subject: $subject) {
              _id
              title
            }
          }
        `,
        variables: {
          tutorial_input: payload,
          subject,
        },
        errorPolicy: 'all',
      })
      .pipe(map((resp) => resp.data['CreateTutorial']));
  }

  updateTutorial(tutorialId, payload, subject): Observable<any> {
    return this.apollo
      .mutate({
        mutation: gql`
        mutation UpdateTutorial($tutorial_input: TutorialInput!, $subject: String) {
          UpdateTutorial(_id: "${tutorialId}", tutorial_input: $tutorial_input, subject: $subject) {
              _id
              title
            }
          }
        `,
        variables: {
          tutorial_input: payload,
          subject,
        },
        errorPolicy: 'all',
      })
      .pipe(map((resp) => resp.data['UpdateTutorial']));
  }

  GetAllInAppTutorial(filter, sorting, pagination): Observable<any[]> {
    return this.apollo
      .watchQuery<any[]>({
        query: gql`
          query GetAllInAppTutorial($filter: InAppTutorialFilterInput, $sorting: InAppTutorialSortingInput, $pagination: PaginationInput) {
            GetAllInAppTutorial(filter: $filter, sorting: $sorting, pagination: $pagination) {
              _id
              module
              sub_modules {
                sub_module
                items {
                  title
                  description
                }
              }
              scenario_checklist_url
              video_presentation
              qa_checklist_url
              count_document
              is_published
              user_types {
                _id
                name
              }
              video_url
            }
          }
        `,
        variables: {
          filter,
          sorting,
          pagination,
        },
        fetchPolicy: 'network-only',
      })
      .valueChanges.pipe(map((resp) => resp.data['GetAllInAppTutorial']));
  }

  GetAllInAppTutorials(): Observable<any[]> {
    return this.apollo
      .watchQuery<any[]>({
        query: gql`
          query {
            GetAllInAppTutorial {
              _id
              module
              sub_modules {
                sub_module
                items {
                  title
                  description
                }
              }
              scenario_checklist_url
              video_presentation
              qa_checklist_url
              count_document
              video_url
              user_types {
                _id
                name
              }
              is_published
            }
          }
        `,
        fetchPolicy: 'network-only',
      })
      .valueChanges.pipe(map((resp) => resp.data['GetAllInAppTutorial']));
  }

  GetAllInAppTutorialsByModule(moduleName, userType): Observable<any[]> {
    return this.apollo
      .watchQuery<any[]>({
        query: gql`
          query GetAllInAppTutorialByModule($filter: InAppTutorialFilterInput) {
            GetAllInAppTutorial(filter: $filter) {
              _id
              module
              sub_modules {
                sub_module
                items {
                  title
                  description
                }
              }
              scenario_checklist_url
              video_presentation
              qa_checklist_url
              count_document
              video_url
              is_published
            }
          }
        `,
        variables: {
          filter: {
            module: moduleName,
            is_published: true,
            user_type_name: userType ? userType : '',
          },
        },
        fetchPolicy: 'network-only',
      })
      .valueChanges.pipe(map((resp) => resp.data['GetAllInAppTutorial']));
  }

  GetListTutorialAdded(): Observable<any[]> {
    return this.apollo
      .watchQuery<any[]>({
        query: gql`
          query {
            GetAllInAppTutorial {
              _id
              module
              is_published
            }
          }
        `,
        fetchPolicy: 'network-only',
      })
      .valueChanges.pipe(map((resp) => resp.data['GetAllInAppTutorial']));
  }

  GetAllInAppTutorialModule(): Observable<any[]> {
    return this.apollo
      .watchQuery<any[]>({
        query: gql`
          query GetAllInAppTutorialModule {
            GetAllInAppTutorialModule {
              _id
              module
              sub_modules {
                sub_module_name
                parent_module
                sub_of_sub_module {
                  sub_of_sub_module_name
                  sub_module_parent
                }
              }
            }
          }
        `,
        fetchPolicy: 'network-only',
      })
      .valueChanges.pipe(map((resp) => resp.data['GetAllInAppTutorialModule']));
  }
  getOneUser(_id): Observable<any> {
    return this.apollo
      .query({
        query: gql`
          query GetOneUser($_id: ID) {
            GetOneUser(_id: $_id) {
              _id
              entities {
                type {
                  _id
                  name
                }
              }
            }
          }
        `,
        variables: {
          _id,
        },
        fetchPolicy: 'network-only',
      })
      .pipe(map((resp) => resp.data['GetOneUser']));
  }
  // @Cacheable()
  // getTutotrials(): Observable<any[]> {
  //   return this.httpClient.get<any[]>('assets/data/tutorial.json');
  // }
}
