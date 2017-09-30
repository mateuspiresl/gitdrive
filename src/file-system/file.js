const errors = require('../errors');
const util = require('../util');
const fs = require('./fs-promise');
const Promise = require('bluebird');


class File extends FileSystemItem
{
  constructor (gdrive, parent, name) {
    super(gdrive, parent, name);

    this._cache
  }

  read (keepCache, encoding)
  {
    if (!this.location) return Promise.reject(new errors.MissingLocalPath(this.name));
    return fs.readFileAsync(this.location, encoding);
  }

  get path () {
    if (this.parent === null) return [this.name];
    else return this.parent.path.concat(this.name);
  }
}