var Attraction = require('../models/attraction.js');

exports.getAttractions = function (request, content, cb) {
  Attraction.find({approved: true}, function (errors, attractions) {
    if (errors) return cb({error: 'Internal error.'});
    cb(null, attractions.map(function (a) {
      return {
        name: a.name,
        description: a.description,
        location: a.location
      };
    }));
  });
};

exports.postAttraction = function (request, content, cb) {
  var a = new Attraction({
    name: request.body.name,
    description: request.body.description,
    location: {
      lat: request.body.lat,
      lng: request.body.lng
    },
    history: {
      event: 'created',
      email: request.body.email,
      date: new Date()
    },
    approved: false
  });
  a.save(function (errors, a) {
    if (errors) return cb({error: 'Unable to add attraction.'});
    cb(null, {id: a._id});
  });
};

exports.getAttraction = function (request, content, cb) {
  Attraction.findById(request.params.id, function (errors, a) {
    if (errors) return cb({error: 'Unable to retrieve attraction.'});
    cb(null, {
      name: a.name,
      description: a.description,
      location: a.location
    });
  });
};