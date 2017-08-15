module.exports = function (_this) {
  return {
    doLogin(username, password) {
      _this.evaluate((username, password) => {
        document.getElementById('user').value = username;
        document.getElementById('password').value = password;
        document.getElementById('myBtn').click();
      }, username, password);
    },
    getCasperEngine() {
      try {
        slimer;
        return 'slimerjs';
      } catch (e) {
        return 'phantomjs';
      }
    }
  };
};
