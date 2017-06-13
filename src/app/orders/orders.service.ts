import {Injectable} from '@angular/core';
import {Http} from '@angular/http';
import 'rxjs/add/operator/map';
import {AuthHttp} from 'angular2-jwt';

@Injectable()
export class OrdersService {

  constructor(private http: Http, private authHttp: AuthHttp) {
  }

  getAllOrders(myRange: any) {
    const begin = myRange.beginDate.year + '-'
      + (myRange.beginDate.month < 10 ? '0' + myRange.beginDate.month : myRange.beginDate.month)
      + '-' + (myRange.beginDate.day < 10 ? '0' + myRange.beginDate.day : myRange.beginDate.day);
    const end = myRange.endDate.year + '-'
      + (myRange.endDate.month < 10 ? '0' + myRange.endDate.month : myRange.endDate.month)
      + '-' + (myRange.endDate.day < 10 ? '0' + myRange.endDate.day : myRange.endDate.day);
    return this.authHttp.get('api/orders/' + begin + '/' + end)
      .map(res => res.json());
  }

  updateAllOrders() {
    return this.authHttp.get('api/orders/update')
      .map(res => res.json());
  }
}
