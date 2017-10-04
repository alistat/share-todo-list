import {ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import { TodoList } from "../models/TodoList";
import { ListService, TodoListManager } from "../services/list.service";
import {Share} from "../models/Share";
import {UsersService} from "../services/users.service";
import {User} from "../models/User";
import {share} from "rxjs/operator/share";

@Component({
  selector: 'app-list-sharer',
  templateUrl: './list-sharer.component.html',
  styleUrls: ['./list-sharer.component.sass']
})
export class ListSharerComponent implements OnInit {

  listManager: TodoListManager;
  shares: Share[] = [];
  publicShare: string;
  shareHistory: string[] = [];
  _list: TodoList;
  myself: User;
  setMyRole: string = null;
  error: string = null;

  visible = false;

  @Input('visible')
  set _visible(visible: boolean) {
    this.visible = visible;
    this.uiUpdater.detectChanges();
  }

  @Input()
  set list(list: TodoList) {
    this._list = list;
    this.error = null;
    this.uiUpdater.detectChanges();
    if (!this.listManager) return;
    if (list) {
      this.listManager.watchShares(list.ownerUsername, list.name, (error, shares, publicShare) => {
        if (shares) {
          this.shares = shares;
        }
        if (publicShare !== undefined) {
          this.publicShare = publicShare;
        }
        if (error) {
          this.error = error.message;
        }
        this.uiUpdater.detectChanges();
      });
    } else {
      this.listManager.unwatchShares();
      this.shares = [];
    }
    this.uiUpdater.detectChanges();

  }

  @Output() onDialogClose = new EventEmitter<void>();

  constructor(private listService: ListService,
              private usersService: UsersService,
              private uiUpdater: ChangeDetectorRef) { }

  ngOnInit() {
    this.listManager = this.listService.getListManager();
    this.usersService.currentUser.subscribe(user => {
      this.myself = user;
      if (user) {
        this.listManager.watchUser(user.username, (error, _1, _2, shareHistory) => {
          if (shareHistory) {
            this.shareHistory = shareHistory.map(h => h.username);
            this.uiUpdater.detectChanges();
          }
        });
      } else {
        this.listManager.unwatchUser();
      }
      this.uiUpdater.detectChanges();
    });
  }

  get listShareHistory() {
    if (this.shares.length === 0) {
      return this.shareHistory;
    }
    return this.shareHistory.filter(user => {
      for (const share of this.shares) {
        if (share.username === user) return false;
      }
      return true;
    });
  }

  onEditShare(user: string, role: string) {
    if (this.myself.username === user && role !== "admin") {
      this.setMyRole = role;
      this.uiUpdater.detectChanges();
    } else {
      this.listManager.updateShare(this._list.ownerUsername, this._list.name, user, role).catch(err => {
        if (err.code === "PERMISSION_DENIED") {
          this.error = `Share failed. Are you sure username "${user}" is the correct one?`;
        } else {
          this.error = "Share did not succeed. All we know is \""+err.code+'\"';
        }
        this.uiUpdater.detectChanges();
      });
    }
  }

  onAddShare(user: string, role: string) {
    this.listManager.updateShare(this._list.ownerUsername, this._list.name, user, role).catch(err => {
      if (err.code === "PERMISSION_DENIED") {
        this.error = `Share failed. Are you sure username "${user}" is the correct one?`;
      } else {
        this.error = "Share did not succeed. All we know is \""+err.code+'\"';
      }
      this.uiUpdater.detectChanges();
    });
  }

  onRemoveShare(user) {
    if (this.myself.username === user) {
      this.setMyRole = "remove";
      this.uiUpdater.detectChanges();
    } else {
      this.listManager.updateShare(this._list.ownerUsername, this._list.name, user, null);
    }
  }

  removeFromAdmin() {
    if (this.setMyRole === "remove") {
      this.listManager.updateShare(this._list.ownerUsername, this._list.name, this.myself.username, null);
    } else {
      this.listManager.updateShare(this._list.ownerUsername, this._list.name, this.myself.username, this.setMyRole);
    }
    this.setMyRole = null;
    this.visible = false;
  }

  cancelFromAdmin() {
    this.setMyRole = null;
  }

  onEditPublicShare(role) {
    this.listManager.updatePublicShare(this._list.ownerUsername, this._list.name, role);
  }

  onClose() {
    this.visible = false;
    this.onDialogClose.emit(null);
    this.uiUpdater.detectChanges();
  }
}
