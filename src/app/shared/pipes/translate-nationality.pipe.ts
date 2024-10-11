import { Pipe } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

@Pipe({
  name: 'translateNationality',
  pure: false,
})
export class TranslateNationalityPipe extends TranslatePipe {
  transform(value: any, ...args: any[]) {
    if (!value) {
      return value;
    }
    const translated = super.transform(`NATIONALITY.${value}`);
    return translated.replace('NATIONALITY.', '');
  }
}
