import { Injectable } from '@angular/core';
import { MatSidenav } from '@angular/material/sidenav';
import { BehaviorSubject, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class CoreService {
  public tutorialData: BehaviorSubject<any> = new BehaviorSubject<any>(null);

  collapseSidebar = false;
  collapseSidebarStatus: boolean;
  sidenavMode = 'side';
  sidenavTutorialMode = 'side';
  sidenavOpen = true;
  sidenavOpenMode = 'icon'; // full | icon | none
  sidenavTutorialOpen = false;
  horizontalSideNavMode = 'over';
  horizontalSideNavOpen = false;
  displayFullScreen = false;
  projectDetailsContent: any;
  editProductData: any;
  isSidebarClicked: boolean = false;

  isOpenTheme = false

  clickedMenuSource = new BehaviorSubject<any>(null);
  clickedMenu$ = this.clickedMenuSource.asObservable();

  clickedMenuStateSource = new BehaviorSubject<any>(null);
  clickedMenuState$ = this.clickedMenuStateSource.asObservable();

  tutorialClicked = new BehaviorSubject<any>(null);
  tutorialClicked$ = this.tutorialClicked.asObservable();

  private sidenav: MatSidenav;

  setToggleTutorial(menu) {
    this.tutorialClicked.next(menu);
  }

  setClickedMenu(menu) {
    this.clickedMenuSource.next(menu);
    this.clickedMenuStateSource.next(menu?.state);
  }

  changePrimaryColor(data): void {
    document.documentElement.style.setProperty('--custom-element-primary-color', data?.color);
  }
  changeSecondaryColor(data): void {
    document.documentElement.style.setProperty('--custom-element-second-color', data?.color);
  }
  changeThirdColor(data): void {
    document.documentElement.style.setProperty('--custom-element-third-color', data?.color);
  }
  setTutorialView(value: any) {
    this.tutorialData.next(value);
  }
  isSidenavOpen() {
    return this.sidenavOpen;
  }

  public setSidenav(type, sidenav: MatSidenav) {
    this.sidenav = sidenav;
    if (document && type === 'popup') {
      const dataBackdropDom = document?.querySelector('.tutorial-class')
      if (dataBackdropDom) {
        dataBackdropDom?.classList?.remove('tutorial-class')
      } else {
        const dataBackdropDomOverlay = document?.querySelector('.cdk-overlay-backdrop')
        dataBackdropDomOverlay?.classList?.add('tutorial-class')
      }
      const dataPopUpDom = document?.querySelector('.tutorial-side-open')
      if (dataPopUpDom) {
        dataPopUpDom?.classList?.remove('tutorial-side-open')
      } else {
        const dataPopUpDomOverlay = document?.querySelector('.certification-rule-pop-up')
        dataPopUpDomOverlay?.classList?.add('tutorial-side-open')
      }
    }
    this.sidenavTutorialOpen = true;
  }

  public open(type) {
    this.sidenavTutorialOpen = true;
    if (document && type === 'popup') {
      const dataBackdropDom = document?.querySelector('.tutorial-class')
      if (dataBackdropDom) {
        dataBackdropDom?.classList?.remove('tutorial-class')
      } else {
        const dataBackdropDomOverlay = document?.querySelector('.cdk-overlay-backdrop')
        dataBackdropDomOverlay?.classList?.add('tutorial-class')
      }
      const dataPopUpDom = document?.querySelector('.tutorial-side-open')
      if (dataPopUpDom) {
        dataPopUpDom?.classList?.remove('tutorial-side-open')
      } else {
        const dataPopUpDomOverlay = document?.querySelector('.certification-rule-pop-up')
        dataPopUpDomOverlay?.classList?.add('tutorial-side-open')
      }
    }
    return this.sidenav.open();
  }

  public close(type) {
    this.sidenavTutorialOpen = false;
    if (document && (type === 'popup' || type === 'close')) {
      const dataBackdropDom = document?.querySelector('.tutorial-class')
      if (dataBackdropDom) {
        dataBackdropDom?.classList?.remove('tutorial-class')
      }
      const dataPopUpDom = document?.querySelector('.tutorial-side-open')
      if (dataPopUpDom) {
        dataPopUpDom?.classList?.remove('tutorial-side-open')
      }
    }
    return this.sidenav.close();
  }

  public toggle(type): void {
    this.sidenavTutorialOpen = true;
    if (document && type === 'popup') {
      const dataBackdropDom = document?.querySelector('.tutorial-class')
      if (dataBackdropDom) {
        dataBackdropDom?.classList?.remove('tutorial-class')
      } else {
        const dataBackdropDomOverlay = document?.querySelector('.cdk-overlay-backdrop')
        dataBackdropDomOverlay?.classList?.add('tutorial-class')
      }
      const dataPopUpDom = document?.querySelector('.tutorial-side-open')
      if (dataPopUpDom) {
        dataPopUpDom?.classList?.remove('tutorial-side-open')
      } else {
        const dataPopUpDomOverlay = document?.querySelector('.certification-rule-pop-up')
        dataPopUpDomOverlay?.classList?.add('tutorial-side-open')
      }
    }
    this.sidenav.toggle();
  }
  constructor() {}
}
