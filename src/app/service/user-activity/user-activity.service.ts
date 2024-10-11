import { Injectable } from '@angular/core';
import { Apollo } from 'apollo-angular';
import gql from 'graphql-tag';
import { map } from 'rxjs/operators';
import { UserActivity } from 'app/models/user-activity.model';
import { UserActivityTranslateService } from '../user-activity-translate/user-activity-translate.service';
import * as _ from 'lodash';
import * as moment from 'moment';
import { FormGroup, FormArray, UntypedFormGroup, UntypedFormArray, FormControl, UntypedFormControl } from '@angular/forms';
import { AuthService } from '../auth-service/auth.service';
import { Observable } from 'rxjs';

declare var browserNameADMTC;
declare var fullVersionADMTC

// leave it outside class
let context: { [key: string]: any } = {}

@Injectable({
  providedIn: 'root'
})
export class UserActivityService {
  currentUser: any;

  constructor(
    private apollo: Apollo,
    private userActivityTranslate: UserActivityTranslateService,
    private authService: AuthService
  ) {
    // don't call AuthService.getLocalStorageUser() in constructor,
    // it's can cause white screen of death!!!
    this.currentUser = localStorage.getItem('userProfile');
    this.currentUser = this.currentUser ? JSON.parse(this.currentUser) : {};
  }

  // setter to add callback when translations are loaded
  // by UserActivityTranslateService.
  onTranslationLoaded(callback: Function) {
    this.userActivityTranslate.onLoad(callback);
  }

  getBrowserNameAndVersion() {
    return `${browserNameADMTC} - V ${fullVersionADMTC}`
  }

  getContext(key?: string) {
    return (key ? context[key] : context) ?? null
  }

  setContext(key: string, value: unknown) {
    if (value === undefined && value === null && value === '') {
      throw new Error('Value can not be null, undefined, or empty string')
    }
    context[key] = value
  }

  clearContext() {
    context = {}
  }

  translateToFR(key: string, params?: Object, autoPrefix: boolean = false) {
    return this.userActivityTranslate.getTranslation('fr', key, params, autoPrefix);
  }

  translateToEN(key: string, params?: Object, autoPrefix: boolean = false) {
    return this.userActivityTranslate.getTranslation('en', key, params, autoPrefix);
  }

  // To generate payload that must send user ID
  generatePayloadActivity(origin: string, activities: UserActivity[], affectedUsers: string[]) {
    const payloads = [];
    const activity = activities.filter(item => item.originButton === origin)[0];

    const payload = (affectedUserId?: string) => {
      return {
        user_id: this.currentUser._id,
        user_affected_id: affectedUserId || null,
        type_of_activity: activity.type_of_activity,
        action_en: this.translateAction('en', activity),
        action_fr: this.translateAction('fr', activity),
        description_en: this.translateDescription('en', activity),
        description_fr: this.translateDescription('fr', activity),
        browser: this.getBrowserNameAndVersion(),
        created_at: {
          date: moment().utc().format('DD/MM/YYYY'),
          time: moment().utc().format('HH:mm'),
        }
      };
    };

    affectedUsers.length
      ? affectedUsers.forEach(id => payloads.push(payload(id)))
      : payloads.push(payload());

    return payloads;
  }

  translateAction(lang: 'fr' | 'en', activity: UserActivity) {
    if (!activity.action) return null;
    const isPath = Array.isArray(activity.action);

    if (isPath) {
      return this.translatePath(lang, activity, true);
    }

    if (!isPath) {
      const params = activity.data_description;
      const action = activity.action;
      return this.userActivityTranslate.getTranslation(lang, action as string, params);
    }
  }

  translateDescription(lang: 'fr' | 'en', activity: UserActivity, isAction: boolean = false) {
    if (!activity.description && !activity.nav_description && !activity.action) return null;

    if ((activity.nav_description && !isAction) || (Array.isArray(activity.action) && isAction)) {
      return this.translatePath(lang, activity, isAction);
    }

    const params = activity.data_description;
    const keyTranslation = isAction && typeof activity.action === 'string' ? activity.action : activity.description;
    const description = (activity.nav_description && activity.action) || (activity.description &&  activity.action) || (activity.nav_description !== undefined && activity.description !== undefined && activity.action)
                        ? this.userActivityTranslate.getTranslation(lang, keyTranslation, params, true)
                        : null;

    return description;
  }

  translatePath(lang: 'fr' | 'en', activity: UserActivity, isAction: boolean = false) {
    const params = activity.data_description;
    const dataTranslate = isAction &&  Array.isArray(activity.action) ? activity.action : activity.nav_description;
    const accessTranslation =  this.userActivityTranslate.getTranslation(lang, 'access', null, true);

    const paths = dataTranslate.map(path => {
      return this.userActivityTranslate.getTranslation(lang, path, params);
    });

    return isAction ? accessTranslation +' '+ paths.join(' > ') : paths.join(' > ');;
  }

