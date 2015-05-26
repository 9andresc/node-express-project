var express = require('express');

var app = express();

// Static resources
app.use(express.static(__dirname + '/public'));

// Set up handlebars view engine
var handlebars = require('express-handlebars').create({defaultLayout: 'main'});
app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');

// Set up port
app.set('port', process.env.PORT || 3000);

// Variables
var fortunes = [
  'Conquer your fears or they will conquer you.',
  'Rivers need springs.',
  'Do not fear what you don\'t know.',
  'You will have a pleasant surprise.',
  'Whenever possible, keep it simple.'
];

// Routes
app.get('/', function (request, response) {
  response.render('home');
});

app.get('/about', function (request, response) {
  var randomFortune = fortunes[Math.floor(Math.random() * fortunes.length)];
  response.render('about', {fortune: randomFortune});
});

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

app.listen(app.get('port'), function () {
  console.log('Express started on http://localhost:' + app.get('port') + '; press Ctrl-C to terminate.');
});