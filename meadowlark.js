// NPM MODULES
var express = require('express');
var formidable = require('formidable');
var jqupload = require('jquery-file-upload-middleware');
var nodemailer = require('nodemailer');
var http = require('http');

// CUSTOM MODULES
var fortune = require('./lib/fortune.js');
var cartValidation = require('./lib/cart_validation.js');

// FILES
var credentials = require('./credentials.js');

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

// EMAIL CONFIGURATION
var mainTransport = nodemailer.createTransport('SMTP', {
  service: 'Gmail',
  auth: {
    user: credentials.gmail.user,
    pass: credentials.gmail.password
  }
});

mainTransport.sendMail({
  from: '"Andres Cabral" <andrescabral.c@gmail.com>',
  to: 'joecustomer@gmail.com',
  subject: 'Your Meadowlark Travel Tour',
  text: 'Thank you for booking your trip with Meadowlark Travel. We look forward to your visit!'
}, function (errors) {
  if (errors) console.error('Unable to send email: ' + errors);
});

// FUNCTIONS
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

app.post('/contest/vacation-photo/:year/:month', function (request, response) {
  var form = new formidable.IncomingForm();
  form.parse(request, function (errors, fields, files) {
    if (errors) return response.redirect(303, '/error');
    console.log('received fields:');
    console.log(fields);
    console.log('received files:');
    console.log(files);
    response.redirect(303, '/thank-you');
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

app.get('/epic-fail', function (request, response) {
  process.nextTick(function () {
    throw new errorsor('Kaboom!');
  });
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