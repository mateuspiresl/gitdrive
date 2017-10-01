exports.callbackToPromise = callbackToPromise;
function callbackToPromise(resolve, reject)
{
  return (error, response) => {
    if (error) return reject(error);
    resolve(response);
  };
}

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

exports.promisifyDrive = function (drive, methods)
{
  methods.forEach(method => {
    drive.files[method + 'Async'] = function () {
      return new Promise((resolve, reject) => {
        drive.files[method](...arguments, callbackToPromise(resolve, reject));
      });
    };
  });

  return drive;
}

exports.log = function () {
  const parsedArgs = [];
  
  for (let i in arguments)
    if (typeof arguments[i] === 'object')
      parsedArgs.push(JSON.stringify(arguments[i]));
    else
      parsedArgs.push(arguments[i]);

  console.log(...parsedArgs);

  return arguments[0];
}
