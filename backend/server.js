let express = require('express')
let bodyParser = require('body-parser')
let cors = require('cors')
let cron = require('node-cron')
let admin = require('firebase-admin')
let { initializeApp, applicationDefault, cert } = require('firebase-admin/app')
let { getFirestore, Timestamp, FieldValue } = require('firebase-admin/firestore')
let crypto = require('crypto')
const request = require("request");

// initialize Firestore
let serviceAccount = require('./serviceAccountKey.json')

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
})

let db = getFirestore()

let app = express()
app.use(cors({
    origin: "*"
}))

let jsonParser = bodyParser.json()
const PORT = 8000

async function verifyIDToken(token) {
    try {
        let decodedToken = await admin.auth().verifyIdToken(token)
        return decodedToken.uid
    } catch (e) {
        return null
    }
}

async function makeUser(userData) {
    let preservedData = {}
    try {
        preservedData.name = userData.name
        preservedData.email = userData.email
        preservedData.data = []
        preservedData.emergencyContacts = []
    } catch (e) {
        return {
            data: null,
            message: "Please format the data correctly.",
            status: 400
        }
    }

    await db.collection('users').doc(preservedData.username).set(preservedData)
    let doc = await db.collection('users').doc(preservedData.username).get()

    return {
        data: await doc.data(),
        message: "Successful.",
        status: 200
    }
}

async function makeSpecialContact(userData, contactData) {
    let preservedData = {}
    try {
        preservedData.name = contactData.name
        preservedData.email = contactData.email
    } catch (e) {
        return {
            data: null,
            message: "Please format the data correctly.",
            status: 400
        }
    }

    let ref = db.collection('users').doc(userData.username);

    try {
        let res = await db.runTransaction(async t => {
            await t.update(ref, {
                emergencyContacts: FieldValue.arrayUnion(preservedData)
            });
        });
    } catch (e) {
        return {
            data: null,
            message: "Unable to add special contact.",
            status: 400
        }
    }

    let doc = await ref.get()

    return {
        data: await doc.data(),
        message: "Successful.",
        status: 200
    }
}

async function removeSpecialContact(userData, contactData) {
    let preservedData = {}
    try {
        preservedData.name = contactData.name
        preservedData.email = contactData.email
    } catch (e) {
        return {
            data: null,
            message: "Please format the data correctly.",
            status: 400
        }
    }

    let ref = db.collection('users').doc(userData.username);

    try {
        let res = await db.runTransaction(async t => {
            await t.update(ref, {
                emergencyContacts: FieldValue.arrayRemove(preservedData)
            });
        });
    } catch (e) {
        return {
            data: null,
            message: "Unable to remove special contact.",
            status: 400
        }
    }

    let doc = await ref.get()

    return {
        data: await doc.data(),
        message: "Successful.",
        status: 200
    }
}

async function sendEmails(userData) {

}

async function analyzeText(form) {
    let url = "http://localhost:5050/text/"
    request.post({
        headers: {'content-type' : 'application/json'},
        url: url,
        body: JSON.stringify(form)
    }, function optionalCallback(err, res, body) {
        if (err) {
            console.error('upload failed:', err);
            return {
                data: null,
                message: "Unable to add special contact.",
                status: 400
            }
        }
        console.log('Upload successful!  Server responded with:', body);
        return {
            polarity: body.polarity,
            subjectivity: body.subjectivity
        }
    });
}

