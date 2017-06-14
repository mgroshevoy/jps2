import {Component, OnInit, ViewChild} from '@angular/core';
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
  @ViewChild('importcsv') importcsv;
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
    this.amazonService.setUpdate(event.target.files)
      .subscribe(data => {
          this.orders = data;
          this.toasterService.pop('info', 'Amazon orders updated!');
          this.importcsv.nativeElement.value = '';
        },
        error => console.error(error)
      );
  }
}
