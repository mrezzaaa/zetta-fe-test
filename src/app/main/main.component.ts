import { debounceTime, filter } from 'rxjs/operators';
import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  HostListener,
  AfterViewChecked,
  ChangeDetectorRef,
  OnChanges,
  AfterViewInit,
} from '@angular/core';
import { MenuItems } from '../core/menu/menu-items/menu-items';
import { PageTitleService } from '../core/page-title/page-title.service';
import { TranslateService } from '@ngx-translate/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../service/auth-service/auth.service';
import { CoreService } from '../service/core/core.service';
import { DatePipe, Location } from '@angular/common';
import { SubSink } from 'subsink';
import { NgxPermissionsService } from 'ngx-permissions';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RNCPTitlesService } from 'app/service/rncpTitles/rncp-titles.service';
import { environment } from 'environments/environment';
import { PermissionService } from 'app/service/permission/permission.service';
import * as _ from 'lodash';
import { UtilityService } from 'app/service/utility/utility.service';
import { TutorialService } from 'app/service/tutorial/tutorial.service';
import { UserActivityService } from 'app/service/user-activity/user-activity.service';
import { UserActivity } from 'app/models/user-activity.model';
import { UntypedFormControl } from '@angular/forms';
import Swal from 'sweetalert2';
import { AcademicKitService } from 'app/service/rncpTitles/academickit.service';

declare var require: any;

const screenfull = require('screenfull');

@Component({
  selector: 'ms-gene-layout',
  templateUrl: './main-material.html',
  styleUrls: ['./main-material.scss'],
})
export class MainComponent implements OnInit, OnDestroy, AfterViewChecked, OnChanges, AfterViewInit {
  private subs = new SubSink();
  currentUrl: any;
  dataTutorial: any;
  tutorialData: any;
  root: any = 'ltr';
  layout: any = 'ltr';
  currentLang: any = 'fr';
  customizerIn = false;
  showSettings = false;
  chatpanelOpen = false;
  isMobile = false;
  isFullscreen = false;
  collapseSidebarStatus: boolean;
  header: string;
  dark: boolean;
  compactSidebar: boolean;
  isMobileStatus: boolean;
  sidenavMode = 'side';
  popupDeleteResponse: any;
  sidebarColor: any;
  url: string;
  pageTitle = '';
  pageIcon = '';
  additionalInfo: string;
  juryData: any;
  currentUser: any;
  currentEntity: any;
  windowSize: number;
  chatList;
  isTutorialAdded = false;
  isLoginAsOther = false;
  isSnackbarOpen = false;
  isCompanyUser = false;
  selectedRNCPTab = '';
  selectedBilanTab = '';
  isPermission: any;
  alertData;
  config: MatDialogConfig = {
    disableClose: true,
    width: '800px',
  };
  helpOption = [
    {
      name: 'Contact Us',
      value: 'contact_us',
    },
    {
      name: 'Report a Bug',
      value: 'report_bug',
    },
    {
      name: 'DeskAide',
      value: 'deskaide',
    },
    {
      name: 'Tutorial',
      value: 'tutorial',
    },
  ];
  selectedBar = '';
  tutorialIcon = '../../assets/img/tutorial.png';
  // @HostListener('window:scroll', ['$event']) // for window scroll events
  private _routerEventsSubscription: Subscription;
  private _router: Subscription;
  @ViewChild('sidenav', { static: true }) sidenav;
  @ViewChild('sidenavTutorial', { static: true }) sidenavTutorial;

  sideBarFilterClass: any = [
    {
      sideBarSelect: 'sidebar-color-1',
      colorSelect: 'sidebar-color-dark',
    },
    {
      sideBarSelect: 'sidebar-color-2',
      colorSelect: 'sidebar-color-primary',
    },
    {
      sideBarSelect: 'sidebar-color-3',
      colorSelect: 'sidebar-color-accent',
    },
    {
      sideBarSelect: 'sidebar-color-4',
      colorSelect: 'sidebar-color-warn',
    },
    {
      sideBarSelect: 'sidebar-color-5',
      colorSelect: 'sidebar-color-green',
    },
  ];

