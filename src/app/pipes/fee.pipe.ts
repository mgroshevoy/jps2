import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'fee'
})
export class FeePipe implements PipeTransform {

  transform(value: any, args?: any): any {
    let sumFee = 0;
    if(value.order_status == 'Cancelled' || (value.order_status === 'Active' && value.status === 'Incomplete')) {
      sumFee = 0.3;
    } else {
        for(let val of value.items) {
          sumFee += Number(val.FinalValueFee);
        }
        sumFee += value.total*0.044;
    }
    return sumFee.toFixed(2);
  }
}
