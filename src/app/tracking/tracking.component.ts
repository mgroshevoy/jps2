import {Component, OnInit} from '@angular/core';
import {TrackingService} from './tracking.service';

@Component({
  selector: 'app-tracking',
  templateUrl: './tracking.component.html',
  styleUrls: ['./tracking.component.css']
})
export class TrackingComponent implements OnInit {

  orders: any = [];

  constructor(private trackingService: TrackingService) {
  }

  ngOnInit() {
    this.trackingService.getAllOrders().subscribe(orders => {
      this.orders = orders;
    });
  }

}
