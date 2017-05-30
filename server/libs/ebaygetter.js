require('dotenv').config();
const fs = require("fs");
const path = require('path');
const parse = require('csv-parse');
const ebay = require('ebay-api');
const moment = require('moment');
const _ = require('lodash');
const axios = require('axios');
const cheerio = require('cheerio');
const Nightmare = require('nightmare');
require('nightmare-download-manager')(Nightmare);

const EbayModel = require('../libs/mongoose').EbayModel;
const AmazonModel = require('../libs/mongoose').AmazonModel;
const WalmartModel = require('../libs/mongoose').WalmartModel;
const PurchaseModel = require('../libs/mongoose').PurchaseModel;

class Orders {

  csvDir(fileName) {
    return path.resolve('./uploads/', fileName ? fileName : '');
  }

  /**
   * Load CSV file to Array
   * @param strFileName
   * @returns {Promise}
   */
  loadCSV(strFileName) {
    return new Promise((resolve, reject) => {
      let parser = parse({
        delimiter: ',',
        columns: true
      }, (err, data) => {
        if (err) {
          //console.error(err);
          reject(err);
        } else {
          fs.unlinkSync(this.csvDir(strFileName));
          resolve(data);
        }
      });
      fs.createReadStream(this.csvDir(strFileName)).pipe(parser);
    });
  }

