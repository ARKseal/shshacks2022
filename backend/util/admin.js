var admin = require("firebase-admin");

var serviceAccount = require("serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://choice-2022-default-rtdb.firebaseio.com"
});

const db = admin.firestore();
module.exports = { admin, db };
