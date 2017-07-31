module.exports = function(_this) {
  return {
    doLogin: function(username, password) {
      _this.evaluate(function(username, password) {
        document.getElementById('user').value = username;
        document.getElementById('password').value = password;
        document.getElementById('myBtn').click();
      }, username, password);
    },
    getCasperEngine: function() {
      try {
        slimer;
        return 'slimerjs';
      } catch (e) {
        return 'phantomjs';
      }
    }
  };
};
