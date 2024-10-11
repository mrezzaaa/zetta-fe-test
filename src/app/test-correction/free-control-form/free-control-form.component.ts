import { Component, Input, OnInit } from '@angular/core';
import { UntypedFormGroup, Validators } from '@angular/forms';
import { TestCreationRespData } from 'app/test/test-creation/test-creation.model';
import { SubSink } from 'subsink';

@Component({
  selector: 'ms-free-control-form',
  templateUrl: './free-control-form.component.html',
  styleUrls: ['./free-control-form.component.scss']
})
export class FreeControlFormComponent implements OnInit {
  private subs = new SubSink();
  @Input() testCorrectionForm: UntypedFormGroup;
  @Input() testData: TestCreationRespData;

  constructor() { }

  ngOnInit() {
    this.setValidator()
  }

  validateAdditionalTotal() {
    const additionalTotal = +this.getCorrectionForm().get('additional_total').value;
    if (additionalTotal % 1 !== 0) {
      // if decimal value, limit only 2 number behind comma
      this.getCorrectionForm().get('additional_total').setValue(additionalTotal.toFixed(2));
      this.getCorrectionForm().get('total').setValue(additionalTotal.toFixed(2));
    }

  }
  setValidator(){
    this.getCorrectionForm().get('additional_total').setValidators([Validators.min(0),Validators.max(20),Validators.required]);
    this.getCorrectionForm().get('additional_total').updateValueAndValidity()
  }

  getCorrectionForm() {
    return this.testCorrectionForm.get('correction_grid').get('correction') as UntypedFormGroup;
  }

}
