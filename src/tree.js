const util = require('./util');


class Tree
{
  constructor ()
  {
    this.count = 0;
    this.content = {};
  }

  add (fileName)
  {
    util.log('Searching %s at', fileName, this.content);

    if (this.content[fileName])
    {
      const file = this.content[fileName];
      util.log('Found', file);
      
      file.updateDate = new Date().getTime();
      return file;
    }
    else
    {
      const file = {
        name: fileName,
        creationDate: new Date().getTime()
      };
      util.log('Creating', file);
  
      this.content[fileName] = file;
      return file;
    }
  }

  toString ()
  {
    return JSON.stringify({
      count: this.count,
      content: this.content
    });
  }

  static parse (treeObject)
  {
    util.log('Tree parsed from', treeObject);

    const tree = new Tree();

    tree.content = treeObject.content;
    tree.count = treeObject.count;

    return tree;
  }
}


module.exports = Tree;