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
const TrackingAccountsModel = require('../libs/mongoose').TrackingAccountsModel;
const TrackingNumbersModel = require('../libs/mongoose').TrackingNumbersModel;
const Orders = require('../libs/ebaygetter');
const UPS = require('../libs/UPS');
const schedule = require('node-schedule');

if (!process.env.DEV_MODE) {
  let startAtNine = schedule.scheduleJob('00 9 * * *', function () {
    console.info('Setting Tracking Numbers at: ' + moment().format('lll'));
    setTrackingNumbers();
  });
}

let updateEverySixHours = schedule.scheduleJob('00 */6 * * *', function () {
  console.info('Updating Tracking Numbers at: ' + moment().format('lll'));
  updateTrackingNumbers();
});

let updateEveryTwoHours = schedule.scheduleJob('00 */2 * * *', function () {
  console.info('Updating Amazon orders at: ' + moment().format('lll'));
  Orders.getAmazonOrders()
    .then(() => {
      console.info('Updated Amazon orders at: ' + moment().format('lll'));
    })
    .catch(() => {
      console.info('Amazon orders update is failed!');
    });
  updateTrackingNumbers();
});

let updateEveryHour = schedule.scheduleJob('00 * * * *', function () {
  console.info('Updating eBay orders at: ' + moment().format('lll'));
  Orders.getOrdersFromEbay()
    .then(() => {
      console.info('Updated eBay orders at: ' + moment().format('lll'));
    })
    .catch((err) => {
      console.info('Ebay orders update is failed!');
      console.error(err);
    });
});

function setTrackingNumbers() {
  Orders.getOrders(moment().subtract(3, 'days').startOf('day').add(7, 'hours'))
    .then(result => {
      console.log(result.length);
      result.forEach(order => {
        order.items.forEach(item => {
          if (item.ShipmentTrackingDetails.length === 0 && order.order_status === 'Completed') {
            Orders.ebayGetOrderTransactions([{OrderID: order.id}])
              .then(transaction => {
                if (!transaction.Orders.Transactions.ShippingDetails) {
                  TrackingNumbersModel
                    .where({delivery: {$gt: moment().add(2, 'd')}}, {used: false})
                    .findOne((error, obj) => {
                      console.log(moment().toISOString());
                      obj.used = true;
                      obj.save((err, obj) => {
                        Orders.ebayCompleteSale(order.id, obj.tracking_number, moment().toISOString())
                          .then(info => {
                            console.log('Adding tracking number on order ' + order.id);
                            console.log(info);
                          })
                      });
                    })
                    .sort('-delivery');
                }
              });
          }
        });
      });
    });
}

function updateTrackingNumbers() {
  const MAX_ERRORS = 10;
  const MAX_COUNT = 500; // How many invoice numbers to catch.
  //const NUMBER = '1ZA3720W0313828028';
  const DATE = moment().add(2, 'days');

  TrackingAccountsModel.find({}, (error, accounts) => {
    if (accounts) {
      console.log(accounts);
      accounts.forEach((account) => {
        UPS.getInvoiceNumberForDate(
          account.tracking_account.substr(2, 6),
          account.tracking_account.substr(8, 2),
          account.tracking_account.substr(10, 5),
          DATE, MAX_COUNT, MAX_ERRORS,

          (error, list) => {
            console.log('Total numbers found: ' + list.length + '\n');
            list.forEach((item) => {
              if (new Date(item.dateDelivery) > moment().add(2, 'd')) {
                console.log(item.number);
                console.log('Billed on:   ' + item.dateBilled);
                console.log('Delivery on: ' + item.dateDelivery);
                console.log('Country:     ' + item.country);
                console.log('State:       ' + item.state);
                console.log('City:        ' + item.city);
                console.log('Type:        ' + item.category);
                console.log('Weight:      ' + item.weight + ' g.');
                console.log('---\n');
                account.tracking_account = item.number;
                TrackingNumbersModel.findOne({tracking_number: item.number}, (err, obj) => {
                  if (obj) {
                    //obj.tracking_number = item.number;
                    obj.billed = moment(item.dateBilled).add(moment().utcOffset(), 'm');
                    obj.delivery = moment(item.dateDelivery).add(moment().utcOffset(), 'm');
                    obj.country = item.country;
                    obj.state = item.state;
                    obj.city = item.city;
                    obj.category = item.category;
                    obj.weight = item.weight;
                    obj.tracking_account_id = account._id;
                  } else {
                    obj = new TrackingNumbersModel({
                      tracking_number: item.number,
                      billed: moment(item.dateBilled).add(moment().utcOffset(), 'm'),
                      delivery: moment(item.dateDelivery).add(moment().utcOffset(), 'm'),
                      country: item.country,
                      state: item.state,
                      city: item.city,
                      category: item.category,
                      weight: item.weight,
                      tracking_account_id: account._id
                    });
                  }
                  obj.save();
                });
              }
            });
            account.save();
          }
        );
      });
    }
  });
}

/* GET api listing. */
router.get('/', (req, res, next) => {
  res.send('api works');
});

router.get('/auto', (req, res, next) => {
});

router.get('/tracking', (req, res, next) => {
  Orders.getOrders()
    .then(result => {
      res.status(200).json(result);
    });
});

router.get('/tn', (req, res, next) => {
  TrackingNumbersModel
    .where({delivery: {$gt: moment().add(2, 'd')}}, {used: false})
    .find((error, obj) => {
      res.status(200).json(obj);
    })
    .sort('delivery');
});

router.get('/tn/list', (req, res, next) => {
  TrackingAccountsModel.find({}, (error, obj) => {
    res.send(obj);
  });
});

router.get('/tn/update', (req, res, next) => {
  updateTrackingNumbers();
});

router.get('/tn/add/:trackingNumber', (req, res, next) => {
  TrackingAccountsModel.findOne({tracking_account: new RegExp(req.params.trackingNumber)}, (error, obj) => {
    if (obj) {
      res.send(obj);
    } else {
      obj = new TrackingAccountsModel({
        tracking_account: req.params.trackingNumber
      });
      obj.save();
      res.send(obj);
    }
  });
});

router.get('/tn/del/:trackingNumber', (req, res, next) => {
  TrackingAccountsModel.findOne({tracking_account: new RegExp(req.params.trackingNumber)}, (error, obj) => {
    if (obj) {
      res.send(obj);
      obj.remove();
    } else {
      res.send(req.params);
    }
  });
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
  Orders.loadCSV(req.files[0].filename)
    .then((orders) => {
      return Orders.saveAmazonOrders(orders);
    })
    .then(() => {
      AmazonModel
        .find((err, orders) => {
          if (err) res.status(500).send(error);
          res.status(200).json(orders);
        })
        .sort('-date');
    });
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
  Orders.getOrders(dateFrom, dateTo)
    .then(result => {
      res.status(200).json(result);
    });
});

router.get('/accounting', (req, res, next) => {
  Orders.getOrders()
    .then(result => {
      res.status(200).json(result);
    });
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
