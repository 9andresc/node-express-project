// NPM modules
var express = require('express');

// Node modules
var fortune = require('./lib/fortune.js');

var app = express();

// Response's header configuration
// Disable server information
app.disable('x-powered-by');

// Static resources
app.use(express.static(__dirname + '/public'));

// Set up handlebars view engine
var handlebars = require('express-handlebars').create({defaultLayout: 'main'});
app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');

// Set up a port
app.set('port', process.env.PORT || 3000);

// Middleware for querystring of testing
app.use(function (request, response, next) {
  response.locals.showTests = app.get('env') !== 'production' && request.query.test === '1';
  next();
});

// Routes
app.get('/', function (request, response) {
  response.render('home');
});

app.get('/about', function (request, response) {
  response.render('about', {
    fortune: fortune.getFortune(),
    pageTestScript: '/qa/tests_about.js'
  });
});

app.get('/tours/hood-river', function (request, response) {
  response.render('tours/hood_river');
});

app.get('/tours/oregon-coast', function (request, response) {
  response.render('tours/oregon_coast');
});

app.get('/tours/request-group-rate', function (request, response) {
  response.render('tours/request_group_rate');
});

// Custom 404 page
app.use(function (request, response) {
  response.status(404);
  response.render('404');
});

// Custom 500 page
app.use(function (error, request, response) {
  console.error(error.stack);
  response.status(500);
  response.render('500');
});

app.listen(app.get('port'), function () {
  console.log('Express started on http://localhost:' + app.get('port') + '; press Ctrl-C to terminate.');
});