exports.promisifyFs = function (fs)
{
  fs.readFileAsync = function (filename) {
    return new Promise((resolve, reject) => {
      try {
        resolve(fs.readFileSync(filename));
      } catch (error) {
        reject(error);
      }
    });
  }

  return fs;
}

exports.log = function () {
  console.log(...arguments);
  return arguments[0];
}

exports.handleGoogleCallback = function (resolve, reject)
{
  return (error, response) => {
    if (error) return reject(error);
    resolve(response);
  };
}