import {Component, OnChanges, OnInit, SimpleChange} from '@angular/core';
import * as moment from 'moment';
import {AccountingService} from './accounting.service';
import {IMyOptions, IMyDateRangeModel} from 'mydaterangepicker';
import {FeePipe} from '../pipes/fee.pipe';
import {EbayfeePipe} from '../pipes/ebayfee.pipe';
import {PaypalfeePipe} from '../pipes/paypalfee.pipe';

@Component({
  selector: 'app-accounting',
  templateUrl: './accounting.component.html',
  styleUrls: ['./accounting.component.css']
})

export class AccountingComponent implements OnInit, OnChanges {

  orders: any = [];
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
    this.orders.sumEbayFee = 0;
    this.orders.sumPaypalFee = 0;
    this.orders.num = orders.length;
    for (const order of orders) {
      if (order.paid_time) {
        this.orders.totalSum += order.total;
      }
      this.orders.sumEbayFee += +new EbayfeePipe().transform(order);
      this.orders.sumPaypalFee += +new PaypalfeePipe().transform(order);
      this.orders.sumFee += +new FeePipe().transform(order);
      this.orders.sumAmazon += order.amazon.total;
      this.orders.sumWalmart += order.walmart.total;
    }
    this.orders.totalProfit = this.orders.totalSum - this.orders.sumFee - this.orders.sumAmazon - this.orders.sumWalmart;
  }

  changePrice($event, order) {
    this.accountingService
      .setPurchasePrice({
        id: order.id,
        amazonprice: order.amazon.total,
        walmartprice: order.walmart.total,
        amazonid: order.amazon.id,
        walmartid: order.walmart.id
      })
      .subscribe((res: any) => {
        if (res.amazontotal) {
          order.amazon.total = res.amazontotal;
        }
        if (res.walmarttotal) {
          order.walmart.total = res.walmarttotal;
        }
        this.calcFunc(this.orders);
      });
  }

  selectPrice($event) {
    $event.target.select();
  }

  ngOnChanges(changes: { [propName: string]: SimpleChange }) {
    console.log(changes);
  }

}
