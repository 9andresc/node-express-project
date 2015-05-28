// NPM MODULES
var express = require('express');

// NODE MODULES
var fortune = require('./lib/fortune.js');

// EXPRESS INITIATION
var app = express();

// RESPONSE'S HEADER CONFIGURATION
// Disable sensitive information server
app.disable('x-powered-by');

// STATIC RESOURCES
app.use(express.static(__dirname + '/public'));

// ENGINES
// Set up handlebars view engine
var handlebars = require('express-handlebars').create({
  defaultLayout: 'main',
  helpers: {
    section: function (name, options) {
      if (!this._sections) this._sections = {};
      this._sections[name] = options.fn(this);
      return null;
    }
  }
});
app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');

// PORT CONFIGURATION
app.set('port', process.env.PORT || 3000);

// FUNCTIONS
// Function to return weather data
function getWeatherData() {
  return {
    locations: [
      {
        name: 'Portland',
        forecastUrl: 'http://www.wunderground.com/US/OR/Portland.html',
        iconUrl: 'http://icons-ak.wxug.com/i/c/k/cloudy.gif',
        weather: 'Overcast',
        temp: '54.1 F (12.3 C)'
      },
      {
        name: 'Bend',
        forecastUrl: 'http://www.wunderground.com/US/OR/Bend.html',
        iconUrl: 'http://icons-ak.wxug.com/i/c/k/partlycloudy.gif',
        weather: 'Partly Cloudy',
        temp: '55.0 F (12.8 C)'
      },
      {
        name: 'Manzanita',
        forecastUrl: 'http://www.wunderground.com/US/OR/Manzanita.html',
        iconUrl: 'http://icons-ak.wxug.com/i/c/k/rain.gif',
        weather: 'Light Rain',
        temp: '55.0 F (12.8 C)'
      }
    ]
  };
}

// MIDDLEWARE
// Middleware to inject data into res.locals.partials
app.use(function (request, response, next) {
  if (!response.locals.partials) response.locals.partials = {};
  response.locals.partials.weatherData = getWeatherData();
  next();
});

// Middleware to enable page testing
app.use(function (request, response, next) {
  response.locals.showTests = app.get('env') !== 'production' && request.query.test === '1';
  next();
});

// Middleware to parse URL-encoded body
app.use(require('body-parser')());

// ROUTES
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

app.get('/jquery-test', function(request, response){
  response.render('jquery_test');
});

app.get('/nursery-rhyme', function (request, response) {
  response.render('nursery_rhyme');
});

app.get('/data/nursery-rhyme', function (request, response) {
  response.json({
    animal: 'squirrel',
    bodyPart: 'tail',
    adjective: 'bushy',
    noun: 'heck'
  });
});

app.get('/newsletter', function (request, response) {
  response.render('newsletter', {csrf: 'CSRF token goes here'});
});

app.post('/process', function (request, response) {
  console.log('Form (from querystring): ' + request.query.form);
  console.log('CSRF token (from hidden form field): ' + request.body._csrf);
  console.log('Name (from visible form field): ' + request.body.name);
  console.log('Email (from visible form field): ' + request.body.email);
  response.redirect(303, '/thank-you');
});

// ERROR HANDLING
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

// SERVER CONFIGURATION
app.listen(app.get('port'), function () {
  console.log('Express started on http://localhost:' + app.get('port') + '; press Ctrl-C to terminate.');
});