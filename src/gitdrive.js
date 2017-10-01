const GoogleDrive = require('./google-drive');
const path = require('path');
const fs = require('fs');


const gdrive = new GoogleDrive();
const filePath = path.join(__dirname, '../test/file.txt');

gdrive.connect()
  .then(() => gdrive.init(path.join(__dirname, '../test')))
  .then(() => {
    fs.writeFileSync(filePath, 'test content', 'utf-8');
    return gdrive.add('file.txt');
  })
  .then(() => {
    fs.writeFileSync(filePath, 'test content 2', 'utf-8');
    return gdrive.add('file.txt');
  })
  .catch(console.error);