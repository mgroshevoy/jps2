import {Injectable} from '@angular/core';
import {Http} from '@angular/http';
import 'rxjs/add/operator/map';
import {AuthHttp} from 'angular2-jwt';
import {Observable} from 'rxjs/Observable';

@Injectable()
export class AmazonService {

  constructor(private http: Http, private authHttp: AuthHttp) {
  }

  getAllOrders() {
    return this.authHttp.get('api/amazon')
      .map(res => res.json());
  }
  setUpdate(files) {
    const fileList: FileList = files;
    if (fileList.length > 0) {
      const file: File = fileList[0];
      const formData: FormData = new FormData();
      formData.append('uploadFile', file, file.name);
      // let headers = new Headers();
      // headers.append('Content-Type', 'multipart/form-data');
      // headers.append('Accept', 'application/json');
      // let options = new RequestOptions({headers: headers});
      return this.authHttp.post('api/amazon', formData) // , options)
        .map(res => res.json())
        .catch(error => Observable.throw(error))
    }
  }
}
