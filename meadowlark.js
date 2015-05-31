// NPM MODULES
var express = require('express');
var formidable = require('formidable');
var jqupload = require('jquery-file-upload-middleware');
var http = require('http');
var mongoose = require('mongoose');
var fs = require('fs');

// FILES
var credentials = require('./credentials.js');

// CUSTOM MODULES
var fortune = require('./lib/fortune.js');
var cartValidation = require('./lib/cart_validation.js');
var emailService = require('./lib/email.js')(credentials);

// MODELS
var Vacation = require('./models/vacation.js');
var VacationInSeasonListener = require('./models/vacation_in_season_listener.js');

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
  if (request.xhr || request.accepts('json,html') === 'json') {
    response.send({
      success: true
    });
  }
  else {
    response.redirect(303, '/thank-you');
  }
});

app.get('/contest/vacation-photo', function (request, response) {
  var now = new Date();
  response.render('contest/vacation_photo', {
    year: now.getFullYear(),
    month: now.getMonth()
  });
});

// Make sure data directory exists
var dataDir = __dirname + '/data';
var vacationPhotoDir = dataDir + '/vacation_photo';
fs.existsSync(dataDir) || fs.mkdirSync(dataDir);
fs.existsSync(vacationPhotoDir) || fs.mkdirSync(vacationPhotoDir);

function saveContestEntry(contestName, email, year, month, photoPath) {
  // TODO... this will come later
}

app.post('/contest/vacation-photo/:year/:month', function (request, response) {
  var form = new formidable.IncomingForm();
  form.parse(request, function (errors, fields, files) {
    if (errors) return response.redirect(303, '/error');
    if (errors) {
      response.session.flash = {
        type: 'danger',
        intro: 'Oops!',
        message: 'There was an error processing your submission. Please try again later.'
      };
      return response.redirect(303, '/contest/vacation-photo');
    }
    var photo = files.photo;
    var dir = vacationPhotoDir + '/' + Date.now();
    var path = dir + '/' + photo.name;
    fs.mkdirSync(dir);
    fs.renameSync(photo.path, dir + '/' + photo.name);
    saveContestEntry('vacation_photo', fields.email, request.params.year, request.params.month, path);
    request.session.flash = {
      type: 'success',
      intro: 'Good luck!',
      message: 'You have been entered into the contest.'
    };
    return response.redirect(303, '/contest/vacation-photo/entries');
  });
});

// For now, we're mocking NewsletterSignup:
function NewsletterSignup(){}
NewsletterSignup.prototype.save = function(cb){
  cb();
};

var VALID_EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

app.post('/newsletter', function (request, response) {
  var name = request.body.name || '', email = request.body.email || '';
  // Input validation
  if (!email.match(VALID_EMAIL_REGEX)) {
    if (request.xhr) {
      return response.json({
        errorsor: 'Invalid name email address.'
      });
    }
    request.session.flash = {
      type: 'danger',
      intro: 'Validation error!',
      message: 'The email address you entered was not valid.'
    };
    return response.redirect(303, 'newsletter/archive');
  }

  new NewsletterSignup({name: name, email: email}).save(function (errors) {
    if (errors) {
      if (request.xhr) return response.json({errorsor: 'Database error.'});
      request.session.flash = {
        type: 'danger',
        intro: 'Database error!',
        message: 'There was a database error; please try again later.'
      };
      return response.redirect(303, '/newsletter/archive');
    }

    if (request.xhr) return response.json({success: true});
    request.session.flash = {
      type: 'success',
      intro: 'Thank you!',
      message: 'You have now been signed up for the newsletter.'
    };
    return response.redirect(303, '/newsletter/archive');
  });
});

app.get('/newsletter/archive', function(request, response){
  response.render('newsletter/archive');
});

app.get('/thank-you', function(request, response){
  response.render('thank_you');
});

app.get('/epic-fail', function () {
  process.nextTick(function () {
    throw new Error('Kaboom!');
  });
});

app.get('/vacations', function (request, response) {
  Vacation.find({available: true}, function (errors, vacations) {
    var context = {
      vacations: vacations.map(function (vacation) {
        return {
          sku: vacation.sku,
          name: vacation.name,
          description: vacation.description,
          price: vacation.getDisplayPrice(),
          inSeason: vacation.inSeason
        };
      })
    };

    response.render('vacations', context);
  });
});

app.get('/cart/add', function (request, response, next) {
  var cart = request.session.cart || (request.session.cart = {items: []});
  Vacation.findOne({sku: request.query.sku}, function (errors, vacation) {
    if (errors) return next(errors);
    if (!vacation) return next(new Error('Unknown vacation SKU: ' + request.query.sku));
    cart.items.push({
      vacation: vacation,
      guests: request.body.guests || 1
    });
    response.redirect(303, '/cart');
  });
});

app.get('/cart', function (request, response, next) {
  var cart = request.session.cart;
  if (!cart) next();
  response.render('cart', {cart: cart});
});

app.get('/cart/checkout', function (request, response, next) {
  var cart = request.session.cart;
  if (!cart) next();
  response.render('cart_checkout');
});

app.post('/cart/checkout', function (request, response, next) {
  var cart = request.session.cart;
  if (!cart) next(new Error('Cart does not exist.'));
  var name = request.body.name || '', email = request.body.email || '';
  // Input validation
  if (!email.match(VALID_EMAIL_REGEX)) return response.next(new Error('Invalid email address.'));
  // Assign a random cart ID; normally we would use a database ID here
  cart.number = Math.random().toString().replace(/^0\.0*/, '');
  cart.billing = {
    name: name,
    email: email
  };

  response.render('email/cart_thank_you', {layout: null, cart: cart}, function (errors, html) {
    if (errors) console.log('error in email template');
    emailService.send(cart.billing.email, 'Thank you for booking your trip with Meadowlark Travel!', html);
  });
  response.render('cart_thank_you', {cart: cart});
});

app.get('/cart/thank-you', function (request, response) {
  response.render('cart_thank_you', {cart: request.session.cart});
});

app.get('/email/cart/thank-you', function (request, response) {
  response.render('email/cart_thank_you', {layout: null, cart: request.session.cart});
});

app.get('/notify-me-when-in-season', function (request, response) {
  response.render('notify_me_when_in_season', {sku: request.query.sku});
});

app.post('/notify-me-when-in-season', function (request, response) {
  VacationInSeasonListener.update(
    {email: request.body.email},
    {$push: {skus: request.body.sku}},
    {upsert: true},
    function (errors) {
      if (errors) {
        console.error(errors.stack);
        request.session.flash = {
          type: 'danger',
          intro: 'Oops!',
          message: 'There was an error processing your request.'
        };
        return response.redirect(303, '/vacations');
      }
      request.session.flash = {
        type: 'success',
        intro: 'Thank you!',
        message: 'You will be notified when this vacation is in season.'
      };
      return response.redirect(303, '/vacations');
    }
  );
});

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