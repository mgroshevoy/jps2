import {Injectable} from '@angular/core';
import {Http} from '@angular/http';
import 'rxjs/add/operator/map';
import * as moment from 'moment';

@Injectable()
export class AccountingService {

  constructor(private http: Http) {
  }

  getAllOrders(myRange: any) {
    return this.http.get('api/accounting/'
      + moment(myRange.beginJsDate).subtract(1, 'month').format('YYYY-MM-DD') + '/'
      + moment(myRange.endJsDate).subtract(1, 'month').format('YYYY-MM-DD'))
      .map(res => res.json());
  }

  setPurchasePrice(order) {
    return this.http.post('api/accounting', order)
      .map(res => res.json());
  }
}
