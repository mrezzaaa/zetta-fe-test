import {enableProdMode} from '@angular/core';
import {platformBrowserDynamic} from '@angular/platform-browser-dynamic';

import {GeneAppModule} from './app/app.module';
import {environment} from './environments/environment';


if (environment.production) {
  enableProdMode();
}

platformBrowserDynamic().bootstrapModule(GeneAppModule)
.catch(err => console.error(err));



