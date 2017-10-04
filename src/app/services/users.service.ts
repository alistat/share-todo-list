import { Injectable } from '@angular/core';
import { User } from '../models/User';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Http, Response } from '@angular/http';
import 'rxjs/add/operator/toPromise';
import {reject} from "q";
import {Subject} from "rxjs/Subject";

declare const firebase: any;
declare const firebaseFunctions: any;
const customLoginURL = firebaseFunctions+"/auth/customLogin";
const trustedProviders = ['facebook.com'];

@Injectable()
export class UsersService {

  private _currentUser: BehaviorSubject<User>;
  private _nonExistentUsernameError = new Subject<User>();
  private userDbRef;
  private doingCustomOn: string = null;
  private facebookProvider = new firebase.auth.FacebookAuthProvider();
  private googleProvider = new firebase.auth.GoogleAuthProvider();

  constructor(private http: Http) {
    this.facebookProvider.setCustomParameters({
      'display': 'popup'
    });

    this._currentUser = new BehaviorSubject(null);
    try {
      firebase.auth().onAuthStateChanged(user => this.onUserReload(user));
    } catch (e) {
      console.error(e);
    }
  }

  onUserReload(user: User) {
    if (this.userDbRef) this.userDbRef.off();
    if (!user) {
      this._currentUser.next(null);
      this._nonExistentUsernameError.next(null);
      return;
    }
    this.customLogin(user).catch(console.error.bind(console));
  }

  customLogin(user: User, force=false): Promise<User> {
    if (!force && this.doingCustomOn === user.uid) {
      return Promise.reject("doing custom caught it ");
    }
    this.doingCustomOn = user.uid;
    const p = user.getToken(false);
    return new Promise((resolve, reject) => {
      p.catch(reject).then(token => {
        this.http.post(customLoginURL, {token}).toPromise().catch(error => {
          if (error._body) {
            const err = JSON.parse(error._body);
            if (err.error && err.error === "auth/non-existent-username") {
              console.log('no username for '+user.email);
              this._nonExistentUsernameError.next(user);
            }
          }
        }).then(res => {
          if (!res) return;
          const userInfo = res.json();
          firebase.auth().signInWithCustomToken(userInfo.token).catch(reject)
            .then((user2: User) => {
              user2.username = userInfo.username;
              user2.isAdmin = userInfo.isAdmin;
              user2.trueEmailVerified = user2.emailVerified;
              if (!user2.trueEmailVerified) { // facebook verifies emails
                for (const provider of user2.providerData) {
                  if (trustedProviders.includes(provider.providerId)) {
                    user2.trueEmailVerified = true;
                    break;
                  }
                }
              }
              resolve(user2);
              window.setTimeout(() => {
                this._currentUser.next(user2);
                this._nonExistentUsernameError.next(null);
                window.setTimeout(() => this.doingCustomOn=null, 5000);
              }, 200);
            });
        });
      });
    });
  }

  get currentUser(): Subject<User> {
    return this._currentUser;
  }

  get nonExistentUsernameError(): Subject<User> {
    return this._nonExistentUsernameError;
  }

  checkUsername(username: string): Promise<boolean> {
    const p = firebase.database().ref(`usernames/${username}`).once('value');
    return new Promise((resolve, reject) => {
      p.catch(reject).then(snap => {
        resolve(!snap.val());
      });
    });
  }

  createUserWithPassword(email: string, password: string, username: string): Promise<User> {
    const p = firebase.auth().createUserWithEmailAndPassword(email, password);
    return new Promise((resolve, reject) => {
      p.catch(reject).then((user: User, err) => {
          console.log("user created "+err);
          firebase.database().ref(`usernames/${username}`).set(user.uid)
            .catch(() => {
              console.log('deleting ..');
              user.delete();
              reject({code: "username-taken", message: `Username ${username} is already taken.`});
            })
            .then(() => {
              user.username = username;
              resolve(user);
              user.sendEmailVerification();
            });
        }
      );
    });
  }

  loginWithPassword(email, password): Promise<User> {
    return firebase.auth().signInWithEmailAndPassword(email, password);
  }

  createUserWithProvider(username: string, provider: string): Promise<User> {
    let p: Promise<any>;
    if (provider === "facebook") {
      p = firebase.auth().signInWithPopup(this.facebookProvider);
    } else if (provider === 'gplus') {
      p = firebase.auth().signInWithPopup(this.googleProvider);
    }

    return new Promise((resolve, reject) => {
      p.catch(error => {
        if (error.code === 'auth/account-exists-with-different-credential') {
          const email = error.email;
          firebase.auth().fetchProvidersForEmail(email).then(function(providers) {
            reject({message: 'You already have an account with your '+providers.map(s => s==="password"?'email':s).toString()});
          });
        } else {
          reject(error);
        }
      }).then((result) => {
          if (!result) return;
          const user: User = result.user;
          console.log("user created ");
          firebase.database().ref(`usernames/${username}`).set(user.uid)
            .catch(() => {
              console.log('deleting ..');
              user.delete();
              reject({code: "username-taken", message: `Username ${username} is already taken.`});
            })
            .then(() => {
              user.username = username;
              resolve(user);
            });
        }
      );
    });
  }

  loginWithProvider(provider: string): Promise<User> {
    let p: Promise<any>;
    if (provider === "facebook") {
      p = firebase.auth().signInWithPopup(this.facebookProvider);
    } else if (provider === 'gplus') {
      p = firebase.auth().signInWithPopup(this.googleProvider);
    }

    return new Promise((resolve, reject) => {
      p.catch(error => {
        if (error.code === 'auth/account-exists-with-different-credential') {
          const email = error.email;
          firebase.auth().fetchProvidersForEmail(email).then(function(providers) {
            reject({message: 'You already have an account with your '+providers.map(s => s==="password"?'email':s).toString()});
          });
        } else {
          reject(error);
        }
      }).then((result) => {
          if (!result) return;
          const user: User = result.user;
          resolve(user);
        }
      );
    });
  }

  setUsername(user: User, username: string, reloadIt=false): Promise<User> {
    return new Promise((resolve, reject) => {
      firebase.database().ref(`usernames/${username}`).set(user.uid).catch(() => {
        reject({code: "username-taken", message: `Username ${username} is already taken.`});
      }).then(() => {
        user.username = username;
        if (reloadIt) {
          this.customLogin(user, true);
        }
        resolve(user);
      });
    });
  }

  verifyEmail(code): Promise<void> {
    return firebase.auth().applyActionCode(code);
  }

  logOut(): Promise<void> {
    return firebase.auth().signOut();
  }

}
