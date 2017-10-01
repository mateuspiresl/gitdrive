const chalk = require('chalk');


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

const tagLength = 20;
const tagSpaces = new Array(tagLength + 1).join(' ');

function parseArgs(args, errorWithStack)
{
  const parsedArgs = [];
  
  for (let i in args)
    if (args[i] instanceof Error)
      parsedArgs.push(errorWithStack ? args[i].stack : args[i].toString());
    else if (typeof args[i] === 'object')
      parsedArgs.push(JSON.stringify(args[i]));
    else
      parsedArgs.push(args[i]);
  
  return parsedArgs;
}

function log(method, colorizer, tag, ...args)
{
  if (args.length === 0)
  {
    args = [tag];
    tag = tagSpaces;
  }
  else {
    tag = (tag + tagSpaces).substr(0, tagLength);
  }

  const time = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
  const parsedArgs = parseArgs(args, method === console.error);

  method(chalk.gray(time), chalk.blue(tag), colorizer(...parsedArgs));
  
  return args[0];
}

exports.log = function (tag, ...args) {
  return log(console.log, chalk.white, tag, ...args);
}

exports.success = function (tag, ...args) {
  return log(console.log, chalk.green, tag, ...args);
}

exports.error = function (tag, ...args) {
  return log(console.error, chalk.red, tag, ...args);
}
