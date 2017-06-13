import { Injectable } from '@angular/core';
import {Http} from '@angular/http';
import { AuthHttp} from 'angular2-jwt';

@Injectable()
export class TrackingService {

  constructor(private http: Http, private authHttp: AuthHttp) { }

  getAllOrders() {
    return this.authHttp.get('api/tracking')
      .map(res => res.json());
  }
}
