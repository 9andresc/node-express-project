exports.getHoodRiver = function (request, response) {
  response.render('tours/hood_river');
};

exports.getOregonCoast = function (request, response) {
  response.render('tours/oregon_coast');
};

exports.getRequestGroupRate = function (request, response) {
  response.render('tours/request_group_rate');
};