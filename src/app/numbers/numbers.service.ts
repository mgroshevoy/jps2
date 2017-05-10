import { Injectable } from '@angular/core';
import {Http} from '@angular/http';
import 'rxjs/add/operator/map';

@Injectable()
export class NumbersService {

  constructor(private http: Http) {
  }

  getAllNumbers() {
    return this.http.get('api/tn')
      .map(res => res.json());
  }
}
