require('dotenv').config();
const ebay = require('ebay-api');
const moment = require('moment');
const _ = require('lodash');
const axios = require('axios');
const cheerio = require('cheerio');
const EbayModel = require('../libs/mongoose').EbayModel;
const AmazonModel = require('../libs/mongoose').AmazonModel;
const WalmartModel = require('../libs/mongoose').WalmartModel;
const PurchaseModel = require('../libs/mongoose').PurchaseModel;

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
      let res = [];
      arrayOfOrders = _.concat(arrayOfOrders, results);
      _.forEach(arrayOfOrders, function (o) {
        _.forEach(o.Orders, function (order) {
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
            SellingManagerNumber: order.ShippingDetails.SellingManagerSalesRecordNumber,
          });
          _.forEach(order.Transactions, function (transaction) {
            res[res.length - 1].Items.push({
              ItemID: transaction.Item.ItemID,
              Title: transaction.Item.Title,
              SKU: transaction.Item.SKU,
              FinalValueFee: transaction.FinalValueFee._,
              ShipmentTrackingDetails: transaction.ShippingDetails.ShipmentTrackingDetails?transaction.ShippingDetails.ShipmentTrackingDetails:[],
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
          if (element !== -1) {
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

module.exports.getOrdersFromEbay = getOrdersFromEbay;
module.exports.saveOrder = saveOrder;
module.exports.getOrders = getOrders;
