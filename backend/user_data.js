const { admin, db } = require("../util/admin");
const { firebase, app, analytics, auth } = require("../util/firebase");


exports.validateUser = (idToken) => {
    return new Promise((resolve, reject) => {
        auth.verifyIdToken(idToken).then(decodedIdToken => {
            console.log('ID Token correctly decoded', decodedIdToken);
            admin.auth().getUser(decodedIdToken.uid).then((userRecord) => {
                return resolve(userRecord);
            }).catch(error => {
                console.error('Error while getting Firebase User record:', error);
                return reject({ code: 403, error: 'Unauthorized' });
            });
        }).catch(error => {
            console.error('Error while verifying Firebase ID token:', error);
            return reject({ code: 403, error: 'Unauthorized' });
        });
    });
}

exports.getUserData = (userRecord) => {
    return new Promise((resolve, reject) => {
        db.collection('users').doc(userRecord.uid).get().then(doc => {
            return resolve(doc.data());
        }).catch(error => {
            console.error('Error while getting user data:', error);
            return reject({ code: 500, error: 'Internal server error' });
        });
    });
}

exports.createUserData = (userRecord, data) => {
    const res = await db.collection('users').doc(userRecord.uid).set(data);
}

exports.updateUserData = (userRecord, data) => {
    const res = await db.collection('users').doc(userRecord.uid).update(data);
}
