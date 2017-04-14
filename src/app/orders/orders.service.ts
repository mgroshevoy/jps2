import {Injectable} from '@angular/core';
import {Http} from '@angular/http';
import 'rxjs/add/operator/map';
import * as moment from 'moment';

@Injectable()
export class OrdersService {

  constructor(private http: Http) {
  }

  getAllOrders(myRange: any) {
    return this.http.get('api/orders/'
      + myRange.beginDate.year + '-' + myRange.beginDate.month + '-' + myRange.beginDate.day +'/'
      + myRange.endDate.year + '-' + myRange.endDate.month + '-' + myRange.endDate.day)
      .map(res => res.json());
  }

  updateAllOrders() {
    return this.http.get('api/orders/update')
      .map(res => res.json());
  }
}
