// NPM modules
var express = require('express');

// Node modules
var fortune = require('./lib/fortune.js');


var app = express();

// Static resources
app.use(express.static(__dirname + '/public'));

// Set up handlebars view engine
var handlebars = require('express-handlebars').create({defaultLayout: 'main'});
app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');

// Set up a port
app.set('port', process.env.PORT || 3000);

// Routes
app.get('/', function (request, response) {
  response.render('home');
});

app.get('/about', function (request, response) {
  response.render('about', {fortune: fortune.getFortune()});
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