  headerFilterClass: any = [
    {
      headerSelect: 'header-color-1',
      colorSelect: 'header-color-dark',
    },
    {
      headerSelect: 'header-color-2',
      colorSelect: 'header-color-primary',
    },
    {
      headerSelect: 'header-color-3',
      colorSelect: 'header-color-accent',
    },
    {
      headerSelect: 'header-color-4',
      colorSelect: 'header-color-warning',
    },
    {
      headerSelect: 'header-color-5',
      colorSelect: 'header-color-green',
    },
  ];
  themes = [
    {
      name: 'Initial',
      value: 'initial',
      primary: '#363636',
      secondary: '#424242',
      tertiary: '#ffffff',
    },
    {
      name: 'Retro',
      value: 'retro',
      primary: '#6F61C0',
      secondary: '#A084E8',
      tertiary: '#D5FFE4',
    },
    {
      name: 'Neon',
      value: 'neon',
      primary: '#CCFFBD',
      secondary: '#7ECA9C',
      tertiary: '#1C1427',
    },
    {
      name: 'Light',
      value: 'light',
      primary: '#F4F9F9',
      secondary: '#CCF2F4',
      tertiary: '#000000',
    },
    {
      name: 'Dark',
      value: 'dark',
      primary: '#27374D',
      secondary: '#526D82',
      tertiary: '#DDE6ED',
    },
    {
      name: 'Warm',
      value: 'warm',
      primary: '#DD5353',
      secondary: '#B73E3E',
      tertiary: '#EDDBC0',
    },
    {
      name: 'Cold',
      value: 'cold',
      primary: '#C4DFDF',
      secondary: '#D2E9E9',
      tertiary: '#000000',
    },
    {
      name: 'Summer',
      value: 'summer',
      primary: '#E1FFB1',
      secondary: '#C7F2A4',
      tertiary: '#234507',
    },
    {
      name: 'Spring',
      value: 'spring',
      primary: '#FFD4B2',
      secondary: '#FFF6BD',
      tertiary: '#b95c47',
    },
    {
      name: 'Happy',
      value: 'happy',
      primary: '#1D5D9B',
      secondary: '#75C2F6',
      tertiary: '#000000',
    },
    {
      name: 'Fall',
      value: 'fall',
      primary: '#884A39',
      secondary: '#C38154',
      tertiary: '#F9E0BB',
    },
    {
      name: 'Custom',
      value: 'custom',
      primary: '#363636',
      secondary: '#424242',
      tertiary: '#ffffff',
    },
  ];
  theme = new UntypedFormControl('initial');
  currTheme = 'initial';
  currentURL: any;
  showSidebar = true;
  opened: any;
  modeType: any;
  currentLocale: string;
  datePipe: DatePipe;
  public currentDate: Date = new Date();
  public color1 = '#363636';
  public color2 = '#424242';
  public color3 = '#ffffff';
  public cmykValue = '';
  myInnerHeight: number;
  constructor(
    public menuItems: MenuItems,
    private pageTitleService: PageTitleService,
    public translate: TranslateService,
    public router: Router,
    public authService: AuthService,
    public coreService: CoreService,
    private location: Location,
    private ngxPermissionService: NgxPermissionsService,
    private _snackBar: MatSnackBar,
    private rncpTitleService: RNCPTitlesService,
    private acadKitService: AcademicKitService,
    public dialog: MatDialog,
    public permissionService: PermissionService,
    public utilService: UtilityService,
    private cdr: ChangeDetectorRef,
    public tutorialService: TutorialService,
    private userActivity: UserActivityService,
  ) {}

  ngOnInit() {
    // setTimeout(() => {}, 10000);
    this.coreService.setSidenav('', this.sidenavTutorial);
    this.opened = this.coreService.sidenavOpen;
    this.modeType = this.coreService.sidenavOpenMode;
    this.datePipe = new DatePipe(this.translate.currentLang);

    this.subs.sink = this.coreService.tutorialClicked$.subscribe(resp => {
      if (resp) {
        this.sidenavTutorial?.toggle();
      }
    });
    this.isPermission = this.authService.getPermission();
    if (
      (this.router.url === '/dashboard/courses' ||
        this.router.url === '/courses/courses-list' ||
        this.router.url === '/courses/course-detail' ||
        this.router.url === '/ecommerce/shop' ||
        this.router.url === '/ecommerce/checkout' ||
        this.router.url === '/ecommerce/invoice') &&
      window.innerWidth < 1920
    ) {
      // this.coreService.sidenavOpen = false;
      // this.coreService.sidenavOpenMode = 'none';
    }
    if (this.router.url !== this.currentURL) {
      this.currentURL = this.router.url;
      this.pageTitleService.setIcon(null);
      this.subs.unsubscribe();
      if (
        this.currentURL &&
        (this.currentURL.includes('/title-rncp/task-builder/key-tables') || this.currentURL.includes('/form-builder/key-table'))
      ) {
        this.showSidebar = false;
      } else {
        this.showSidebar = true;
      }
    }
    this.currentUser = this.authService.getLocalStorageUser();
    this.currentEntity = this.authService.getUserEntity();
    this.coreService.collapseSidebarStatus = this.coreService.collapseSidebar;
    this.subs.sink = this.pageTitleService.title.subscribe((val: string) => {
      this.header = val;
      this.pageTitle = val;
      this.setPageTitleTutorial();
    });

    this.subs.sink = this.pageTitleService.icon.subscribe((val: string) => {
      this.pageIcon = val;
    });

    this.subs.sink = this.pageTitleService.additionalInfo.subscribe((val: string) => {
      this.additionalInfo = val;
    });

    this.subs.sink = this.pageTitleService.retakeJuryData.subscribe((val: string) => {
      this.juryData = val;
    });

    this.subs.sink = this.pageTitleService.grandOral.subscribe((val: string) => {
      this.juryData = val;
    });

    this.subs.sink = this.acadKitService.selectedTabSource$.subscribe((val: string) => {
      this.selectedRNCPTab = val;
    });

    this.subs.sink = this.pageTitleService.dossierBilan.subscribe((val: string) => {
      this.selectedBilanTab = val;
    });

    this._router = this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe((event: NavigationEnd) => {
      this.coreService.collapseSidebarStatus = this.coreService.collapseSidebar;
      this.url = event.url;
      this.customizeSidebar();
    });
    this.url = this.router.url;
    this.customizeSidebar();

    setTimeout(() => {
      this.windowSize = window.innerWidth;
      this.resizeSideBar();
    }, 0);

    this._routerEventsSubscription = this.router.events.pipe(debounceTime(200)).subscribe(event => {
      if (event instanceof NavigationEnd && this.isMobile) {
        this.sidenav.close();
      }
      if (this.location.path() !== '') {
        // Close sidebar if change route
        // this.coreService.sidenavOpen = false;
        this.coreService.sidenavTutorialOpen = false;

        // this page title will be displayed in main-material.html
        this.setPageTitleTutorial();
      }
    });

    this.setPageTitleTutorial();

    this.setSidebarType();
  }

