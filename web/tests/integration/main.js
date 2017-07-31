casper.test.begin('main.html', 7, function(test) {
  const URL = casper.cli.get('url');
  const username = casper.cli.get('username');
  const password = casper.cli.get('password');
  const expected_token = casper.cli.get('token');
  const expected_jquery = require('../../package.json').dependencies.jquery;

  casper.start(URL);

  casper.viewport(1920, 1080).then(function() {
      const lib = require('../lib/index.js')(this);

      test.assertEquals(this.currentHTTPStatus, 200, "HTTP Status Code should be 200");
      test.assertEquals(this.getTitle(), 'PiCluster Web Console', "Title should equal 'PiCluster WebConsole'");
      var iframe = this.evaluate(function(username, password) {
        var iframes = document.getElementsByTagName('iframe');

        return {length: iframes.length, url: iframes[0].src};
      });

      test.assertEquals(1, iframe.length, "There should be 1 iframe");
      test.assertEquals(iframe.url, URL + '/blank', "Its source should equal " + URL + "/blank");

      this.waitForResource("jquery.min.js", function() {
        var jquery = this.evaluate(function() {
          return $.fn.jquery;
        });

        const expected_jqueryUI = "1.12.1";
        var jqueryUI;
        this.waitForResource("jquery-ui.js", function() {
          jqueryUI = this.evaluate(function() {
            return $.ui.version;
          });

          test.assertEquals(jqueryUI, expected_jqueryUI, "jQuery UI should be '" + expected_jqueryUI + "'");
        });

        test.assert(expected_jquery.indexOf(jquery) > -1, "jQuery should be " + expected_jquery);

        lib.doLogin(username, password);

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
