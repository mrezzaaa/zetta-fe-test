import { Pipe, PipeTransform } from '@angular/core';
@Pipe({
  name: 'formatPhoneNumber',
})
export class FormatPhoneNumberPipe implements PipeTransform {
  transform(value, type: 'format' | 'reset') {
    let result = value;
    if (result || typeof result === 'number') {
      if (type === 'format') {
        result = result?.toString()?.replace(/\D/g, '')?.replace(/(\d{2})(?=\d)/g, '$1 ');
      } else if (type === 'reset') {
        result = result?.toString()?.replace(/\s/g, '')
      }
    }
    return result;
  }

  transformOnPaste(event) {
    const pastedText = event?.clipboardData?.getData('text');
    if (pastedText) {
      event.preventDefault();
      document.execCommand('insertText', false, this.transform(pastedText, 'format'));
    }
  }

  preventNonNumericalInput(event) {
    if (event && event.key) {
      if (!event.key.match(/^[0-9]+$/)) {
        event.preventDefault();
      }
    }
  }
}
