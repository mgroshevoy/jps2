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
      + moment(myRange.beginDate).subtract(1, 'month').format('YYYY-MM-DD') + '/'
      + moment(myRange.endDate).subtract(1, 'month').format('YYYY-MM-DD'))
      .map(res => res.json());
  }

  updateAllOrders() {
    return this.http.get('api/orders/update')
      .map(res => res.json());
  }
}
