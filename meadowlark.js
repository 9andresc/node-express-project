// NPM MODULES
var express = require('express');
var jqupload = require('jquery-file-upload-middleware');
var http = require('http');
var mongoose = require('mongoose');

// FILES
var credentials = require('./credentials.js');

// CUSTOM MODULES
var cartValidation = require('./lib/cart_validation.js');

// MODELS
var Vacation = require('./models/vacation.js');

// EXPRESS INITIATION
var app = express();

// RESPONSE'S HEADER CONFIGURATION
// Disable sensitive information of the server
app.disable('x-powered-by');

// DOMAIN
// Middleware that deals with uncaught exceptions
app.use(function (request, response, next) {
  // Create a domain for this request
  var domain = require('domain').create();
  // Handle errors on this domain
  domain.on('error', function (errors) {
    console.error('DOMAIN ERROR CAUGHT\n', errors.stack);
    try {
      // Failsafe shutdown in 5 seconds
      setTimeout(function () {
        console.error('Failsafe shutdown.');
        process.exit(1);
      }, 5000);

      // Disconnect from the cluster
      var worker = require('cluster').worker;
      if (worker) worker.disconnect();

      // Stop taking new requests
      server.close();

      try {
        // Attempt to use Express error route
        next(errors);
      }
      catch (e) {
        // If Express error route failed, try plain Node response
        console.error('Express error mechanism failed.\n', e.stack);
        response.statusCode = 500;
        response.setHeader('content-type', 'text/plain');
        response.send('Server error.');
      }
    }
    catch (e) {
      console.error('Unable to send 500 response.\n', e.stack);
    }
  });

  // Add the request and response objects to the domain
  domain.add(request);
  domain.add(response);

  // Execute the rest of the request chain in the domain
  domain.run(next);
});

// LOGGING CONFIGURATION
switch (app.get('env')) {
  case 'development':
    // Compact, colorful dev logging
    app.use(require('morgan')('dev'));
    break;
  case 'production':
    // Module 'express-logger' supports daily log rotation
    app.use(require('express-logger')({
      path: __dirname + '/log/requests.log'
    }));
    break;
}

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

// DATABASE CONFIGURATION
var opts = {
  server: {
    socketOptions: {keepAlive: 1}
  }
};
switch (app.get('env')) {
  case 'development':
    mongoose.connect(credentials.mongo.development.connectionString, opts);
    break;
  case 'production':
    mongoose.connect(credentials.mongo.production.connectionString, opts);
    break;
  default:
    throw new Error('Unknown execution environment: ' + app.get('env'));
}

// Initialize vacations
Vacation.find(function (errors, vacations) {
  if (vacations.length) return;

  new Vacation({
    name: 'Hood River Day Trip',
    slug: 'hood-river-day-trip',
    category: 'Day Trip',
    sku: 'HR199',
    description: 'Spend a day sailing on the Columbia and enjoying craft beers in Hood River!',
    priceInCents: 9995,
    tags: ['day trip', 'hood river', 'sailing', 'windsurfing', 'breweries'],
    inSeason: true,
    maximumGuests: 16,
    available: true,
    packagesSold: 0
  }).save();

  new Vacation({
    name: 'Oregon Coast Getaway',
    slug: 'oregon-coast-getaway',
    category: 'Weekend Getaway',
    sku: 'OC39',
    description: 'Enjoy the ocean air and quaint coastal towns!',
    priceInCents: 269995,
    tags: ['weekend getaway', 'oregon coast', 'beachcombing'],
    inSeason: false,
    maximumGuests: 8,
    available: true,
    packagesSold: 0
  }).save();

  new Vacation({
    name: 'Rock Climbing in Bend',
    slug: 'rock-climbing-in-bend',
    category: 'Adventure',
    sku: 'B99',
    description: 'Experience the thrill of climbing in the high desert.',
    priceInCents: 289995,
    tags: ['weekend getaway', 'bend', 'high desert', 'rock climbing'],
    inSeason: true,
    requiresWaiver: true,
    maximumGuests: 4,
    available: false,
    packagesSold: 0,
    notes: 'The tour guide is currently recovering from a skiing accident'
  }).save();
});

// MIDDLEWARE
// Function to return mocked weather data
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

// Middleware to work with jquery-file-upload
app.use('/upload', function (request, response, next) {
  var now = Date.now();
  jqupload.fileHandler({
    uploadDir: function () {
      return __dirname + '/public/uploads/' + now;
    },
    uploadUrl: function () {
      return '/uploads/' + now;
    }
  })(request, response, next);
});

// Middleware to setting and accessing cookies
app.use(require('cookie-parser')(credentials.cookieSecret));

// Middleware for store sessions information
app.use(require('express-session')());

// Middleware to add a flash object into the context
app.use(function (request, response, next) {
  response.locals.flash = request.session.flash;
  delete request.session.flash;
  next();
});

// Middleware for cart validation
app.use(cartValidation.checkWaivers);
app.use(cartValidation.checkGuestCounts);

// ROUTES
require('./routes.js')(app);

// ERROR HANDLING
// Custom 404 page
app.use(function (request, response) {
  response.status(404);
  response.render('404');
});

// Custom 500 page
app.use(function (errorsor, request, response) {
  console.error(errorsor.stack);
  response.status(500);
  response.render('500');
});

// SERVER INITIATION
var server;
function startServer() {
  server = http.createServer(app).listen(app.get('port'), function () {
    console.log('Express started in ' + app.get('env') + ' mode on http://localhost:' + app.get('port') + '; press Ctrl-C to terminate.');
  });
}

if (require.main === module) {
  // Application run directly; start app server
  startServer();
}
else {
  // Application imported as a module via 'require': export function to create server
  module.exports = startServer;
}