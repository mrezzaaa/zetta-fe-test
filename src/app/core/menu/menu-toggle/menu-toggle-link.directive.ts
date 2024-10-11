import {
  Directive, HostBinding, Inject, Input, OnInit, OnDestroy
} from '@angular/core';

import { MenuToggleDirective } from './menu-toggle.directive';
import { CoreService } from 'app/service/core/core.service';

@Directive({
  selector: '[menuToggleLink]'
})
export class MenuToggleLinkDirective implements OnInit, OnDestroy {

  @Input() public group: any;

  @HostBinding('class.open')
  @Input()
  get open(): boolean {
    return this._open;
  }

  set open(value: boolean) {
    this._open = value;
    if (value) {
      this.nav.closeOtherLinks(this);
    }
  }

  protected _open: boolean;
  protected nav: MenuToggleDirective;

  public constructor(@Inject(MenuToggleDirective) nav: MenuToggleDirective, private coreService: CoreService) {
    this.nav = nav;
  }

  public ngOnInit(): any {
    this.nav.addLink(this);

    if (this.group) {
      const routeUrl = this.nav.getUrl();
      const currentUrl = routeUrl.split('/');
      if (currentUrl.indexOf( this.group ) > 0) {
        this.toggle();
      }
    }
  }

  public ngOnDestroy(): any {
    this.nav.removeGroup(this);
  }

  public toggle(): any {
    if (this.coreService.sidenavOpenMode !== 'icon') {
      this.open = !this.open;
    } else if (this.coreService.sidenavOpenMode === 'icon') {
      if (!this.coreService.isSidebarClicked && !this.open) {
        this.open = true
      } else if (this.coreService.isSidebarClicked) {
        this.open = !this.open;
      }
    }
  }
}
