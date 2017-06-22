const ContextIO = require('contextio');
const cheerio = require('cheerio');
const _ = require('lodash');
const AmazonModel = require('../libs/mongoose').AmazonModel;
const WalmartModel = require('../libs/mongoose').WalmartModel;
const moment = require('moment');

const ctxioClient = ContextIO({
  key: "0ukneikt",
  secret: "aXMDncj1tiT76bJ6",
  version: 'lite'
});

class EmailGet {

  constructor() {

  };

  updateDeliveryStatus() {
    ctxioClient
      .users('594818c867ad614869062a83')
      .email_accounts('0')
      .folders('Inbox')
      .messages()
      .get({
        limit: '100',
        include_body: '1'
      }).then(res => {
      let amazonLetters = _.filter(res, function (letter) {
        return letter.addresses.from[0].email.match(/(auto-confirm|tracking)@amazon\.com/);
      });
      let walmartLetters = _.filter(res, function (letter) {
        return letter.addresses.from[0].email.match(/help@walmart\.com/);
      });
      console.log(walmartLetters.length);
      for (let letter of walmartLetters) {
        //console.log(letter.bodies);
        const $ = cheerio.load(letter.bodies[0].content);
        let orderId = $('td').map(function () {
          return $(this).text().match(/\d{7}-\d{6}/);
        }).get();
        console.log(orderId);
        if (orderId.length) {
          let address = $('tbody').map(function () {
            return $(this).text()
              .replace(/(\t)/g, '')
              .replace(/(?=(\n))\1{2,}/g, '"')
              .replace(/"\s+"/g, '"')
              .match(/Shipping\sto:"(.+?".+?".+?)(?=("))/g);
          }).get();
          if (address[0]) {
            address[0] = address[0].split(/"/);
            let trackingCarrier = $('td').map(function () {
              return $(this).text().match(/(\w+)\stracking\snumber:/);
            }).get();
            console.log(trackingCarrier[1]);
            let trackingNumber = $('td').map(function () {
              return $(this).text().match(/[A-Z,0-9]{10}[0-9]+/);
            }).get();
            console.log(trackingNumber[0]);
            let deliveryDate = $('td').map(function () {
              return $(this).text().match(/\w{3},\s\w{3}\s\d+/);
            }).get();
            console.log(deliveryDate[0]);
            let price = $('td').map(function () {
              return $(this).text().match(/\$\d+\.\d+/);
            }).get();
            console.log(_.last(price));
            console.log(letter.subject);
            if (deliveryDate[0].match(/January/) && moment().month() === 11) {
              deliveryDate[0] = moment(new Date(deliveryDate[0] + ', ' + (moment().year() + 1)));
            } else {
              deliveryDate[0] = moment(new Date(deliveryDate[0] + ', ' + moment().year()));
            }
            WalmartModel.findOne({id: orderId[0]}, (err, item) => {
              if (item) {
                item.delivery_date = deliveryDate[0];
                if (trackingCarrier[1]) {
                  item.tracking_number = trackingCarrier[1] + ' #' + trackingNumber[0];
                }
                item.save();
              }
            });
          }
        }
      }
      console.log(amazonLetters.length);
      for (let letter of amazonLetters) {
        const $ = cheerio.load(letter.bodies[1].content);
        let orderId = $('a').map(function () {
          return $(this).text().match(/\d+-\d+-\d+/);
        }).get();
        if (orderId.length) {
          let deliveryDate = $('p').map(function () {
            return $(this).text().match(/\w+,\s\w+\s\d{1,2}\s/);
          }).get();
          console.log(deliveryDate);
          console.log(orderId);
          for (let i = 0; i < orderId.length; i++) {
            if (deliveryDate[i]) {
              if (deliveryDate[i].match(/January/) && moment().month() === 11) {
                deliveryDate[i] = moment(new Date(deliveryDate[i] + ', ' + (moment().year() + 1))).add(1, 'd').startOf('day');
              } else {
                deliveryDate[i] = moment(new Date(deliveryDate[i] + ', ' + moment().year())).add(1, 'd').startOf('day');
              }
              AmazonModel.findOne({id: orderId[i]}, (err, item) => {
                if (item) {
                  item.delivery_date = deliveryDate[i];
                  item.save();
                }
              });
            }
          }
        }
      }
    }).catch(err => {
      console.error(err);
    });
  }
}

module.exports = new EmailGet;

