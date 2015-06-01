exports.getJqueryTest = function (request, response) {
  response.render('jquery_test');
};

exports.getNurseryRhyme = function (request, response) {
  response.render('nursery_rhyme');
};

exports.getNurseryRhymeData = function (request, response) {
  response.json({
    animal: 'squirrel',
    bodyPart: 'tail',
    adjective: 'bushy',
    noun: 'heck'
  });
};

exports.getNewsletter = function (request, response) {
  response.render('newsletter', {csrf: 'CSRF token goes here'});
};

// For now, we're mocking NewsletterSignup:
function NewsletterSignup(){}
NewsletterSignup.prototype.save = function(cb){
  cb();
};

var VALID_EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

exports.postNewsletter = function (request, response) {
  var name = request.body.name || '', email = request.body.email || '';
  // Input validation
  if (!email.match(VALID_EMAIL_REGEX)) {
    if (request.xhr) {
      return response.json({
        error: 'Invalid name email address.'
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
};

exports.getNewsletterArchive = function (request, response) {
  response.render('newsletter/archive');
};

exports.postProcess = function (request, response) {
  if (request.xhr || request.accepts('json,html') === 'json') {
    response.send({
      success: true
    });
  }
  else {
    response.redirect(303, '/thank-you');
  }
};

exports.getThankYou = function (request, response) {
  response.render('thank_you');
};

exports.getEpicFail = function () {
  process.nextTick(function () {
    throw new Error('Kaboom!');
  });
};