const util = require('./util');
const File = require('./file');


class Tree
{
  constructor () {
    this.content = {};
  }

  add (fileName)
  {
    if (this.content[fileName])
    {
      const file = File.parse(this.content[fileName]);
      return file;
    }
    else
    {
      const file = new File(fileName);
      this.content[fileName] = file;
      return file;
    }
  }

  get (fileName) {
    return this.content[fileName];
  }

  list ()
  {
    const list = [];

    for (let fileName in this.content)
      list.push(fileName);

    return list;
  }

  remove (fileName)
  {
    const file = this.content[fileName];

    if (file)
    {
      delete this.content[fileName];
      return file;
    }
    else return false;
  }

  toString () {
    return JSON.stringify(this);
  }

  static parse (treeObject)
  {
    const tree = new Tree();
    tree.content = treeObject.content;
    return tree;
  }
}


module.exports = Tree;