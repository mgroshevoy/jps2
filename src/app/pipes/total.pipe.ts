import {Pipe, PipeTransform} from '@angular/core';

@Pipe({
  name: 'total'
})
export class TotalPipe implements PipeTransform {

  transform(value: any, args?: any): any {
    if (!value) {
      return value;
    }
    if (value.paid_time) {
      return value.total;
    }
    return 0;
  }

}
