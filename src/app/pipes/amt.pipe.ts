import { Pipe, PipeTransform } from '@angular/core';
import * as moment from 'moment';

@Pipe({
  name: 'amt'
})
export class AmtPipe implements PipeTransform {

  transform(value: any, args?: string[]): any {
    if (!value) {
      return value;
    }
    return moment(value).utcOffset(-4).format('L');
  }

}
