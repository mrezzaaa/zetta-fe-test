import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Injectable({
  providedIn: 'root'
})
export class UserActivityTranslateService {
  private callbacks: Function[] = [];
  isLoaded: boolean = false;
  translations: any = { fr: {}, en: {} };

  constructor(private translate: TranslateService) { }

  onLoad(callback: Function) {
    this.callbacks.push(callback);
    if (this.isLoaded) callback();
  }

  loadTranslations() {
    let count = 0;

    const subFR = this.translate.getTranslation('fr').subscribe(result => {
      this.translations.fr = result;
      subFR.unsubscribe();

      count++; if (count === 2) { 
        this.isLoaded = true;
        this.callbacks.forEach(cb => cb());
      };
    });

    const subEN = this.translate.getTranslation('en').subscribe(result => {
      this.translations.en = result;
      subEN.unsubscribe();

      count++; if (count === 2) { 
        this.isLoaded = true;
        this.callbacks.forEach(cb => cb());
      };
    });
  }

  getTranslation(lang: 'en' | 'fr', key: string, params?: Object, autoPrefix: boolean = false) {
    key = autoPrefix ? ('USER_ACTIVITY.' + key) : key;
    let result: string | any = key;

    if (!this.isLoaded) {
      console.warn('[UserActivityTranslateService]: Translation data is still loading.');
      return result;
    }

    key.split('.').forEach((item: string, index: number) => {
      result = (index === 0) ? this.translations[lang][item] : result[item];
      result = !result ? key : result;
    });

    if (params) {
      result = result.replace(/\{\{([a-z0-9_]+)\}\}/g, (_, match: string) => {
        const subs = params[match]; // substitute
        return subs ? subs : match;
      });
    }

    return result;
  }
}