  ngOnChanges() {
    this.opened = this.coreService.sidenavOpen;
    this.modeType = this.coreService.sidenavOpenMode;
  }
  ngAfterViewInit() {
    this.opened = this.coreService.sidenavOpen;
    this.modeType = this.coreService.sidenavOpenMode;
  }

  setColor() {
    const colorPalette = JSON.parse(localStorage.getItem('currentTheme'));
    const colorPalettePrimary = colorPalette?.primary;
    if (colorPalette && colorPalette?.name) {
      this.theme.setValue(colorPalette.name.toLowerCase(), { emitEvent: false });
    }
    if (colorPalettePrimary) {
      this.color1 = colorPalettePrimary;
      document.documentElement.style.setProperty('--custom-element-primary-color', colorPalettePrimary);
    }
    const colorPaletteSecondary = colorPalette?.secondary;
    if (colorPaletteSecondary) {
      this.color2 = colorPaletteSecondary;
      document.documentElement.style.setProperty('--custom-element-second-color', colorPaletteSecondary);
    }
    const colorPaletteThird = colorPalette?.tertiary;
    if (colorPaletteThird) {
      this.color3 = colorPaletteThird;
      document.documentElement.style.setProperty('--custom-element-third-color', colorPaletteThird);
    }
  }

  setSidebarType() {
    const user_id = this.authService.getLocalStorageUser();
    this.authService.GetDashboardThemeSetting(user_id?._id).subscribe(resp => {
      if (resp) {
        localStorage.setItem('sidebarType', JSON.stringify(resp.sidebar_type));
        localStorage.setItem('currentTheme', JSON.stringify(resp.selected_theme));
        this.setColor();
        this.getSidebarType();
      }
    });
  }

  getSidebarType() {
    const sidebarType = JSON.parse(localStorage.getItem('sidebarType'));

    if (sidebarType && sidebarType === 'full') {
      if (!this.router.url?.includes('/title-rncp/task-builder/key-tables') && !this.router.url?.includes('/form-builder/key-table')) {
        this.opened = true;
        this.modeType = 'full';
        this.coreService.sidenavOpen = true;
        this.coreService.sidenavOpenMode = 'full';
      }
    } else if (sidebarType && sidebarType === 'icon') {
      if (!this.router.url?.includes('/title-rncp/task-builder/key-tables') && !this.router.url?.includes('/form-builder/key-table')) {
        this.opened = true;
        this.modeType = 'icon';
        this.coreService.sidenavOpen = true;
        this.coreService.sidenavOpenMode = 'icon';
      }
    } else {
      this.opened = true;
      this.modeType = 'none';
      this.coreService.sidenavOpen = false;
      this.coreService.sidenavOpenMode = 'none';
    }
  }

