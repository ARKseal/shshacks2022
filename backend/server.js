let express = require('express')
let bodyParser = require('body-parser')
let cors = require('cors')
let cron = require('node-cron')
let admin = require('firebase-admin')
let { initializeApp, applicationDefault, cert } = require('firebase-admin/app')
let { getFirestore, Timestamp, FieldValue } = require('firebase-admin/firestore')
let crypto = require('crypto')
let request = require('request');
let nodemailer = require('nodemailer');
require('dotenv').config();

let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.USER_EMAIL,
        pass: process.env.USER_PASSWORD
    }
});

// initialize Firestore
let serviceAccount = require('./serviceAccountKey.json')
const { read } = require('fs')

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
})

let db = getFirestore()

let app = express()
app.use(cors({
    origin: '*'
}))

let jsonParser = bodyParser.json()
const PORT = 8000

async function verifyIDToken(token) {
    return 1
    try {
        let decodedToken = await admin.auth().verifyIdToken(token)
        return decodedToken.uid
    } catch (e) {
        return null
    }
}

async function makeUser(data) {
    let preservedData = {}
    console.log(data)
    try {
        preservedData.name = data.name
        preservedData.email = data.email
        preservedData.username = data.username
        preservedData.data = []
        preservedData.emergencyContacts = []
    } catch (e) {
        return {
            data: null,
            message: 'Please format the data correctly.',
            status: 400
        }
    }

    await db.collection('users').doc(preservedData.username).set(preservedData)
    let doc = await db.collection('users').doc(preservedData.username).get()

    return {
        data: await doc.data(),
        message: 'Successful.',
        status: 200
    }
}

async function makeSpecialContact(data) {
    let preservedData = {}
    let username = ''
    console.log(data)
    try {
        username = data.user.username
        preservedData.name = data.contact.name
        preservedData.email = data.contact.email
    } catch (e) {
        return {
            data: null,
            message: 'Please format the data correctly.',
            status: 400
        }
    }

    let ref = db.collection('users').doc(username);

    try {
        let res = await db.runTransaction(async t => {
            await t.update(ref, {
                emergencyContacts: FieldValue.arrayUnion(preservedData)
            });
        });
    } catch (e) {
        return {
            data: null,
            message: 'Unable to add special contact.',
            status: 400
        }
    }

    let doc = await ref.get()

    return {
        data: await doc.data(),
        message: 'Successful.',
        status: 200
    }
}

async function removeSpecialContact(data) {
    let username = ''
    let preservedData = {}
    console.log(data)
    try {
        username = data.user.username
        preservedData.name = data.contact.name
        preservedData.email = data.contact.email
    } catch (e) {
        return {
            data: null,
            message: 'Please format the data correctly.',
            status: 400
        }
    }

    let ref = db.collection('users').doc(username);

    try {
        let res = await db.runTransaction(async t => {
            await t.update(ref, {
                emergencyContacts: FieldValue.arrayRemove(preservedData)
            });
        });
    } catch (e) {
        return {
            data: null,
            message: 'Unable to remove special contact.',
            status: 400
        }
    }

    let doc = await ref.get()

    return {
        data: await doc.data(),
        message: 'Successful.',
        status: 200
    }
}

async function sendEmails(userData, count) {
    for (person in data.emergencyContacts) {
        var mailOptions = {
            from: process.env.USER_EMAIL,
            to: person.email,
            subject: 'Emergency Alert: ' + userData.name + ' might need your help! - noreply',
            text: 'You were added as an emergency contact for ' + userData.name + '.' +
                userData.name + ' was generally writing with strong negative connotation about themselves for ' + count + ' days out of the last 4 weeks. ' +
                'Contact him at ' + userData.email + ' or in person... You can help him as this is the start of many mental illness like depression, anxiety, and bipolar disorder.' +
                'SAVE HIM!\n\n' +
                'This is an automated message. Please do not reply to this email.'
        };

        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                console.log(error);
            } else {
                console.log('Email sent: ' + info.response);
            }
        });
    }
}

