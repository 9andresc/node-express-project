var fortune = require('../lib/fortune.js');

exports.getHome = function (request, response) {
  response.render('home');
};

exports.getAbout = function (request, response) {
  response.render('about', {
    fortune: fortune.getFortune(),
    pageTestScript: '/qa/tests_about.js'
  });
};