  setPageTitleTutorial() {
    const url = this.router.url;
    this.isTutorialAdded = false;

    if (url.includes('/group-creation')) {
      this.getInAppTutorial('Create Groups');
    } else if (url.includes('/crossCorrection')) {
      this.pageTitle = 'List of Cross Correction';
      this.getInAppTutorial('Cross correction');
    } else if (url.includes('/crossCorrection/assign-cross-corrector')) {
      this.getInAppTutorial('Assign Cross Corrector');
    } else if (url === '/rncpTitles') {
      this.pageTitle = 'List of RNCP Title';
      this.getInAppTutorial('List of RNCP Titles');
    } else if (url === '/school') {
      this.pageTitle = 'List of schools';
      this.getInAppTutorial('List of schools');
    } else if (url === '/school/create') {
      this.getInAppTutorial('Add School');
    } else if (/\/school\/[0-9a-fA-F]{24}/.test(url)) {
      if (this.pageTitle?.includes('School Detail') || this.pageTitle?.includes("L'école")) {
        this.getInAppTutorial('Detail of School');
      } else if (this.pageTitle?.includes('School Staff') || this.pageTitle?.includes('Les membres')) {
        this.getInAppTutorial('School Staff');
      } else if (this.pageTitle?.includes('Student Cards') || this.pageTitle?.includes('Les Apprenants en Fiche')) {
        this.getInAppTutorial('Student Cards');
      } else {
        this.isTutorialAdded = false;
      }
    } else if (url === '/group-of-schools') {
      this.pageTitle = 'List of Group of School';
      this.getInAppTutorial('List of Group of schools');
    } else if (url === '/students') {
      this.pageTitle = 'List of Active Students';
      this.getInAppTutorial('List of Active students');
    } else if (url === '/completed-students') {
      this.pageTitle = 'List of Completed Students';
      this.getInAppTutorial('List of completed students');
    } else if (url === '/deactivated-students') {
      this.pageTitle = 'List of Deactivated Students';
      this.getInAppTutorial('List of deactivated students');
    } else if (url === '/suspended-students') {
      this.pageTitle = 'List of Suspended Students';
      this.getInAppTutorial('List of suspended students');
    } else if (url === '/companies/entities') {
      this.pageTitle = 'NAV.Companies Entity';
      this.getInAppTutorial('Companies Entity');
    } else if (url === '/companies/branches') {
      this.pageTitle = 'NAV.Companies Branches';
      this.getInAppTutorial('Companies Branches');
    } else if (url === '/task') {
      this.pageTitle = 'NAV.MY_TASK';
      this.getInAppTutorial('My Task');
    } else if (url === '/student-task') {
      this.pageTitle = 'NAV.STUDENT_TASK';
      this.getInAppTutorial('Student Task');
    } else if (url === '/user-task') {
      this.pageTitle = 'NAV.USER_TASK';
      this.getInAppTutorial('User Task');
    } else if (url.includes('/mailbox')) {
      this.getInAppTutorial('Mailbox');
    } else if (url === '/users') {
      this.pageTitle = 'List of users';
      this.getInAppTutorial('Users');
    } else if (url === '/title-rncp') {
      this.pageTitle = 'RNCP Title Management';
      this.getInAppTutorial('RNCP Title Management');
    } else if (url === '/notifications') {
      this.pageTitle = 'List of notifications';
      this.getInAppTutorial('Notification');
    } else if (url === '/questionnaire-tools') {
      this.pageTitle = 'Questionnaire Tools';
      this.getInAppTutorial('Questionnary tools');
    } else if (url === '/employability-survey') {
      this.pageTitle = 'List of Employability Survey';
      this.getInAppTutorial('Employability survey');
    } else if (url === '/crossCorrection') {
      this.pageTitle = 'List of Cross Correction';
      this.getInAppTutorial('Cross correction');
    } else if (url === '/form-builder') {
      this.pageTitle = 'List of Form Template';
      this.getInAppTutorial('Form Builder');
    } else if (url === '/form-builder/template-detail') {
      this.getInAppTutorial('Form Builder > Form Template');
    } else if (url === '/alert-functionality') {
      this.pageTitle = 'List of alert';
      this.getInAppTutorial('Functionality Alert');
    } else if (url === '/tutorial') {
      this.pageTitle = 'List of tutorials';
      this.getInAppTutorial('Tutorial');
    } else if (url === '/promo/auto-promo') {
      this.pageTitle = 'Promo';
      this.getInAppTutorial('Promo');
    } else if (url === '/my-activity') {
      this.pageTitle = 'My Activity';
      this.getInAppTutorial('My Activity');
    } else if (url.includes('/questionnaire-tools/form/')) {
      this.getInAppTutorial('Questionnary tools Edit');
    } else if (url === '/jury-organization') {
      this.getInAppTutorial('List of Jury Organization');
    } else if (url === '/dossier-bilan-pro') {
      this.pageTitle = 'DOSSIER_BILAN.List of Dossier Bilan Professionnelle';
      this.getInAppTutorial('List of Dossier Bilan Professionnelle');
    } else if (url?.toString()?.toLowerCase().includes('/dossier-bilan-detail')) {
      this.getInAppTutorial('List of Dossier Bilan Professionnelle');
    } else if (url === '/title-manager/task-follow-up') {
      this.pageTitle = 'NAV.TASK_FOLLOW_UP';
      this.getInAppTutorial('Task Follow Up');
    } else if (url === '/history-export-billing') {
      this.pageTitle = 'NAV.BILLING';
      this.getInAppTutorial('Billing');
    } else if (url.includes('/title-manager/template-creation')) {
      this.pageTitle = 'NAV.TASK_FOLLOW_UP';
      this.getInAppTutorial('Task Follow Up');
    } else {
      this.isTutorialAdded = false;
    }

    switch (this.router.url) {
      case '/user-permission':
        this.pageTitle = 'User Permission';
        break;
      case '/school-detail':
        this.pageTitle = 'List of schools';
        break;
      case '/academic-journeys/summary':
        this.pageTitle = 'Academic Journey';
        break;
      case '/academic-journeys/my-profile':
        this.pageTitle = 'My Profile';
        break;
      case '/academic-journeys/my-diploma':
        this.pageTitle = 'My Diploma';
        break;
      case '/academic-journeys/my-experience':
        this.pageTitle = 'My Experience';
        break;
      case '/academic-journeys/my-skill':
        this.pageTitle = 'My Skill';
        break;
      case '/academic-journeys/my-language':
        this.pageTitle = 'My Language';
        break;
      case '/academic-journeys/my-interest':
        this.pageTitle = 'My Interest';
        break;
      case '/doctest':
        this.pageTitle = 'List of Tests';
        break;
      case '/questionnaireTools':
        this.pageTitle = 'List of questionnaire';
        break;
      case '/transcript-process':
        // this.pageTitle = 'List of jury organizations';
        break;
      case '/ideas':
        this.pageTitle = 'List of 1001 ideas';
        break;
      case '/students-card':
        this.pageTitle = 'List of students';
        break;
      case '/platform':
        this.pageTitle = 'List of platform';
        break;
      case '/rncpTitles/dashboard':
        this.pageTitle = 'List of pending task and calendar step';
        break;
      case '/companies':
        this.pageTitle = 'List of companies';
        break;
      case '/quality-control':
        this.pageTitle = 'List of quality control';
        break;
      case '/certidegree':
        this.pageTitle = 'List of CertiDegree';
        break;
      case '/mailbox/inbox':
        this.pageTitle = 'Inbox';
        break;
      case '/mailbox/sentBox':
        this.pageTitle = 'Sent';
        break;
      case '/mailbox/important':
        this.pageTitle = 'Important';
        break;
      case '/mailbox/trash':
        this.pageTitle = 'Trash';
        break;
      case '/mailbox/draft':
        this.pageTitle = 'Draft';
        break;
      case '/process-management':
        this.pageTitle = 'Process Management';
        break;
      case '/grand-oral':
        this.pageTitle = 'Compléter la grille pour grand oral';
        break;
      case '/jury-organization/all-jury-schedule':
        this.pageTitle = 'Schedule of Jury';
        break;
      case '/title-rncp/details':
        break;
      case '/tutorial-app':
        this.pageTitle = 'InApp Tutorials';
        break;
      case '/certidegree/':
        this.pageTitle = '';
        break;
      case '/form-follow-up':
        this.pageTitle = 'Form Follow Up Table';
        break;
      case '/dashboard':
        this.pageTitle = 'NAV.DASHBOARD';
        break;
      default:
        // this.pageTitle = '';
        break;
    }

    // For jury organization, need to check using include. so cannot use in switchase because it has juryorgid
    if (this.router.url.includes('/jury-organization') && !this.router.url.includes('/organize-juries/setup-schedule')) {
      this.pageTitle = 'List of jury organizations';
    }
    if (this.router.url.includes('/jury-organization') && this.router.url.includes('/setup-schedule')) {
      this.pageTitle = 'retake-setup-schedule';
    }
    if (this.router.url.includes('/jury-organization') && this.router.url.includes('/setup-schedule-go')) {
      this.pageTitle = 'grandOral-setup-schedule';
    }
  }

