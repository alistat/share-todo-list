import {ChangeDetectorRef, Component, ElementRef, EventEmitter, OnInit, Output, SecurityContext} from '@angular/core';
import { DomSanitizer, SafeHtml } from "@angular/platform-browser";
import {ListService, TodoListManager} from "../services/list.service";
import {UsersService} from "../services/users.service";
import {User} from "../models/User";
import {TodoList} from "../models/TodoList";
import { ListType } from '../models/ListType';

enum SelectionPanel {
  PUBLIC,
  PRIVATE
}


@Component({
  selector: 'app-todo-list-selector',
  templateUrl: './todo-list-selector.component.html',
  styleUrls: ['./todo-list-selector.component.sass']
})
export class TodoListSelectorComponent implements OnInit {

  SelectionPanel: typeof SelectionPanel = SelectionPanel;
  ListType: typeof ListType = ListType;
  selectionPanel: SelectionPanel = SelectionPanel.PUBLIC;

  onSide = false;

  listManager: TodoListManager;
  user: User;
  userlists: any[] = [];
  history: any[];
  typedListPassword = '';
  _typedPrivateList = '';
  typedListName = '';
  proccessedHash: string;

  @Output('onListSelected') listSelectEmitter = new EventEmitter<TodoList>();

  constructor(private listService: ListService,
              private usersService: UsersService,
              private uiUpdater: ChangeDetectorRef,
              private myElement: ElementRef,
              private sanitizer: DomSanitizer) { }

  ngOnInit() {
    this.listManager = this.listService.getListManager();
    this.usersService.currentUser.subscribe(user => {
      this.user = user;
      if (!user) {
        this.listManager.unwatchUser();
        return;
      }
      this.listManager.watchUser(user.username, (error, lists, history) => {
        if (error) {
          console.error(error);
          // this.userlists = [];
          // this.history = [];
        }
        if (lists) {
          this.userlists = lists;
        }
        if (history) {
          this.history = history;
        }
        this.uiUpdater.detectChanges();
      });
      this.selectionPanel = SelectionPanel.PRIVATE;
      this.uiUpdater.detectChanges();
    });

    // get list from address bar
    this.processHash();
    window.addEventListener("hashchange", this.processHash.bind(this));
  }

  get typedPrivateList(): {owner: string, name: string} {
    if (typeof this._typedPrivateList === "object") {
      return this._typedPrivateList;
    }
    const ownerList = this._typedPrivateList.split("/", 2);
    let owner=null, name;
    if (ownerList.length === 1) {
      if (this.user) {
        owner = this.user.username;
      }
      name = ownerList[0];
    } else {
      owner = ownerList[0];
      name = ownerList[1];
    }

    return {owner, name};
  }

  onPrivateListType() {
    this.uiUpdater.detectChanges();
  }

  processHash() {
    const hash = location.hash;
    if (hash === this.proccessedHash) {
      return;
    }
    this.proccessedHash = hash;
    const list = ListService.unhashAddressBar(decodeURIComponent(hash));
    if (list) {
      if (list.type === ListType.USER) {
        this.selectionPanel = SelectionPanel.PRIVATE;
        this._typedPrivateList = `${list.ownerUsername}/${list.name}`;
      } else {
        this.selectionPanel = SelectionPanel.PUBLIC;
        this.typedListName = list.name;
        if (list.type === ListType.PASSWORD) {
          window.setTimeout(() => this.myElement.nativeElement.querySelector(".select-list-input.password").focus(), 200);
        }
      }
      this.uiUpdater.detectChanges();
      if (list.type !== ListType.PASSWORD) {
        window.setTimeout(() => this.onListSelected(), 0);
      }
    }
  }

  formatMyList = (list) => {
    if (!this.user || list.owner !== this.user.username) {
      const owner = this.sanitizer.sanitize(SecurityContext.HTML, list.owner);
      const name = this.sanitizer.sanitize(SecurityContext.HTML, list.name);
      const templ = `<span style="color:#5d5d5d" class="my-lists-owner">${owner}/</span>${name}`;
      return this.sanitizer.bypassSecurityTrustHtml(templ);
    } else {
      return list.name;
    }
  }

  formatMyListValue = (list) => {
    if (!this.user || list.owner !== this.user.username) {
      return list.owner+'/'+list.name;
    } else {
      return list.name;
    }
  }

  isNewList(): boolean {
    const owner = this.typedPrivateList.owner,
          name = this.typedPrivateList.name;
    for (const myList of this.userlists) {
      if (myList.owner === owner && myList.name === name) return false;
    }
    return !owner || this.user && owner === this.user.username;
  }

  shouldDisableOpenPrivate() {
    if (!this._typedPrivateList) return true;
    const owner = this.typedPrivateList.owner,
      name = this.typedPrivateList.name;
    if (!name)  return true;
    if (!this.user && !owner) return true;
    return false;
  }

  onMyListClicked(list) {
    this._typedPrivateList = this.formatMyListValue(list);
    this.onListSelected();
  }

  onHistoryClicked(list) {
    this.typedListName = list.name;
    this.typedListPassword = '';
    if (list.type === ListType.OPEN) {
      this.onListSelected();
    } else {
      this.myElement.nativeElement.querySelector(".select-list-input.password").focus();
    }
  }

  onHistoryDelete(list) {
    this.listManager.deleteFromHistory(this.user.username, list.type, list.name);
  }

  onListSelected() {
    let listType: ListType, password='', username=null,  listName;
    if (this.selectionPanel === SelectionPanel.PUBLIC) {
      if (this.typedListPassword) {
        password = this.typedListPassword;
        listType = ListType.PASSWORD;
      } else {
        listType = ListType.OPEN;
      }
      listName = this.typedListName;
    } else {
      username = this.typedPrivateList.owner;
      listName = this.typedPrivateList.name;
      listType = ListType.USER;
    }

    const list = {
      todoes: null,
      name: listName,
      type: listType,
      ownerUsername: username,
      password
    };
    this.listSelectEmitter.emit(list);
    this.onSide = true;
    this.uiUpdater.detectChanges();

    // add to history
    if (this.user && (listType === ListType.OPEN || listType === ListType.PASSWORD)) {
      this.listManager.addToHistory(this.user.username, listType, listName);
    }
    // touch
    ListService.touchList(listType, listName, listType === ListType.PASSWORD ? password : username);

    // update address bar
    location.hash = ListService.hashAddressBar(list);
  }
}
