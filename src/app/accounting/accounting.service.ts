import {Injectable} from '@angular/core';
import {Http} from '@angular/http';
import 'rxjs/add/operator/map';
import * as moment from 'moment';

@Injectable()
export class AccountingService {

  constructor(private http: Http) {
  }

  getAllOrders(myRange: any) {
    console.log(myRange);
    return this.http.get('api/accounting/'
      + myRange.beginDate.year + '-' + myRange.beginDate.month + '-' + myRange.beginDate.day +'/'
      + myRange.endDate.year + '-' + myRange.endDate.month + '-' + myRange.endDate.day)
      .map(res => res.json());
  }

  setPurchasePrice(order) {
    return this.http.post('api/accounting', order)
      .map(res => res.json());
  }
}
