import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { User } from '../models/User';
import { UsersService } from '../services/users.service';
import {validate} from "codelyzer/walkerFactory/walkerFn";

enum PanelState {
  LOGIN,
  REGISTER,
  HIDDEN
}

@Component({
  selector: 'app-auth',
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.sass']
})
export class AuthComponent implements OnInit {

  PanelState: typeof PanelState = PanelState;
  panelState: PanelState = PanelState.HIDDEN;
  typedUsername: string;
  typedEmail: string;
  typedPassword: string;
  repeatPassword: string;
  user: User;
  checkCount = 0;
  userNameTaken: string;
  error: string;
  emailError: string;
  waiting = false;

  constructor(private userService: UsersService, private uiUpdater: ChangeDetectorRef) { }

  ngOnInit() {
    this.userService.currentUser.subscribe((user: User) => {
      this.user = user;
      if (user) {
        this.panelState = PanelState.HIDDEN;
      }
      this.waiting = false;
      this.uiUpdater.detectChanges();
    });
    // window.setTimeout(() => this.updater.markForCheck(), 2000);
  }

  validate(): boolean {
    if (!this.typedUsername) {
      this.error = "Username is required.";
    } else if (this.typedUsername.length >= 30) {
      this.error = "Username must be shorter than 30 characters.";
    } else if (!/[a-zA-Z]/.test(this.typedUsername[0])) {
      this.error = "Username must begin with a latin letter.";
    } else if (!/^[a-zA-Z](\w|\d|_|-)*$/.test(this.typedUsername)) {
      this.error = "Username must contain only latin letters, digits dashes and underscores.";
    } else if (this.typedUsername !== this.userNameTaken) {
      this.error = null;
    }
    if (this.typedUsername) {
      const checkCount = ++this.checkCount;
      const username = this.typedUsername;
      setTimeout(() => {
        if (checkCount !== this.checkCount) return;
        this.userService.checkUsername(username).then(resp => {
          if (!resp && this.typedUsername === username) {
            this.error = `Username ${username} is already taken.`;
            this.userNameTaken = username;
            this.uiUpdater.detectChanges();
          }
        });
      }, 500);
    }

    return !this.error;
  }

  onPasswordLogin() {
    this.waiting = true;
    this.uiUpdater.detectChanges();
    this.userService.loginWithPassword(this.typedEmail, this.typedPassword)
      .catch((err) => {
        this.error = err.message;
        this.waiting = false;
        this.uiUpdater.detectChanges();
      }).then(u => {
        if (u) this.error = null;
      });
  }

  onPasswordRegister() {
    if (!this.validate()) {
      return;
    }

    if (!this.typedEmail) {
      this.emailError = "Email is required.";
    } else if (!this.typedPassword) {
      this.emailError = "Password is required.";
    } else if (this.typedPassword !== this.repeatPassword) {
      this.emailError = "Passwords don't match.";
    } else {
      this.waiting = true;
      this.uiUpdater.detectChanges();
      this.userService.createUserWithPassword(this.typedEmail, this.typedPassword, this.typedUsername)
        .catch((err) => {
        this.emailError = err.message;
        this.waiting = false;
        this.uiUpdater.detectChanges();
      }).then(u => {
        if (u) {
          this.error = null;
          this.emailError = null;
          // this.waiting = false;
          this.uiUpdater.detectChanges();
        }
      });
    }
  }


  onProviderRegister(provider) {
    if (!this.typedUsername) {
      this.error = "Username is required.";
    } else if (this.typedPassword !== this.repeatPassword) {
      this.error = "Passwords don't match.";
    } else {
      this.waiting = true;
      this.uiUpdater.detectChanges();
      this.userService.createUserWithProvider(this.typedUsername, provider)
        .catch((err) => {
          this.error = err.message;
          this.waiting = false;
          this.uiUpdater.detectChanges();
        }).then(u => {
        if (u) {
          this.error = null;
          // this.waiting = false;
          this.uiUpdater.detectChanges();
        }
      });
    }
  }

  onProviderLogin(provider) {
    this.waiting = true;
    this.uiUpdater.detectChanges();
    this.userService.loginWithProvider(provider)
      .catch((err) => {
        this.error = err.message;
        this.waiting = false;
        this.uiUpdater.detectChanges();
      }).then(u => {
      if (u) {
        this.error = null;
        // this.waiting = false;
        this.uiUpdater.detectChanges();
      }
    });
  }

  onLogOut() {
    this.userService.logOut()
      .catch((err) => this.error = err.message).then(() => this.error = null);
  }

  setPanelState(panelState: PanelState) {
    if (panelState !== this.panelState) {
      this.error = null;
    }
    this.panelState = panelState;
    this.uiUpdater.detectChanges();
  }
}