  goToRetakeGrandOral(id) {
    if (id) {
      this.router.navigate([`/jury-organization/${id}/organize-juries/grand-oral-jury-parameter`]);
    }
  }

  goToGrandOral(id) {
    if (id) {
      this.router.navigate([`/jury-organization/${id}/organize-juries/grand-oral-jury-parameter`]);
    }
  }

  ngAfterViewChecked() {
    this.cdr.detectChanges();
  }

  ngOnDestroy() {
    this._router.unsubscribe();
    this.subs.unsubscribe();
  }

  /**
   *As router outlet will emit an activate event any time a new component is being instantiated.
   */
  onActivate(e, scrollContainer) {
    scrollContainer.scrollTop = 0;
    this.getSidebarType();
  }

  /**
   * toggleFullscreen method is used to show a template in fullscreen.
   */
  toggleFullscreen() {
    if (screenfull.enabled) {
      screenfull.toggle();
      this.isFullscreen = !this.isFullscreen;
    }
  }

  /**
   * customizerFunction is used to open and close the customizer.
   */
  customizerFunction() {
    this.customizerIn = !this.customizerIn;
  }

  /**
   * addClassOnBody method is used to add a add or remove class on body.
   */
  addClassOnBody(event) {
    const body = document.body;
    if (event.checked) {
      body.classList.add('dark-theme-active');
    } else {
      body.classList.remove('dark-theme-active');
    }
  }

  /**
   * changeRTL method is used to change the layout of template.
   */
  changeRTL(isChecked) {
    if (isChecked) {
      this.layout = 'rtl';
    } else {
      this.layout = 'ltr';
    }
  }

  /**
   * toggleSidebar method is used a toggle a side nav bar.
   */
  toggleSidebar() {
    this.selectedBar = '';
    this.coreService.sidenavMode = 'side';
    if (this.coreService.sidenavOpen && this.coreService.sidenavOpenMode === 'full') {
      this.opened = true;
      this.modeType = 'icon';
      this.coreService.sidenavOpen = true;
      this.coreService.sidenavOpenMode = 'icon';
      this.subs.sink = this.authService.updateDashboardThemeSetting(this.currentUser._id, 'icon').subscribe(resp => {});
      localStorage.setItem('sidebarType', JSON.stringify('icon'));
    } else if (this.coreService.sidenavOpen && this.coreService.sidenavOpenMode === 'icon') {
      this.opened = true;
      this.modeType = 'none';
      this.coreService.sidenavOpen = false;
      this.coreService.sidenavOpenMode = 'none';
      this.subs.sink = this.authService.updateDashboardThemeSetting(this.currentUser._id, 'none').subscribe(resp => {});
      localStorage.setItem('sidebarType', JSON.stringify('none'));
    } else {
      this.opened = true;
      this.modeType = 'full';
      this.coreService.sidenavOpen = true;
      this.coreService.sidenavOpenMode = 'full';
      this.subs.sink = this.authService.updateDashboardThemeSetting(this.currentUser._id, 'full').subscribe(resp => {});
      localStorage.setItem('sidebarType', JSON.stringify('full'));
    }
    this.coreService.close('');
  }

  /**
   * logOut method is used to log out the  template.
   */
  logOut() {
    this.sendUserActivity();
  }

  sendUserActivity() {
    const redirectTo = window.location.href;
    const studentMenuActivity: UserActivity[] = [
      {
        originButton: 'logoutBtn', // origin of the function called
        type_of_activity: 'logout', // type of activity click_on | access | login | logout | specific_action
        action: 'logout', // key for localization action
        description: 'Logout from', // key for localization
        data_description: { platform_url: redirectTo }, // to send data dynamic data in the localization
      },
    ];
    let dataPayload = this.userActivity.generatePayloadActivity('logoutBtn', studentMenuActivity, []);
    dataPayload[0].user_id = this.currentUser?._id;
    this.subs.sink = this.userActivity.createUserActivity(dataPayload).subscribe(resp => {
      if (resp) {
        // logOut
        this.authService.logOut();
      }
    });
  }

