import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'ebayfee'
})
export class EbayfeePipe implements PipeTransform {

  transform(value: any, args?: any): any {
    let ebayFee = 0;
    if (value.order_status === 'Cancelled' || (value.order_status === 'Active' && value.status === 'Incomplete')) {
      ebayFee = 0;
    } else {
      for (const val of value.items) {
        ebayFee += Number(val.FinalValueFee);
      }
    }
    return ebayFee.toFixed(2);
  }

}
