import {Component, OnInit} from '@angular/core';
import {OrdersService} from '../orders/orders.service';
import {FeePipe} from "../pipes/fee.pipe";
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
  showStart: boolean = false;
  private toasterService: ToasterService;
  public toasterconfig : ToasterConfig =
    new ToasterConfig({
      positionClass: "toast-top-center",
      timeout: 5000
    });
  private myDateRangePickerOptions: IMyOptions = {
    dateFormat: 'yyyy-mm-dd',
  };
  private myRange: Object = {
    beginDate: {
      year: moment().subtract(30, 'days').year(),
      month: moment().subtract(30, 'days').month()+1,
      day: moment().subtract(30, 'days').date()
    },
    endDate: {year: moment().year(), month: moment().month()+1, day: moment().date()}
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
    //console.log('onDateRangeChanged(): Begin date: ', event.beginDate, ' End date: ', event.endDate);
    //console.log('onDateRangeChanged(): Formatted: ', event.formatted);
    //console.log('onDateRangeChanged(): BeginEpoc timestamp: ', event.beginEpoc, ' - endEpoc timestamp: ', event.endEpoc);
    this.ordersService.getAllOrders(event).subscribe(orders => {
      this.orders = orders;
      this.calcFunc(orders);
    });
  }

  calcFunc(orders: any){
    this.orders.totalSum = 0;
    this.orders.sumFee = 0;
    this.orders.num = orders.length;
    for (let order of orders) {
      this.orders.totalSum += order.total;
      this.orders.sumFee += Number(new FeePipe().transform(order));
    }
  }

  updateData(){
    this.toasterService.pop('info', 'Update started!', 'Process will take a few minutes.');
    this.ordersService.updateAllOrders().subscribe(orders => {
      this.orders = orders;
      this.toasterService.pop('info', 'Orders updated!');
      this.myRange = {
        beginDate: {
          year: moment().subtract(30, 'days').year(),
          month: moment().subtract(30, 'days').month()+1,
          day: moment().subtract(30, 'days').date()
        },
        endDate: {year: moment().year(), month: moment().month()+1, day: moment().date()}
      };
      this.calcFunc(orders);
    });
  }
}
