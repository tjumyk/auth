import {Directive, Input} from '@angular/core';
import {AbstractControl, NG_VALIDATORS, ValidationErrors, Validator, ValidatorFn} from "@angular/forms";

export function sameAsValidator(sameAs: any): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    return control.value && (control.value !== sameAs) ? {'sameAs': {value: control.value}} : null;
  }
}

@Directive({
  selector: '[appSameAs]',
  providers: [{provide: NG_VALIDATORS, useExisting: SameAsDirective, multi: true}]
})
export class SameAsDirective implements Validator {
  @Input('appSameAs') sameAs: any;

  constructor() {
  }

  validate(c: AbstractControl): ValidationErrors | null {
    if(!this.sameAs)
      return null;
    return sameAsValidator(this.sameAs)(c);
  }
}
