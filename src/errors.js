class GitDriveError extends Error {
  constructor (message) {
    super(message);
    this.name = new.targe.name;
  }
}

// class SimpleMessageError extends GitDriveError {
//   constructor (message, defaultMessage) {
//     super(message ? message : defaultMessage);
//   }
// }


// FileSystemItem
class InvalidLocalPath extends GitDriveError { constructor (path) { super(`The path ${path} doesn't exist`) } }
// File
class MissingLocalPath extends GitDriveError { constructor (name) { super(`The file ${name} has no local path`) } }
class FileNotFound extends GitDriveError { constructor (path) { super(`The file ${path} wasn't found`) } }

exports.InvalidLocalPath = InvalidLocalPath;
exports.MissingLocalPath = MissingLocalPath;
exports.FileNotFound = FileNotFound;