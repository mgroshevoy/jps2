import {Injectable} from '@angular/core';
import {Http} from '@angular/http';
import 'rxjs/add/operator/map';
import {AuthHttp} from 'angular2-jwt';

@Injectable()
export class WalmartService {

  constructor(private http: Http, private authHttp: AuthHttp) {
  }

  getAllOrders() {
    return this.authHttp.get('api/walmart')
      .map(res => res.json());
  }
}