  saveAmazonOrders(orders) {
    let promises = [];
    for (let order of orders) {
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
                console.info(new Date(), 'Order saved!');
              } else {
                console.error('Internal error: %s', err.message);
              }
            });
          })
        );
      }
    }
    return Promise.all(promises);
  }

  /**
   * Get Amazon orders list
   * @returns {Promise}
   */
  getAmazonOrders() {
    return new Promise((resolve, reject) => {
      let email = process.env.AMAZON_EMAIL;
      let password = process.env.AMAZON_PASS;
      let objFile;
      let nightmare = new Nightmare({
        openDevTools: {
          mode: 'detach'
        },
        show: true,
        paths: {
          downloads: this.csvDir()
        }
      });

      nightmare.on('download', function (state, downloadItem) {
        if (state === 'started') {
          objFile = downloadItem;
          nightmare.emit('download', downloadItem);
        }
      });

      nightmare
        .downloadManager()
        .useragent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.87 Safari/537.36")
        .goto('https://www.amazon.com/gp/b2b/reports?')
        .wait()
        .type('form [name=email]', email)
        .wait()
        .type('form [name=password]', password)
        .wait()
        .click('#signInSubmit')
        .wait('#report-last30Days')
        .click('#report-last30Days')
        .wait()
        .click('#report-confirm')
        .wait()
        .waitDownloadsComplete()
        .end()
        .then(() => {
          return this.loadCSV(objFile.filename);
        })
        .then((orders) => {
          if (!orders) {
            throw TypeError('Csv is empty!');
          }
          return this.saveAmazonOrders(orders);
        })
        .catch((error) => {
          console.error(error);
          reject({error: error});
        });
    });
  }

  ebayCompleteSale(orderId, trackingNumber, trackingCarrier = 'UPS') {
    return new Promise((resolve, reject) => {
      ebay.xmlRequest({
        serviceName: 'Trading',
        opType: 'CompleteSale',

        // app/environment
        devId: process.env.EBAY_DEVID,
        certId: process.env.EBAY_CERTID,
        appId: process.env.EBAY_APPID,
        sandbox: false,

        // per user
        authToken: process.env.EBAY_AUTHTOKEN,

        params: {
          WarningLevel: 'High',
          OrderID: orderId,
          // Paid: true,
          // Shipped: true,
          Shipment: {
            ShipmentTrackingDetails: {
              ShipmentTrackingNumber: trackingNumber,
              ShippingCarrierUsed: trackingCarrier,
            }
          },
          // ShippedTime: shippedTime,
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


  ebayGetOrderTransactions(orderIdArray) {
    return new Promise((resolve, reject) => {
      ebay.xmlRequest({
        serviceName: 'Trading',
        opType: 'GetOrderTransactions',

        // app/environment
        devId: process.env.EBAY_DEVID,
        certId: process.env.EBAY_CERTID,
        appId: process.env.EBAY_APPID,
        sandbox: false,

        // per user
        authToken: process.env.EBAY_AUTHTOKEN,

        params: {
          OrderIDArray: orderIdArray,
          DetailLevel: 'ReturnAll',
          IncludeFinalValueFee: true,
          // OrderStatus: 'All',
          // CreateTimeFrom: moment().subtract(90, 'days').toISOString(),
          // CreateTimeTo: moment().toISOString(),
          // OrderRole: 'Seller',
          // Pagination: {
          //   EntriesPerPage: 100,
          //   PageNumber: intPage
          // }
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
   * Get orders from Ebay API
   * @param intPage
   * @returns {Promise}
   */
  ebayGetOrders(intPage = 1) {
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
  ebayGetSellerList(intPage = 1) {
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
  getOrdersFromEbay(res) {
    let i = 1, promises = [], arrayOfOrders = [], arrayOfResults = [], arrayOfSellerList = [];
    return new Promise((resolve, reject) => {
      this.ebayGetOrders().then(results => {
        arrayOfOrders.push(results);
        for (i = 2; i <= results.PaginationResult.TotalNumberOfPages; i++) {
          promises.push(this.ebayGetOrders(i));
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
                ShipmentTrackingDetails: transaction.ShippingDetails.ShipmentTrackingDetails ? transaction.ShippingDetails.ShipmentTrackingDetails : [],
                QuantityPurchased: transaction.QuantityPurchased,
              });
            })
          })
        });
        return res;
      }).then(result => {
        return new Promise(resolve => {
          arrayOfResults = _.clone(result);
          this.ebayGetSellerList().then(results => {
            arrayOfSellerList = _.concat(arrayOfSellerList, results.Items);
            let promises = [];
            for (i = 2; i <= results.PaginationResult.TotalNumberOfPages; i++) {
              promises.push(this.ebayGetSellerList(i));
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
          });
        });
        return {prom: Promise.all(promises), orders: results};
      }).then((results) => {
        let promises = [];
        console.info(new Date(), 'Saving...');
        for (let order of results.orders) promises.push(this.saveOrder(order));
        return Promise.all(promises);
      }).then(() => {
        if (res) {
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
        }
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
  saveOrder(order) {
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
            console.info(new Date(), "Order saved!");
            resolve(obj);
          } else {
            console.error('Internal error: %s', err.message);
            reject('Internal error: ' + err.message);
          }
        });
      });
    })
  }

  /**
   * Get orders from DB
   * @param res
   * @param dateFrom
   * @param dateTo
   */
  getOrders(
            dateFrom = moment().subtract(30, 'days').startOf('day').add(7, 'hours'),
            dateTo = moment().startOf('day').add(7, 'hours')) {
    return new Promise ((resolve,reject) => {
      EbayModel
        .where('created_time').gte(moment(dateFrom).startOf('day')).lte(moment(dateTo).endOf('day'))
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
                  $gte: moment(result[i].created_time).startOf('day').subtract(3, 'days').toISOString(),
                  $lt: moment(result[i].created_time).startOf('day').add(6, 'days').toISOString()
                },
                shipping_zip: {
                  '$regex': result[i].address.postal_code.substr(0, 5),
                  '$options': 'i'
                },
                total: {
                  $gt: 0
                }
              }));
          }
          Promise.all(promises).then(amazonOrders => {
            for (i = 0; i < result.length; i++) {
              if (result[i].address.name) {
                result[i]._doc.amazon = amazonOrders[i] || {total: 0};
              } else {
                result[i]._doc.amazon = {total: 0};
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
                    $gte: moment(result[i].created_time).startOf('day').subtract(3, 'days').toISOString(),
                    $lt: moment(result[i].created_time).startOf('day').add(6, 'days').toISOString()
                  },
                  total: {
                    $gt: 0
                  }
                }));
            }
            Promise.all(promises).then(walmartOrders => {
              for (i = 0; i < result.length; i++) {
                if (result[i].address.name) {
                  result[i]._doc.walmart = walmartOrders[i] || {total: 0};
                } else {
                  result[i]._doc.walmart = {total: 0};
                }
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
                resolve(result);
              });
            });
          });
        }).catch(err => {
        if (err) reject(error);
      });
    });
  }
}

module.exports = new Orders;
