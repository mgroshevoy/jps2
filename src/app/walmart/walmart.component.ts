import { Component, OnInit } from '@angular/core';
import {WalmartService} from '../walmart/walmart.service'
import {Observable} from "rxjs";
import {Http} from "@angular/http";

@Component({
  selector: 'app-walmart',
  templateUrl: './walmart.component.html',
  styleUrls: ['./walmart.component.css']
})
export class WalmartComponent implements OnInit {

  orders: any = [];

  constructor(private walmartService: WalmartService, private http: Http) { }

  ngOnInit() {
    this.walmartService.getAllOrders().subscribe(orders => {
      this.orders = orders;
    });
  }
  fileChange(event) {
    let fileList: FileList = event.target.files;
    if (fileList.length > 0) {
      let file: File = fileList[0];
      let formData: FormData = new FormData();
      formData.append('uploadFile', file, file.name);
      // let headers = new Headers();
      // headers.append('Content-Type', 'multipart/form-data');
      // headers.append('Accept', 'application/json');
      // let options = new RequestOptions({headers: headers});
      this.http.post('api/walmart', formData)//, options)
        .map(res => res.json())
        .catch(error => Observable.throw(error))
        .subscribe(data => {
            console.log(data);
            this.orders = data;
          },
          error => console.error(error)
        )
    }
  }
}
