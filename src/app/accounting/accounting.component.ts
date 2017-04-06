import {Component, OnChanges, OnInit, SimpleChange} from '@angular/core';
import * as moment from 'moment';
import {AccountingService} from './accounting.service';
import {IMyOptions, IMyDateRangeModel} from 'mydaterangepicker';
import {FeePipe} from "../pipes/fee.pipe";

@Component({
  selector: 'app-accounting',
  templateUrl: './accounting.component.html',
  styleUrls: ['./accounting.component.css']
})

export class AccountingComponent implements OnInit, OnChanges {

  orders: any = [];
  myDateRangePickerOptions: IMyOptions = {
    dateFormat: 'yyyy-mm-dd',
  };
  myRange: Object = {
    beginDate: {
      year: moment().subtract(30, 'days').year(),
      month: moment().subtract(30, 'days').month() + 1,
      day: moment().subtract(30, 'days').date()
    },
    endDate: {year: moment().year(), month: moment().month() + 1, day: moment().date()}
  };

  constructor(private accountingService: AccountingService) {
  }

  ngOnInit() {
    this.accountingService.getAllOrders(this.myRange).subscribe(orders => {
      this.orders = orders;
      this.calcFunc(orders);
    });
  }

  onDateRangeChanged(event: IMyDateRangeModel) {
    console.log(event);
    //console.log('onDateRangeChanged(): Begin date: ', event.beginDate, ' End date: ', event.endDate);
    //console.log('onDateRangeChanged(): Formatted: ', event.formatted);
    //console.log('onDateRangeChanged(): BeginEpoc timestamp: ', event.beginEpoc, ' - endEpoc timestamp: ', event.endEpoc);
    this.accountingService.getAllOrders(event).subscribe(orders => {
      this.orders = orders;
      this.calcFunc(orders);
    });
  }

  calcFunc(orders: any) {
    this.orders.totalSum = 0;
    this.orders.sumFee = 0;
    this.orders.sumAmazon = 0;
    this.orders.sumWalmart = 0;
    this.orders.num = orders.length;
    for (let order of orders) {
      this.orders.totalSum += order.total;
      this.orders.sumFee += Number(new FeePipe().transform(order));
      this.orders.sumAmazon += order.amazon.total;
      this.orders.sumWalmart += order.walmart.total;
    }
    this.orders.totalProfit = this.orders.totalSum - this.orders.sumFee - this.orders.sumAmazon - this.orders.sumWalmart;
  }

  changePrice($event, order, store) {
    this.accountingService
      .setPurchasePrice({
        id: order.id,
        amazonprice: order.amazon.total,
        walmartprice: order.walmart.total,
        amazonid: order.amazon.id,
        walmartid: order.walmart.id
      })
      .subscribe((res: any) => {
        if (res.amazontotal) order.amazon.total = res.amazontotal;
        if (res.walmarttotal) order.walmart.total = res.walmarttotal;
        this.calcFunc(this.orders);
        //        console.log($event.target.value);
      });
  }

  selectPrice($event) {
    $event.target.select();
  }

  ngOnChanges(changes: { [propName: string]: SimpleChange }) {
    console.log(changes);
  }

}