  /**
   * relogin method is used to log in as previous user.
   */
  backToPreviousLogin() {
    const user = _.cloneDeep(JSON.parse(localStorage.getItem('backupUser')));
    this.authService.loginAsPreviousUser();

    const userLogin = user;

    const entities = userLogin.entities;

    const sortedEntities = this.utilService.sortEntitiesByHierarchy(entities);
    const permissions = [];
    const permissionsId = [];
    if (sortedEntities && sortedEntities.length > 0) {
      sortedEntities.forEach(entity => {
        permissions.push(entity.type.name);
        permissionsId.push(entity.type._id);
      });
    }

    this.authService.setPermission([permissions[0]]);
    this.ngxPermissionService.flushPermissions();
    this.ngxPermissionService.loadPermissions([permissions[0]]);

    // *********** call query table settings development acad-190 column custimazation
    this.authService.checkTemplateTable(this.currentUser);
    this.router.navigateByUrl('/mailbox/inbox', { skipLocationChange: true }).then(() => {
      if (this.ngxPermissionService.getPermission('Mentor') || this.ngxPermissionService.getPermission('HR')) {
        this.router.navigate(['/students-card']);
      } else if (this.ngxPermissionService.getPermission('Chief Group Academic')) {
        this.router.navigate(['/school-group']);
      } else if (this.ngxPermissionService.getPermission('Student')) {
        this.router.navigate(['/my-file']);
      } else {
        this.router.navigate(['/']);
      }
    });
  }

  openPrivacyPolicy() {
    const urlFr = `${environment.apiUrl}/privacy-policy/FR_USER.html`.replace('/graphql', '');
    const urlEn = `${environment.apiUrl}/privacy-policy/EN_USER.html`.replace('/graphql', '');
    window.open(this.translate.currentLang === 'fr' ? urlFr : urlEn, '_blank');
  }

  /**
   * sidebarFilter function filter the color for sidebar section.
   */
  sidebarFilter(selectedFilter) {
    for (let i = 0; i < this.sideBarFilterClass.length; i++) {
      document.getElementById('main-app').classList.remove(this.sideBarFilterClass[i].colorSelect);
      if (this.sideBarFilterClass[i].colorSelect === selectedFilter.colorSelect) {
        document.getElementById('main-app').classList.add(this.sideBarFilterClass[i].colorSelect);
      }
    }
    document.querySelector('.radius-circle').classList.remove('radius-circle');
    document.getElementById(selectedFilter.sideBarSelect).classList.add('radius-circle');
  }

  /**
   * headerFilter function filter the color for header section.
   */
  headerFilter(selectedFilter) {
    for (let i = 0; i < this.headerFilterClass.length; i++) {
      document.getElementById('main-app').classList.remove(this.headerFilterClass[i].colorSelect);
      if (this.headerFilterClass[i].colorSelect === selectedFilter.colorSelect) {
        document.getElementById('main-app').classList.add(this.headerFilterClass[i].colorSelect);
      }
    }
    document.querySelector('.radius-active').classList.remove('radius-active');
    document.getElementById(selectedFilter.headerSelect).classList.add('radius-active');
  }

  /**
   *chatMenu method is used to toggle a chat menu list.
   */
  /* chatMenu() {
    document.getElementById('gene-chat').classList.toggle('show-chat-list');
  } */

  /**
   * onChatOpen method is used to open a chat window.
   */
  /*   onChatOpen() {
    document.getElementById('chat-open').classList.toggle('show-chat-window');
  } */

  /**
   * onChatWindowClose method is used to close the chat window.
   */
  /*  chatWindowClose() {
    document.getElementById('chat-open').classList.remove('show-chat-window');
  } */

  collapseSidebar(event) {
    document.getElementById('main-app').classList.toggle('collapsed-sidebar');
  }

  // onResize method is used to set the side bar according to window width.
  @HostListener('window:resize', ['$event'])
  onResize(event) {
    this.windowSize = event.target.innerWidth;
    this.resizeSideBar();
  }

  // customizeSidebar method is used to change the side bar behaviour.
  customizeSidebar() {
    if (
      (this.url === '/dashboard/courses' ||
        this.url === '/courses/courses-list' ||
        this.url === '/courses/course-detail' ||
        this.url === '/ecommerce/shop' ||
        this.url === '/ecommerce/checkout' ||
        this.url === '/ecommerce/invoice') &&
      this.windowSize < 1920
    ) {
      this.coreService.sidenavMode = 'over';
      this.coreService.sidenavOpen = false;
      if (!document.getElementById('main-app').classList.contains('sidebar-overlay')) {
        document.getElementById('main-app').className += ' sidebar-overlay';
      }
    } else if (
      window.innerWidth > 1200 &&
      (this.url === '/dashboard/crypto' ||
        this.url === '/crypto/marketcap' ||
        this.url === '/crypto/wallet' ||
        this.url === '/crypto/trade')
    ) {
      this.collapseSidebarStatus = this.coreService.collapseSidebar;
      if (this.collapseSidebarStatus === false && window.innerWidth > 1200) {
        document.getElementById('main-app').className += ' collapsed-sidebar';
        this.coreService.collapseSidebar = true;
        this.coreService.sidenavOpen = true;
        this.coreService.sidenavOpenMode = 'full';
        this.coreService.sidenavMode = 'side';
        document.getElementById('main-app').classList.remove('sidebar-overlay');
      }
    } else if (
      window.innerWidth > 1200 &&
      !(
        this.url === '/dashboard/courses' ||
        this.url === '/courses/courses-list' ||
        this.url === '/courses/course-detail' ||
        this.url === '/ecommerce/shop' ||
        this.url === '/ecommerce/checkout' ||
        this.url === '/ecommerce/invoice'
      )
    ) {
      this.coreService.sidenavMode = 'side';
      if (this.showSidebar) {
        this.coreService.sidenavOpen = true;
        if (this.modeType !== 'icon') {
          this.coreService.sidenavOpenMode = 'full';
        }
      } else {
        // this.coreService.sidenavOpen = false;
        // this.coreService.sidenavOpenMode = 'none';
      }
      // for responsive
      const main_div = document.getElementsByClassName('app');
      for (let i = 0; i < main_div.length; i++) {
        if (main_div[i].classList.contains('sidebar-overlay')) {
          document.getElementById('main-app').classList.remove('sidebar-overlay');
        }
      }
    } else if (window.innerWidth < 1200) {
      // for responsive
      this.coreService.sidenavMode = 'over';
      // this.coreService.sidenavOpen = false;
      // this.coreService.sidenavOpenMode = 'none';
      const main_div = document.getElementsByClassName('app');
      for (let i = 0; i < main_div.length; i++) {
        if (!main_div[i].classList.contains('sidebar-overlay')) {
          document.getElementById('main-app').className += ' sidebar-overlay';
        }
      }
    }
  }

