/* eslint-env phantomjs,browser */
/* global slimer */
module.exports = function (_this) {
  return {
    doLogin(username, password) {
      _this.evaluate((username, password) => {
        document.getElementById('user').value = username;
        document.getElementById('password').value = password;
        document.getElementById('submit_button').click();
      }, username, password);
    },
    getCasperEngine() {
      try {
        slimer; // eslint-disable-line no-unused-expressions
        return 'slimerjs';
      } catch (error) {
        return 'phantomjs';
      }
    }
  };
};
