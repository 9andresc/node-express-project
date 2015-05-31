var loadtest = require('loadtest');
var expect = require('chai').expect;

suite('Stress tests', function () {
  test('Homepage should handle 100 request in a second', function (done) {
    var options = {
      url: 'http://localhost:3000',
      concurrency: 4,
      maxRequests: 100
    };
    loadtest.loadTest(options, function (errors, result) {
      expect(!errors);
      expect(result.totalTimeSeconds < 1);
      done();
    });
  });
});