import { Injectable, ElementRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { Apollo } from 'apollo-angular';
import gql from 'graphql-tag';
import { map, take } from 'rxjs/operators';
import { environment } from 'environments/environment';
import { UserProfileData, UserProfileEntities } from 'app/users/user.model';
import { HttpClient } from '@angular/common/http';
import * as CryptoJS from 'crypto-js';
import Swal from 'sweetalert2';
declare var OSNameADMTC: any;
declare var browserNameADMTC: any;
declare var locationUrl: any;
import { PermissionService } from '../permission/permission.service';
import { SubSink } from 'subsink';
import { TranslateService } from '@ngx-translate/core';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  userData: UserProfileData;
  isLoggedIn = new BehaviorSubject<boolean>(false);
  public isLoggedIn$ = this.isLoggedIn.asObservable();
  private subs = new SubSink();

  private isConnectAsUserSource = new BehaviorSubject<boolean>(false);
  public isConnectAsUser$ = this.isConnectAsUserSource.asObservable();

  private userAcceptedCertificationRuleSource = new BehaviorSubject<boolean>(false);
  userAcceptedCertificaitonRule$ = this.userAcceptedCertificationRuleSource.asObservable();

  private isReloadTableSource = new BehaviorSubject<boolean>(false);
  public isReloadTableSource$ = this.isReloadTableSource.asObservable();

  @ViewChild('pagesElement', { static: false }) documentPagesRef: ElementRef;

  constructor(
    private router: Router,
    private apollo: Apollo,
    public permissionService: PermissionService,
    private httpClient: HttpClient,
    private translate: TranslateService,
  ) {}

  setUserAcceptedCertificationRule(value: boolean) {
    this.userAcceptedCertificationRuleSource.next(value);
  }

  getLocalStorageUser(): UserProfileData {
    if (localStorage.getItem('userProfile')) {
      this.userData = JSON.parse(localStorage.getItem('userProfile'));
      // this.isLoggedIn = this.userData ? true : false;
      if (this.userData) {
        this.isLoggedIn.next(true);
      } else {
        this.isLoggedIn.next(false);
      }
      if (this.isLoginAsOther()) {
        this.isConnectAsUserSource.next(true);
      } else {
        this.isConnectAsUserSource.next(false);
      }
      return this.userData;
    } else {
      this.logOut();
    }
  }

  getCurrentUser(): UserProfileData {
    return this.userData;
  }

  logOut() {
    this.removeLocalUserProfile();
    localStorage.removeItem('version');
    this.router.navigate(['/session/login']);
    this.isConnectAsUserSource.next(false);
  }

  logOutExpireToken() {
    const returnUrl = this.router.routerState.snapshot.url;
    this.removeLocalUserProfile();
    localStorage.removeItem('version');
    this.router.navigate(['/session/login'], { queryParams: { returnUrl: returnUrl } });
    this.isConnectAsUserSource.next(false);
  }

  setLocalUserProfileAndToken(value: { token: string; user: UserProfileData }) {
    localStorage.setItem('userProfile', JSON.stringify(value.user));
    localStorage.setItem(environment.tokenKey, JSON.stringify(value.token));
    this.permissionService.resetServiceData();
    this.isLoggedIn.next(true);
  }

  backupLocalUserProfileAndToken() {
    const backupUser = JSON.parse(localStorage.getItem('userProfile'));
    const backupToken = JSON.parse(localStorage.getItem('admtc-token-encryption'));
    localStorage.setItem('backupUser', JSON.stringify(backupUser));
    localStorage.setItem('backupToken', JSON.stringify(backupToken));
    sessionStorage.removeItem('latestSelectedMenu');
    this.isConnectAsUserSource.next(true);
  }

  connectAsStudent(user, permissions, from?) {
    const action = from ? from : 'connect';
    const actionData = window.btoa(action);
    const userData = window.btoa(
      JSON.stringify({
        token: user?.token,
        user: {
          civility: user?.user?.civility,
          direct_line: user?.user?.direct_line,
          email: user?.user?.email,
          entities: user?.user?.entities.map(element => {
            return {
              assigned_rncp_title: {
                _id: element?.assigned_rncp_title?._id,
              },
              class: {
                _id: element?.class?._id,
              },
              type: {
                _id: element?.type?._id,
              },
            };
          }),
          first_name: user?.user?.first_name,
          last_name: user?.user?.last_name,
          office_phone: user?.user?.office_phone,
          portable_phone: user?.user?.portable_phone,
          position: user?.user?.position,
          profile_picture: user?.user?.profile_picture,
          student_id: {
            _id: user?.user?.student_id?._id,
          },
          _id: user?.user?._id,
        },
      }),
    );

    const permissionsData = window.btoa(permissions);
    window.open(environment.studentEnvironment + `?a=${actionData}&u=${userData}&p=${permissionsData}`, '_blank');
  }

  async connectAsStudentFromLoginPage(user, permissions, from?) {
    const action = from ? from : 'login';
    const actionData = window?.btoa(action);

    const userData = window?.btoa(
      JSON.stringify({
        token: user?.token,
        user: {
          civility: user?.user?.civility,
          direct_line: user?.user?.direct_line,
          email: user?.user?.email,
          entities: user?.user?.entities.map(element => {
            return {
              assigned_rncp_title: {
                _id: element?.assigned_rncp_title?._id,
              },
              class: {
                _id: element?.class?._id,
              },
              type: {
                _id: element?.type?._id,
              },
            };
          }),
          first_name: user?.user?.first_name,
          last_name: user?.user?.last_name,
          office_phone: user?.user?.office_phone,
          portable_phone: user?.user?.portable_phone,
          position: user?.user?.position,
          profile_picture: user?.user?.profile_picture,
          student_id: {
            _id: user?.user?.student_id?._id,
          },
          _id: user?.user?._id,
        },
      }),
    );

    const permissionsData = window?.btoa(permissions);
    window.open(environment.studentEnvironment + `?a=${actionData}&u=${userData}&p=${permissionsData}`, '_self');
  }

  async connectAsForJobDesc(user, permissions) {
    const action = 'connectAsForJobDesc';
    const actionData = window?.btoa(action);
    const userData = window?.btoa(
      JSON.stringify({
        token: user?.token,
        user: {
          civility: user?.user?.civility,
          direct_line: user?.user?.direct_line,
          email: user?.user?.email,
          entities: user?.user?.entities.map(element => {
            return {
              assigned_rncp_title: {
                _id: element?.assigned_rncp_title?._id,
              },
              class: {
                _id: element?.class?._id,
              },
              type: {
                _id: element?.type?._id,
              },
            };
          }),
          first_name: user?.user?.first_name,
          last_name: user?.user?.last_name,
          office_phone: user?.user?.office_phone,
          portable_phone: user?.user?.portable_phone,
          position: user?.user?.position,
          profile_picture: user?.user?.profile_picture,
          student_id: {
            _id: user?.user?.student_id?._id,
          },
          _id: user?.user?._id,
        },
      }),
    );
    const permissionsData = window.btoa(permissions);
    window.open(environment?.studentEnvironment + `?a=${actionData}&u=${userData}&p=${permissionsData}`, '_blank');
    // window.open(`${environment.studentEnvironment}/student-form-fill/job-description-form-fill?studentID=${studentId}`, '_blank');
  }

  isLoginAsOther() {
    if (
      localStorage.getItem('backupUser') &&
      JSON.parse(localStorage.getItem('backupUser')) &&
      localStorage.getItem('backupToken') &&
      JSON.parse(localStorage.getItem('backupToken'))
    ) {
      return true;
    } else {
      return false;
    }
  }

  loginAsPreviousUser() {
    const user = JSON.parse(localStorage.getItem('backupUser'));
    const token = JSON.parse(localStorage.getItem('backupToken'));

    localStorage.setItem('userProfile', JSON.stringify(user));
    localStorage.setItem(environment.tokenKey, JSON.stringify(token));
    localStorage.removeItem('backupUser');
    localStorage.removeItem('backupToken');
    sessionStorage.removeItem('latestSelectedMenu');
    this.isLoggedIn.next(true);
    this.permissionService.resetServiceData();
    this.isConnectAsUserSource.next(false);
  }

  setLocalUserProfile(user: UserProfileData) {
    localStorage.setItem('userProfile', JSON.stringify(user));
  }

  setPermission(data: string[]) {
    const conversionEncryptOutput = CryptoJS.AES.encrypt(JSON.stringify(data), 'Key').toString();

    localStorage.setItem('permissions', conversionEncryptOutput);
  }

  getPermission(): string[] {
    const conversionDecryptOutput = CryptoJS.AES.decrypt(localStorage.getItem('permissions'), 'Key').toString(CryptoJS.enc.Utf8);

    return JSON.parse(conversionDecryptOutput);
  }

  removeLocalUserProfile() {
    localStorage.removeItem('userProfile');
    localStorage.removeItem(environment.tokenKey);
    localStorage.removeItem('permissions');
    localStorage.removeItem('backupUser');
    localStorage.removeItem('backupToken');
    sessionStorage.removeItem('latestSelectedMenu');
    this.isLoggedIn.next(false);
  }

  setPassword(token: string, password: string): Observable<any> {
    return this.apollo
      .mutate({
        mutation: gql`
          mutation {
            SetPassword(token: "${token}", password: "${password}") {
              email
            }
          }
        `,
      })
      .pipe(map(resp => resp.data));
  }

  updateDashboardThemeSetting(id: any, sidebar_type: any): Observable<any> {
    return this.apollo
      .mutate({
        mutation: gql`
          mutation UpdateDashboardThemeSetting($userId: ID!, $sidebarType: EnumSideBarType) {
            UpdateDashboardThemeSetting(user_id: $userId, sidebar_type: $sidebarType) {
              sidebar_type
            }
          }
        `,
        variables: {
          userId: id,
          sidebarType: sidebar_type,
        },
      })
      .pipe(map(resp => resp));
  }

  updateDashboardThemeSettingHexa(id: any, colorName: any): Observable<any> {
    return this.apollo
      .mutate({
        mutation: gql`
          mutation UpdateDashboardThemeSetting($userId: ID!, $colorName: String) {
            UpdateDashboardThemeSetting(user_id: $userId, color_name: $colorName) {
              sidebar_type
            }
          }
        `,
        variables: {
          userId: id,
          colorName: colorName,
        },
      })
      .pipe(map(resp => resp));
  }

  updateDashboardThemeSettingHexaCustom(id: any, colorHexa: any): Observable<any> {
    return this.apollo
      .mutate({
        mutation: gql`
          mutation UpdateDashboardThemeSetting($userId: ID!, $colorHexa: ColorHexaInput) {
            UpdateDashboardThemeSetting(user_id: $userId, color_hexa: $colorHexa) {
              sidebar_type
            }
          }
        `,
        variables: {
          userId: id,
          colorHexa: colorHexa,
        },
      })
      .pipe(map(resp => resp));
  }

  getUserById(userId: string) {
    return this.apollo
      .query({
        query: gql`query {
         GetOneUser(_id:"${userId}"){
                 _id
                 civility
                 first_name
                 last_name
                 email
                 position
                 office_phone
                 direct_line
                 portable_phone
                 profile_picture
                 entities {
                     entity_name
                     school_type
                     group_of_schools {
                         _id
                         short_name
                     }
                     school {
                         _id
                         short_name
                     }
                     assigned_rncp_title {
                         _id
                         short_name
                     }
                     class {
                         _id
                         name
                         registration_period {
                          start_date {
                            date
                            time
                          }
                          end_date {
                            date
                            time
                          }
                        }
                     }
                     type {
                         _id
                         name
                     }
                 }
         }
     }`,
        fetchPolicy: 'network-only',
      })
      .pipe(map(res => res.data['GetOneUser']));
  }

  getDeletedUserById(userId: string) {
    return this.apollo
      .query({
        query: gql`query {
         GetOneUser(_id:"${userId}", status: deleted){
                 _id
                 civility
                 first_name
                 last_name
                 email
                 position
                 office_phone
                 direct_line
                 portable_phone
                 profile_picture
                 entities {
                     entity_name
                     school_type
                     group_of_schools {
                         _id
                         short_name
                     }
                     school {
                         _id
                         short_name
                     }
                     assigned_rncp_title {
                         _id
                         short_name
                     }
                     class {
                         _id
                         name
                         registration_period {
                          start_date {
                            date
                            time
                          }
                          end_date {
                            date
                            time
                          }
                        }
                     }
                     type {
                         _id
                         name
                     }
                 }
         }
     }`,
        fetchPolicy: 'network-only',
      })
      .pipe(map(res => res.data['GetOneUser']));
  }

  verifRecaptcha(token: string): Observable<any> {
    return this.apollo
      .query({
        query: gql`
          query {
          VerifyRecaptcha (token: "${token}"){
              success
              challenge_ts
              hostname
              score
              action
          }
      }`,
        fetchPolicy: 'network-only',
      })
      .pipe(map(res => res.data['VerifyRecaptcha']));
  }

  loginAsUser(loggedInUserId: string, userToLoginId: string): Observable<any> {
    return this.apollo
      .mutate({
        mutation: gql`
      mutation {
        loginAsUserIncognito(logged_in_user: "${loggedInUserId}", user_to_login: "${userToLoginId}") {
          token
          user {
            _id
            civility
            first_name
            last_name
            email
            position
            office_phone
            direct_line
            portable_phone
            profile_picture
            student_id {
              _id
              student_title_status
              admission_status
            }
            entities {
              entity_name
              school_type
              group_of_schools {
                _id
                short_name
              }
              group_of_school{
                _id
                headquarter {
                  _id
                  short_name
                }
                school_members {
                  _id
                  short_name
                }
              }
              school {
                _id
                short_name
                logo
              }
              assigned_rncp_title {
                _id
                short_name
              }
              class {
                _id
                name
              }
              type {
                _id
                name
                usertype_permission_id {
                  _id
                  user_type_name
                  user_dashboard {
                    show_perm
                    edit_perm
                    home_page
                  }
                  rncp_title {
                    show_perm
                    show_chief_group_perm
                    pending_task {
                      show_perm
                      edit_perm
                    }
                    acad_kit {
                      show_perm
                      edit_perm
                      edit_06_perm
                      folder_permissions {
                        folder_one {
                          show_perm
                        }
                        folder_two {
                          show_perm
                        }
                        folder_three {
                          show_perm
                        }
                        folder_four {
                          show_perm
                        }
                        folder_five {
                          show_perm
                        }
                        folder_six {
                          show_perm
                        }
                        folder_seven {
                          show_perm
                        }
                        folder_others {
                          show_perm
                        }
                      }
                    }
                    calendar {
                      show_perm
                      edit_perm
                      add_perm
                      delete_perm
                    }
                  }
                  schools {
                    show_perm
                    list_of_schools_sub {
                      show_perm
                      edit_perm
                      add_school {
                        show_perm
                        edit_perm
                        actions {
                          btn_save
                          btn_add_address
                          btn_add_logo
                        }
                      }
                      export {
                        show_perm
                        edit_perm
                      }
                      edit_school {
                        show_perm
                        edit_perm
                      }
                      student_detail {
                        show_perm
                        edit_perm
                      }
                      send_email {
                        show_perm
                        edit_perm
                      }
                    }
                    group_of_schools_sub {
                      show_perm
                      edit_perm
                      add_school_group {
                        show_perm
                        edit_perm
                        actions {
                          btn_cancel
                          btn_submit
                        }
                      }
                      edit_school_group {
                        show_perm
                        edit_perm
                        actions {
                          btn_cancel
                          btn_submit
                        }
                      }
                      delete_school_group {
                        show_perm
                      }
                    }
                    list_of_schools {
                      show_perm
                      student_table {
                        show_perm
                        actions {
                          thumbsup
                          resignation
                          edit_perm
                          send_email
                          incognito
                          view_admission_form_perm
                        }
                        import_student
                        add_perm
                        export_list_of_student
                        export_ES
                      }
                      deactivate_student_table {
                        show_perm
                        export_perm
                        reactive_perm
                        resignation_detail
                      }
                      suspended_student_table {
                        show_perm
                      }
                      school_table {
                        show_perm
                        add_perm
                        actions {
                          edit_perm
                          send_email
                        }
                      }
                      school_details {
                        show_perm
                        edit_perm
                        add_perm
                        connected_rncp {
                          show_perm
                          add_perm
                          actions {
                            edit_perm
                            delete_perm
                          }
                        }
                      }
                      school_staff {
                        show_perm
                        add_user
                        export_button
                        school_staff_table {
                          show_perm
                          actions {
                            incognito
                            error_email
                            edit_perm
                            delete_perm
                            send_email
                          }
                        }
                      }
                      student_card {
                        show_perm
                        add_perm
                        import_student
                        import_student_company
                        identity {
                          show_perm
                          identity {
                            show_perm
                            edit_perm
                          }
                          course {
                            show_perm
                            edit_perm
                          }
                          parent {
                            show_perm
                            edit_perm
                          }
                          diploma {
                            show_perm
                            edit_perm
                          }
                        }
                        admission {
                          show_perm
                          admission_form {
                            show_perm
                            edit_perm
                          }
                          academic_journey {
                            show_perm
                            edit_perm
                          }
                          certification_rule {
                            show_perm
                            edit_perm
                          }
                        }
                        company {
                          show_perm
                          company {
                            show_perm
                            edit_perm
                          }
                          job_desc {
                            show_perm
                            edit_perm
                          }
                          problematic {
                            show_perm
                            edit_perm
                          }
                          mentor_evaluation {
                            show_perm
                            edit_perm
                          }
                        }
                        document {
                          show_perm
                          edit_perm
                          my_document {
                            show_perm
                            edit_perm
                          }
                          published_document {
                            show_perm
                            edit_perm
                          }
                        }
                        certification {
                          show_perm
                          certification {
                            show_perm
                            edit_perm
                          }
                          subject_of_cert {
                            show_perm
                            edit_perm
                          }
                          details_of_certification {
                            show_perm
                            edit_perm
                          }
                        }
                        emp_survey {
                          show_perm
                          edit_perm
                        }
                        retake_during_year {
                          show_perm
                          edit_perm
                        }
                        task {
                          show_perm
                          add_task
                          internal_task
                          add_test_task
                          actions {
                            delete_task
                            edit_perm
                          }
                        }
                        comment {
                          show_perm
                          add_comment
                        }
                        mailbox {
                          show_perm
                          edit_perm
                          inbox
                          sent
                          important
                          draft
                          trash
                          actions {
                            download_email
                            urgent_message
                            mail_to_group
                            compose
                            important
                            delete
                          }
                          inbox_sub {
                            show_perm
                            edit_perm
                            actions {
                              btn_reset
                              btn_compose
                              btn_download_email
                              btn_urgent_message
                              btn_mail_to_group
                            }
                          }
                          cc_sub {
                            show_perm
                            edit_perm
                            actions {
                              btn_reset
                              btn_compose
                              btn_download_email
                              btn_urgent_message
                              btn_mail_to_group
                            }
                          }
                          sent_sub {
                            show_perm
                            edit_perm
                            actions {
                              btn_reset
                              btn_compose
                              btn_download_email
                              btn_urgent_message
                              btn_mail_to_group
                            }
                          }
                          important_sub {
                            show_perm
                            edit_perm
                            actions {
                              btn_reset
                              btn_compose
                              btn_download_email
                              btn_urgent_message
                              btn_mail_to_group
                            }
                          }
                          draft_sub {
                            show_perm
                            edit_perm
                            actions {
                              btn_reset
                              btn_compose
                              btn_download_email
                              btn_urgent_message
                              btn_mail_to_group
                            }
                          }
                          trash_sub {
                            show_perm
                            edit_perm
                            actions {
                              btn_reset
                              btn_compose
                              btn_download_email
                              btn_urgent_message
                              btn_mail_to_group
                            }
                          }
                        }
                      }
                    }
                    group_of_schools {
                      show_perm
                      add_perm
                      actions {
                        edit_perm
                        delete_perm
                      }
                    }
                  }
                  students {
                    show_perm
                    derogation_dispense {
                      show_perm
                      edit_perm
                      ask_form {
                        edit_perm
                        show_perm
                      }
                    }
                    student_table {
                      show_perm
                      export_list_of_student
                      export_ES
                      actions {
                        edit_perm
                        thumbsup
                        incognito
                        error_email
                        send_email
                        resignation_perm
                        deactive_perm
                      }
                    }
                    active_students {
                      show_perm
                      student_table {
                        show_perm
                        export_list_of_student
                        export_ES
                        transfer_student
                        actions {
                          edit_perm
                          thumbsup
                          incognito
                          error_email
                          send_email
                          resignation_perm
                          deactive_perm
                          view_admission_form_perm
                          view_perm
                        }
                      }
                    }
                    completed_students {
                      show_perm
                      student_table {
                        show_perm
                        export_list_of_student
                        export_ES
                        actions {
                          edit_perm
                          thumbsup
                          incognito
                          error_email
                          send_email
                          resignation_perm
                          deactive_perm
                          view_perm
                        }
                      }
                    }
                    deactivated_students {
                      show_perm
                      student_table {
                        show_perm
                        export_list_of_student
                        export_ES
                        actions {
                          reactivation_perm
                          edit_perm
                          thumbsup
                          incognito
                          error_email
                          send_email
                          resignation_perm
                          deactive_perm
                        }
                      }
                    }
                    suspended_students {
                      show_perm
                      student_table {
                        show_perm
                        export_list_of_student
                        export_ES
                        actions {
                          reactivation_perm
                          edit_perm
                          thumbsup
                          incognito
                          error_email
                          send_email
                          resignation_perm
                          deactive_perm
                        }
                      }
                    }
                    student_card{
                      show_perm
                      actions {
                        edit_perm
                        thumbsup
                        incognito
                        error_email
                        send_email_student
                        send_email_mentor
                        send_email_acadir
                        resignation_perm
                        deactive_perm
                        view_perm
                        reactivation_perm
                        resignation_detail
                        renew_pass
                      }
                    }
                    student_detail {
                      show_perm
                    }
                  }
                  my_file {
                    show_perm
                  }
                  academic_journeys {
                    show_perm
                  }
                  form_follow_up
                  companies {
                    show_perm
                    add_company
                    company_entity {
                      show_perm
                      add_company {
                        show_perm
                        edit_perm
                      }
                      entity {
                        show_perm
                      }
                      head_office {
                        show_perm
                      }
                      branch {
                        show_perm
                      }
                      note {
                        show_perm
                        add_note
                      }
                    }
                    company_branch {
                      show_perm
                      add_company {
                        show_perm
                        edit_perm
                      }
                      identity {
                        show_perm
                      }
                      company_staff {
                        show_perm
                        add_perm
                        actions {
                          edit_perm
                          send_email
                          delete_perm
                        }
                      }
                      school_connected {
                        show_perm
                        connect_school
                        actions {
                          connect_mentor_to_School
                          delete_perm
                        }
                      }
                      note {
                        show_perm
                        add_note
                      }
                    }
                  }
                  tasks {
                    show_perm
                    add_task
                    internal_task
                    add_test_task
                    actions {
                      delete_task
                      edit_perm
                    }
                    my_task {
                      show_perm
                      edit_perm
                      add_task {
                        show_perm
                      }
                      actions {
                        btn_add_task
                        btn_today
                        btn_yesterday
                        btn_last_7_days
                        btn_last_30_days
                        btn_reset
                        btn_internal_task
                      }
                    }
                    student_task {
                      show_perm
                      edit_perm
                      add_task {
                        show_perm
                      }
                      actions {
                        btn_add_task
                        btn_today
                        btn_yesterday
                        btn_last_7_days
                        btn_last_30_days
                        btn_reset
                        btn_internal_task
                      }
                    }
                    user_task {
                      show_perm
                      edit_perm
                      add_task {
                        show_perm
                      }
                      actions {
                        btn_add_task
                        btn_today
                        btn_yesterday
                        btn_last_7_days
                        btn_last_30_days
                        btn_reset
                        btn_internal_task
                      }
                    }
                  }
                  mailbox {
                    show_perm
                    inbox
                    sent
                    important
                    draft
                    trash
                    actions {
                      download_email
                      urgent_message
                      mail_to_group
                      compose
                      important
                      delete
                    }
                    inbox_sub {
                      show_perm
                      edit_perm
                      actions {
                        btn_reset
                        btn_compose
                        btn_download_email
                        btn_urgent_message
                        btn_mail_to_group
                      }
                    }
                    cc_sub {
                      show_perm
                      edit_perm
                      actions {
                        btn_reset
                        btn_compose
                        btn_download_email
                        btn_urgent_message
                        btn_mail_to_group
                      }
                    }
                    sent_sub {
                      show_perm
                      edit_perm
                      actions {
                        btn_reset
                        btn_compose
                        btn_download_email
                        btn_urgent_message
                        btn_mail_to_group
                      }
                    }
                    important_sub {
                      show_perm
                      edit_perm
                      actions {
                        btn_reset
                        btn_compose
                        btn_download_email
                        btn_urgent_message
                        btn_mail_to_group
                      }
                    }
                    draft_sub {
                      show_perm
                      edit_perm
                      actions {
                        btn_reset
                        btn_compose
                        btn_download_email
                        btn_urgent_message
                        btn_mail_to_group
                      }
                    }
                    trash_sub {
                      show_perm
                      edit_perm
                      actions {
                        btn_reset
                        btn_compose
                        btn_download_email
                        btn_urgent_message
                        btn_mail_to_group
                      }
                    }
                  }
                  users {
                    show_perm
                    add_perm
                    export
                    transfer_responsibility
                    actions {
                      incognito
                      error_email
                      delete_perm
                      edit_perm
                      send_email
                      reminder_reg_user
                       export{
                        show_perm
                        edit_perm
                        home_page
                      }
                    transfer_responsibility{
                        show_perm
                        edit_perm
                        home_page
                      }
                    add_user{
                        show_perm
                        edit_perm
                        home_page
                      }
                    }
                    deactivated_users{
                      show_perm
                      edit_perm
                    }
                  }
                  parameters {
                platform {
                    user_type_management {
                        actions {
                            edit_perm
                            delete_perm
                        }
                        show_perm
                        user_type_table
                    }
                    scholar_season {
                        actions {
                            edit_perm
                            delete_perm
                        }
                        show_perm
                        scholar_season_table
                        add_perm
                    }
                    calendar_steps_manegement {
                        actions {
                            edit_perm
                            delete_perm
                        }
                        show_perm
                        calendar_steps_table
                        add_perm
                    }
                    show_perm
                }

                rncp_title_management {
                    show_perm
                    add_perm
                    edit_perm
                    home_page
                }
                show_perm
                edit_perm
                home_page
                user_permission {
                    show_perm
                 }
               }
                  export {
                edit_perm
                home_page
                groups {
                    show_perm
                    edit_perm
                    home_page
                }
                status_update {
                    show_perm
                    edit_perm
                    home_page
                }
                show_perm
                edit_perm
                home_page
            }
                  history {
                notifications {
                    actions {
                        view_perm
                        btn_export
                        btn_today
                        btn_yesterday
                        btn_last_7_days
                        btn_last_30_days
                        btn_reset
                    }
                    show_perm
                    edit_perm
                    home_page
                }
                my_activities {
                  show_perm
                }
                user_status {
                  show_perm
                }
                tests {
                    actions {
                        view_perm
                        forward
                    }
                    show_perm
                    list_of_test_table
                    edit_perm
                    home_page
                }
                show_perm
            }
                  process {
                    show_perm
                    edit_perm
                    home_page
                    ques_tools {
                      show_perm
                      add_perm
                      edit_perm
                      home_page
                      actions {
                        duplicate_perm
                        edit_perm
                        delete_perm
                      }
                    }
                    emp_survey {
                      show_perm
                      edit_perm
                      home_page
                      actions {
                        btn_reset
                        btn_employability_survey
                      }
                    }
                    quality_control {
                      show_perm
                    }
                    cross_correction {
                      show_perm
                      edit_perm
                      home_page
                    }
                    retake_during_year {
                      show_perm
                    }
                    form_builder {
                      actions {
                        duplicate_perm
                        edit_perm
                        delete_perm
                        btn_form_template
                        btn_reset
                      }
                      show_perm
                      add_perm
                      edit_perm
                      home_page
                    }
                    form_follow_up {
                      show_perm
                      edit_perm
                      home_page
                    }
                  }
                  messages {
                    show_perm
                    edit_perm
                    home_page
                    urgent_message {
                      show_perm
                      edit_perm
                      home_page
                      actions {
                        btn_submit
                      }
                    }
                    group_mailing {
                      show_perm
                      edit_perm
                      home_page
                    }
                    alert_func {
                      actions {
                        delete_perm
                        edit_perm
                        user_response
                        duplicate
                        btn_add_new_alert
                      }
                      show_perm
                      alert_func_table
                      edit_perm
                      home_page
                    }
                  }
                  certifications {
                    show_perm
                    accrochage {
                      show_perm
                    }
                    final_transcript {
                      show_perm
                      edit_perm
                      home_page
                    }
                    jury_schedule {
                      show_perm
                      edit_perm
                      home_page
                    }
                    test_status {
                      show_perm
                      edit_perm
                      home_page
                    }
                    jury_organization {
                      show_perm
                      add_perm
                      actions {
                        view_perm
                        delete_perm
                        edit_perm
                      }
                      organize_juries {
                        show_perm
                      }
                      schedule_juries {
                        show_perm
                      }
                      jury_organization_assign_jury {
                        show_perm
                        add_survival_kit
                        send_to_certifier
                        export_csv
                        actions {
                          view_perm
                          delete_perm
                          edit_perm
                        }
                      }
                      jury_organization_assign_president_jury {
                        show_perm
                        assign_president_jury_perm
                      }
                      jury_organization_assign_member_jury {
                        show_perm
                        assign_member_jury_perm
                      }
                      jury_organization_assign_student {
                        show_perm
                        assign_student_perm
                        actions {
                          view_perm
                          delete_perm
                          edit_perm
                        }
                      }
                      jury_organization_schedule_jury {
                        show_perm
                        add_survival_kit
                      }
                      jury_mark_entry_table {
                        show_perm
                      }
                      edit_jury_organization {
                        show_perm
                        edit_perm
                        home_page
                      }
                      delete_jury_organization {
                        show_perm
                        edit_perm
                        home_page
                      }
                    }
                    final_retake {
                      show_perm
                    }
                    certidegree {
                      show_perm
                      add_perm
                      edit_perm
                      home_page
                      actions {
                        delete_perm
                        edit_perm
                      }
                    }
                    dossier_bilan {
                      add_perm
                      show_perm
                      edit_perm
                      dossier_bilan_detail {
                        edit_perm
                        add_perm
                        show_perm
                        delete_perm
                        dossier_bilan_parameter {
                          edit_perm
                          add_perm
                          show_perm
                          delete_perm
                        }
                        dossier_bilan_follow_up {
                          edit_perm
                          add_perm
                          show_perm
                          delete_perm
                        }
                      }
                    }
                  }
                  transcript_builder {
                    show_perm
                  }
                  ideas {
                    show_perm
                    ideas_table
                    add_perm
                    actions {
                      details
                      reply
                      share
                      delete_perm
                    }
                  }
                  tutorials {
                    show_perm
                    tutorial_table
                    add_perm
                    edit_perm
                    home_page
                    actions {
                      view_perm
                      edit_perm
                      delete_perm
                      send
                    }
                  }
                  need_help {
                    show_perm
                  }
                  chief_group_school {
                    show_perm
                  }
                  company_student {
                    show_perm
                  }
                  previous_course {
                    show_perm
                  }
                  promos {
                    show_perm
                    promo_table
                    add_perm
                    edit_perm
                    home_page
                    actions {
                      view_perm
                      edit_perm
                      delete_perm
                    }
                  }
                  inapp_tutorials {
                    show_perm
                    edit_perm
                    home_page
                  }
                  manager_menu {
                    billing {
                      show_perm
                      edit_perm
                      actions {
                        btn_export_billing
                        btn_reset
                      }
                    }
                    show_perm
                    manager_task
                    table_of_student
                    tasks_follow_up
                    manager_task_sub {
                      pending_task {
                        show_perm
                        edit_perm
                        actions {
                          btn_reset
                          btn_manager_task
                        }
                      }
                      follow_up_school_table {
                        show_perm
                        edit_perm
                        actions {
                          btn_see_follow_up_school_table
                        }
                      }
                      follow_up_registration {
                        show_perm
                        edit_perm
                        actions {
                          btn_see_follow_up_registration_table
                        }
                      }
                      follow_up_company {
                        show_perm
                        edit_perm
                        actions {
                          btn_see_follow_up_company_table
                        }
                      }
                    }
                    table_of_student_sub {
                      show_perm
                      edit_perm
                      connect_as_student {
                        show_perm
                        edit_perm
                      }
                      status_toward_administaration {
                        show_perm
                        edit_perm
                      }
                      resignation_of_student {
                        show_perm
                        edit_perm
                      }
                      student_file {
                        show_perm
                        edit_perm
                      }
                      send_a_email_to_student {
                        show_perm
                        edit_perm
                      }
                      commentaries {
                        show_perm
                        edit_perm
                      }
                      email_academic_director {
                        show_perm
                        edit_perm
                      }
                    }
                    tasks_follow_up_sub {
                      tasks_follow_up_table {
                        show_perm
                        edit_perm
                        actions {
                          btn_send_reminder
                          btn_export_csv
                          btn_reset
                        }
                      }
                      history_of_reminder_table {
                        show_perm
                        edit_perm
                        actions {
                          btn_export_csv
                          btn_reset
                        }
                      }
                      template_of_reminder {
                        show_perm
                        edit_perm
                        actions {
                          btn_new_template
                          btn_export_csv
                          btn_reset
                        }
                      }
                    }
                  }
                  student_corrector {
                    show_perm
                    actions {
                      edit_perm
                    }
                  }
                }
              }
            }
          }
        }
      }
      `,
      })
      .pipe(
        map(resp => {
          return resp.data['loginAsUserIncognito'];
        }),
      );
  }

  GetDashboardThemeSetting(user_id: any): Observable<any> {
    return this.apollo
      .query({
        query: gql`query {
         GetDashboardThemeSetting(user_id:"${user_id}"){
          sidebar_type
          selected_theme {
           name
           primary
           secondary
           tertiary
          }

        }
     }`,
        fetchPolicy: 'network-only',
      })
      .pipe(map(res => res.data['GetDashboardThemeSetting']));
  }

  autoLoginFromAuth(email: string): Observable<any> {
    return this.apollo
      .query({
        query: gql`
        query {
        GetOneUser(email: "${email}") {
          _id
          civility
          first_name
          last_name
          email
          position
          office_phone
          direct_line
          portable_phone
          profile_picture
          student_id {
            _id
            student_title_status
            admission_status
          }
          entities {
            entity_name
            school_type
            group_of_schools {
              _id
              short_name
            }
            group_of_school{
              _id
              headquarter {
                _id
                short_name
              }
              school_members {
                _id
                short_name
              }
            }
            school {
              _id
              short_name
              logo
            }
            assigned_rncp_title {
              _id
              short_name
            }
            class {
              _id
              name
            }
            type {
              _id
              name
              usertype_permission_id {
                _id
                user_type_name
                user_dashboard {
                  show_perm
                  edit_perm
                  home_page
                }
                rncp_title {
                  show_perm
                  show_chief_group_perm
                  pending_task {
                    show_perm
                    edit_perm
                  }
                  acad_kit {
                    show_perm
                    edit_perm
                    edit_06_perm
                    folder_permissions {
                      folder_one {
                        show_perm
                      }
                      folder_two {
                        show_perm
                      }
                      folder_three {
                        show_perm
                      }
                      folder_four {
                        show_perm
                      }
                      folder_five {
                        show_perm
                      }
                      folder_six {
                        show_perm
                      }
                      folder_seven {
                        show_perm
                      }
                      folder_others {
                        show_perm
                      }
                    }
                  }
                  calendar {
                    show_perm
                    edit_perm
                    add_perm
                    delete_perm
                  }
                }
                schools {
                  show_perm
                  list_of_schools_sub {
                    show_perm
                    edit_perm
                    add_school {
                      show_perm
                      edit_perm
                      actions {
                        btn_save
                        btn_add_address
                        btn_add_logo
                      }
                    }
                    export {
                      show_perm
                      edit_perm
                    }
                    edit_school {
                      show_perm
                      edit_perm
                    }
                    student_detail {
                      show_perm
                      edit_perm
                    }
                    send_email {
                      show_perm
                      edit_perm
                    }
                  }
                  group_of_schools_sub {
                    show_perm
                    edit_perm
                    add_school_group {
                      show_perm
                      edit_perm
                      actions {
                        btn_cancel
                        btn_submit
                      }
                    }
                    edit_school_group {
                      show_perm
                      edit_perm
                      actions {
                        btn_cancel
                        btn_submit
                      }
                    }
                    delete_school_group {
                      show_perm
                    }
                  }
                  list_of_schools {
                    show_perm
                    student_table {
                      show_perm
                      actions {
                        thumbsup
                        resignation
                        edit_perm
                        send_email
                        incognito
                        view_admission_form_perm
                      }
                      import_student
                      add_perm
                      export_list_of_student
                      export_ES
                    }
                    deactivate_student_table {
                      show_perm
                      export_perm
                      reactive_perm
                      resignation_detail
                    }
                    suspended_student_table {
                      show_perm
                    }
                    school_table {
                      show_perm
                      add_perm
                      actions {
                        edit_perm
                        send_email
                      }
                    }
                    school_details {
                      show_perm
                      edit_perm
                      add_perm
                      connected_rncp {
                        show_perm
                        add_perm
                        actions {
                          edit_perm
                          delete_perm
                        }
                      }
                    }
                    school_staff {
                      show_perm
                      add_user
                      export_button
                      school_staff_table {
                        show_perm
                        actions {
                          incognito
                          error_email
                          edit_perm
                          delete_perm
                          send_email
                        }
                      }
                    }
                    student_card {
                      show_perm
                      add_perm
                      import_student
                      import_student_company
                      identity {
                        show_perm
                        identity {
                          show_perm
                          edit_perm
                        }
                        course {
                          show_perm
                          edit_perm
                        }
                        parent {
                          show_perm
                          edit_perm
                        }
                        diploma {
                          show_perm
                          edit_perm
                        }
                      }
                      admission {
                        show_perm
                        admission_form {
                          show_perm
                          edit_perm
                        }
                        academic_journey {
                          show_perm
                          edit_perm
                        }
                        certification_rule {
                          show_perm
                          edit_perm
                        }
                      }
                      company {
                        show_perm
                        company {
                          show_perm
                          edit_perm
                        }
                        job_desc {
                          show_perm
                          edit_perm
                        }
                        problematic {
                          show_perm
                          edit_perm
                        }
                        mentor_evaluation {
                          show_perm
                          edit_perm
                        }
                      }
                      document {
                        show_perm
                        edit_perm
                        my_document {
                          show_perm
                          edit_perm
                        }
                        published_document {
                          show_perm
                          edit_perm
                        }
                      }
                      certification {
                        show_perm
                        certification {
                          show_perm
                          edit_perm
                        }
                        subject_of_cert {
                          show_perm
                          edit_perm
                        }
                        details_of_certification {
                          show_perm
                          edit_perm
                        }
                      }
                      emp_survey {
                        show_perm
                        edit_perm
                      }
                      retake_during_year {
                        show_perm
                        edit_perm
                      }
                      task {
                        show_perm
                        add_task
                        internal_task
                        add_test_task
                        actions {
                          delete_task
                          edit_perm
                        }
                      }
                      comment {
                        show_perm
                        add_comment
                      }
                      mailbox {
                        show_perm
                        edit_perm
                        inbox
                        sent
                        important
                        draft
                        trash
                        actions {
                          download_email
                          urgent_message
                          mail_to_group
                          compose
                          important
                          delete
                        }
                        inbox_sub {
                          show_perm
                          edit_perm
                          actions {
                            btn_reset
                            btn_compose
                            btn_download_email
                            btn_urgent_message
                            btn_mail_to_group
                          }
                        }
                        cc_sub {
                          show_perm
                          edit_perm
                          actions {
                            btn_reset
                            btn_compose
                            btn_download_email
                            btn_urgent_message
                            btn_mail_to_group
                          }
                        }
                        sent_sub {
                          show_perm
                          edit_perm
                          actions {
                            btn_reset
                            btn_compose
                            btn_download_email
                            btn_urgent_message
                            btn_mail_to_group
                          }
                        }
                        important_sub {
                          show_perm
                          edit_perm
                          actions {
                            btn_reset
                            btn_compose
                            btn_download_email
                            btn_urgent_message
                            btn_mail_to_group
                          }
                        }
                        draft_sub {
                          show_perm
                          edit_perm
                          actions {
                            btn_reset
                            btn_compose
                            btn_download_email
                            btn_urgent_message
                            btn_mail_to_group
                          }
                        }
                        trash_sub {
                          show_perm
                          edit_perm
                          actions {
                            btn_reset
                            btn_compose
                            btn_download_email
                            btn_urgent_message
                            btn_mail_to_group
                          }
                        }
                      }
                    }
                  }
                  group_of_schools {
                    show_perm
                    add_perm
                    actions {
                      edit_perm
                      delete_perm
                    }
                  }
                }
                students {
                  show_perm
                  derogation_dispense {
                    show_perm
                    edit_perm
                    ask_form {
                      edit_perm
                      show_perm
                    }
                  }
                  student_table {
                    show_perm
                    export_list_of_student
                    export_ES
                    actions {
                      edit_perm
                      thumbsup
                      incognito
                      error_email
                      send_email
                      resignation_perm
                      deactive_perm
                    }
                  }
                  active_students {
                    show_perm
                    student_table {
                      show_perm
                      export_list_of_student
                      export_ES
                      transfer_student
                      actions {
                        edit_perm
                        thumbsup
                        incognito
                        error_email
                        send_email
                        resignation_perm
                        deactive_perm
                        view_admission_form_perm
                        view_perm
                      }
                    }
                  }
                  completed_students {
                    show_perm
                    student_table {
                      show_perm
                      export_list_of_student
                      export_ES
                      actions {
                        edit_perm
                        thumbsup
                        incognito
                        error_email
                        send_email
                        resignation_perm
                        deactive_perm
                        view_perm
                      }
                    }
                  }
                  deactivated_students {
                    show_perm
                    student_table {
                      show_perm
                      export_list_of_student
                      export_ES
                      actions {
                        reactivation_perm
                        edit_perm
                        thumbsup
                        incognito
                        error_email
                        send_email
                        resignation_perm
                        deactive_perm
                      }
                    }
                  }
                  suspended_students {
                    show_perm
                    student_table {
                      show_perm
                      export_list_of_student
                      export_ES
                      actions {
                        reactivation_perm
                        edit_perm
                        thumbsup
                        incognito
                        error_email
                        send_email
                        resignation_perm
                        deactive_perm
                      }
                    }
                  }
                  student_card{
                    show_perm
                    actions {
                      edit_perm
                      thumbsup
                      incognito
                      error_email
                      send_email_student
                      send_email_mentor
                      send_email_acadir
                      resignation_perm
                      deactive_perm
                      view_perm
                      reactivation_perm
                      resignation_detail
                      renew_pass
                    }
                  }
                  student_detail {
                    show_perm
                  }
                }
                my_file {
                  show_perm
                }
                academic_journeys {
                  show_perm
                }
                form_follow_up
                companies {
                  show_perm
                  add_company
                  company_entity {
                    show_perm
                    add_company {
                      show_perm
                      edit_perm
                    }
                    entity {
                      show_perm
                    }
                    head_office {
                      show_perm
                    }
                    branch {
                      show_perm
                    }
                    note {
                      show_perm
                      add_note
                    }
                  }
                  company_branch {
                    show_perm
                    add_company {
                      show_perm
                      edit_perm
                    }
                    identity {
                      show_perm
                    }
                    company_staff {
                      show_perm
                      add_perm
                      actions {
                        edit_perm
                        send_email
                        delete_perm
                      }
                    }
                    school_connected {
                      show_perm
                      connect_school
                      actions {
                        connect_mentor_to_School
                        delete_perm
                      }
                    }
                    note {
                      show_perm
                      add_note
                    }
                  }
                }
                tasks {
                  show_perm
                  add_task
                  internal_task
                  add_test_task
                  actions {
                    delete_task
                    edit_perm
                  }
                  my_task {
                    show_perm
                    edit_perm
                    add_task {
                      show_perm
                    }
                    actions {
                      btn_add_task
                      btn_today
                      btn_yesterday
                      btn_last_7_days
                      btn_last_30_days
                      btn_reset
                      btn_internal_task
                    }
                  }
                  student_task {
                    show_perm
                    edit_perm
                    add_task {
                      show_perm
                    }
                    actions {
                      btn_add_task
                      btn_today
                      btn_yesterday
                      btn_last_7_days
                      btn_last_30_days
                      btn_reset
                      btn_internal_task
                    }
                  }
                  user_task {
                    show_perm
                    edit_perm
                    add_task {
                      show_perm
                    }
                    actions {
                      btn_add_task
                      btn_today
                      btn_yesterday
                      btn_last_7_days
                      btn_last_30_days
                      btn_reset
                      btn_internal_task
                    }
                  }
                }
                mailbox {
                  show_perm
                  inbox
                  sent
                  important
                  draft
                  trash
                  actions {
                    download_email
                    urgent_message
                    mail_to_group
                    compose
                    important
                    delete
                  }
                  inbox_sub {
                    show_perm
                    edit_perm
                    actions {
                      btn_reset
                      btn_compose
                      btn_download_email
                      btn_urgent_message
                      btn_mail_to_group
                    }
                  }
                  cc_sub {
                    show_perm
                    edit_perm
                    actions {
                      btn_reset
                      btn_compose
                      btn_download_email
                      btn_urgent_message
                      btn_mail_to_group
                    }
                  }
                  sent_sub {
                    show_perm
                    edit_perm
                    actions {
                      btn_reset
                      btn_compose
                      btn_download_email
                      btn_urgent_message
                      btn_mail_to_group
                    }
                  }
                  important_sub {
                    show_perm
                    edit_perm
                    actions {
                      btn_reset
                      btn_compose
                      btn_download_email
                      btn_urgent_message
                      btn_mail_to_group
                    }
                  }
                  draft_sub {
                    show_perm
                    edit_perm
                    actions {
                      btn_reset
                      btn_compose
                      btn_download_email
                      btn_urgent_message
                      btn_mail_to_group
                    }
                  }
                  trash_sub {
                    show_perm
                    edit_perm
                    actions {
                      btn_reset
                      btn_compose
                      btn_download_email
                      btn_urgent_message
                      btn_mail_to_group
                    }
                  }
                }
                users {
                  show_perm
                  add_perm
                  export
                  transfer_responsibility
                  actions {
                    incognito
                    error_email
                    delete_perm
                    edit_perm
                    send_email
                    reminder_reg_user
                     export{
                        show_perm
                        edit_perm
                        home_page
                      }
                    transfer_responsibility{
                        show_perm
                        edit_perm
                        home_page
                      }
                    add_user{
                        show_perm
                        edit_perm
                        home_page
                      }
                  }
                  deactivated_users{
                    show_perm
                    edit_perm
                  }
                }
                parameters {
                platform {
                    user_type_management {
                        actions {
                            edit_perm
                            delete_perm
                        }
                        show_perm
                        user_type_table
                    }
                    scholar_season {
                        actions {
                            edit_perm
                            delete_perm
                        }
                        show_perm
                        scholar_season_table
                        add_perm
                    }
                    calendar_steps_manegement {
                        actions {
                            edit_perm
                            delete_perm
                        }
                        show_perm
                        calendar_steps_table
                        add_perm
                    }
                    show_perm
                }

                rncp_title_management {
                    show_perm
                    add_perm
                    edit_perm
                    home_page
                }
                show_perm
                edit_perm
                home_page
                user_permission {
                    show_perm
                 }
               }
                export {
                edit_perm
                home_page
                groups {
                    show_perm
                    edit_perm
                    home_page
                }
                status_update {
                    show_perm
                    edit_perm
                    home_page
                }
                show_perm
                edit_perm
                home_page
            }
                history {
                notifications {
                    actions {
                        view_perm
                        btn_export
                        btn_today
                        btn_yesterday
                        btn_last_7_days
                        btn_last_30_days
                        btn_reset
                    }
                    show_perm
                    edit_perm
                    home_page
                }
                my_activities {
                  show_perm
                }
                user_status {
                  show_perm
                }
                tests {
                    actions {
                        view_perm
                        forward
                    }
                    show_perm
                    list_of_test_table
                    edit_perm
                    home_page
                }
                show_perm
            }
                process {
                  show_perm
                  edit_perm
                  home_page
                  ques_tools {
                    show_perm
                    add_perm
                    edit_perm
                    home_page
                    actions {
                      duplicate_perm
                      edit_perm
                      delete_perm
                    }
                  }
                  emp_survey {
                    show_perm
                    edit_perm
                    home_page
                    actions {
                      btn_reset
                      btn_employability_survey
                    }
                  }
                  quality_control {
                    show_perm
                  }
                  cross_correction {
                    show_perm
                    edit_perm
                    home_page
                  }
                  retake_during_year {
                    show_perm
                  }
                  form_builder {
                    actions {
                      duplicate_perm
                      edit_perm
                      delete_perm
                      btn_form_template
                      btn_reset
                    }
                    show_perm
                    add_perm
                    edit_perm
                    home_page
                  }
                  form_follow_up {
                    show_perm
                    edit_perm
                    home_page
                  }
                }
                messages {
                  show_perm
                  edit_perm
                  home_page
                  urgent_message {
                    show_perm
                    edit_perm
                    home_page
                    actions {
                      btn_submit
                    }
                  }
                  group_mailing {
                    show_perm
                    edit_perm
                    home_page
                  }
                  alert_func {
                    actions {
                      delete_perm
                      edit_perm
                      user_response
                      duplicate
                      btn_add_new_alert
                    }
                    show_perm
                    alert_func_table
                    edit_perm
                    home_page
                  }
                }
                certifications {
                  show_perm
                  accrochage {
                    show_perm
                  }
                  final_transcript {
                    show_perm
                    edit_perm
                    home_page
                  }
                  jury_schedule {
                    show_perm
                    edit_perm
                    home_page
                  }
                  test_status {
                    show_perm
                    edit_perm
                    home_page
                  }
                  jury_organization {
                    show_perm
                    add_perm
                    actions {
                      view_perm
                      delete_perm
                      edit_perm
                    }
                    organize_juries {
                      show_perm
                    }
                    schedule_juries {
                      show_perm
                    }
                    jury_organization_assign_jury {
                      show_perm
                      add_survival_kit
                      send_to_certifier
                      export_csv
                      actions {
                        view_perm
                        delete_perm
                        edit_perm
                      }
                    }
                    jury_organization_assign_president_jury {
                      show_perm
                      assign_president_jury_perm
                    }
                    jury_organization_assign_member_jury {
                      show_perm
                      assign_member_jury_perm
                    }
                    jury_organization_assign_student {
                      show_perm
                      assign_student_perm
                      actions {
                        view_perm
                        delete_perm
                        edit_perm
                      }
                    }
                    jury_organization_schedule_jury {
                      show_perm
                      add_survival_kit
                    }
                    jury_mark_entry_table {
                      show_perm
                    }
                    edit_jury_organization {
                      show_perm
                      edit_perm
                      home_page
                    }
                    delete_jury_organization {
                      show_perm
                      edit_perm
                      home_page
                    }
                  }
                  final_retake {
                    show_perm
                  }
                  certidegree {
                    show_perm
                    add_perm
                    edit_perm
                    home_page
                    actions {
                      delete_perm
                      edit_perm
                    }
                  }
                  dossier_bilan {
                    add_perm
                    show_perm
                    edit_perm
                    dossier_bilan_detail {
                      edit_perm
                      add_perm
                      show_perm
                      delete_perm
                      dossier_bilan_parameter {
                        edit_perm
                        add_perm
                        show_perm
                        delete_perm
                      }
                      dossier_bilan_follow_up {
                        edit_perm
                        add_perm
                        show_perm
                        delete_perm
                      }
                    }
                  }
                }
                transcript_builder {
                  show_perm
                }
                ideas {
                  show_perm
                  ideas_table
                  add_perm
                  actions {
                    details
                    reply
                    share
                    delete_perm
                  }
                }
                tutorials {
                  show_perm
                  tutorial_table
                  add_perm
                  edit_perm
                  home_page
                  actions {
                    view_perm
                    edit_perm
                    delete_perm
                    send
                  }
                }
                need_help {
                  show_perm
                }
                chief_group_school {
                  show_perm
                }
                company_student {
                  show_perm
                }
                previous_course {
                  show_perm
                }
                promos {
                  show_perm
                  promo_table
                  add_perm
                  edit_perm
                  home_page
                  actions {
                    view_perm
                    edit_perm
                    delete_perm
                  }
                }
                inapp_tutorials {
                  show_perm
                  edit_perm
                  home_page
                }
                manager_menu {
                  billing {
                    show_perm
                    edit_perm
                    actions {
                      btn_export_billing
                      btn_reset
                    }
                  }
                  show_perm
                  manager_task
                  table_of_student
                  tasks_follow_up
                  manager_task_sub {
                    pending_task {
                      show_perm
                      edit_perm
                      actions {
                        btn_reset
                        btn_manager_task
                      }
                    }
                    follow_up_school_table {
                      show_perm
                      edit_perm
                      actions {
                        btn_see_follow_up_school_table
                      }
                    }
                    follow_up_registration {
                      show_perm
                      edit_perm
                      actions {
                        btn_see_follow_up_registration_table
                      }
                    }
                    follow_up_company {
                      show_perm
                      edit_perm
                      actions {
                        btn_see_follow_up_company_table
                      }
                    }
                  }
                  table_of_student_sub {
                    show_perm
                    edit_perm
                    connect_as_student {
                      show_perm
                      edit_perm
                    }
                    status_toward_administaration {
                      show_perm
                      edit_perm
                    }
                    resignation_of_student {
                      show_perm
                      edit_perm
                    }
                    student_file {
                      show_perm
                      edit_perm
                    }
                    send_a_email_to_student {
                      show_perm
                      edit_perm
                    }
                    commentaries {
                      show_perm
                      edit_perm
                    }
                    email_academic_director {
                      show_perm
                      edit_perm
                    }
                  }
                  tasks_follow_up_sub {
                    tasks_follow_up_table {
                      show_perm
                      edit_perm
                      actions {
                        btn_send_reminder
                        btn_export_csv
                        btn_reset
                      }
                    }
                    history_of_reminder_table {
                      show_perm
                      edit_perm
                      actions {
                        btn_export_csv
                        btn_reset
                      }
                    }
                    template_of_reminder {
                      show_perm
                      edit_perm
                      actions {
                        btn_new_template
                        btn_export_csv
                        btn_reset
                      }
                    }
                  }
                }
                student_corrector {
                  show_perm
                  actions {
                    edit_perm
                  }
                }
                inapp_tutorials {
                  show_perm
                  edit_perm
                  home_page
                }
                promos {
                  show_perm
                  promo_table
                  add_perm
                  edit_perm
                  home_page
                  actions {
                    view_perm
                    edit_perm
                    delete_perm
                  }
                }
                form_follow_up
              }
            }
          }
        }
      }
      `,
      })
      .pipe(
        map(resp => {
          return resp.data['GetOneUser'];
        }),
      );
  }

  isUserADMTCAdmin() {
    const currentUser = JSON.parse(localStorage.getItem('userProfile'));
    let isADMTCADMIN = false;
    if (currentUser && currentUser.entities && currentUser.entities.length) {
      for (const entity of currentUser.entities) {
        if (entity && entity.type && entity.type.name === 'ADMTC Admin') {
          isADMTCADMIN = true;
          break;
        }
      }
    }
    return isADMTCADMIN;
  }

  getUserEntity() {
    const currentUser = JSON.parse(localStorage.getItem('userProfile'));
    let entityName = '';
    if (currentUser && currentUser.entities && currentUser.entities.length) {
      for (const entity of currentUser.entities) {
        entityName = entity.entity_name;
        break;
      }
    }
    return entityName;
  }

  checkLinkStatus(token): Observable<any> {
    return this.apollo
      .mutate({
        mutation: gql`
        mutation {
          CheckLinkStatus(token: "${token}")
          }
        `,
        errorPolicy: 'all',
      })
      .pipe(map(resp => resp));
  }

  checkStudentAllowedToLoggin(student_id) {
    return this.apollo
      .mutate({
        mutation: gql`
          mutation($student_id: ID) {
            CheckStudentAllowedToLoggin(student_id: $student_id)
          }
        `,
        variables: {
          student_id: student_id,
        },
      })
      .pipe(map(resp => resp.data['CheckStudentAllowedToLoggin']));
  }

  postErrorLog(msg: string) {
    msg = JSON.stringify(msg);
    const exceptionList = [
      '0 Unknown Error',
      'Password Not Valid',
      'Invalid Password',
      'invalid signature',
      'jwt expired',
      'str & salt required',
      'UnAuthenticated',
      'salt',
    ];
    let isException = false;
    if (msg) {
      for (const exception of exceptionList) {
        if (msg.includes(exception)) {
          isException = true;
          break;
        }
      }
    }

    if (!isException) {
      let currentUser = localStorage.getItem('userProfile') ? JSON.parse(localStorage.getItem('userProfile')) : null;
      const packages = require('../../../../package.json');
      currentUser = currentUser && currentUser._id ? currentUser : null;
      const payload = {
        environment: environment.apiUrl,
        first_name: currentUser ? currentUser.first_name : '',
        last_name: currentUser ? currentUser.last_name : '',
        civility: currentUser ? currentUser.civility : '',
        email: currentUser ? currentUser.email : '',
        operating_system: OSNameADMTC,
        browser_name: browserNameADMTC,
        version: packages.version,
        url: locationUrl,
        error_message: msg,
      };

      if (environment.apiUrl === 'https://prod-api.zettaprojects.space/graphql') {
        this.httpClient.post<any>(`https://zetta-track.click/saveErrorLog`, payload).subscribe(data => {});
      }
    }
  }

  /**
   * this function to handle respone error email validation form third party
   */
  postErrorLogThirdParty(err) {
    const message = String(err?.message);
    const errorTypes = [
      'GraphQL error: Error: error',
      'GraphQL error: Error: smtp_error',
      'GraphQL error: Error: attempt_rejected',
      'GraphQL error: Error: relay_error',
      'GraphQL error: Error: domain_error',
      'GraphQL error: Error: dead_server',
      'GraphQL error: Error: syntax_error',
      'GraphQL error: Error: unknown',
      'GraphQL error: Error: disposable',
      'GraphQL error: Error: spam_trap',
      'GraphQL error: Error: spamtrap',
      'GraphQL error: Error: spam_traps',
      'GraphQL error: Error: spamtraps',
      'GraphQL error: Error: invalid_syntax',
      'GraphQL error: Error on email verification',
      'email address doesn',
      'Existing user',
    ];

    let newReason = '';

    /**
     * the code below is to find is the message include in the errorTypes
     * if true newReason variable will assign with message so the code errorTypes.includes(newReason) below
     * will return true
     */
    if (errorTypes.find(errorType => errorType === message)) {
      newReason = message;
    }

    if (errorTypes.includes(newReason)) {
      /**
       * if else below is use to replace error because both error will appear same swal
       * so i won't duplicate in the fr or en json
       */
      if (newReason === 'GraphQL error: Error: invalid_syntax') {
        newReason = 'GraphQL error: Error: syntax_error';
      } else if (/spam_trap/.test(newReason) || /spamtrap/.test(newReason)) {
        newReason = 'GraphQL error: Error: spam_traps';
      }

      Swal.fire({
        title: this.translate.instant('USERCREATE_S3.TITLE'),
        html: this.translate.instant('USERCREATE_S3.TEXT', {
          reason: this.translate.instant('USERCREATE_S3.' + newReason.replace('GraphQL error: Error: ', '')),
        }),
        type: 'warning',
        footer: `<span style="margin-left: auto">USERCREATE_S3</span>`,
        confirmButtonText: this.translate.instant('USERCREATE_S3.BUTTON 1'),
      });
    } else {
      Swal.fire({
        type: 'error',
        title: 'Error',
        text: err && err['message'] ? err['message'] : err,
        confirmButtonText: this.translate.instant('DISCONNECT_SCHOOL.BUTTON3'),
        allowOutsideClick: false,
      });
    }
  }

  getUserIP(): void {
    this.httpClient.get('https://jsonip.com').subscribe(
      (data: any) => {
        localStorage.setItem('ipAddress', data?.ip);
      },
      error => {
        console.log(error);
      },
    );
  }
  setReloadTale(value: boolean) {
    this.isReloadTableSource.next(value);
  }
  GetUserTableColumnSettings(user_id): Observable<any[]> {
    return this.apollo
      .watchQuery<any[]>({
        query: gql`
          query GetUserTableColumnSettings($user_id: ID!) {
            GetUserTableColumnSettings(user_id: $user_id) {
              table_name
              default_tab
              display_column {
                column_name
              }
              filter_column
              header_column {
                is_group_header
                width_header {
                  group_header_name
                  is_have_group
                  col_span
                  list_column
                  list_filter_column
                }
                list_header
                template
              }
            }
          }
        `,
        variables: {
          user_id,
        },
        fetchPolicy: 'network-only',
      })
      .valueChanges.pipe(map(resp => resp.data['GetUserTableColumnSettings']));
  }
  CreateOrUpdateUserTableColumnSettings(user_id, input_table_setting): Observable<any> {
    return this.apollo
      .mutate({
        mutation: gql`
          mutation CreateOrUpdateUserTableColumnSettings($input_table_setting: InputTableSetting, $user_id: ID) {
            CreateOrUpdateUserTableColumnSettings(user_id: $user_id, input_table_setting: $input_table_setting) {
              table_name
              display_column {
                column_name
              }
              filter_column
              header_column {
                is_group_header
                width_header {
                  group_header_name
                  is_have_group
                  col_span
                  list_column
                  list_filter_column
                }
                list_header
                template
              }
            }
          }
        `,
        variables: {
          user_id,
          input_table_setting,
        },
      })
      .pipe(map(resp => resp.data['CreateOrUpdateUserTableColumnSettings']));
  }
  refreshTemplateTables(user_id) {
    this.subs.sink = this.GetUserTableColumnSettings(user_id).subscribe(
      resp => {
        if (resp && resp?.length) {
          localStorage.setItem('templateTable', JSON.stringify(resp));
        }
      },
      err => {
        Swal.fire({
          type: 'info',
          title: 'Warning',
          text: err && err['message'] ? this.translate.instant(err['message'].replaceAll('GraphQL error: ', '')) : err,
          confirmButtonText: this.translate.instant('DISCONNECT_SCHOOL.BUTTON3'),
        });
      },
    );
  }

  checkTemplateTable(currentUser) {
    this.subs.sink = this.GetUserTableColumnSettings(currentUser?._id)
      .pipe(take(1))
      .subscribe(
        resp => {
          if (resp && resp?.length) {
            localStorage.setItem('templateTable', JSON.stringify(resp));
          }
        },
        err => {
          Swal.fire({
            type: 'info',
            title: 'Warning',
            text: err && err['message'] ? this.translate.instant(err['message'].replaceAll('GraphQL error: ', '')) : err,
            confirmButtonText: this.translate.instant('DISCONNECT_SCHOOL.BUTTON3'),
          });
        },
      );
  }

  connectAsForAccrochage(user) {
    const token = localStorage?.getItem('admtc-token-encryption');
    const userData = window.btoa(
      JSON.stringify({
        token: token,
        user: {
          _id: user?._id,
          civility: 'MR',
          first_name: user?.first_name,
          last_name: user?.last_name,
          full_name: `${user?.last_name} ${user?.first_name}`,
          email: user?.email,
          position: user?.position,
          office_phone: user?.office_phone,
          direct_line: user?.direct_line,
          portable_phone: user?.portable_phone,
          profile_picture: user?.profile_picture,
          is_password_set: user?.is_password_set,
          is_registered: user?.is_registered,
          last_admission_status: user?.last_admission_status,
          student_id: user?.student_id,
          hashed_password: user?.hashed_password,
          entities: user?.entities.map(element => {
            return {
              entity_name: element?.entity_name,
              school: element?.school?._id,
              assigned_to_rncp: element?.assigned_rncp_title?._id,
              class: element?.class?._id,
              type: {
                _id: element?.type?._id,
                name: element?.type?.name,
              },
            };
          }),
        },
      }),
    );

    window.open(environment.accorchageEnvironment + `?u=${userData}`, '_blank');
  }

  connectAsForDeskaide(user, type) {
    const token = localStorage?.getItem('admtc-token-encryption');
    const currentUser = this.getLocalStorageUser();
    const userType = currentUser.entities.find(entity => entity?.type?.name?.toLowerCase() === this.getPermission()[0]?.toLowerCase());
    const userData = window.btoa(
      JSON.stringify({
        token: token,
        user: {
          _id: user?._id,
          civility: 'MR',
          first_name: user?.first_name,
          last_name: user?.last_name,
          full_name: `${user?.last_name} ${user?.first_name}`,
          email: user?.email,
          profile_picture: user?.profile_picture,
          salt: user?.salt,
          is_operator: this.checkUserOperator(user?.entities),
          is_user_acadir: this.checkUserAcadir(user?.entities),
          user_type: userType?.type?._id,
          entities: currentUser?.entities.map(list => {
            return {
              assigned_rncp_title: list?.assigned_rncp_title,
              class: list?.class,
              type: {
                name: list?.type?.name,
                _id: list?.type?._id,
              },
            };
          }),
          user_from_platform: 'admtc',
          is_password_set: user?.is_password_set,
          is_registered: user?.is_registered,
          last_admission_status: user?.last_admission_status,
          student_id: user?.student_id,
          hashed_password: user?.hashed_password,
        },
      }),
    );
    const platformData = window.btoa('ADMTC');
    const target = window.btoa(type);
    window.open(environment.deskaideEnvironment + `/sign-in-with-token?u=${userData}&p=${platformData}&t=${target}`, '_blank');
  }

  checkUserOperator(entities) {
    let isOperator = false;
    if (entities?.length) {
      isOperator = entities?.some(data => data?.type?._id === '5a2e1ecd53b95d22c82f954e' || data?.type?._id === '5a2e1ecd53b95d22c82f954b');
    }
    return isOperator;
  }
  checkUserAcadir(entities) {
    let isACADIR = false;
    if (entities?.length) {
      isACADIR = entities?.some(data => data?.type?._id === '5a2e1ecd53b95d22c82f9554');
    }
    return isACADIR;
  }
  getUserByIdForAccrochage(userId: string) {
    return this.apollo
      .query({
        query: gql`query {
         GetOneUser(_id:"${userId}"){
                 _id
                 civility
                 first_name
                 last_name
                 email
                 position
                 office_phone
                 direct_line
                 portable_phone
                 profile_picture
                 hashed_password
         }
     }`,
        fetchPolicy: 'network-only',
      })
      .pipe(map(res => res.data['GetOneUser']));
  }

  getUserByIdForDeskaide(_id: string) {
    return this.apollo
      .query({
        query: gql`
          query GetUserByIdForDeskaide($_id: ID) {
            GetOneUser(_id: $_id) {
              _id
              civility
              first_name
              last_name
              email
              position
              office_phone
              direct_line
              salt
              portable_phone
              profile_picture
              hashed_password
              is_password_set
              is_registered
            }
          }
        `,
        variables: {
          _id: _id,
        },
        fetchPolicy: 'network-only',
      })
      .pipe(map(res => res.data['GetOneUser']));
  }

  GetOneUser(email: string) {
    return this.apollo
      .query({
        query: gql`
          query GetOneUser($email: String) {
            GetOneUser(email: $email) {
              _id
              student_id {
                _id
              }
            }
          }
        `,
        variables: {
          email: email,
        },
        fetchPolicy: 'network-only',
      })
      .pipe(map(res => res.data['GetOneUser']));
  }
}
