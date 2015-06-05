var User = require('../models/user.js');
var passport = require('passport');
var FacebookStrategy = require('passport-facebook').Strategy;

passport.serializeUser(function (user, done) {
  done(null, user._id);
});

passport.deserializeUser(function (id, done) {
  User.findById(id, function (errors, user) {
    if (errors || !user) return done(errors, null);
    done(null, user);
  });
});

module.exports = function (app, options) {
  // If success and failure redirects aren't specified, set some reasonable defaults
  if (!options.successRedirect) options.successRedirect = '/account';
  if (!options.failureRedirect) options.failureRedirect = '/login';

  return {
    init: function () {
      var env = app.get('env');
      var config = options.providers;

      // Configure Facebook strategy
      passport.use(new FacebookStrategy({
        clientID: config.facebook[env].appId,
        clientSecret: config.facebook[env].appSecret,
        callbackURL: '/auth/facebook/callback'
      }, function (accessToken, refreshToken, profile, done) {
        var authId = 'facebook:' + profile.id;
        User.findOne({authId: authId}, function (errors, user) {
          if (errors) return done(errors, null);
          if (user) return done(null, user);
          user = new User({
            authId: authId,
            name: profile.displayName,
            created: Date.now(),
            role: 'customer'
          });
          user.save(function (errors) {
            if (errors) return done(errors, null);
            done(null, user);
          });
        });
      }));

      app.use(passport.initialize());
      app.use(passport.session());
    },
    registerRoutes: function () {
      // Register Facebook routes
      app.get('/auth/facebook', function (request, response, next) {
        passport.authenticate('facebook', {
          callbackURL: '/auth/facebook/callback?redirect=' + encodeURIComponent(request.query.redirect)
        })(request, response, next);
      });
      app.get('/auth/facebook/callback', passport.authenticate('facebook', {failureRedirect: options.failureRedirect},
        function (request, response) {
          // We only get here on successful authentication
          response.redirect(303, request.query.redirect || options.successRedirect);
        }
      ));
    }
  };
};