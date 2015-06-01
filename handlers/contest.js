var formidable = require('formidable');
var fs = require('fs');

exports.getVacationPhoto = function (request, response) {
  var now = new Date();
  response.render('contest/vacation_photo', {
    year: now.getFullYear(),
    month: now.getMonth()
  });
};

// Make sure data directory exists
var dataDir = __dirname + '/data';
var vacationPhotoDir = dataDir + '/vacation_photo';
fs.existsSync(dataDir) || fs.mkdirSync(dataDir);
fs.existsSync(vacationPhotoDir) || fs.mkdirSync(vacationPhotoDir);

function saveContestEntry(contestName, email, year, month, photoPath) {
  // TODO... this will come later
}

exports.postVacationPhoto = function (request, response) {
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
};