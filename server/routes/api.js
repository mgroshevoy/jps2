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
const UPS = require('../libs/UPS');
const schedule = require('node-schedule');
const _ = require('lodash');
const jwt = require('jwt-simple');
const ContextIO = require('contextio');
const cheerio = require('cheerio');

const ctxioClient = ContextIO({
  key: "0ukneikt",
  secret: "aXMDncj1tiT76bJ6",
  version: 'lite'
});

function updateDeliveryStatus() {
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
            return $(this).text().match(/[A-Z,0-9]{12}[0-9]+/);
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
            deliveryDate[0] = moment(new Date(deliveryDate[0] + ', ' + (moment().year() + 1))).add(1, 'd').startOf('day');
          } else {
            deliveryDate[0] = moment(new Date(deliveryDate[0] + ', ' + moment().year())).add(1, 'd').startOf('day');
          }
          WalmartModel.findOne({id: orderId[0]}, (err, item) => {
            if (item) {
              item.delivery_date = deliveryDate[0];
              if(trackingCarrier[1]){
                item.tracking_number = trackingCarrier[1] + ' #' +trackingNumber[0];
              }
              item.save();
            } else {
              item = new WalmartModel({

              });
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
  updateDeliveryStatus();
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
    let threeDaysOrders = yield Orders.getOrders(moment().subtract(3, 'days').startOf('day').add(7, 'hours'));
    let wmrt, amzn;

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
    res.send(threeDaysOrders);
    // for (order of threeDaysOrders) {
    //   for (item of order.items) {
    //     if (item.ShipmentTrackingDetails.length === 0 && order.order_status === 'Completed') {
    //       checkedOrders.push(yield Orders.ebayGetOrderTransactions([{OrderID: order.id}]));
    //     }
    //   }
    // }
    //res.send(checkedOrders);
    //for (order of checkedOrders) {
    //   trackingNumber = yield TrackingNumbersModel
    //     .where({delivery: {$gt: moment().add(2, 'd')}}, {used: false})
    //     .findOne((error, obj) => {
    //       console.log(obj);
    //     })
    //     .sort('-delivery');
    //  yield Orders.ebayCompleteSale(order.id, trackingNumber.tracking_number);
    //}

  })((error, result) => {
    if (error) console.error(error);
  });
}

function updateTrackingNumbers() {
  const MAX_ERRORS = 100;
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
