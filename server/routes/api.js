require('dotenv').config();
const fs = require('fs');
const parse = require('csv-parse');
const express = require('express');
const router = express.Router();
const moment = require('moment');
const EbayModel = require('../libs/mongoose').EbayModel;
const AmazonModel = require('../libs/mongoose').AmazonModel;
const WalmartModel = require('../libs/mongoose').WalmartModel;
const PurchaseModel = require('../libs/mongoose').PurchaseModel;
const Orders = require('../libs/ebaygetter');
const schedule = require('node-schedule');

let updateEveryHour = schedule.scheduleJob('45 * * * *', function () {
  console.info('Updating ebay orders at: ' + moment().format('lll'));
  Orders.getOrdersFromEbay().then(() => {
    console.info('Updated ebay orders at: ' + moment().format('lll'));
  });
});

/* GET api listing. */
router.get('/', (req, res, next) => {
  res.send('api works');
});

router.get('/tracking', (req, res, next) => {
  Orders.getOrders(res);
});

router.get('/orders/:dateFrom/:dateTo', (req, res, next) => {
  console.log(req.params);
  let dateFrom, dateTo;
  if (moment(req.params.dateFrom).isValid()) dateFrom = req.params.dateFrom;
  else dateFrom = moment().subtract(30, 'days').format('YYYY-MM-DD');
  if (moment(req.params.dateTo).isValid()) dateTo = req.params.dateTo;
  else dateTo = moment().format('YYYY-MM-DD');
  EbayModel
    .where('created_time').gte(dateFrom).lte(dateTo)
    .find((err, orders) => {
      if (err) res.status(500).send(error);
      res.status(200).json(orders);
    })
    .sort('-created_time');
});

router.get('/orders/update', (req, res, next) => {
  console.info('Updating...');
  Orders.getOrdersFromEbay(res).then(() => {
    console.info('Updated');
  });
});

router.get('/orders', (req, res, next) => {
  let dateFrom, dateTo;
  dateFrom = moment().subtract(30, 'days').startOf('day').add(7, 'hours');
  dateTo = moment().startOf('day').add(7, 'hours');
  EbayModel
    .where('created_time').gte(dateFrom).lte(dateTo)
    .find((err, orders) => {
      if (err) res.status(500).send(error);
      res.status(200).json(orders);
    })
    .sort('-created_time');
});

router.post('/amazon', (req, res, next) => {
  console.log(req.files[0].destination + req.files[0].filename);
  let parser = parse({
    delimiter: ',',
    columns: true
  }, (err, data) => {
    let promises = [];
    if (err) {
      console.error(err);
      return;
    }
    for (let order of data) {
      if (order['Order ID'] && order['Order Date'] && order['Item Total'] && order['ASIN/ISBN']) {
        promises.push(
          AmazonModel.findOne({id: order['Order ID']}, (err, obj) => {
            if (obj === null) {
              obj = new AmazonModel({
                id: order['Order ID'],
                date: order['Order Date'],
                title: order['Title'],
                category: order['Category'],
                asin_isbn: order['ASIN/ISBN'],
                unspsc: order['UNSPSC Code'],
                condition: order['Condition'],
                seller: order['Seller'],
                list_price_unit: Number(order['List Price Per Unit'].substr(1)),
                purchase_price_unit: Number(order['Purchase Price Per Unit'].substr(1)),
                quantity: Number(order['Quantity']),
                payment_type: order['Payment Instrument Type'],
                customer_email: order['Ordering Customer Email'],
                shipment_date: order['Shipment Date'],
                shipping_name: order['Shipping Address Name'],
                shipping_street1: order['Shipping Address Street 1'],
                shipping_street2: order['Shipping Address Street 2'],
                shipping_city: order['Shipping Address City'],
                shipping_state: order['Shipping Address State'],
                shipping_zip: order['Shipping Address Zip'],
                order_status: order['Order Status'],
                tracking_number: order['Carrier Name & Tracking Number'],
                subtotal: Number(order['Item Subtotal'].substr(1)),
                subtotal_tax: Number(order['Item Subtotal Tax'].substr(1)),
                total: order['Item Total'].substr(1),
                buyer_name: order['Buyer Name'],
                currency: order['Currency']
              });
            } else {
              obj.date = order['Order Date'];
              obj.title = order['Title'];
              obj.category = order['Category'];
              obj.asin_isbn = order['ASIN/ISBN'];
              obj.unspsc = order['UNSPSC Code'];
              obj.condition = order['Condition'];
              obj.seller = order['Seller'];
              obj.list_price_unit = Number(order['List Price Per Unit'].substr(1));
              obj.purchase_price_unit = Number(order['Purchase Price Per Unit'].substr(1));
              obj.quantity = Number(order['Quantity']);
              obj.payment_type = order['Payment Instrument Type'];
              obj.customer_email = order['Ordering Customer Email'];
              obj.shipment_date = order['Shipment Date'];
              obj.shipping_name = order['Shipping Address Name'];
              obj.shipping_street1 = order['Shipping Address Street 1'];
              obj.shipping_street2 = order['Shipping Address Street 2'];
              obj.shipping_city = order['Shipping Address City'];
              obj.shipping_state = order['Shipping Address State'];
              obj.shipping_zip = order['Shipping Address Zip'];
              obj.order_status = order['Order Status'];
              obj.tracking_number = order['Carrier Name & Tracking Number'];
              obj.subtotal = Number(order['Item Subtotal'].substr(1));
              obj.subtotal_tax = Number(order['Item Subtotal Tax'].substr(1));
              obj.total = order['Item Total'].substr(1);
              obj.buyer_name = order['Buyer Name'];
              obj.currency = order['Currency'];
            }
            obj.save(function (err) {
              if (!err) {
                console.info("Order saved!");
              } else {
                console.error('Internal error: %s', err.message);
              }
            });
          })
        );
      }
    }
    Promise.all(promises).then(() => {
      AmazonModel
        .find((err, orders) => {
          if (err) res.status(500).send(error);
          res.status(200).json(orders);
        })
        .sort('-date');
    });
    fs.unlinkSync(req.files[0].destination + req.files[0].filename);
  });
  fs.createReadStream(req.files[0].destination + req.files[0].filename).pipe(parser);
});

