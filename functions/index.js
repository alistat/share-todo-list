"use strict";

const MAX_OPEN_LISTS = 3;
const MAX_PASSWORD_LISTS = 3;

const functions = require('firebase-functions');

const admin = require('firebase-admin');
const config = functions.config().firebase;
const configParams = require("./config.json");
config.credential = admin.credential.cert(configParams);
admin.initializeApp(functions.config().firebase);
const db = admin.database();

const express = require('express');
const origin = configParams.project_id === "todoes-test" ? "*" : "https://sharetodolist.eu";
const cors = require('cors')({origin: origin});
const authRouter = new express.Router();
const adminRouter = new express.Router();

authRouter.use(cors);
adminRouter.use(cors);

authRouter.post('/customLogin', (req, res) => {
  admin.auth().verifyIdToken(req.body.token)
    .catch(function (error) {
      console.log("token error "+error);
      res.status(400).json({error});
    })
    .then(function (decodedToken) {
      const additionalInfo = {};
      const uid = decodedToken.uid;
      db.ref('usernames').orderByValue().startAt(uid).endAt(uid).once('value', snap => {
        let username, allUsernames = snap.val();
        for (const aUsername in allUsernames) {
          if (allUsernames.hasOwnProperty(aUsername)) {
            if (!username) {
              username = aUsername;
            } else {
              db.ref('usernames/' + aUsername).remove();
            }
          }
        }
        if (username) {
          additionalInfo.username = username;
          admin.auth().getUser(uid)
            .then(function(userRecord) {
              additionalInfo.isAdmin = userRecord.emailVerified && configParams.admins.includes(userRecord.email);
              admin.auth().createCustomToken(uid, additionalInfo)
                .catch(function (error) {
                  res.status(500).json({error});
                })
                .then(function (customToken) {
                  res.status(200).send({token: customToken, username, isAdmin: additionalInfo.isAdmin});
                });
            })
            .catch(function(error) {
              console.log("Error fetching user data:", error);
              res.status(500).json({error});
            });


        } else {
          res.status(400).json({error: "auth/non-existent-username"});
        }
      });

    });
});


exports.auth = functions.https.onRequest((req, res) => {
  req.url = req.path ? req.url : `/${req.url}`;
  return authRouter(req, res);
});

function isAdmin(req, res, next) {
  admin.auth().verifyIdToken(req.body.token)
    .catch(function (error) {
      console.log("token error "+error);
      res.status(400).json({error});
    })
    .then(function (decodedToken) {
      if (decodedToken.isAdmin) {
        next();
      } else {
        res.status(401).json({error: "unauthorized"});
      }

    });
}

adminRouter.use(isAdmin);

adminRouter.get('/openCount', (req, res) => {
  db.ref('openLists').once('value', snap => {
    const count = snap.numChildren();
    res.json({count});
  });
});

adminRouter.delete('/deleteOldOpen', (req, res) => {
  db.ref('openLists').once('value', snap => {
    const count = snap.numChildren();
    if (count > MAX_OPEN_LISTS) {
      const toDelete = count - MAX_OPEN_LISTS;
      db.ref('openLists').orderByChild('lastAccess').limitToFirst(toDelete).once('value', snapToDelete => {
        console.log(snapToDelete.ref);
        snapToDelete.ref.remove().catch(error => {
          console.log("error "+error);
          res.status(400).json({error});
        }).then(() => {
          res.json({countDeleted: toDelete});
        });
      });
    }
  });
});

exports.admin = functions.https.onRequest((req, res) => {
  req.url = req.path ? req.url : `/${req.url}`;
  return adminRouter(req, res);
});

exports.propagateShare = functions.database.ref('/userLists/{ownerUsername}/{listname}/shares/{username}').onWrite(event => {
  db.ref(`/users/${event.params.username}/shares/${event.params.ownerUsername}/${event.params.listname}`)
    .set(event.data.val());
});

exports.propagateAddRemove = functions.database.ref('/userLists/{ownerUsername}/{listname}').onWrite(event => {
  if (event.data.exists()) {
    db.ref(`/users/${event.params.ownerUsername}/shares/${event.params.ownerUsername}/${event.params.listname}`)
      .set("owner");
  } else {
    db.ref(`/userListItems/${event.params.ownerUsername}/${event.params.listname}`).remove();
    const updates = {
      [`${event.params.ownerUsername}/shares/${event.params.ownerUsername}/${event.params.listname}`]: null
    };
    const shares = event.data.previous.child("shares").val();
    for (const share in shares) {
      if (shares.hasOwnProperty(share)) {
        updates[`${share}/shares/${event.params.ownerUsername}/${event.params.listname}`] = null;
      }
    }
    db.ref("/users").update(updates);
  }
});

exports.propagateUsernameRemove = functions.database.ref('/usernames/{username}').onWrite(event => {
  if (!event.data.exists()) {
    const username = event.params.username;
    db.ref(`/userLists/${username}`).remove();
    db.ref(`/users/${username}`).remove();
  }
});

exports.onUserDelete = functions.auth.user().onDelete(event => {
  const user = event.data;
  db.ref('usernames').orderByValue().startAt(user.uid).endAt(user.uid).once('value', snap => {
    let allUsernames = snap.val();
    for (const aUsername in allUsernames) {
      if (allUsernames.hasOwnProperty(aUsername)) {
        db.ref('usernames/' + aUsername).remove();
      }
    }
  });
});
