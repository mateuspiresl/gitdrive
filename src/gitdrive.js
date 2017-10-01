const GoogleDrive = require('./google-drive');
const util = require('./util');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs');


const gdrive = new GoogleDrive();
const fileName = 'file.txt';
const fileName2 = 'file2.txt';
const filePath = path.join(__dirname, '../test', fileName);
const filePath2 = path.join(__dirname, '../test', fileName2);

gdrive.connect()
  .then(() => gdrive.init(path.join(__dirname, '../test')))
  .then(() => {
    util.log('write file 1')
    fs.writeFileSync(filePath, 'test content', 'utf-8');
    util.log('add file 1')
    gdrive.add(fileName);
    util.log('push file 1')
    return gdrive.push();
  })
  .then(() => {
    util.log('write file 1 and 2')
    fs.writeFileSync(filePath, 'test content 2', 'utf-8');
    fs.writeFileSync(filePath2, 'test 2 content', 'utf-8');
    util.log('add file 1 and 2')
    gdrive.add(fileName);
    gdrive.add(fileName2);
    util.log('push file 1 and 2')
    return gdrive.push();
  })
  .then(() => {
    util.log('remove local file 1')
    fs.unlinkSync(filePath);
    if (fs.existsSync(filePath)) throw new Error('File not removed from local');
    util.log('pull file 1')
    return gdrive.pull(fileName);
  })
  .then(() => {
    if (!fs.existsSync(filePath)) throw new Error('File not pulled');
    util.log('file 1 is local')

    const list = gdrive.list();
    list.forEach(file => {
      util.log('remove remote' + file)
      gdrive.remove(file);
    });
    util.log('push removes')
    return gdrive.push();
  })
  .then(() => {
    util.log('add file 1 and 2')
    gdrive.add(fileName);
    gdrive.add(fileName2);
    util.log('push file 1 and 2')
    return gdrive.push();
  })
  .catch(util.error);