  // getInAppTutorial(type) {
  //   // const permission = this.isPermission && this.isPermission.length && this.isPermission[0] ? this.isPermission[0] : [];
  //   const userType = this.currentUser.entities[0].type.name;
  //   this.subs.sink = this.tutorialService.GetAllInAppTutorialsByModule(type, userType).subscribe((list) => {
  //     if (list && list.length) {
  //       this.dataTutorial = list;
  //       const tutorialData = this.dataTutorial.filter((tutorial) => {
  //         return tutorial.is_published === true && tutorial.module === type;
  //       });
  //       this.tutorialData = tutorialData[0];
  //       if (this.tutorialData) {
  //         this.isTutorialAdded = true;
  //       } else {
  //         this.isTutorialAdded = false;
  //       }
  //     }
  //   });
  // }

  toggleTutorial(data) {
    this.tutorialService.setTutorialView(data);
    if (this.coreService.sidenavOpen) {
      this.coreService.sidenavOpen = !this.coreService.sidenavOpen;
    }
    if (!this.coreService.sidenavOpen) {
      this.coreService.sidenavOpenMode = 'none';
    } else {
      this.coreService.sidenavOpenMode = 'full';
    }
    this.coreService.close('');
  }

  public onEventLog(event: string, data: any): void {
    const colorPalette = JSON.parse(localStorage.getItem('currentTheme'));
    if (event === 'primary') {
      // localStorage.setItem('colorPalettePrimary', data?.color);
      localStorage.setItem(
        'currentTheme',
        JSON.stringify({
          name: colorPalette?.name,
          primary: data?.color,
          secondary: colorPalette?.secondary,
          tertiary: colorPalette.tertiary,
        }),
      );
      this.subs.sink = this.authService
        .updateDashboardThemeSettingHexaCustom(this.currentUser._id, {
          primary: data?.color,
          secondary: colorPalette?.secondary,
          tertiary: colorPalette?.tertiary,
        })
        .subscribe(resp => {});
      this.coreService.changePrimaryColor(data);
    } else if (event === 'second') {
      // localStorage.setItem('colorPaletteSecondary', data?.color);
      this.coreService.changeSecondaryColor(data);
      localStorage.setItem(
        'currentTheme',
        JSON.stringify({
          name: colorPalette?.name,
          primary: colorPalette?.primary,
          secondary: data?.color,
          tertiary: colorPalette?.tertiary,
        }),
      );
      this.subs.sink = this.authService
        .updateDashboardThemeSettingHexaCustom(this.currentUser._id, {
          primary: colorPalette?.primary,
          secondary: data?.color,
          tertiary: colorPalette?.tertiary,
        })
        .subscribe(resp => {});
    } else {
      // localStorage.setItem('colorPaletteThird', data?.color);
      localStorage.setItem(
        'currentTheme',
        JSON.stringify({
          name: colorPalette.name,
          primary: colorPalette?.primary,
          secondary: colorPalette?.secondary,
          tertiary: data?.color,
        }),
      );
      this.coreService.changeThirdColor(data);
      this.subs.sink = this.authService
        .updateDashboardThemeSettingHexaCustom(this.currentUser._id, {
          primary: colorPalette?.primary,
          secondary: colorPalette?.secondary,
          tertiary: data?.color,
        })
        .subscribe(resp => {});
    }
  }

  navTutorialClosed() {
    this.selectedBar = '';
    this.coreService.setTutorialView(null);
  }

