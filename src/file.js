class File
{
  constructor (name)
  {
    this.name = name;
    this.creationDate = new Date().getTime();
  }

  toString () {
    return `File { name: ${this.name} }`;
  }

  static parse (fileData)
  {
    if (fileData instanceof File) return fileData;

    const file = new File(fileData.name);
    file.creationDate = fileData.creationDate;
    file.updateDate = fileData.updateDate;
    file.remoteId = fileData.remoteId;
    return file;
  }
}


module.exports = File;