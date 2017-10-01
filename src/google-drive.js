const util          = require('./util');
const File          = require('./file');
const Tree          = require('./tree');
const fs            = require('fs');
const path          = require('path');
const readline      = require('readline');
const google        = require('googleapis');
const googleAuth    = require('google-auth-library');

const handle        = util.callbackToPromise;

log = (tag, ...args) => util.log('GDrive.' + tag, ...args);
error = (tag, ...args) => util.error('GDrive.' + tag, ...args);
success = (tag, ...args) => util.success('GDrive.' + tag, ...args);


// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/drive-nodejs-quickstart.json
const SCOPES = ['https://www.googleapis.com/auth/drive'];
const TOKEN_DIR = path.join(process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE, '.credentials');
const TOKEN_PATH = path.join(TOKEN_DIR, 'gitdrive.json');
const CLIENT_SECRET_PATH = path.join(__dirname, '../client_secret.json');


const ROOT_FILE_NAME = '.gitdrive';
const TREE_FILE_NAME = '.tree.json';

class GoogleDrive
{
  constructor ()
  {
    this.staged = [];
    this.stagedForDelete = [];
  }

  async connect ()
  {
    const clientSecretFile = fs.readFileSync(CLIENT_SECRET_PATH);
    this.auth = await authorize(JSON.parse(clientSecretFile));
    
    const drive = google.drive({ version: 'v3', auth: this.auth });
    this.drive = util.promisifyDrive(drive, ['list', 'create', 'update', 'delete']);
  }

  async init (localParent, remoteParent)
  {
    this.remoteParent = remoteParent ? remoteParent : 'root';
    this.localParent = localParent;
    
    await this._initRootFolder(this.remoteParent);
    
    this.treeFile = new File(TREE_FILE_NAME);
    this.treeFile.remoteId = await this._getTreeFileId(this.rootId);
    this.treePath = path.join(this.localParent, TREE_FILE_NAME);

    // Pull remote .tree file
    if (this.treeFile.remoteId)
    {
      await this._pullFile(this.treeFile);
      log('init', 'Tree file pulled to', this.treePath);
      
      const treeContent = fs.readFileSync(this.treePath);
      this.tree = Tree.parse(JSON.parse(treeContent));
      log('init', 'Tree updated');
    }
    // No .tree remote file
    // Create and push .tree file
    else
    {
      this.tree = new Tree();
      log('init', 'Tree created');
      this._saveTreeFile();
    }
  }

  list () {
    return this.tree.list();
  }

  add (fileName)
  {
    const file = this.tree.add(fileName);
    this.staged.push(file);
    
    log('add', 'Staged', file.name);
    return file;
  }

  remove (fileName)
  {
    const file = this.tree.get(fileName);
    if (!file) throw new Error('File ' + fileName + ' does not exist on remote');

    log('remove', 'Staged for delete', file.name)
    this.stagedForDelete.push(file);
  }

  reset (fileName)
  {
    if (fileName)
    {
      log('reset', 'Reset staged', fileName);
      
      const onStaged = this.staged.indexOf(fileName);
      if (onStaged !== -1) return this.staged.splice(onStaged, 1);
      
      const onStagedForDelete = this.stagedForDelete.indexOf(fileName);
      if (onStaged !== -1) return this.stagedForDelete.splice(onStaged, 1);
    }
    else
    {
      log('reset', 'Reset', this.staged.length + this.stagedForDelete.length, 'staged files');
      
      this.staged = [];
      this.stagedForDelete = [];
    }
  }

  async push ()
  {
    if (this.staged.length > 0)
      await this._pushFile(this.staged.splice(0, 1)[0]);

    else if (this.stagedForDelete.length > 0)
    {
      const file = await this._removeFile(this.stagedForDelete.splice(0, 1)[0]);
      this.tree.remove(file.name);
    }

    else throw new Error('No files staged for push');

    try {
      await this.push();
    }
    catch (error) {
      if (error.message === 'No files staged for push')
        await this._saveTreeFile();
      else
        throw error;
    }
  }

  async pull (fileName)
  {
    const file = this.tree.get(fileName);
    if (!file) throw new Error('File ' + fileName + ' does not exist on remote');
    
    await this._pullFile(file);
  }

