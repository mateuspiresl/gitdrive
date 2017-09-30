
class Tree
{
  constructor ()
  {
    this.files;
  }

  createFolder (parent, name)
  {
    if (typeof parent === 'string')
    {
      
    }
  }

  getByPath (path)
  {
    const tokens = path.split('/');
    let folder = this.files;

    for (let token in tokens)
  }

  static parse (content)
  {

  }
}