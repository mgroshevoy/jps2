import {Component, OnInit, ViewChild} from '@angular/core';
import {WalmartService} from './walmart.service'
import {Http} from '@angular/http';
import {ToasterService, ToasterConfig} from 'angular2-toaster';

@Component({
  selector: 'app-walmart',
  templateUrl: './walmart.component.html',
  styleUrls: ['./walmart.component.css']
})
export class WalmartComponent implements OnInit {
  @ViewChild('importcsv') importcsv;
  orders: any = [];
  private toasterService: ToasterService;
  public toasterconfig: ToasterConfig =
    new ToasterConfig({
      positionClass: 'toast-top-center',
      timeout: 5000
    });

  constructor(private walmartService: WalmartService, private http: Http, toasterService: ToasterService) {
    this.toasterService = toasterService;
  }

  ngOnInit() {
    this.walmartService.getAllOrders().subscribe(orders => {
      this.orders = orders;
    });
  }

  fileChange(event) {
    this.walmartService.setUpdate(event.target.files)
      .subscribe(data => {
        this.orders = data;
        this.toasterService.pop('info', 'Walmart orders updated!');
        this.importcsv.nativeElement.value = '';
      },
      error => console.error(error)
    );
  }
}
