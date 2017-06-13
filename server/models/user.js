const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');

mongoose.Promise = global.Promise;

const db = mongoose.createConnection('mongodb://localhost/mean-auth');

db.on('error', function (err) {
  console.error('DB users connection error:', err.message);
});
db.once('open', function callback() {
  console.info("Connected to DB users!");
});

const Schema = mongoose.Schema;

// Schemas
const User = new Schema({
  username: String,
  password: String
});
User.plugin(passportLocalMongoose);

module.exports = db.model('users', User);
