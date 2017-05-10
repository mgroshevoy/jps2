const mongoose = require('mongoose');

mongoose.Promise = global.Promise;

mongoose.connect('mongodb://localhost/justpicksales');
const db = mongoose.connection;

db.on('error', function (err) {
  console.error('DB connection error:', err.message);
});
db.once('open', function callback() {
  console.info("Connected to DB!");
});

const Schema = mongoose.Schema;

// Schemas
const WalmartOrders = new Schema({
  id: {type: String, unique: true, required: true},
  date: Date,
  url: String,
  address: String,
  total: Number,
  tracking_number: String
});

const AmazonOrders = new Schema({
  id: {type: String, unique: true, required: true},
  date: Date,
  title: String,
  category: String,
  asin_isbn: String,
  unspsc: String,
  condition: String,
  seller: String,
  list_price_unit: Number,
  purchase_price_unit: Number,
  quantity: Number,
  payment_type: String,
  customer_email: String,
  shipment_date: Date,
  shipping_name: String,
  shipping_street1: String,
  shipping_street2: String,
  shipping_city: String,
  shipping_state: String,
  shipping_zip: String,
  order_status: String,
  tracking_number: String,
  subtotal: Number,
  subtotal_tax: Number,
  total: Number,
  buyer_name: String,
  currency: String
});

const EbayOrders = new Schema({
  id: {type: String, unique: true, required: true},
  created_time: Date,
  adj_amount: Number,
  paid_amount: Number,
  order_status: String,
  items: [],
  payment_status: String,
  status: String,
  paid_time: Date,
  total: Number,
  sellingmanagernumber: Number,
  address: {
    name: String,
    street1: String,
    street2: String,
    city: String,
    state: String,
    country: String,
    country_name: String,
    phone: String,
    postal_code: String
  }
});

const PurchasePrice = new Schema({
  id: {type: String, unique: true, required: true},
  amazonprice: Number,
  walmartprice: Number
});

const TrackingAccounts = new Schema({
  tracking_account: {type: String, unique: true, required: true},
});

const TrackingNumbers = new Schema({
  tracking_number: {type: String, unique: true, required: true},
  billed: Date,
  delivery: Date,
  country: String,
  state: String,
  city: String,
  type: String,
  weight: Number,
  tracking_account_id: {}
});

const WalmartModel = mongoose.model('WalmartOrders', WalmartOrders);
const AmazonModel = mongoose.model('AmazonOrders', AmazonOrders);
const EbayModel = mongoose.model('EbayOrders', EbayOrders);
const PurchaseModel = mongoose.model('PurchasePrice', PurchasePrice);
const TrackingAccountsModel = mongoose.model('TrackingAccounts', TrackingAccounts);
const TrackingNumbersModel = mongoose.model('TrackingNumbers', TrackingNumbers);

module.exports.WalmartModel = WalmartModel;
module.exports.AmazonModel = AmazonModel;
module.exports.EbayModel = EbayModel;
module.exports.PurchaseModel = PurchaseModel;
module.exports.TrackingAccountsModel = TrackingAccountsModel;
module.exports.TrackingNumbersModel = TrackingNumbersModel;
