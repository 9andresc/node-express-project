var Vacation = require('../models/vacation.js');
var VacationInSeasonListener = require('../models/vacation_in_season_listener.js');
var VALID_EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
var credentials = require('../credentials.js');
var emailService = require('../lib/email.js')(credentials);

exports.getVacations = function (request, response) {
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
};

exports.getCartAdd = function (request, response, next) {
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
};

exports.getCart = function (request, response, next) {
  var cart = request.session.cart;
  if (!cart) next();
  response.render('cart', {cart: cart});
};

exports.getCartCheckout = function (request, response, next) {
  var cart = request.session.cart;
  if (!cart) next();
  response.render('cart_checkout');
};

exports.postCartCheckout = function (request, response, next) {
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
};

exports.getCartThankYou = function (request, response) {
  response.render('cart_thank_you', {cart: request.session.cart});
};

exports.getEmailCartThankYou = function (request, response) {
  response.render('email/cart_thank_you', {layout: null, cart: request.session.cart});
};

exports.getNotifyMeWhenInSeason = function (request, response) {
  response.render('notify_me_when_in_season', {sku: request.query.sku});
};

exports.postNotifyMeWhenInSeason = function (request, response) {
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
};