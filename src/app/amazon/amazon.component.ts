import {Component, OnInit} from '@angular/core';
import {AmazonService} from './amazon.service'
import {Http} from '@angular/http';
import {Observable} from 'rxjs/Rx';
import {ToasterService, ToasterConfig} from 'angular2-toaster';

@Component({
  selector: 'app-amazon',
  templateUrl: './amazon.component.html',
  styleUrls: ['./amazon.component.css']
})
export class AmazonComponent implements OnInit {

  orders: any = [];
  private toasterService: ToasterService;
  public toasterconfig: ToasterConfig =
    new ToasterConfig({
      positionClass: 'toast-top-center',
      timeout: 5000
    });

  constructor(private amazonService: AmazonService, private http: Http, toasterService: ToasterService) {
    this.toasterService = toasterService;
  }

  ngOnInit() {
    this.amazonService.getAllOrders().subscribe(orders => {
      this.orders = orders;
    });
  }

  fileChange(event) {
    const fileList: FileList = event.target.files;
    if (fileList.length > 0) {
      const file: File = fileList[0];
      const formData: FormData = new FormData();
      formData.append('uploadFile', file, file.name);
      // let headers = new Headers();
      // headers.append('Content-Type', 'multipart/form-data');
      // headers.append('Accept', 'application/json');
      // let options = new RequestOptions({headers: headers});
      this.http.post('api/amazon', formData) // , options)
        .map(res => res.json())
        .catch(error => Observable.throw(error))
        .subscribe(data => {
            console.log(data);
            this.orders = data;
            this.toasterService.pop('info', 'Amazon orders updated!');
          },
          error => console.error(error)
        )
    }
  }
}
