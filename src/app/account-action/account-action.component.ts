import {ChangeDetectorRef, Component, OnInit} from '@angular/core';
import {UsersService} from "../services/users.service";
import {User} from "../models/User";

function getQueryVariable(variable) {
  const query = window.location.search.substring(1);
  const vars = query.split("&");
  for (let i=0; i<vars.length; i++) {
    const pair = vars[i].split("=");
    if (pair[0] === variable) {
      return pair[1];
    }
  }
  return null;
}

@Component({
  selector: 'app-account-action',
  templateUrl: './account-action.component.html',
  styleUrls: ['./account-action.component.sass']
})
export class AccountActionComponent implements OnInit {

  mustVerify = false;
  verifySuccess = false;
  resetPassword = false;
  mode: string;
  oobCode: string;
  user: User;
  error: string;
  hideResend = false;

  noUsernameUser: User;
  typedUsername: string;
  checkCount = 0;
  userNameTaken: string;
  usernameError: string;
  usernameWaiting = false;

  constructor(private usersService: UsersService,
              private uiUpdater: ChangeDetectorRef) { }

  ngOnInit() {
    this.mode = getQueryVariable('mode');
    this.oobCode = getQueryVariable('oobCode');

    if (this.mode === 'verifyEmail') {
      this.usersService.verifyEmail(this.oobCode).catch(err => {
        this.error = err;
        this.uiUpdater.detectChanges();
      }).then(() => {
        this.verifySuccess = true;
        this.uiUpdater.detectChanges();
        history.pushState({}, document.title, "/");
      });
    }

    this.usersService.currentUser.subscribe(user => {
      this.user = user;
      if (user) {
        this.mustVerify = !user.trueEmailVerified;
        this.uiUpdater.detectChanges();
      } else {
        this.mustVerify = false;
        this.uiUpdater.detectChanges();
      }
    });

    this.usersService.nonExistentUsernameError.subscribe(user => {
      console.log(user);
      this.noUsernameUser = user;
      this.usernameWaiting = false;
      this.uiUpdater.detectChanges();
    });
  }

  onResend() {
    this.user.sendEmailVerification().catch(err => {
      this.error = err;
      this.uiUpdater.detectChanges();
    }).then(() => {
      this.hideResend = true;
      this.uiUpdater.detectChanges();
    });
  }


  validate(): boolean {
    if (!this.typedUsername) {
      this.usernameError = "Username is required.";
    } else if (this.typedUsername.length >= 30) {
      this.usernameError = "Username must be shorter than 30 characters.";
    } else if (!/[a-zA-Z]/.test(this.typedUsername[0])) {
      this.usernameError = "Username must begin with a latin letter.";
    } else if (!/^[a-zA-Z](\w|\d|_|-)*$/.test(this.typedUsername)) {
      this.usernameError = "Username must contain only latin letters, digits dashes and underscores.";
    } else if (this.typedUsername !== this.userNameTaken) {
      this.usernameError = null;
    }
    if (this.typedUsername) {
      const checkCount = ++this.checkCount;
      const username = this.typedUsername;
      setTimeout(() => {
        if (checkCount !== this.checkCount) return;
        this.usersService.checkUsername(username).then(resp => {
          if (!resp && this.typedUsername === username) {
            this.usernameError = `Username ${username} is already taken.`;
            this.userNameTaken = username;
            this.uiUpdater.detectChanges();
          }
        });
      }, 400);
    }

    return !this.usernameError;
  }

  onPickUsername() {
    if (this.validate()) {
      this.usernameWaiting = true;
      this.usersService.setUsername(this.noUsernameUser, this.typedUsername, true)
        .catch((error) => {
          this.usernameError = error.message;
          this.usernameWaiting = false;
          this.uiUpdater.detectChanges();
        })
        .then(() => {
          this.usernameError = '';
        });
    }
  }

  onLogOut() {
    this.usersService.logOut();
  }
}
