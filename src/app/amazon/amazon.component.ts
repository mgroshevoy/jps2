import {Component, OnInit} from '@angular/core';
import {AmazonService} from './amazon.service'
import {Http} from "@angular/http";
import {Observable} from "rxjs";

@Component({
  selector: 'app-amazon',
  templateUrl: './amazon.component.html',
  styleUrls: ['./amazon.component.css']
})
export class AmazonComponent implements OnInit {

  orders: any = [];

  constructor(private amazonService: AmazonService, private http: Http) {
  }

  ngOnInit() {
    this.amazonService.getAllOrders().subscribe(orders => {
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
      this.http.post('api/amazon', formData)//, options)
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