router.get('/amazon', (req, res, next) => {
  AmazonModel
    .find((err, orders) => {
      if (err) res.status(500).send(error);
      res.status(200).json(orders);
    })
    .sort('-date');
});

router.get('/walmart', (req, res, next) => {
  WalmartModel
    .find((err, orders) => {
      if (err) res.status(500).send(error);
      res.status(200).json(orders);
    })
    .sort('-date');
});

router.post('/walmart', (req, res, next) => {
  console.log(req.files[0].destination + req.files[0].filename);
  let parser = parse({
    delimiter: ',',
    columns: true
  }, (err, data) => {
    let promises = [];
    if (err) {
      console.error(err);
      return;
    }
    console.log(data);
    for (let order of data) {
      if (order['Order #'] && order['Date'] && order['Name+Address']) {
        promises.push(
          WalmartModel.findOne({id: order['Order #']}, (err, obj) => {
            if (obj === null) {
              obj = new WalmartModel({
                id: order['Order #'],
                date: order['Date'],
                address: order['Name+Address'],
                total: order['Order total'] ? Number(order['Order total'].substr(1)) : 0,
                tracking_number: order['Tracking Number']
              });
            } else {
              //obj.id = order['Order #'];
              obj.date = order['Date'];
              obj.address = order['Name+Address'];
              obj.total = order['Order total'] ? Number(order['Order total'].substr(1)) : 0;
              obj.tracking_number = order['Tracking Number'];
            }
            obj.save(function (err) {
              if (!err) {
                console.info("Order saved!");
              } else {
                console.error('Internal error: %s', err.message);
              }
            });
          })
        );
      }
    }
    Promise.all(promises).then(() => {
      WalmartModel
        .find((err, orders) => {
          if (err) res.status(500).send(error);
          res.status(200).json(orders);
        })
        .sort('-date');
    });
    fs.unlinkSync(req.files[0].destination + req.files[0].filename);
  });
  fs.createReadStream(req.files[0].destination + req.files[0].filename).pipe(parser);
});

router.get('/accounting/:dateFrom/:dateTo', (req, res, next) => {
  console.log(req.params);
  let dateFrom, dateTo;
  if (moment(req.params.dateFrom).isValid()) dateFrom = req.params.dateFrom;
  else dateFrom = moment().subtract(30, 'days').format('YYYY-MM-DD');
  if (moment(req.params.dateTo).isValid()) dateTo = req.params.dateTo;
  else dateTo = moment().format('YYYY-MM-DD');
  Orders.getOrders(res, dateFrom, dateTo);
});

router.get('/accounting', (req, res, next) => {
  Orders.getOrders(res);
});

router.post('/accounting', (req, res, next) => {
  let order = req.body;
  if (!order.id) {
    res.status(400);
    res.json({
      "error": "Invalid Data",
      "req": req.body
    });
  } else {
    PurchaseModel
      .findOne()
      .where('id', order.id)
      .then(result => {
        if (order.amazonprice || order.walmartprice) {
          if (result === null) {
            result = new PurchaseModel({
              id: order.id,
              amazonprice: order.amazonprice,
              walmartprice: order.walmartprice
            });
          } else {
            result.amazonprice = order.amazonprice;
            result.walmartprice = order.walmartprice;
          }
          result.save(function (err, result) {
            if (!err) {
              console.info('Purchase saved!');
              res.send(result)
            } else {
              console.error('Internal error: %s', err.message);
              res.send(err);
            }
          });
        } else {
          console.log(order);
          if (result) {
            result.remove((err) => {
              if (err) {
                console.error('Internal error: %s', err.message);
              } else {
                console.info('Purchase deleted!');
              }
            });
          }
          AmazonModel
            .findOne()
            .where('id', order.amazonid)
            .then((result) => {
              if (result) {
                res.send({
                  amazontotal: result.total
                });
              } else {
                WalmartModel
                  .findOne()
                  .where('id', order.walmartid)
                  .then((result) => {
                    if (result) {
                      res.send({
                        walmarttotal: result.total
                      });
                    }
                  });
              }
            })
        }
      });
  }
});

module.exports = router;
