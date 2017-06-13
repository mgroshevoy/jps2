'use strict';

const Request = require('request');
const Async = require('async');
const Convert = require('convert-units');
const moment = require('moment');

class UPS {
  static calcCheckDigit(trk) {
    trk = trk.substr(2, 15);

    let chars = trk.split('');
    let index = 1;
    let total = 0;

    chars.forEach(ch => {
      let num = parseInt(ch + '');
      let ascii = ch.charCodeAt(0);

      if ((index % 2) === 0) {
        if (!isNaN(num)) total += 2 * num;
        else total += ((ascii - 63) % 10) * 2;
      }
      else {
        if (!isNaN(num)) total += num;
        else total += (ascii - 63) % 10;
      }

      index++;
    });

    let y = (total % 10);

    if (y === 0) return y;
    else if (y > 0) return 10 - y;

    return 0;
  }

  static generate(accountNumber, serviceType, invoiceNumber, packageNumber) {
    // The first two characters must be "1Z".
    let number = '1Z';

    // The next 6 characters we fill with our UPS account number "XXXXXX".
    if (accountNumber.length !== 6) throw new Error('Invalid account number. Must be 6 characters.');
    number += accountNumber;

    // The next 2 characters denote the service type:
    if (!ServiceTypes[serviceType]) throw new Error('Unknown service type.');
    number += serviceType;

    // The next 5 characters is our invoice number (our invoices are 6 digits; we drop the first digit, e.g., the 123456 invoice would yield 23456 characters).
    invoiceNumber = parseInt((invoiceNumber + '').replace(/^[0]+/, ''));
    if (isNaN(invoiceNumber) || invoiceNumber > 99999 || invoiceNumber < 0)
      throw new Error('Invalid invoice number. Must be a number between 0 and 99999.');
    number += ('000000' + invoiceNumber).substr(-5);

    // The next 2 digits is the package number, zero filled. E.g., package 1 is "01", 2 is "02".
    packageNumber = parseInt(packageNumber);
    if (isNaN(packageNumber) || packageNumber > 99 || packageNumber < 0)
      throw new Error('Invalid package number. Must be a number between 0 and 99.');
    number += ('0' + packageNumber).substr(-2);

    // The last and final character is the check digit.
    number += UPS.calcCheckDigit(number);

    return number;
  }

