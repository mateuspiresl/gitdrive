const util          = require('./util');
const Tree          = require('./tree');
const fs            = require('fs');
const path          = require('path');
const readline      = require('readline');
const google        = require('googleapis');
const googleAuth    = require('google-auth-library');

const handle        = util.callbackToPromise;


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
  }

  async connect ()
  {
    const clientSecretFile = fs.readFileSync(CLIENT_SECRET_PATH);
    this.auth = await authorize(JSON.parse(clientSecretFile));
    
    const drive = google.drive({ version: 'v3', auth: this.auth });
    this.drive = util.promisifyDrive(drive, ['list', 'create', 'update']);
  }

  async init (localParent, remoteParent)
  {
    this.remoteParent = remoteParent ? remoteParent : 'root';
    this.localParent = localParent;
    this.rootId = await this._initRootFolder(this.remoteParent);
    this.treeId = await this._getTreeFileId(this.rootId);
    this.treePath = path.join(this.localParent, TREE_FILE_NAME);

    // Pull remote .tree file
    if (this.treeId)
    {
      util.log('Pulling tree file:', this.treeId);
      await this._pullFile(this.treeId, TREE_FILE_NAME);
      util.log('Tree file pulled to', this.treePath);
      
      const treeContent = fs.readFileSync(this.treePath);
      this.tree = Tree.parse(JSON.parse(treeContent));
      util.log('Tree updated', this.tree);
    }
    // No .tree remote file
    // Create and push .tree file
    else
    {
      util.log('Creating and pushing tree file');

      if (fs.existsSync(this.treePath))
      {
        const treeContent = fs.readFileSync(this.treePath);
        this.tree = Tree.parse(JSON.parse(treeContent));

        util.log('Tree file read from', this.treePath);
      }
      else {
        this.tree = new Tree();
        fs.writeFileSync(this.treePath, this.tree.toString(), 'utf-8');

        util.log('Tree file created at', this.treePath);
      }
      
      this.treeId = await this._pushFile(TREE_FILE_NAME, this.treePath);
      util.log('Tree file pushed:', this.treeId);
    }
  }

  list () {
    return this.tree.content;
  }

  async add (fileName)
  {
    util.log('Adding', fileName);

    const file = this.tree.add(fileName);
    const filePath = path.join(this.localParent, fileName);

    if (file.remoteId)
      await this._updateFile(file.remoteId, filePath);
    else
      file.remoteId = await this._pushFile(fileName, filePath);

    util.log('Pushed ', file);

    this._saveTreeFile();
    return file;
  }

  async _initRootFolder (parent)
  {
    // Search
    const response = await this.drive.files.listAsync({
      q: `'${parent}' in parents and name='${ROOT_FILE_NAME}'`,
      fields: 'files(id)',
      spaces: 'drive'
    });
    
    // Found, return id
    if (response.files.length > 0)
    {
      util.log('Root folder exists');
      return response.files[0].id;
    }

    util.log('Root folder does not exist, creating');
    
    // Not found, create and return id
    this.rootId = await this.drive.files.createAsync({
      fields: 'id',
      resource: {
        name: ROOT_FILE_NAME,
        mimeType: 'application/vnd.google-apps.folder'
      }
    }).id;

    util.log('Root folder created');
  }

  async _getTreeFileId ()
  {
    const response = await this.drive.files.listAsync({
      q: `'${this.rootId}' in parents and name='${TREE_FILE_NAME}'`,
      fields: 'files(id)',
      spaces: 'drive'
    });

    if (response.files.length === 0) {
      util.log('Tree file does not exist');
      return null;
    }
    else {
      util.log('Tree file exists');
      return response.files[0].id;
    }
  }

  async _saveTreeFile()
  {
    util.log('Updating tree file')

    fs.writeFileSync(this.treePath, this.tree.toString(), 'utf-8');      
    this.treeId = await this._updateFile(this.treeId, this.treePath);

    util.log('Tree file updated', this.treeId);
  }

  async _pullFile (id, localPath)
  {
    return new Promise((resolve, reject) => {
        const destination = fs.createWriteStream(localPath);
        const options = {
          fileId: id,
          alt: 'media'
        };
        
        this.drive.files.get(options)
          .on('end', resolve)
          .on('error', reject)
          .pipe(destination);
          // .on('data', chunk => content += chunk)
      });
      // .then(content => {
      //   fs.writeFileSync(localPath, content);
      // });
  }

  async _pushFile (name, localPath)
  {
    util.log('Pushing', name);
    
    const file = await this.drive.files.createAsync({
      fields: 'id',
      resource: {
        name: name,
        parents: [this.rootId]
      },
      media: {
        body: fs.createReadStream(localPath)
      }
    });

    return file.id;
  }

  async _updateFile (id, localPath)
  {
    util.log('Updating', id);

    const file = await this.drive.files.updateAsync({
      fileId: id,
      media: {
        body: fs.createReadStream(localPath)
      }
    });

    return file.id;
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

      util.log('Authorize this app by visiting this url: ', authUrl);
      
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
    util.log('Token stored to ' + TOKEN_PATH);
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