  async _initRootFolder (parent)
  {
    // Search
    const response = await this.drive.files.listAsync({
      q: `'${parent}' in parents and name='${ROOT_FILE_NAME}'`,
      fields: 'files(id)',
      spaces: 'drive'
    });
    
    // Found, set id
    if (response.files.length > 0)
    {
      log('_initRootFolder', 'Root folder exists');
      this.rootId = response.files[0].id;
    }
    // Not found, create a set id
    else
    {
      log('_initRootFolder', 'Root folder does not exist, creating');
      
      // Not found, create and return id
      const root = await this.drive.files.createAsync({
        fields: 'id',
        resource: {
          name: ROOT_FILE_NAME,
          mimeType: 'application/vnd.google-apps.folder'
        }
      });
  
      this.rootId = root.id;
      success('_initRootFolder', 'Root folder created');
    }
  }

  async _getTreeFileId ()
  {
    const response = await this.drive.files.listAsync({
      q: `'${this.rootId}' in parents and name='${TREE_FILE_NAME}'`,
      fields: 'files(id)',
      spaces: 'drive'
    });

    if (response.files.length === 0) {
      log('_getTreeFileId', 'Tree file does not exist');
      return null;
    }
    else {
      log('_getTreeFileId', 'Tree file exists');
      return response.files[0].id;
    }
  }

  async _saveTreeFile()
  {
    fs.writeFileSync(this.treePath, this.tree.toString(), 'utf-8');      
    await this._pushFile(this.treeFile);
  }

  async _pullFile (file)
  {
    const filePath = path.join(this.localParent, file.name);
    const destination = fs.createWriteStream(filePath);
    const options = { fileId: file.remoteId, alt: 'media' };

    return new Promise((resolve, reject) => {
      this.drive.files.get(options)
        .on('end', () => {
          success('_pullFile', 'Pulled', file.name);
          resolve(file);
        })
        .on('error', reject)
        .pipe(destination);
    });
  }

  async _pushFile (file)
  {
    const filePath = path.join(this.localParent, file.name);    
    const stream = fs.createReadStream(filePath);

    if (file.remoteId)
    {
      await this.drive.files.updateAsync({
        fileId: file.remoteId,
        media: { body: stream }
      });
    }
    else
    {
      file.remoteId = (await this.drive.files.createAsync({
        fields: 'id',
        resource: { name: file.name, parents: [this.rootId] },
        media: { body: stream }
      })).id;
    }

    file.updateDate = new Date().getTime();

    success('_pushFile', 'Pushed', file.name);
    return file;
  }
  
  async _removeFile (file)
  {
    await this.drive.files.deleteAsync({
      fileId: file.remoteId
    });

    success('_pushFile', 'Pushed removal', file.name);
    return file;
  }
}


module.exports = GoogleDrive;


/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
async function authorize(credentials) {
  const clientSecret = credentials.installed.client_secret;
  const clientId = credentials.installed.client_id;
  const redirectUrl = credentials.installed.redirect_uris[0];
  const auth = new googleAuth();
  const oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

  // Check if we have previously stored a token
  try {
    const token = fs.readFileSync(TOKEN_PATH);
    oauth2Client.credentials = JSON.parse(token);
    return oauth2Client;
  }
  catch (error) {
    return getNewToken(oauth2Client);
  }
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */
function getNewToken(oauth2Client) {
  return new Promise((resolve, reject) => {
      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES
      });

      log('Authorize this app by visiting this url: ', authUrl);
      
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      rl.question('Enter the code from that page here:', code => {
        rl.close();
        oauth2Client.getToken(code, handle(resolve, reject));
      });
    })

    .then(token => {
      oauth2Client.credentials = token;
      return storeToken(token);
    })
    
    .then(() => oauth2Client);
}

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
function storeToken(token) {
  return new Promise((resolve, reject) => {
    try {
      fs.mkdirSync(TOKEN_DIR);
    }
    catch (err) {
      if (err.code != 'EEXIST') reject(err);
    }

    fs.writeFileSync(TOKEN_PATH, JSON.stringify(token));
    log('Token stored to ' + TOKEN_PATH);
    resolve();
  });
}


/**
 * Lists the names and IDs of up to 10 files.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function listFiles(auth) {
  return new Promise((resolve, reject) => {
      const options = {
        auth: auth,
        pageSize: 10,
        fields: "nextPageToken, files(id, name)"
      };
      
      drive.files.list(options, handle(resolve, reject));
    })
    .then(response => response.files);
}