  static check(number, callback) {
    Request.post('https://wwwapps.ups.com/WebTracking/track', {
      form: {
        'loc': 'en_US',
        'HTMLVersion': '5.0',
        'USER_HISTORY_LIST': '',
        'track.x': 'Track',
        'InquiryNumber1': number
      }
    }, (error, response, body) => {
      if (body && !body.match(/<h2>\s*Tracking\s*Detail\s*<\/h2>/)) {
        return callback(new Error(number + ' not found.'));
      }
      if (body && body.match(/id="tt_spStatus"\s*>[\s\n\r]*Delivered[\s\n\r]*<\/a>/)) return callback(new Error('Delivered.'));


      // Date
      let m;
      if (body) {
        m = body.match(/<dl>[\s\n\r]*<dt>[\s\n\r]*<label>[\s\n\r]*Scheduled(?: For Early)* Delivery(?: On)*:[\s\n\r]*<\/label>[\s\n\r]*<\/dt>[\s\n\r]*<dd>([\s\S]*?)<\/dd>[\s\n\r]*<\/dl>/);
      }
      if (!m) return callback(new Error('No scheduled delivery.'));

      m = m[1].replace(/&nbsp;/g, '').match(/([\d]{2}\/[\d]{2}\/[\d]{4})/);
      if (!m) return callback(new Error('No delivery date.'));

      let dateDelivery = m[1];


      // Location

      m = body.split(/<fieldset>[\s\n\r]*<div class=".*?">[\s\n\r]*<h4>Shipping Information<\/h4>/);
      if (m.length < 2) return callback(new Error('No shipping information.'));

      m = m[1].split('</fieldset>')[0];

      m = m.match(/<dd>[\s\n\r]*<label>[\s\n\r]*To:[\s\n\r]*<\/label>[\s\n\r]*<br>[\s\n\r]*<strong>([^<]*?)<\/strong>/);
      if (!m) return callback(new Error('No delivery location.'));

      let location = m[1].trim().replace(/[\s\n\r]+/g, ' ').match(/^([A-Z\-,'\s]+),\s*([A-Z]+),\s*([A-Z]+)$/);
      if (!location) return callback(new Error('Cannot parse delivery location.'));

      let city = location[1];
      let state = location[2];
      let country = location[3];


      // Info

      m = body.split(/<fieldset>[\s\n\r]*<div\s+id=".*?"\s+class=".*?">[\s\n\r]*<h4\s+class=".*?">\s*Additional Information\s*<\/h4>/);
      if (m.length < 2) return callback(new Error('No additional information.'));

      m = m[1].split('</fieldset>')[0];
      m = m.replace(/&#047;/g, '/');

      let m1 = m.match(/<dt>[\s\n\r]*<label\s+for=".*?">[\s\n\r]*Shipment Category:[\s\n\r]*<\/label>[\s\n\r]*<\/dt>[\s\n\r]*<dd>[\s\n\r]*([^<]+?)[\s\n\r]*<\/dd>/);
      if (!m1) return callback(new Error('No additional information: shipping category.'));

      let category = m1[1];

      m1 = m.match(/<dt>[\s\n\r]*<label\s+for=".*?">[\s\n\r]*Shipped[\s\n\r]*\/[\s\n\r]*Billed[\s\n\r]*On:[\s\n\r]*<\/label>[\s\n\r]*<\/dt>[\s\n\r]*<dd>[\s\n\r]*([^<]+?)[\s\n\r]*<\/dd>/);
      if (!m1) return callback(new Error('No additional information: billed on'));

      let dateBilled = m1[1];

      m1 = m.match(/<dt>[\s\n\r]*<label\s+for=".*?">[\s\n\r]*Weight:[\s\n\r]*<\/label>[\s\n\r]*<\/dt>[\s\n\r]*<dd>[\s\n\r]*([^<]+?)[\s\n\r]*<\/dd>/);
      if (!m1) return callback(new Error('No additional information: weight'));

      m1 = m1[1].split(' ');
      let weight = 0;

      try {
        weight = Math.round(Convert(parseFloat(m1[0].trim())).from(m1[1].trim().replace('lbs', 'lb').replace('ozs', 'oz')).to('g'));
      } catch (e) {
        return callback(new Error('Wrong additional information: weight cannot be parsed'));
      }

      //

      callback(null, {dateBilled, dateDelivery, city, state, country, category, weight});
    });
  }

  static getInvoiceNumber(accountNumber, serviceType, invoiceNumber, callback) {
    let c = 0;
    let n = 0;
    let stop = false;
    let results = [];

    Async.whilst(
      () => (!stop && n < 20),

      callback => {
        let tasks = [];

        for (let i = 0; i < 10 && n < 99; i++) {
          n++;

          let number = UPS.generate(accountNumber, serviceType, invoiceNumber, n);

          tasks.push(callback => {
            UPS.check(number, (error, data) => {
              if (!error) {
                data.number = number;
                results.push(data);
                c++;
              } else if (error.message === 'Not found.') {
                stop = true;
              }

              if (error && error.message !== 'Delivered.') {
                //console.log(number);
                console.log(error.message);
              }

              callback();
            });
          })
        }

        Async.parallelLimit(tasks, 5, callback);
      },

      error => {
        callback(null, results);
      }
    );
  }

  static getInvoiceNumbers(accountNumber, serviceType, start, count, callback) {
    let n = parseInt((start + '').replace(/^[0]+/, ''));
    let list = [];
    let tasks = [];

    for (let i = 0; i < count; i++) {
      tasks.push(callback => {
        UPS.getInvoiceNumber(accountNumber, serviceType, n, (error, result) => {
          list = list.concat(result);
          callback();
        });
      });

      n++;
    }

    Async.parallelLimit(tasks, 5, error => {
      callback(error, list);
    });
  }

  static getInvoiceNumberForDate(accountNumber, serviceType, start, date, count, countErrors, callback) {
    let n = parseInt((start + '').replace(/^[0]+/, '')) + 1;
    let i = 0, numberOfErrors = 0;
    let isRequest = true;
    let list = [];
    let tasks = [];

    Async.whilst(
      () => {
        return isRequest//i < count
      },

      callback => {
        UPS.getInvoiceNumber(accountNumber, serviceType, n, (error, result) => {
//                    console.log(result);
          if (!result.length) numberOfErrors++;
          if (numberOfErrors > countErrors) isRequest = false;
          console.log('Errors: ' + numberOfErrors);
          for (let a = 0; a < result.length; a++) {
            let item = result[a];
            let dateDelivery = item.dateDelivery;
            let dateBilled = item.dateBilled;
            result[a].dateDelivery = new Date(item.dateDelivery);
            result[a].dateBilled = new Date(item.dateBilled);

            console.log('Number: ' + item.number + ' / Delivery: ' + dateDelivery + ' / Bill: ' + dateBilled);
            i++;

            // if(moment(new Date(dateDelivery)) > moment(new Date(date))) {
            list.push(item);
            // }
            if (moment(new Date(dateBilled)).isSame(moment(), 'day') && i >= count) {
              console.log('Time to stop');
              isRequest = false;
            }
          }

          n += Math.floor(1 + Math.random() * 5);
          callback();
        });
      },

      error => {
        if (error) throw error;

        callback(error, list);
      }
    );
  }
}

const ServiceTypes = {
  // Domestic
  '14': 'UPS Next Day Air Early',
  '01': 'UPS Next Day Air',
  '13': 'UPS Next Day Air Saver',
  '59': 'UPS 2nd Day Air A.M.',
  '02': 'UPS 2nd Day Air',
  '12': 'UPS 3 Day Select',
  '03': 'UPS Ground',
  'YW': 'UPS SurePost',
  'YN': 'UPS',
  '15': 'UPS United States Next Day Air Early A.M.',
  '22': 'UPS United States Ground - Returns Plus - Three Pickup Attempts',
  '32': 'UPS United States Next Day Air Early A.M. - COD',
  '33': 'UPS United States Next Day Air Early A.M. - Saturday Delivery, COD',
  '41': 'UPS United States Next Day Air Early A.M. - Saturday Delivery',
  '42': 'UPS United States Ground - Signature Required',
  '44': 'UPS United States Next Day Air - Saturday Delivery',

  // International
  '11': 'UPS Standard',
  '07': 'UPS Worldwide Express',
  '54': 'UPS Worldwide Express Plus',
  '08': 'UPS Worldwide Expedited',
  '65': 'UPS Worldwide Saver',
  '66': 'UPS United States Worldwide Express',
  '96': 'UPS Worldwide Express Freight',
  '72': 'UPS United States Ground - Collect on Delivery',
  '78': 'UPS United States Ground - Returns Plus - One Pickup Attempt',
  '82': 'UPS Today Standard',
  '83': 'UPS Today Dedicated Courier',
  '84': 'UPS Today Intercity',
  '85': 'UPS Today Express',
  '86': 'UPS Today Express Saver',
  '70': 'UPS Access Point Economy',
  '90': 'UPS United States Ground - Returns - UPS Prints and Mails Label',
  'A0': 'UPS United States Next Day Air Early A.M. - Adult Signature Required',
  'A1': 'UPS United States Next Day Air Early A.M. - Saturday Delivery, Adult Signature Required',
  'A2': 'UPS United States Next Day Air - Adult Signature Required',
  'A8': 'UPS United States Ground - Adult Signature Required',
  'A9': 'UPS United States Next Day Air Early A.M. - Adult Signature Required, COD',
  'AA': 'UPS United States Next Day Air Early A.M. - Saturday Delivery, Adult Signature Required, COD'
};


module.exports = UPS;
