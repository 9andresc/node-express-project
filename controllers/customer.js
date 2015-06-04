var Customer = require('../models/customer.js');
var customerViewModel = require('../view_models/customer.js');

exports = {
  registerRoutes: function (app) {
    app.get('/customer/:id', this.home);
    app.get('/customer/:id/preferences', this.preferences);
    app.get('/orders/:id', this.orders);

    app.post('/customer/:id/update', this.ajaxUpdate);
  },
  home: function (request, response, next) {
    var customer = Customer.findById(request.params.id);
    if (!customer) return next();
    response.render('customer/home', customerViewModel(customer));
  },
  preferences: function (request, response, next) {
    var customer = Customer.findById(request.params.id);
    if (!customer) return next();
    response.render('customer/preferences', customerViewModel(customer));
  },
  orders: function (request, response, next) {
    var customer = Customer.findById(request.params.id);
    if (!customer) return next();
    response.render('customer/orders', customerViewModel(customer));
  },
  ajaxUpdate: function (request, response) {
    var customer = Customer.findById(request.params.id);
    if (!customer) return response.json({error: 'Invalid ID.'});
    if (request.body.firstName) {
      if (typeof request.body.firstName !== 'string' || request.body.firstName.trim() === '') return response.json({error: 'Invalid name.'});
      customer.firstName = request.body.firstName;
    }
    customer.save();
    return response.json({success: true});
  }
};