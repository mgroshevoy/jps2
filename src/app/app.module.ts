import {BrowserModule} from '@angular/platform-browser';
import {NgModule} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {Http, HttpModule, RequestOptions} from '@angular/http';
import {RouterModule} from '@angular/router';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {MyDatePickerModule} from 'mydatepicker';
import {MyDateRangePickerModule} from 'mydaterangepicker';
import {ToasterModule, ToasterService} from 'angular2-toaster';

import {AppComponent} from './app.component';
import {OrdersComponent} from './orders/orders.component';
import {OrdersService} from './orders/orders.service';
import {AmazonComponent} from './amazon/amazon.component';
import {AmazonService} from './amazon/amazon.service';
import {WalmartComponent} from './walmart/walmart.component';
import {WalmartService} from './walmart/walmart.service';
import {AccountingComponent} from './accounting/accounting.component';
import {AccountingService} from './accounting/accounting.service';
import {TrackingComponent} from './tracking/tracking.component';
import {TrackingService} from './tracking/tracking.service';
import {MainComponent} from './main/main.component';

import {AmtPipe} from './pipes/amt.pipe';
import {PstPipe} from './pipes/pst.pipe';
import {FeePipe} from './pipes/fee.pipe';
import {GetTimeStampPipe} from './pipes/get-time-stamp.pipe';
import {TotalPipe} from './pipes/total.pipe';
import {NumbersComponent} from './numbers/numbers.component';
import {NumbersService} from './numbers/numbers.service';
import {PaypalfeePipe} from './pipes/paypalfee.pipe';
import {EbayfeePipe} from './pipes/ebayfee.pipe';
import {LoginComponent} from './login/login.component';
import { NavigationComponent } from './navigation/navigation.component';
import {AuthGuard} from './auth.guard';
import {AuthService} from './login/auth.service';
import { AuthHttp, AuthConfig } from 'angular2-jwt';

export function authHttpServiceFactory(http: Http, options: RequestOptions) {
  return new AuthHttp(new AuthConfig(), http, options);
}

// Define the routes
const ROUTES = [
  // {
  //   path: '',
  //   redirectTo: 'orders',
  //   pathMatch: 'full'
  // },
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: '',
    component: TrackingComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'amazon',
    component: AmazonComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'walmart',
    component: WalmartComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'orders',
    component: OrdersComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'accounting',
    component: AccountingComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'numbers',
    component: NumbersComponent,
    canActivate: [AuthGuard]
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
    TotalPipe,
    NumbersComponent,
    PaypalfeePipe,
    EbayfeePipe,
    LoginComponent,
    NavigationComponent
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
    AuthGuard,
    OrdersService,
    AmazonService,
    WalmartService,
    AccountingService,
    NumbersService,
    ToasterService,
    TrackingService,
    LoginComponent,
    AuthService,
    {
      provide: AuthHttp,
      useFactory: authHttpServiceFactory,
      deps: [Http, RequestOptions]
    }],
  bootstrap: [AppComponent]
})

export class AppModule {
}
