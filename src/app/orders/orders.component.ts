import {Component, OnInit} from '@angular/core';
import {OrdersService} from './orders.service';
import {FeePipe} from '../pipes/fee.pipe';
import {IMyOptions, IMyDateRangeModel} from 'mydaterangepicker';
import * as moment from 'moment';
import {ToasterService, ToasterConfig} from 'angular2-toaster';

@Component({
  selector: 'app-orders',
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.css']
})
export class OrdersComponent implements OnInit {

  orders: any = [];

  private toasterService: ToasterService;
  public toasterconfig: ToasterConfig =
    new ToasterConfig({
      positionClass: 'toast-top-center',
      timeout: 5000
    });
  myDateRangePickerOptions: IMyOptions = {
    dateFormat: 'yyyy-mm-dd',
    selectionTxtFontSize: '16px',
  };
  myRange: object = {
    beginDate: {
      year: moment().subtract(30, 'days').year(),
      month: moment().subtract(30, 'days').month() + 1,
      day: moment().subtract(30, 'days').date()
    },
    endDate: {year: moment().year(), month: moment().month() + 1, day: moment().date()}
  };

  constructor(private ordersService: OrdersService, toasterService: ToasterService) {
    this.toasterService = toasterService;
  }

  ngOnInit() {
    this.ordersService.getAllOrders(this.myRange).subscribe(orders => {
      this.orders = orders;
      this.calcFunc(orders);
    });
  }

  onDateRangeChanged(event: IMyDateRangeModel) {
    this.ordersService.getAllOrders(event).subscribe(orders => {
      this.orders = orders;
      this.calcFunc(orders);
    });
  }

  calcFunc(orders: any) {
    this.orders.totalSum = 0;
    this.orders.sumFee = 0;
    this.orders.num = orders.length;
    for (const order of orders) {
      this.orders.totalSum += order.total;
      this.orders.sumFee += +new FeePipe().transform(order);
    }
  }

  updateData() {
    this.toasterService.pop('info', 'Update started!', 'Process will take a few minutes.');
    this.ordersService.updateAllOrders().subscribe(orders => {
      this.orders = orders;
      this.toasterService.pop('info', 'Orders updated!');
      this.myRange = {
        beginDate: {
          year: moment().subtract(30, 'days').year(),
          month: moment().subtract(30, 'days').month() + 1,
          day: moment().subtract(30, 'days').date()
        },
        endDate: {year: moment().year(), month: moment().month() + 1, day: moment().date()}
      };
      this.calcFunc(orders);
    });
  }
}
