require('dotenv').config();
const vo = require('vo');
const fs = require('fs');
const parse = require('csv-parse');
const express = require('express');
const router = express.Router();
const moment = require('moment');
const passport = require('passport');
const User = require('../models/user');
const EbayModel = require('../libs/mongoose').EbayModel;
const AmazonModel = require('../libs/mongoose').AmazonModel;
const WalmartModel = require('../libs/mongoose').WalmartModel;
const PurchaseModel = require('../libs/mongoose').PurchaseModel;
const TrackingAccountsModel = require('../libs/mongoose').TrackingAccountsModel;
const TrackingNumbersModel = require('../libs/mongoose').TrackingNumbersModel;
const Orders = require('../libs/ebaygetter');
const EmailGet = require('../libs/emailgetter');
const UPS = require('../libs/UPS');
const schedule = require('node-schedule');
const _ = require('lodash');
const jwt = require('jwt-simple');

// vo(function*() {
//   let ex = yield Orders.ebayCompleteSale('122551186520-1811543509002', '1Z3YE9030313978127');
//   console.log(ex);
// })((error, result) => {
//   if (error) console.error(error);
// });

// Orders.ebayCompleteSale().then(res => {
//   console.log(res);
// }).catch(error => {
//   console.error(error);
// });

EmailGet.updateDeliveryStatus();
//setTrackingNumbers();

if (!process.env.DEV_MODE) {
  let startAtNine = schedule.scheduleJob('00 9 * * *', function () {
    console.info(new Date(), 'Setting Tracking Numbers at: ' + moment().format('lll'));
    setTrackingNumbers();
  });
}

let updateEverySixHours = schedule.scheduleJob('00 */6 * * *', function () {
  console.info(new Date(), 'Updating Tracking Numbers at: ' + moment().format('lll'));
  updateTrackingNumbers();
});

let updateEveryTwoHours = schedule.scheduleJob('00 */2 * * *', function () {
  console.info(new Date(), 'Updating Amazon orders at: ' + moment().format('lll'));
  Orders.getAmazonOrders()
    .then(() => {
      console.info(new Date(), 'Updated Amazon orders at: ' + moment().format('lll'));
    })
    .catch(() => {
      console.info(new Date(), 'Amazon orders update is failed!');
    });
  updateTrackingNumbers();
  EmailGet.updateDeliveryStatus();
});

let updateEveryHour = schedule.scheduleJob('00 * * * *', function () {
  console.info(new Date(), 'Updating eBay orders at: ' + moment().format('lll'));
  Orders.getOrdersFromEbay()
    .then(() => {
      console.info(new Date(), 'Updated eBay orders at: ' + moment().format('lll'));
    })
    .catch((err) => {
      console.info(new Date(), 'Ebay orders update is failed!');
      console.error(err);
    });
});

