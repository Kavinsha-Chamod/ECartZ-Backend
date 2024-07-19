const admin = require('firebase-admin');

const serviceAccount = require('../config/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://ecartzapp-default-rtdb.asia-southeast1.firebasedatabase.app/'
});

module.exports = admin;
