import {BrowserModule} from '@angular/platform-browser';
import {NgModule} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {HttpModule} from '@angular/http';
import {RouterModule} from '@angular/router';
import {NgbModule} from '@ng-bootstrap/ng-bootstrap';

import {AppComponent} from './app.component';
import {OrdersComponent} from './orders/orders.component';

import {OrdersService} from './orders/orders.service';
import {AmazonComponent} from './amazon/amazon.component';
import {WalmartComponent} from './walmart/walmart.component';
import {MainComponent} from './main/main.component';
import {AccountingComponent} from './accounting/accounting.component';
import {AmazonService} from "./amazon/amazon.service";
import {AmtPipe} from './pipes/amt.pipe';
import {PstPipe} from './pipes/pst.pipe';
import {FeePipe} from './pipes/fee.pipe';
import {WalmartService} from "./walmart/walmart.service";
import {AccountingService} from "./accounting/accounting.service";
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import { MyDatePickerModule } from 'mydatepicker';
import { MyDateRangePickerModule } from 'mydaterangepicker';
import {ToasterModule, ToasterService} from 'angular2-toaster';

// Define the routes
const ROUTES = [
  // {
  //   path: '',
  //   redirectTo: 'orders',
  //   pathMatch: 'full'
  // },
  {
    path: '',
    component: MainComponent
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
    FeePipe
  ],
  imports: [
    BrowserModule,
    FormsModule,
    HttpModule,
    RouterModule.forRoot(ROUTES),
    NgbModule.forRoot(),
    BrowserAnimationsModule,
    MyDatePickerModule,
    MyDateRangePickerModule,
    ToasterModule
  ],
  providers: [OrdersService, AmazonService, WalmartService, AccountingService, ToasterService],
  bootstrap: [AppComponent]
})
export class AppModule {
}
