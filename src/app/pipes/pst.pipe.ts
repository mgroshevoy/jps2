import { Pipe, PipeTransform } from '@angular/core';
import * as moment from 'moment';

@Pipe({
  name: 'pst'
})
export class PstPipe implements PipeTransform {

  transform(value: any, args?: string[]): any {
    if (!value) {
      return value;
    }
    return moment(value).utcOffset(-7).format('L');
  }
}