async function analyzeText(form) {
    var polarity = 0
    var subjectivity = 0

    let url = 'http://localhost:5050/text/'
    request.post({
        headers: { 'content-type': 'application/json' },
        url: url,
        body: JSON.stringify(form)
    }, function optionalCallback(err, res, body) {
        if (err) {
            console.error('upload failed:', err);
            return {
                data: null,
                message: 'Unable to add special contact.',
                status: 400
            }
        }
        console.log('Upload successful!  Server responded with:', body);
        polarity = body.polarity,
        subjectivity = body.subjectivity
    });
    return {
        polarity: polarity,
        subjectivity: subjectivity
    }
}

function isInToday(inputDate) {
    var today = new Date();
    return today.setHours(0, 0, 0, 0) == inputDate.setHours(0, 0, 0, 0);
}

async function addText(data) {
    let form = {}
    let username = ''
    try {
        username = data.user.username
        form.text = data.text
    } catch (e) {
        return {
            data: null,
            message: 'Please format the data correctly.',
            status: 400
        }
    }
    d = await analyzeText(form);
    let polarity = d.polarity
    let subjectivity = d.subjectivity
    console.log(d)

    let ref = db.collection('users').doc(username);
    try {
        let currData = await ref.get()
        console.log(currData);
        if (Object.keys(currData.data).length == 28) {
            let count = 0;
            for (obj in currData.data) {
                if (obj.subjectivity > 0.7 && obj.polarity < 0) {
                    count++;
                }
            }
            if (count >= 21) {
                sendEmails(currData, count);
            }
            t.update(ref, {
                data: FieldValue.arrayRemove(currData.data[0])
            });
        }

        if (currData.data.length > 0 && isInToday(new Date(currData.data[-1].time))) {
            polarity += currData.data[-1].polarity;
            polarity /= 2;

            subjectivity += currData.data[-1].subjectivity;
            subjectivity /= 2;
            t.update(ref, {
                data: FieldValue.arrayRemove(currData.data[-1])
            });
        }

        ref.update({
            emergencyContacts: FieldValue.arrayUnion({
                time: Date.now(),
                polarity: polarity,
                subjectivity: subjectivity
            })
        });

        return {
            data: currData,
            message: 'Successful.',
            status: 200
        }
    } catch (e) {
        console.log(e)
        return {
            data: null,
            message: 'Unable to add special data.',
            status: 400
        }
    }
}

app.post('/addUser', jsonParser, async (req, res) => {
    let uid = await verifyIDToken(req.body.token)
    if (uid == null) {
        res.status(401)
        res.send({
            code: 401,
            message: 'Please send a valid authentication token.'
        })
    }
    else {
        // body needs name, email and username
        console.log(req)
        let result = await makeUser(req.body.data)
        res.status(result.status)
        res.send({
            code: result.status,
            message: result.message,
            data: result.data
        })
    }
})

app.post('/addSpecialContact', jsonParser, async (req, res) => {
    let uid = await verifyIDToken(req.body.token)
    if (uid == null) {
        res.status(401)
        res.send({
            code: 401,
            message: 'Please send a valid authentication token.'
        })
    }
    else {
        // body needs name and email
        let result = await makeSpecialContact(req.body.data)
        res.status(result.status)
        res.send({
            code: result.status,
            message: result.message,
            data: result.data
        })
    }
})

app.post('/removeSpecialContact', jsonParser, async (req, res) => {
    let uid = await verifyIDToken(req.body.token)
    if (uid == null) {
        res.status(401)
        res.send({
            code: 401,
            message: 'Please send a valid authentication token.'
        })
    }
    else {
        // body needs name and email
        let result = await removeSpecialContact(req.body.data)
        res.status(result.status)
        res.send({
            code: result.status,
            message: result.message,
            data: result.data
        })
    }
})

app.post('/addText', jsonParser, async (req, res) => {
    let uid = await verifyIDToken(req.body.token)
    if (uid == null) {
        res.status(401)
        res.send({
            code: 401,
            message: 'Please send a valid authentication token.'
        })
    }
    else {
        let result = await addText(req.body.data)
        res.status(result.status)
        res.send({
            code: result.status,
            message: result.message,
            data: result.data
        })
    }
})

app.listen(PORT, async () => {
    console.log('API Listening at localhost')
})