function setTrackingNumbers(res) {
  vo(function*() {
    let threeDaysOrders = yield Orders.getOrders(
      moment().subtract(3, 'days').startOf('day').add(7, 'hours'),
      moment().subtract(1, 'days').startOf('day').add(7, 'hours')
    );
    let wmrt, amzn, checkedOrders = [], trackingNumber, accounting;

    for (order of threeDaysOrders) {
      for (item of order.items) {
        if (item.ShipmentTrackingDetails.length === 0 && order.order_status === 'Completed') {
          if (order._doc.walmart.tracking_number) {
            console.log(order._doc.walmart.tracking_number.match(/(.*)\s#/)[1]);
            console.log(order._doc.walmart.tracking_number.match(/#(.*)/)[1]);
            wmrt = yield Orders.ebayCompleteSale(
              order.id,
              order._doc.walmart.tracking_number.match(/#(.*)/)[1],
              order._doc.walmart.tracking_number.match(/(.*)\s#/)[1]
            );
            console.log(wmrt);
          } else if (order._doc.amazon.tracking_number && !(order._doc.amazon.tracking_number.indexOf('AMZN_US') + 1)) {
            console.log(order._doc.amazon.tracking_number.match(/(.*)\(/)[1]);
            console.log(order._doc.amazon.tracking_number.match(/\((.*)\)/)[1]);
            amzn = yield Orders.ebayCompleteSale(
              order.id,
              order._doc.amazon.tracking_number.match(/\((.*)\)/)[1],
              order._doc.amazon.tracking_number.match(/(.*)\(/)[1]
            );
            console.log(amzn);
          } else {

          }
        }
      }
    }
    for (order of threeDaysOrders) {
      for (item of order.items) {
        if (item.ShipmentTrackingDetails.length === 0 && order.order_status === 'Completed') {
          checkedOrders.push(yield Orders.ebayGetOrderTransactions([{OrderID: order.id}]));
        }
      }
    }
    accounting = yield Orders.getOrders();
    let deliveryDate, resultComplete;
    for (order of checkedOrders) {
      console.log(order.Orders.OrderID);
      let findedOrder = _.find(accounting, {id: order.Orders.OrderID});
      if (findedOrder._doc.amazon.delivery_date) {
        deliveryDate = findedOrder._doc.amazon.delivery_date;
      } else {
        deliveryDate = findedOrder._doc.walmart.delivery_date;
      }
      if (deliveryDate) {
        trackingNumber = yield TrackingNumbersModel
          .where({delivery: {$gt: moment(deliveryDate)}}, {used: false})
          .find()
          .sort('-delivery');
        for (let tracking of trackingNumber) {
            resultComplete = yield Orders.ebayCompleteSale(findedOrder.id, tracking.tracking_number);
          if (resultComplete) {
            console.log(resultComplete);
            if (resultComplete.CompleteSaleResponse.Ack === 'Success') {
              TrackingNumbersModel
                .where({tracking_number: tracking.tracking_number}, {used: false})
                .findOne((err, obj) => {
                  if (obj) {
                    obj.used = true;
                    obj.save();
                  }
                });
              break;
            }
          } else break;

          TrackingNumbersModel
            .where({tracking_number: tracking.tracking_number}, {used: false})
            .findOne((err, obj) => {
              if (obj) {
                obj.used = true;
                obj.save();
              }
            });
        }
      }
    }
  })((error, result) => {
    if (error) console.error(error);
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
              account.tracking_account = item.number;
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
  setTrackingNumbers(res);
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
  res.send('Update started!');
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
  let dateFrom, dateTo;
  if (moment(req.params.dateFrom).isValid()) dateFrom = req.params.dateFrom;
  else dateFrom = moment().subtract(30, 'days').format('YYYY-MM-DD');
  if (moment(req.params.dateTo).isValid()) dateTo = req.params.dateTo;
  else dateTo = moment().format('YYYY-MM-DD');
  EbayModel
    .where('created_time').gte(moment(dateFrom).startOf('day')).lte(moment(dateTo).endOf('day'))
    .find((err, orders) => {
      if (err) res.status(500).send(error);
      res.status(200).json(orders);
    })
    .sort('-created_time');
});

router.get('/orders/update', (req, res, next) => {
  console.info(new Date(), 'Updating Ebay Orders...');
  Orders.getOrdersFromEbay(res).then(() => {
    console.info(new Date(), 'Ebay Orders Updated');
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
                console.info(new Date(), "Order saved!");
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
              console.info(new Date(), 'Purchase saved!');
              res.send(result)
            } else {
              console.error('Internal error: %s', err.message);
              res.send(err);
            }
          });
        } else {
          if (result) {
            result.remove((err) => {
              if (err) {
                console.error('Internal error: %s', err.message);
              } else {
                console.info(new Date(), 'Purchase deleted!');
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

// User management
router.post('/register', function (req, res) {
  User.register(new User({username: req.body.username}),
    req.body.password, function (err, account) {
      if (err) {
        return res.status(500).json({
          err: err
        });
      }
      passport.authenticate('local')(req, res, function () {
        return res.status(200).json({
          status: 'Registration successful!'
        });
      });
    });
});

router.post('/login', function (req, res, next) {
  passport.authenticate('local', function (err, user, info) {
    if (err) {
      return next(err);
    }
    if (!user) {
      return res.status(401).json({
        err: info
      });
    }
    req.logIn(user, function (err) {
      if (err) {
        return res.status(500).json({
          err: 'Could not log in user'
        });
      }
      user['iat'] = Math.round(Date.now() / 1000);
      user['exp'] = Math.round(Date.now() / 1000 + 5 * 60 * 60);
      console.log(user);
      const token = jwt.encode({
        user: user.username,
        iat: Math.round(Date.now() / 1000),
        exp: Math.round(Date.now() / 1000 + 5 * 60 * 60)
      }, process.env.JWT_SECRET);
      console.log(token);
      console.log(jwt.decode(token, process.env.JWT_SECRET));
      res.status(200).json({
        success: true,
        message: 'Login successful!',
        token: token
      });
    });
  })(req, res, next);
});

router.get('/logout', function (req, res) {
  req.logout();
  res.status(200).json({
    status: 'Bye!'
  });
});

module.exports = router;
