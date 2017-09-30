const fs            = require('fs');
const path          = require('path');
const readline      = require('readline');
const google        = require('googleapis');
const googleAuth    = require('google-auth-library');

const drive         = google.drive('v3');


fs.readFileAsync = function (filename) {
  return new Promise((resolve, reject) => {
    try {
      resolve(fs.readFileSync(filename));
    } catch (error) {
      reject(error);
    }
  });
}

function log() {
  console.log(...arguments);
  return arguments[0];
}

function handle(resolve, reject) {
  return (error, response) => {
    if (error) return reject(error);
    resolve(response);
  };
}


// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/drive-nodejs-quickstart.json
const SCOPES = ['https://www.googleapis.com/auth/drive'];
const TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
    process.env.USERPROFILE) + '/.credentials/';
const TOKEN_PATH = TOKEN_DIR + 'drive-nodejs-quickstart.json';

const localFile = path.join(__dirname, '../client_secret.json');

try {
  const content = fs.readFileSync(localFile);
  
  // Authorize a client with the loaded credentials, then call the
  // Drive API.
  authorize(JSON.parse(content))
    .then(createFile)

    // .then(listFiles)

    // .then(files => {
    //   if (files.length === 0) return console.log('No files found.');

    //   console.log('Files:');
    //   files.forEach(file => console.log('%s (%s)', file.name, file.id));
    // })

    .catch (error => console.log('The API returned an error:', error));
}
catch (error) {
  console.log('Error loading client secret file: ' + error);
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
    
    .catch(error => {
      return getNewToken(oauth2Client);
    });
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
      
      rl.question('Enter the code from that page here: ', code => {
        rl.close();

        oauth2Client.getToken(code, (error, token) => {
          // Error while trying to retrieve access token
          if (error) return reject(error);
          resolve(token);
        });
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