async function addText(userData, data) {
    let form = {};
    try {
        form.text = data.text
    } catch (e) {
        return {
            data: null,
            message: "Please format the data correctly.",
            status: 400
        }
    }
    d = analyzeText(form);
    let polarity = d.polarity
    let subjectivity = d.subjectivity

    let ref = db.collection('users').doc(userData.username);
    try {
        let res = await db.runTransaction(async t => {
            currData = await t.get(ref).data();
            if (Object.keys(currData.data).length == 28) {
                let count = 0;
                for (obj in currData.data) {
                    if (obj.subjectivity > 0.7 && obj.polarity < 0) {
                        count++;
                    }
                }
                if (count >= 21) {
                    sendEmails(userData);
                }
                await t.update(ref, {
                    data: FieldValue.arrayRemove(currData.data[0])
                });
            }

            await t.set(ref, {
                emergencyContacts: FieldValue.arrayUnion({
                    time: Timestamp(Date.now()),
                    polarity: polarity,
                    subjectivity: subjectivity
                })
            });
        });
    } catch (e) {
        return {
            data: null,
            message: "Unable to add special contact.",
            status: 400
        }
    }
}


async function makeClass(classData) {
    let preservedData = {}
    try {
        preservedData.teacher = classData.teacher
    } catch (e) {
        return {
            data: null,
            message: "Please format the data correctly.",
            status: 400
        }
    }

    let id = crypto.randomBytes(20).toString('hex')
    await db.collection('classes').doc(id).set(preservedData)
    await db.collection('classes').doc(id).update({
        classID: id
    })
    let doc = await db.collection('classes').doc(id).get()

    return {
        data: await doc.data(),
        message: "Successful.",
        status: 200
    }
}

async function makeLesson(lessonData) {
    let preservedData = {}
    try {
        preservedData.timestampGMT = lessonData.timestampGMT
        preservedData.classID = lessonData.classID
    } catch (e) {
        return {
            data: null,
            message: "Please format the data correctly.",
            status: 400
        }
    }

    let id = crypto.randomBytes(20).toString('hex')
    await db.collection('classes').doc(preservedData.classID).collection('lessons').doc(id).set(preservedData)
    await db.collection('classes').doc(preservedData.classID).collection('lessons').doc(id).update({
        lessonID: id,
    })
    let doc = await db.collection('classes').doc(preservedData.classID).collection('lessons').doc(id).get()

    return {
        data: await doc.data(),
        message: "Successful.",
        status: 200
    }
}

async function makePost(postData, authorUID) {
    let preservedData = {}
    try {
        preservedData.timestampGMT = postData.timestampGMT
        preservedData.classID = postData.classID
        preservedData.postContent = postData.postContent
    } catch (e) {
        return {
            data: null,
            message: "Please format the data correctly.",
            status: 400
        }
    }

    let id = crypto.randomBytes(20).toString('hex')
    await db.collection('classes').doc(preservedData.classID).collection('posts').doc(id).set(preservedData)
    await db.collection('classes').doc(preservedData.classID).collection('posts').doc(id).update({
        postID: id,
        postAuthor: authorUID
    })
    let doc = await db.collection('classes').doc(preservedData.classID).collection('posts').doc(id).get()

    return {
        data: await doc.data(),
        message: "Successful.",
        status: 200
    }
}

async function makeAssignment(assignmentData, authorUID) {
    let preservedData = {}
    try {
        preservedData.timestampGMT = assignmentData.timestampGMT
        preservedData.classID = assignmentData.classID
        preservedData.assignmentContent = assignmentData.assignmentContent
    } catch (e) {
        return {
            data: null,
            message: "Please format the data correctly.",
            status: 400
        }
    }

    let id = crypto.randomBytes(20).toString('hex')
    await db.collection('classes').doc(preservedData.classID).collection('assignments').doc(id).set(preservedData)
    await db.collection('classes').doc(preservedData.classID).collection('assignments').doc(id).update({
        assignmentID: id,
        assignmentAuthor: authorUID
    })
    let doc = await db.collection('classes').doc(preservedData.classID).collection('assignments').doc(id).get()

    return {
        data: await doc.data(),
        message: "Successful.",
        status: 200
    }
}

