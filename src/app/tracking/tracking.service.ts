import { Injectable } from '@angular/core';
import {Http} from '@angular/http';

@Injectable()
export class TrackingService {

  constructor(private http: Http) { }

  getAllOrders() {
    return this.http.get('api/tracking')
      .map(res => res.json());
  }
}
