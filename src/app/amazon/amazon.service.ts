import {Injectable} from '@angular/core';
import {Http} from '@angular/http';
import 'rxjs/add/operator/map';

@Injectable()
export class AmazonService {

  constructor(private http: Http) {
  }

  getAllOrders() {
    return this.http.get('api/amazon')
      .map(res => res.json());
  }
}
