var fs = require('fs');

// Sets ENV variables from the test config file.
function loadTestEnv() {
  let json = JSON.parse(fs.readFileSync('.private.test.json'));

  Object.keys(json).forEach((key) => {
    process.env[key] = json[key];
  });
}

module.exports = function () {
  loadTestEnv();
};