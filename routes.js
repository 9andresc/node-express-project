var rest = require('connect-rest');

var main = require('./handlers/main.js');
var tours = require('./handlers/tours.js');
var others = require('./handlers/others.js');
var contest = require('./handlers/contest.js');
var vacations = require('./handlers/vacations.js');
var api = require('./handlers/api.js');

module.exports = function (app) {
  app.get('/', main.getHome);

  app.get('/about', main.getAbout);

  app.get('/tours/hood-river', tours.getHoodRiver);

  app.get('/tours/oregon-coast', tours.getOregonCoast);

  app.get('/tours/request-group-rate', tours.getRequestGroupRate);

  app.get('/jquery-test', others.getJqueryTest);

  app.get('/nursery-rhyme', others.getNurseryRhyme);

  app.get('/data/nursery-rhyme', others.getNurseryRhymeData);

  app.get('/newsletter', others.getNewsletter);

  app.post('/newsletter', others.postNewsletter);

  app.post('/process', others.postProcess);

  app.get('/newsletter/archive', others.getNewsletterArchive);

  app.get('/thank-you', others.getThankYou);

  app.get('/epic-fail', others.getEpicFail);

  app.get('/contest/vacation-photo', contest.getVacationPhoto);

  app.post('/contest/vacation-photo/:year/:month', contest.postVacationPhoto);

  app.get('/vacations', vacations.getVacations);

  app.get('/cart/add', vacations.getCartAdd);

  app.get('/cart', vacations.getCart);

  app.get('/cart/checkout', vacations.getCartCheckout);

  app.post('/cart/checkout', vacations.postCartCheckout);

  app.get('/cart/thank-you', vacations.getCartThankYou);

  app.get('/email/cart/thank-you', vacations.getEmailCartThankYou);

  app.get('/notify-me-when-in-season', vacations.getNotifyMeWhenInSeason);

  app.post('/notify-me-when-in-season', vacations.postNotifyMeWhenInSeason);

  // API ROUTES
  rest.get('/attractions', api.getAttractions);

  rest.post('/attraction', api.postAttraction);

  rest.get('/attraction/:id', api.getAttraction);
};