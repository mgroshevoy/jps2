import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'paypalfee'
})
export class PaypalfeePipe implements PipeTransform {

  transform(value: any, args?: any): any {
    let paypalFee: number;
    if (value.order_status === 'Cancelled' || (value.order_status === 'Active' && value.status === 'Incomplete')) {
      paypalFee = 0.3;
    } else {
      paypalFee = value.total * 0.044;
    }
    return paypalFee.toFixed(2);
  }

}
