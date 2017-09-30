class Folder extends File
{
  constructor (parent, name)
  {
    super(parent, name);
    this.content = [];
  }

  search (name)
  {
    for (let file in this.content)
    {
      if (file.name === name)
        return name
    }
  }
}