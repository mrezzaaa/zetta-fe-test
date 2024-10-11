import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { NgxPermissionsService } from 'ngx-permissions';
import { AuthService } from './service/auth-service/auth.service';
import { MatDialogConfig, MatDialog } from '@angular/material/dialog';
import { UserActivityTranslateService } from './service/user-activity-translate/user-activity-translate.service';

@Component({
  selector: 'ms-app',
  styles:[
    `
      ms-app {
        display: block;
        height: 100vh;
      }
    `
  ],
  template: `<ngx-loading-bar></ngx-loading-bar><router-outlet></router-outlet>`,
  encapsulation: ViewEncapsulation.None,
})
export class AppComponent implements OnInit {
  urgentMessageConfig: MatDialogConfig = {
    disableClose: true,
    width: '825px',
    panelClass: 'certification-rule-pop-up',
  };
  constructor(
    translate: TranslateService,
    private permissionsService: NgxPermissionsService,
    private authService: AuthService,
    public dialog: MatDialog,
    private userActivityTranslate: UserActivityTranslateService
  ) {
    translate.addLangs(['en', 'fr', 'he', 'ru', 'ar', 'zh', 'de', 'es', 'ja', 'ko', 'it', 'hu']);
    translate.setDefaultLang('fr');

    this.userActivityTranslate.loadTranslations();

    // const browserLang: string = translate.getBrowserLang();
    // translate.use(browserLang.match(/fr|en/) ? browserLang : 'fr');
  }

  ngOnInit(): void {
    if (localStorage.getItem('permissions')) {
      const permissions = this.authService.getPermission();
      this.permissionsService.loadPermissions(permissions);
    }

    // ACAD_037 Improvement to log IP Address of User when application is being open
    this.authService.getUserIP();
  }

}