  // To resize the side bar according to window width.
  resizeSideBar() {
    if (this.windowSize < 1200) {
      this.isMobileStatus = true;
      this.isMobile = this.isMobileStatus;
      this.coreService.sidenavMode = 'over';
      this.coreService.sidenavOpen = false;
      // for responsive
      const main_div = document.getElementsByClassName('app');
      for (let i = 0; i < main_div.length; i++) {
        if (!main_div[i].classList.contains('sidebar-overlay')) {
          if (document.getElementById('main-app')) {
            document.getElementById('main-app').className += ' sidebar-overlay';
          }
        }
      }
    } else if (
      (this.url === '/dashboard/courses' ||
        this.url === '/courses/courses-list' ||
        this.url === '/courses/course-detail' ||
        this.url === '/ecommerce/shop' ||
        this.url === '/ecommerce/checkout' ||
        this.url === '/ecommerce/invoice') &&
      this.windowSize < 1920
    ) {
      this.customizeSidebar();
    } else {
      this.isMobileStatus = false;
      this.isMobile = this.isMobileStatus;
      this.coreService.sidenavMode = 'side';
      if (this.showSidebar) {
        this.coreService.sidenavOpen = true;
        if (this.modeType !== 'icon') {
          this.coreService.sidenavOpenMode = 'full';
        }
      } else {
        this.coreService.sidenavOpen = false;
        this.coreService.sidenavOpenMode = 'none';
      }
      // for responsive
      const main_div = document.getElementsByClassName('app');
      for (let i = 0; i < main_div.length; i++) {
        if (main_div[i].classList.contains('sidebar-overlay')) {
          document.getElementById('main-app').classList.remove('sidebar-overlay');
        }
      }
    }
  }
  onScrollContainer(event) {
    if (event && event.path && event.path[8].URL.search('/title-rncp/details/') !== -1) {
      this.rncpTitleService.setEventScroll(event);
    }
  }
  openNeedHelp() {
    // this.contactUsDialogComponent = this.dialog.open(ContactUsDialogComponent, this.config);
    const currentUser = this.utilService.getCurrentUser();
    this.subs.sink = this.authService.getUserByIdForDeskaide(currentUser?._id).subscribe(resp => {
      if (resp) {
        if (currentUser?.entities) {
          resp['entities'] = currentUser.entities;
        }
        this.authService.connectAsForDeskaide(resp, 'deskaide');
      }
    });
  }

  openIssueReport() {
    // this.contactUsDialogComponent = this.dialog.open(ContactUsDialogComponent, this.config);
    const currentUser = this.utilService.getCurrentUser();
    this.subs.sink = this.authService.getUserByIdForDeskaide(currentUser?._id).subscribe(resp => {
      if (resp) {
        if (currentUser?.entities) {
          resp['entities'] = currentUser.entities;
        }
        this.authService.connectAsForDeskaide(resp, 'wizard');
      }
    });
  }

  openTutorial() {
    this.router.navigate(['tutorial']);
  }

  getUserSchool() {
    this.isCompanyUser = this.utilService.isUserCompany();
    if (this.isCompanyUser) {
      return '';
    } else {
      return this.currentUser &&
        this.currentUser.entities[0] &&
        this.currentUser.entities[0].school &&
        this.currentUser.entities[0].school.short_name
        ? ' - ' + this.currentUser.entities[0].school.short_name
        : '';
    }
  }

  getTranslatedDate(dateRaw) {
    if (dateRaw) {
      this.datePipe = new DatePipe(this.translate.currentLang);
      if (this.datePipe && this.datePipe['locale']) {
        const dateTranslate = this.datePipe.transform(dateRaw, 'EEEE d MMMM y');
        return dateTranslate;
      }
      return '';
    }
    return '';
  }
  getTranslatedTime(dateRaw) {
    if (dateRaw) {
      this.datePipe = new DatePipe(this.translate.currentLang);
      if (this.datePipe && this.datePipe['locale']) {
        const dateTranslate = this.datePipe.transform(dateRaw, 'shortTime');
        return dateTranslate;
      }
      return '';
    }
    return '';
  }

  changeTheme(selectedTheme?: string) {
    let theme = '';
    if (selectedTheme) {
      theme = selectedTheme;
    } else {
      theme = this.theme.value;
    }
    const themeSelected = this.themes.find(them => them?.value === selectedTheme);
    if (themeSelected) {
      const primary = themeSelected?.primary;
      const secondary = themeSelected?.secondary;
      const tertiary = themeSelected?.tertiary;
      localStorage.setItem(
        'currentTheme',
        JSON.stringify({ name: selectedTheme, primary: primary, secondary: secondary, tertiary: tertiary }),
      );
      this.color1 = primary;
      // localStorage.setItem('colorPalettePrimary', primary);
      this.coreService.changePrimaryColor({ color: primary });
      this.color2 = secondary;
      // localStorage.setItem('colorPaletteSecondary', secondary);
      this.coreService.changeSecondaryColor({ color: secondary });
      this.color3 = tertiary;
      // localStorage.setItem('colorPaletteThird', tertiary);
      this.coreService.changeThirdColor({ color: tertiary });
      if (selectedTheme === 'custom') {
        this.subs.sink = this.authService
          .updateDashboardThemeSettingHexaCustom(this.currentUser._id, { primary: primary, secondary: secondary, tertiary: tertiary })
          .subscribe(resp => {});
      } else {
        this.subs.sink = this.authService
          .updateDashboardThemeSettingHexa(
            this.currentUser._id,
            (selectedTheme = selectedTheme.charAt(0).toUpperCase() + selectedTheme.slice(1)),
          )
          .subscribe(resp => {});
      }
    }
  }

  getAutomaticHeight() {
    this.myInnerHeight = window.innerHeight - 600;
    return this.myInnerHeight > 86 ? 'theme-panel' : this.myInnerHeight === 86 ? 'theme-panel-34' : 'theme-panel-80';
  }

  openTutorialBar() {
    this.tutorialService.openTutorialBar('', this.tutorialData);
  }

  getInAppTutorial(type: string) {
    this.tutorialService.getInAppTutorialByModule(type).subscribe(
      resp => {
        this.isTutorialAdded = !!resp;
        this.tutorialData = resp;
      },
      err => {
        if (err && err['message'] && err['message'].includes('Network error: Http failure response for')) {
          Swal.fire({
            type: 'warning',
            title: this.translate.instant('BAD_CONNECTION.Title'),
            html: this.translate.instant('BAD_CONNECTION.Text'),
            confirmButtonText: this.translate.instant('BAD_CONNECTION.Button'),
            allowOutsideClick: false,
            allowEnterKey: false,
            allowEscapeKey: false,
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
}