async function makeSubmission(submissionData, authorUID) {
    let preservedData = {}
    try {
        preservedData.timestampGMT = submissionData.timestampGMT
        preservedData.classID = submissionData.classID
        preservedData.assignmentID = submissionData.assignmentID
        preservedData.submissionContent = submissionData.submissionContent
    } catch (e) {
        return {
            data: null,
            message: "Please format the data correctly.",
            status: 400
        }
    }

    let id = crypto.randomBytes(20).toString('hex')
    await db.collection('classes').doc(preservedData.classID).collection('assignments').doc(preservedData.assignmentID).collection('submissions').doc(id).set(preservedData)
    await db.collection('classes').doc(preservedData.classID).collection('assignments').doc(preservedData.assignmentID).collection('submissions').doc(id).update({
        submissionID: id,
        submissionAuthor: authorUID
    })
    let doc = await db.collection('classes').doc(preservedData.classID).collection('assignments').doc(preservedData.assignmentID).collection('submissions').doc(id).get()

    return {
        data: await doc.data(),
        message: "Successful.",
        status: 200
    }
}



app.post('/students', jsonParser, async (req, res) => {
    let uid = await verifyIDToken(req.body.token)
    if (uid != null) {
        res.status(401)
        res.send({
            code: 401,
            message: "Please send a valid authentication token."
        })
    }
    else {
        let result = await makeStudent(req.body.data)
        res.status(result.status)
        res.send({
            code: result.status,
            message: result.message,
            data: result.data
        })
    }
})

app.post('/teachers', jsonParser, async (req, res) => {
    let uid = await verifyIDToken(req.body.token)
    if (uid != null) {
        res.status(401)
        res.send({
            code: 401,
            message: "Please send a valid authentication token."
        })
    }
    else {
        let result = await makeTeacher(req.body.data)
        res.status(result.status)
        res.send({
            code: result.status,
            message: result.message,
            data: result.data
        })
    }
})

app.post('/classes', jsonParser, async (req, res) => {
    let uid = await verifyIDToken(req.body.token)
    if (uid != null) {
        res.status(401)
        res.send({
            code: 401,
            message: "Please send a valid authentication token."
        })
    }
    else {
        let result = await makeClass(req.body.data)
        res.status(result.status)
        res.send({
            code: result.status,
            message: result.message,
            data: result.data
        })
    }
})

app.post('/classes/:classID/lessons', jsonParser, async (req, res) => {
    let uid = await verifyIDToken(req.body.token)
    if (uid != null) {
        res.status(401)
        res.send({
            code: 401,
            message: "Please send a valid authentication token."
        })
    }
    else {
        let result = await makeLesson(req.body.data)
        res.status(result.status)
        res.send({
            code: result.status,
            message: result.message,
            data: result.data
        })
    }
})

app.post('/classes/:classID/posts', jsonParser, async (req, res) => {
    let uid = await verifyIDToken(req.body.token)
    if (uid != null) {
        res.status(401)
        res.send({
            code: 401,
            message: "Please send a valid authentication token."
        })
    }
    else {
        let result = await makePost(req.body.data, uid)
        res.status(result.status)
        res.send({
            code: result.status,
            message: result.message,
            data: result.data
        })
    }
})

app.post('/classes/:classID/assignments', jsonParser, async (req, res) => {
    let uid = await verifyIDToken(req.body.token)
    if (uid != null) {
        res.status(401)
        res.send({
            code: 401,
            message: "Please send a valid authentication token."
        })
    }
    else {
        let result = await makeAssignment(req.body.data, uid)
        res.status(result.status)
        res.send({
            code: result.status,
            message: result.message,
            data: result.data
        })
    }
})

app.post('/classes/:classID/assignments/:assignmentID/submissions', jsonParser, async (req, res) => {
    let uid = await verifyIDToken(req.body.token)
    if (uid != null) {
        res.status(401)
        res.send({
            code: 401,
            message: "Please send a valid authentication token."
        })
    }
    else {
        let result = await makeSubmission(req.body.data, uid)
        res.status(result.status)
        res.send({
            code: result.status,
            message: result.message,
            data: result.data
        })
    }
})

app.listen(PORT, async () => {
    console.log("API Listening at localhost")
})