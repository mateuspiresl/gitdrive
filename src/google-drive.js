const util          = require('./util');
const fs            = util.promisifyFs(require('fs'));
const path          = require('path');
const readline      = require('readline');
const google        = require('googleapis');
const googleAuth    = require('google-auth-library');

const handle        = util.handleGoogleCallback;


// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/drive-nodejs-quickstart.json
const SCOPES = ['https://www.googleapis.com/auth/drive'];
const TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
    process.env.USERPROFILE) + '/.credentials/';
const TOKEN_PATH = TOKEN_DIR + 'gitdrive.json';

const localFile = path.join(__dirname, '../client_secret.json');


class GoogleDrive
{
  constructor ()
  {
    
  }

  connect ()
  {
    return fs.readFileAsync(localFile)
      .then(content => authorize(JSON.parse(content)))
      .then(auth => {
        this.auth = auth;
        this.drive = google.drive({ version: 'v3', auth: this.auth });
      })
      .catch(error => console.log('Error loading client secret file: ' + error));
  }

  init (parent)
  {
    return getRoot(this.drive, parent ? parent : 'root')
      .then(root => {
        this.root = root;
        return getTree(this.drive, root);
      })
      .then(tree => {
        this.tree = tree;
        // TODO
      });
  }
}

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials) {
  console.log(credentials);

  const clientSecret = credentials.installed.client_secret;
  const clientId = credentials.installed.client_id;
  const redirectUrl = credentials.installed.redirect_uris[0];
  const auth = new googleAuth();
  const oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

  // Check if we have previously stored a token
  return fs.readFileAsync(TOKEN_PATH)
    
    .then(token => {
      oauth2Client.credentials = JSON.parse(token);
      return oauth2Client;
    })
    
    .catch(error => getNewToken(oauth2Client));
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

      console.log('Authorize this app by visiting this url: ', authUrl);
      
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
    console.log('Token stored to ' + TOKEN_PATH);
    resolve();
  });
}


function getRoot(drive, parent) {
  return new Promise((resolve, reject) => {
      const options = {
        q: "'" + parent + "' in parents and name = '.gitdrive'",
        fields: 'files(id)',
        spaces: 'drive'
      };

      return drive.files.list(options, handle(resolve, reject));
    })

    .then(response => {
      // Root folder found
      if (response.files.length > 0)
        return response.files[0];
      
      // Root folder not found, create it
      const rootMeta = {
        name: '.gitdrive',
        mimeType: 'application/vnd.google-apps.folder'
      };

      const options = { resource: rootMeta, fields: 'id' };
      return drive.files.create(options, handle(resolve, reject));
    })

    .then(file => file.id);
}

function getTree(drive, root) {
  return new Promise((resolve, reject) => {
      const options = {
        q: "'" + root + "' in parents and name = '.tree'",
        fields: 'files(id)',
        spaces: 'drive'
      };

      return drive.files.list(options, handle(resolve, reject));
    })

    .then(response => {
      // Tree not found
      if (response.files.length === 0) return {};
      
      // Tree found: download and parse
      return new Promise((resolve, reject) => {
          const content = new Buffer();
          const options = {
            fileId: response.files[0].id,
            alt: 'media'
          };
          
          drive.files.get(options)
            .on('data', chunk => content += chunk)
            .on('end', () => resolve(content))
            .on('error', reject);
        })
        .then(JSON.parse);
    })

    .then(file => file.id);
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

function createFile(auth) {
  return new Promise((resolve, reject) => {
    const options = {
      auth: auth,
      resource: { name: 'Test', mimeType: 'text/plain' },
      media: { mimeType: 'text/plain', body: 'Hello World' }
    };

    drive.files.create(options, handle(resolve, reject));
  });
}