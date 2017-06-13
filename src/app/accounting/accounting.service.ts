import {Injectable} from '@angular/core';
import {Http} from '@angular/http';
import 'rxjs/add/operator/map';
import { AuthHttp} from 'angular2-jwt';

@Injectable()
export class AccountingService {

  constructor(private http: Http, private authHttp: AuthHttp) {
  }

  getAllOrders(myRange: any) {
    let begin = myRange.beginDate.year + '-'
      + (myRange.beginDate.month < 10 ? '0' + myRange.beginDate.month : myRange.beginDate.month)
      + '-' + (myRange.beginDate.day < 10 ? '0' + myRange.beginDate.day : myRange.beginDate.day);
    let end = myRange.endDate.year + '-'
      + (myRange.endDate.month < 10 ? '0' + myRange.endDate.month : myRange.endDate.month)
      + '-' + (myRange.endDate.day < 10 ? '0' + myRange.endDate.day : myRange.endDate.day);
    return this.authHttp.get('api/accounting/' + begin + '/' + end)
      .map(res => res.json());
  }

  setPurchasePrice(order) {
    return this.authHttp.post('api/accounting', order)
      .map(res => res.json());
  }
}