  // to generate data super filter for description user activity
  generateDataSuperFilter(dataSuperFilter){
    let appliedFilter = [];
    dataSuperFilter.forEach(data => {
      if (data.filterValue) {
        let valueFilterEN = '';
        let valueFilterFR = '';

        if(data.filterList.length !== data.filterValue.length) {
          let valueFilter = [];
           data.filterList.forEach(list => {
            if(data.filterValue.includes(list[data.savedValue])) {
              const translatedValue = {
                valueFilterEN: this.translateToEN(list[data.displayKey], null, true),
                valueFilterFR: this.translateToFR(list[data.displayKey], null, true)
              };
              valueFilter.push(translatedValue);
            }
           });
           if (valueFilter.length) {
            valueFilterEN = valueFilter.map(data => data.valueFilterEN).join();
            valueFilterFR = valueFilter.map(data => data.valueFilterFR).join();
          }
        }
        const dataFilter = {
          dataFilterEN : `${this.translateToEN(data?.name, null, true)}: ${(data.filterList.length !== data.filterValue.length ) ? valueFilterEN : 'All'}`,
          dataFilterFR :`${this.translateToFR(data?.name, null, true)}: ${(data.filterList.length !== data.filterValue.length ) ? valueFilterFR : this.translateToFR('All', null, true)}`,
        };
        if(data.filterValue.length) {
          appliedFilter.push(dataFilter);
        }
      }
    })
    const resultFilterData = {
      resultFilterEN: appliedFilter.map(data => data.dataFilterEN).join(),
      resultFilterFR: appliedFilter.map(data => data.dataFilterFR).join()
    };

    return resultFilterData;
  }

  shapePayloadFromChangedValues(formGroup: unknown, oldValueRef: Object | {}, payloadRef: any[], keyPrefix: string[] = []) {
    if (formGroup instanceof FormGroup || formGroup instanceof FormArray || formGroup instanceof UntypedFormGroup || formGroup instanceof UntypedFormArray) {
      for (const [key, control] of Object.entries(formGroup.controls)) {
        if (!control.dirty || control.value === oldValueRef[key]) continue
        if (control instanceof FormGroup || control instanceof FormArray || control instanceof UntypedFormGroup || control instanceof UntypedFormArray) {
          this.shapePayloadFromChangedValues(control, oldValueRef[key], payloadRef, [...keyPrefix, key])
        } else if (control instanceof FormControl || control instanceof UntypedFormControl) {
          payloadRef.push({
            field_name: [...keyPrefix, key].join('.'),
            old_value: oldValueRef[key],
            new_value: formGroup.get(key).value
          })
        }
      }
    }
  }

  getAllUserActivity(filter?: any, pagination?: any, sorting?: any) {
    return this.apollo.query({
      query: gql`
        query GetAllUserActivity($filter: FilterUserActivites, $pagination: PaginationInput, $sorting: SortingUserActivites, $lang: String) {
          GetAllUserActivity(filter: $filter, pagination: $pagination, sorting: $sorting, lang: $lang) {
            _id
            user_id {
              _id
              civility
              first_name
              last_name
            }
            user_affected_id {
              _id
              civility
              first_name
              last_name
            }
            type_of_activity
            action
            action_en
            action_fr
            description
            description_en
            description_fr
            count_document
            browser
            created_at {
              date
              time
            }
            data_change {
              field
              old_value
              new_value
            }
          }
        }
      `,

      variables: {
        pagination: pagination ? pagination : { page: 0, limit: 10 },
        sorting: sorting ? sorting : {},
        filter: filter ? filter : null,
        lang: localStorage.getItem('currentLang'),
      },
      fetchPolicy: 'network-only'
    })
    .pipe(map((resp) => resp.data['GetAllUserActivity']));
  }

  createUserActivity(user_activity_input) {
    const isConnectAs: boolean = this.authService.isLoginAsOther();
    // ************* if user access the platform as another user do not record their activities.
    if (isConnectAs) return new Observable<any>();

    return this.apollo
      .mutate({
        mutation: gql`
          mutation CreateActivity($user_activity_input: [UserActivitiesInput]) {
            CreateActivity(user_activity_input: $user_activity_input)
          }
        `,
        variables: {
          user_activity_input: user_activity_input?.map((activity: any) => {
            return {
              ...activity,
              ip_address: localStorage?.getItem('ipAddress'),
              selected_localization: localStorage?.getItem('currentLang')
            }
          })
        },
        errorPolicy: 'ignore'
      })
      .pipe(map((resp) => resp.data['CreateActivity']));
  }
}