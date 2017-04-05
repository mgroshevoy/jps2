require('dotenv').config();
const fs = require('fs');
const parse = require('csv-parse');
const express = require('express');
const router = express.Router();
const _ = require('lodash');
const moment = require('moment');
const ebay = require('ebay-api');
const EbayModel = require('../libs/mongoose').EbayModel;
const AmazonModel = require('../libs/mongoose').AmazonModel;
const WalmartModel = require('../libs/mongoose').WalmartModel;
const PurchaseModel = require('../libs/mongoose').PurchaseModel;


/* GET api listing. */
router.get('/', (req, res, next) => {
  res.send('api works');
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
  getOrdersFromEbay().then(orders => {
    let promises = [];
    console.info('Saving...');
    for (let order of orders) promises.push(saveOrder(order));
    return Promise.all(promises);
  }).then(() => {
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
    for (let order of data) {
      if (order['Order #'] && order['Date'] && order['Name+Address']) {
        promises.push(
          WalmartModel.findOne({id: order['Order #']}, (err, obj) => {
            if (obj === null) {
              obj = new WalmartModel({
                id: order['Order #'],
                date: order['Date'],
                address: order['Name+Address'],
                total: order['Order total'] ? Number(order['Order total'].substr(1)) : 0
              });
            } else {
              obj.id = order['Order #'];
              obj.date = order['Date'];
              obj.address = order['Name+Address'];
              obj.total = order['Order total'] ? Number(order['Order total'].substr(1)) : 0;
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


function getOrders(res, dateFrom = moment().subtract(30, 'days').startOf('day').add(7, 'hours'), dateTo = moment().startOf('day').add(7, 'hours')) {
  EbayModel
    .where('created_time').gte(dateFrom).lte(dateTo)
    .sort('-created_time')
    .find()
    .then(result => {
      let i, promises = [];
      for (i = 0; i < result.length; i++) {
        promises.push(AmazonModel
          .findOne({
            shipping_name: {
              '$regex': result[i].address.name,
              '$options': 'i'
            },
            date: {
              $gte: moment(result[i].created_time).startOf('day').toISOString(),
              $lt: moment(result[i].created_time).startOf('day').add(6, 'days').toISOString()
            },
            shipping_zip: {
              '$regex': result[i].address.postal_code.substr(0, 5),
              '$options': 'i'
            }
          }));
      }
      Promise.all(promises).then(amazonOrders => {
        for (i = 0; i < result.length; i++) {
          result[i]._doc.amazon = amazonOrders[i] || {total: 0};
          if (!result[i]._doc.amazon) {
            result[i]._doc.amazon.total = 0;
          }
        }
        promises = [];
        for (i = 0; i < result.length; i++) {
          promises.push(WalmartModel
            .findOne({
              address: {
                '$regex': result[i].address.name, // + '.*' + result[i].address.postal_code.substr(0, 5),
                '$options': 'i'
              },
              date: {
                $gte: moment(result[i].created_time).startOf('day').toISOString(),
                $lt: moment(result[i].created_time).startOf('day').add(6, 'days').toISOString()
              }
            }));
        }
        Promise.all(promises).then(walmartOrders => {
          for (i = 0; i < result.length; i++) {
            result[i]._doc.walmart = walmartOrders[i] || {total: 0};
          }
          promises = [];
          for (i = 0; i < result.length; i++) {
            promises.push(PurchaseModel.findOne({id: result[i].id}));
          }
          Promise.all(promises).then(purchaseOrders => {
            for (i = 0; i < result.length; i++) {
              if (purchaseOrders[i]) {
                result[i]._doc.amazon.total = purchaseOrders[i].amazonprice;
                result[i]._doc.walmart.total = purchaseOrders[i].walmartprice;
              }
            }
            res.status(200).json(result);
          });
        });
      });
    }).catch(err => {
    if (err) res.status(500).send(error);
  });
}

router.get('/accounting/:dateFrom/:dateTo', (req, res, next) => {
  console.log(req.params);
  let dateFrom, dateTo;
  if (moment(req.params.dateFrom).isValid()) dateFrom = req.params.dateFrom;
  else dateFrom = moment().subtract(30, 'days').format('YYYY-MM-DD');
  if (moment(req.params.dateTo).isValid()) dateTo = req.params.dateTo;
  else dateTo = moment().format('YYYY-MM-DD');
  getOrders(res, dateFrom, dateTo);
});

router.get('/accounting', (req, res, next) => {
  getOrders(res);
});

router.post('/accounting', (req, res, next) => {
  let order = req.body;
  console.log(order);
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

function ebayGetOrders(intPage = 1) {
  return new Promise((resolve, reject) => {
    ebay.xmlRequest({
      serviceName: 'Trading',
      opType: 'GetOrders',

      // app/environment
      devId: process.env.EBAY_DEVID,
      certId: process.env.EBAY_CERTID,
      appId: process.env.EBAY_APPID,
      sandbox: false,

      // per user
      authToken: process.env.EBAY_AUTHTOKEN,

      params: {
        DetailLevel: 'ReturnAll',
        IncludeFinalValueFee: true,
        OrderStatus: 'All',
        CreateTimeFrom: moment().subtract(90, 'days').toISOString(),
        CreateTimeTo: moment().toISOString(),
        OrderRole: 'Seller',
        Pagination: {
          EntriesPerPage: 100,
          PageNumber: intPage
        }
      }
    }, function (error, results) {
      if (error) {
        console.error(error);
        reject(error);
      }
      resolve(results);
    });
  });
}

/**
 * Ebay API request to Trading:GetSellerList
 * @param intPage
 * @returns {Promise}
 */
function ebayGetSellerList(intPage = 1) {
  return new Promise((resolve, reject) => {
    ebay.xmlRequest({
      serviceName: 'Trading',
      opType: 'GetSellerList',

      // app/environment
      devId: process.env.EBAY_DEVID,
      certId: process.env.EBAY_CERTID,
      appId: process.env.EBAY_APPID,
      sandbox: false,

      // per user
      authToken: process.env.EBAY_AUTHTOKEN,

      params: {
        DetailLevel: 'ReturnAll',
        IncludeFinalValueFee: true,
        StartTimeFrom: moment().subtract(120, 'days').toISOString(),
        StartTimeTo: moment().toISOString(),
        // EndTimeFrom: moment().subtract(120, 'days').toISOString(),
        // EndTimeTo: moment().toISOString(),
        Sort: 1,
        //GranularityLevel: 'Coarse',
        Pagination: {
          EntriesPerPage: 200,
          PageNumber: intPage
        }
      }
    }, function (error, results) {
      if (error) {
        console.error(error);
        reject(error);
      }
      resolve(results);
    });
  });
}
/**
 * Get Orders from Ebay
 * @returns {Promise}
 */
function getOrdersFromEbay() {
  let i = 1, promises = [], arrayOfOrders = [], arrayOfResults = [], arrayOfSellerList = [];
  return new Promise((resolve, reject) => {
    ebayGetOrders().then(results => {
      arrayOfOrders.push(results);
      for (i = 2; i <= results.PaginationResult.TotalNumberOfPages; i++) {
        promises.push(ebayGetOrders(i));
      }
      return Promise.all(promises);
    }).then(results => {
      var res = [];
      arrayOfOrders = _.concat(arrayOfOrders, results);
      _.forEach(arrayOfOrders, function (o) {
        _.forEach(o.Orders, function (order) {
          console.log(order);
          res.push({
            OrderID: order.OrderID,
            CreatedTime: order.CreatedTime,
            AdjustmentAmount: order.AdjustmentAmount.amount,
            AmountPaid: order.AmountPaid.amount,
            OrderStatus: order.OrderStatus,
            Items: [],
            eBayPaymentStatus: order.CheckoutStatus.eBayPaymentStatus,
            Status: order.CheckoutStatus.Status,
            PaidTime: order.PaidTime,
            Total: order.Total._,
            Address: order.ShippingAddress,
            SellingManagerNumber: order.ShippingDetails.SellingManagerSalesRecordNumber
          });
          _.forEach(order.Transactions, function (transaction) {
            res[res.length - 1].Items.push({
              ItemID: transaction.Item.ItemID,
              Title: transaction.Item.Title,
              SKU: transaction.Item.SKU,
              FinalValueFee: transaction.FinalValueFee._
            });
          })
        })
      });
      return res;
    }).catch(error => {
      console.error(error);
      reject(error);
    }).then(result => {
      return new Promise(resolve => {
        arrayOfResults = _.clone(result);
        ebayGetSellerList().then(results => {
          arrayOfSellerList = _.concat(arrayOfSellerList, results.Items);
          let promises = [];
          for (i = 2; i <= results.PaginationResult.TotalNumberOfPages; i++) {
            promises.push(ebayGetSellerList(i));
          }
          resolve(Promise.all(promises));
        });
      });
    }).then(results => {
      let element;
      _.forEach(results, function (page) {
        arrayOfSellerList = _.concat(arrayOfSellerList, page.Items);
      });
      _.forEach(arrayOfResults, function (o, i) {
        _.forEach(o.Items, function (item, j) {
          element = _.findIndex(arrayOfSellerList, ['ItemID', arrayOfResults[i].Items[j].ItemID]);
          if (element != -1) {
            arrayOfResults[i].Items[j].Image = arrayOfSellerList[element].PictureDetails.GalleryURL;
          }
        });
      });
      return arrayOfResults;
    }).then(results => {
      let promises = [];
      _.forEach(results, function (o, i) {
        _.forEach(o.Items, function (item, j) {
          if (!_.isString(results[i].Items[j].Image)) {
            promises.push(axios.get("http://cgi.ebay.com/ws/eBayISAPI.dll?ViewItem&item=" + item.ItemID)
              .then((response) => {
                $ = cheerio.load(response.data);
                results[i].Items[j].Image = $('#icImg')[0].src;
                resolve(results[i].Items[j].Image);
              }).catch(error => {
                console.error(error);
                reject(error);
              }));
          }
          console.log(results[i].Items[j].Image);
        });
      });
      console.log(promises.length);
      Promise.all(promises);
      resolve(results);
    }).catch(error => {
      console.error(error);
      reject(error);
    });
  });
}

/**
 * Save order in DB
 * @param order Object
 * @returns {Promise}
 */
function saveOrder(order) {
  return new Promise((resolve, reject) => {
    EbayModel.findOne({id: order['OrderID']}, function (err, obj) {
      if (obj === null) {
        obj = new EbayModel({
          id: order['OrderID'],
          created_time: order['CreatedTime'],
          adj_amount: order['AdjustmentAmount'],
          paid_amount: order['AmountPaid'],
          items: order['Items'],
          order_status: order['OrderStatus'],
          payment_status: order['eBayPaymentStatus'],
          status: order['Status'],
          paid_time: order['PaidTime'],
          total: order['Total'],
          sellingmanagernumber: order['SellingManagerNumber'],
          address: {
            name: order.Address.Name,
            street1: order.Address.Street1,
            street2: order.Address.Street2,
            city: order.Address.CityName,
            state: order.Address.StateOrProvince,
            country: order.Address.Country,
            country_name: order.Address.CountryName,
            phone: order.Address.Phone,
            postal_code: order.Address.PostalCode
          }
        });
      } else {
        obj.created_time = order['CreatedTime'];
        obj.adj_amount = order['AdjustmentAmount'];
        obj.paid_amount = order['AmountPaid'];
        obj.items = order['Items'];
        obj.order_status = order['OrderStatus'];
        obj.payment_status = order['eBayPaymentStatus'];
        obj.status = order['Status'];
        obj.paid_time = order['PaidTime'];
        obj.total = order['Total'];
        obj.sellingmanagernumber = order['SellingManagerNumber'];
        obj.address = {
          name: order.Address.Name,
          street1: order.Address.Street1,
          street2: order.Address.Street2,
          city: order.Address.CityName,
          state: order.Address.StateOrProvince,
          country: order.Address.Country,
          country_name: order.Address.CountryName,
          phone: order.Address.Phone,
          postal_code: order.Address.PostalCode
        };
      }
      obj.save(function (err) {
        if (!err) {
          console.info("Order saved!");
          resolve(obj);
        } else {
          console.error('Internal error: %s', err.message);
          reject('Internal error: ' + err.message);
        }
      });
    });
  })
}
