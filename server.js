// Get dependencies
const User = require('./server/models/user');
const express = require('express');
const path = require('path');
const http = require('http');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
// const expressSession = require('express-session');
// const hash = require('bcrypt-nodejs');
const passport = require('passport');
const localStrategy = require('passport-local' ).Strategy;
const jwt = require('express-jwt');

// Get our API routes
const api = require('./server/routes/api');


const multer = require('multer');
const app = express();

app.use(multer({
  dest: './uploads/',
  limits: {
    fileSize: 1000000
  },
}).any());

// Parsers for POST data
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(require('express-session')({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

// Point static path to dist
app.use(express.static(path.join(__dirname, 'dist')));


// configure passport
passport.use(new localStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Set our api routes
app.use('/api', jwt({ secret: process.env.JWT_SECRET}).unless({path: ['/api/login']}), function (req,res,next) {
  //console.log(req.user);
  next();
});
app.use('/api', api);

// Catch all other routes and return the index file
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist/index.html'));
});

/**
 * Get port from environment and store in Express.
 */
const port = process.env.PORT || '3000';
app.set('port', port);

/**
 * Create HTTP server.
 */
const server = http.createServer(app);

/**
 * Listen on provided port, on all network interfaces.
 */
server.listen(port, () => console.log(`API running on localhost:${port}`));
