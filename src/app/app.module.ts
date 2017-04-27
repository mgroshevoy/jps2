import {BrowserModule} from '@angular/platform-browser';
import {NgModule} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {HttpModule} from '@angular/http';
import {RouterModule} from '@angular/router';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {MyDatePickerModule} from 'mydatepicker';
import {MyDateRangePickerModule} from 'mydaterangepicker';
import {ToasterModule, ToasterService} from 'angular2-toaster';

import {AppComponent} from './app.component';
import {OrdersComponent} from './orders/orders.component';
import {OrdersService} from './orders/orders.service';
import {AmazonComponent} from './amazon/amazon.component';
import {AmazonService} from "./amazon/amazon.service";
import {WalmartComponent} from './walmart/walmart.component';
import {WalmartService} from "./walmart/walmart.service";
import {AccountingComponent} from './accounting/accounting.component';
import {AccountingService} from "./accounting/accounting.service";
import {TrackingComponent} from './tracking/tracking.component';
import {TrackingService} from './tracking/tracking.service';
import {MainComponent} from './main/main.component';

import {AmtPipe} from './pipes/amt.pipe';
import {PstPipe} from './pipes/pst.pipe';
import {FeePipe} from './pipes/fee.pipe';
import {GetTimeStampPipe} from './pipes/get-time-stamp.pipe';
import {TotalPipe} from './pipes/total.pipe';

// Define the routes
const ROUTES = [
  // {
  //   path: '',
  //   redirectTo: 'orders',
  //   pathMatch: 'full'
  // },
  {
    path: '',
    component: TrackingComponent
  },
  {
    path: 'amazon',
    component: AmazonComponent
  },
  {
    path: 'walmart',
    component: WalmartComponent
  },
  {
    path: 'orders',
    component: OrdersComponent
  },
  {
    path: 'accounting',
    component: AccountingComponent
  }
];

@NgModule({
  declarations: [
    AppComponent,
    OrdersComponent,
    AmazonComponent,
    WalmartComponent,
    MainComponent,
    AccountingComponent,
    AmtPipe,
    PstPipe,
    FeePipe,
    TrackingComponent,
    GetTimeStampPipe,
    TotalPipe
  ],
  imports: [
    BrowserModule,
    FormsModule,
    HttpModule,
    RouterModule.forRoot(ROUTES),
    BrowserAnimationsModule,
    MyDatePickerModule,
    MyDateRangePickerModule,
    ToasterModule
  ],
  providers: [
    OrdersService,
    AmazonService,
    WalmartService,
    AccountingService,
    ToasterService,
    TrackingService],
  bootstrap: [AppComponent]
})

export class AppModule {
}
