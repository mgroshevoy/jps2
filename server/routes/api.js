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

let updateEveryTwoHours = schedule.scheduleJob('00 */2 * * *', function () {
  console.info('Updating Amazon orders at: ' + moment().format('lll'));
  Orders.getAmazonOrders()
    .then(() => {
      console.info('Updated Amazon orders at: ' + moment().format('lll'));
    })
    .catch(() => {
      console.info('Amazon orders update is failed!');
    });
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
