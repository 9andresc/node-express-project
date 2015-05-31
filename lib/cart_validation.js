module.exports = {
  checkWaivers: function (request, response, next) {
    var cart = request.session.cart;
    if (!cart) return next();
    if (cart.items.some(function (item) { return item.vacation.requiresWaiver; })) {
      if (!cart.warnings) cart.warnings = [];
      cart.warnings.push('One or more of your selected tours requires a waiver.');
    }
    next();
  },
  checkGuestCounts: function (request, response, next) {
    var cart = request.session.cart;
    if (!cart) return next();
    if (cart.items.some(function (item) { return item.guests > item.vacation.maximumGuests; })) {
      if (!cart.errors) cart.errors = [];
      cart.errors.push('One or more of your selected tours cannot accommodate the number of guests you have selected.');
    }
    next();
  }
};