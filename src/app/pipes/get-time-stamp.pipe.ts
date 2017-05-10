import {Pipe, PipeTransform} from '@angular/core';
import * as moment from 'moment'

@Pipe({
  name: 'getTimeStamp'
})
export class GetTimeStampPipe implements PipeTransform {

  transform(value: any, args?: any): any {
    return value ? moment(new Date(parseInt(value.substring(0, 8), 16) * 1000)).format('lll') : '';
  }
}
