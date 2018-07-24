import {Directive} from '@angular/core';
import {AbstractControl, NG_VALIDATORS, ValidationErrors, Validator, ValidatorFn} from "@angular/forms";

export function strongPasswordValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const password = control.value;
    if (!password)
      return null;
    if (!/[a-z]/.test(password)) {
      return {strongPassword: 'At least one lowercase character'}
    }
    if (!/[A-Z]/.test(password)) {
      return {strongPassword: 'At least one uppercase character'}
    }
    if (!/[0-9]/.test(password)) {
      return {strongPassword: 'At least one digit'}
    }
    return null;
  }
}

@Directive({
  selector: '[appStrongPassword]',
  providers: [{provide: NG_VALIDATORS, useExisting: StrongPasswordDirective, multi: true}]
})
export class StrongPasswordDirective implements Validator {

  constructor() {
  }

  validate(c: AbstractControl): ValidationErrors | null {
    return strongPasswordValidator()(c);
  }

}
