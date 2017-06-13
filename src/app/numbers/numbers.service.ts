import { Injectable } from '@angular/core';
import {Http} from '@angular/http';
import 'rxjs/add/operator/map';
import {AuthHttp} from 'angular2-jwt';

@Injectable()
export class NumbersService {

  constructor(private http: Http, private authHttp: AuthHttp) {
  }

  getAllNumbers() {
    return this.authHttp.get('api/tn')
      .map(res => res.json());
  }
}
