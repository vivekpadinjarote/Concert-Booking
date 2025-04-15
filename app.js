var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var expresslayouts = require('express-ejs-layouts')
var session = require('express-session')

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var database = require('./database/db');
var registerRouter = require('./routes/admin')
var bookingRouter = require('./routes/booking')
var userApiRouter = require('./routes/api')

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(expresslayouts)

app.set('layout','layouts/main-layout')
app.use((req, res, next) => {
  res.locals.title = 'Concert Nation'; // Fallback title
  res.locals.userName = req.session ? req.session.userName || '':'';
  res.locals.role = req.session ? req.session.role || '':'';
  res.locals.userEmail = req.session ? req.session.userEmail || '':'';
  next();
})


app.use(session({
  secret: process.env.SESSION_SECRET || 'default-secret-key',
  resave: false,
  saveUninitialized:true
}))

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/admin',registerRouter);
app.use('/booking',bookingRouter);
app.use('/api',userApiRouter)

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
