import {Injectable} from '@angular/core';
import {Http} from '@angular/http';
import 'rxjs/add/operator/map';
import * as moment from 'moment';

@Injectable()
export class AccountingService {

  constructor(private http: Http) {
  }

  getAllOrders(myRange: any) {
    let begin = myRange.beginDate.year + '-'
      + (myRange.beginDate.month < 10 ? '0' + myRange.beginDate.month : myRange.beginDate.month)
      + '-' + (myRange.beginDate.day < 10 ? '0' + myRange.beginDate.day : myRange.beginDate.day);
    let end = myRange.endDate.year + '-'
      + (myRange.endDate.month < 10 ? '0' + myRange.endDate.month : myRange.endDate.month)
      + '-' + (myRange.endDate.day < 10 ? '0' + myRange.endDate.day : myRange.endDate.day);
    return this.http.get('api/accounting/' + begin + '/' + end)
      .map(res => res.json());
  }

  setPurchasePrice(order) {
    return this.http.post('api/accounting', order)
      .map(res => res.json());
  }
}
