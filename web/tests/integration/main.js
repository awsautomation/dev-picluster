casper.test.begin('main.html', 6, function(test) {
  const URL = casper.cli.get('url');
  const username = casper.cli.get('username');
  const password = casper.cli.get('password');
  const expected_token = casper.cli.get('token');
  const expected_jquery = require('../../package.json').dependencies.jquery;

  casper.start(URL);

  casper.viewport(1920, 1080).then(function() {
      test.assertEquals(this.currentHTTPStatus, 200, "HTTP Status Code should be 200");
      test.assertEquals(this.getTitle(), 'PiCluster Web Console', "Title should equal 'PiCluster WebConsole'");
      var iframe = this.evaluate(function(username, password) {
        var iframes = document.getElementsByTagName('iframe');

        return {length: iframes.length, url: iframes[0].src};
      });

      test.assertEquals(1, iframe.length, "There should be 1 iframe");
      test.assertEquals(iframe.url, URL + '/blank', "Its source should equal " + URL + "/blank");

      this.wait(2000, function() {
        var jquery = this.evaluate(function() {
          return $.fn.jquery;
        });

        test.assert(expected_jquery.indexOf(jquery) > -1, "jQuery should be " + expected_jquery);

        this.evaluate(function(username, password) {
          document.getElementById('user').value = username;
          document.getElementById('password').value = password;
          document.getElementById('myBtn').click();
        }, username, password);

        this.wait(1000, function() {
          var token = this.evaluate(function() {
            return token;
          });

        test.assertEquals(token, expected_token, "The token should equal " + expected_token);

        casper.test.done();

        });
      });
  });

  casper.run();

});
