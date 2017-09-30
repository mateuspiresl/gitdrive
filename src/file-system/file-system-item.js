const errors = require('../errors');
const util = require('../util');
const fs = require('./fs-promise');
const path = require('path');
const Promise = require('bluebird');


class FileSystemItem
{
  constructor (parent, name, remoteId, localPath)
  {
    this.parent = parent;
    this.name = name;
    this.creationDate = new Date().getTime();
    // this.updateDate = this.creationDate;

    if (remoteId) this.linkRemote(id);
    else
    {
      // TODO search for remote
    }

    if (localPath) this.linkLocal(localPath);
  }

  linkRemote (id)
  {
    // TODO
    return Promise.reject(new Error());
  }

  linkLocal (path)
  {
    return fs.existsAsync(path)
      .then(exists => {
        if (exists) this.local = path;
        else throw new errors.InvalidLocalPath(path);
      });
  }

  unlinkRemote () {
    this.remote = undefined;
  }

  unlinkLocal () {
    this.local = undefined;
  }

  removeRemote ()
  {
    if (this.remote)
      // TODO
      return Promise.reject(new Error());
    else
      return Promise.resolve(false);
  }

  removeLocal ()
  {
    if (this.local)
      return fs.unlink(this.local).then(() => true);
    else
      return Promise.resolve(false);
  }

  remove () {
    return this.removeRemote().then(this.removeLocal().bind(this));
  }

  pull ()
  {
    // TODO
    return Promise.reject(new Error());
  }

  push ()
  {
    // TODO
    return Promise.reject(new Error());
  }

  rename (name)
  {

    return new Promise((resolve, reject) => {
        if (this.location !== null) try {
          fs.renameSync(this.location, path.join(this.parent.location, name));
          resolve();
        }
        catch (error) {
          reject(error);
        }
      })
      .then(() => this.name = name);
  }

  // hasLocal (path)
  // {
  //   return fs.existsAsync(path)
  //     .then(exists => {
  //       if (exists) this._localPath = path;
  //       else throw new errors.InvalidLocalPath(path);
  //     });
  // }

  get location () {
    return this._localPath;
  }

  get path () {
    if (this.parent === null) return [this.name];
    else return this.parent.path.concat(this.name);
  }

  static fromLocal(path)
  {

  }
}