import {Component, OnInit, ChangeDetectorRef, Input, ElementRef} from '@angular/core';
import { ListService, TodoListManager } from '../services/list.service';
import { Todo } from '../models/Todo';
import { TodoList } from '../models/TodoList';
import { ListType } from '../models/ListType';
import {UsersService} from "../services/users.service";
import {DomSanitizer, SafeHtml} from "@angular/platform-browser";
import {User} from "../models/User";
import {DragulaService} from "ng2-dragula";
import * as moment from 'moment';


@Component({
  selector: 'app-todo-list',
  templateUrl: './todo-list.component.html',
  styleUrls: ['./todo-list.component.sass']
})
export class TodoListComponent implements OnInit {

  SITE_ROOT = "https://sharetodolist.eu";
  DAY_LENGTH = 1000*60*60*24;

  user: User;

  listName: string;
  listType: ListType;
  usernameOrPassword = '';
  listRole: string;
  listPrivateRole: string;

  _list: TodoList;
  historyBack: TodoList[] = [];
  historyFront: TodoList[] = [];

  showSharer = false;
  showConfirm = false;
  copied = false;

  newTodo: string;
  newDate: Date;

  todoes: Todo[];
  permissionDenied = false;
  listManager: TodoListManager;

  todoesDragOptions = {
    moves: () => {
      console.log("moves "+this.canReorderTodo());
      return this.canReorderTodo();
    }
  };

  updater = (error, todoes: Todo[], list: string) => {
    if (error) {
      if (error.code === "PERMISSION_DENIED") {
        this.permissionDenied = true;
        this.todoes = [];
      }
    } else {
      if (list === this.listName) {
        this.permissionDenied = false;
        this.todoes = todoes;
        this.uiUpdater.detectChanges();
      }
    }
  }

  constructor(private listService: ListService,
              private usersService: UsersService,
              private uiUpdater: ChangeDetectorRef,
              private sanitizer: DomSanitizer,
              private myElement: ElementRef,
              private dragulaService: DragulaService) {
  }

  ngOnInit() {
    this.listManager = this.listService.getListManager();
    this.usersService.currentUser.subscribe(user => {
      this.user = user;
      if (user && this._list) {
        this.todoList = this._list;
      }
      this.uiUpdater.detectChanges();
    });
    this.dragulaService.drop.subscribe(value => {
      const el = value[1];
      const sibl = value[4];
      if (sibl) {
        console.log("ind "+(sibl.getAttribute('index')));
        this.listManager.setTodoIndex(el.getAttribute('todoId'), sibl.getAttribute('index'));
      } else {
        console.log("end "+this.todoes.length);
        this.listManager.setTodoIndex(el.getAttribute('todoId'), this.todoes.length);
      }
      // this.uiUpdater.detectChanges();
    });
  }

  @Input()
  set todoList(todoList: TodoList) {

    if (this._list && !ListService.sameList(this._list, todoList)
      && !ListService.sameList(this._list, this.historyFront[0])
      && !ListService.sameList(this._list, this.historyBack[0])) {
      this.historyBack.unshift(this._list);
    }
    this._list = todoList;
    if (!this.listManager) return;
    this.listName = todoList.name;
    this.listType = todoList.type;
    this.usernameOrPassword = ListType.USER ? todoList.ownerUsername : todoList.password;

    this.showConfirm = false;
    this.copied = false;
    this.uiUpdater.detectChanges();

    this.listManager.watch(todoList.type, todoList.name, this.updater,
      todoList.type===ListType.USER ? todoList.ownerUsername : todoList.password);
    if (todoList.type === ListType.USER) {
      const username = this.user ? this.user.username : null;
      this.listManager.watchRole(username, todoList.ownerUsername, todoList.name, (error, role, privateRole) => {
        this.listRole = role;
        this.listPrivateRole = privateRole;
        this.permissionDenied = !error && !role;
        // this.todoList = this._list;
        this.uiUpdater.detectChanges();
      });
    }
  }

  get listTitle() {
    switch (this.listType) {
      case ListType.USER: return `${this.usernameOrPassword}/${this.listName}`;
      case ListType.OPEN: return `${this.listName} (open)`;
      case ListType.PASSWORD: return `${this.listName} (secret)`;
    }
  }

  onDelete(todoId: string) {
    this.listManager.deleteTodo(todoId);
  }

  onUpdate(todoId, done: boolean) {
    if (this.canCheckTodo()) {
      this.listManager.updateTodo(todoId, done, this.user ? this.user.username : 'anonymous');
    }
  }

  onAdd() {
    this.listManager.addTodo(this.newTodo);
    this.newTodo = null;
    window.setTimeout(() => this.uiUpdater.detectChanges(), 100);

  }

  onSetIndex(todoId, newIndex) {
    this.listManager.setTodoIndex(todoId, newIndex);
  }

  onSetDate(todoId, date: Date) {
    this.listManager.setTodoDate(todoId, date ? date.getTime() : null);
  }

  // onTodoDragStart(e: DragEvent, todoId: Todo) {
  //   e.dataTransfer.setData("application/todo", todoId.id);
  // }

  onDeleteListConfirm() {
    this.listManager.deleteList(this.usernameOrPassword, this.listName);
    this.showConfirm = false;
    this.uiUpdater.detectChanges();
  }

  onLeaveListConfirm() {
    // this.listManager.deleteList(this.usernameOrPassword, this.listName);
    this.listManager.updateShare(this.usernameOrPassword, this.listName, this.user.username, null);
    this.showConfirm = false;
    this.uiUpdater.detectChanges();
  }

  onBackPush(e: MouseEvent) {
    if (!this.historyBack[0]) return;
    if (e.button === 0) {
      const back = this.historyBack.shift();
      this.historyFront.unshift(this._list);
      e.preventDefault();
      location.hash = ListService.hashAddressBar(back);
    }
    return true;
  }

  onFrontPush(e: MouseEvent) {
    if (!this.historyFront[0]) return;
    if (e.button === 0) {
      const front = this.historyFront.shift();
      this.historyBack.unshift(this._list);
      e.preventDefault();
      location.hash = ListService.hashAddressBar(front);
    }
    return true;
  }

  listURL(list: TodoList): any {
    return list ? '/#'+ListService.hashAddressBar(list) : this.sanitizer.bypassSecurityTrustResourceUrl('javascript:void(0);');
  }

  onCopyLink() {
    this.myElement.nativeElement.querySelector('.list-link').select();
    document.execCommand('copy');
    this.copied = true;
    this.uiUpdater.detectChanges();
  }

  canShareList() {
    return this.listType === ListType.USER && ["owner", "admin"].includes(this.listRole);
  }

  canDeleteList() {
    return this.listType === ListType.USER && ["owner"].includes(this.listRole);
  }

  canLeaveList() {
    return this.listType === ListType.USER && !this.canDeleteList() && this.listPrivateRole;
  }

  canAddTodo() {
    return this.listType !== ListType.USER || ["owner", "admin", "edit"].includes(this.listRole);
  }

  canDeleteTodo() {
    return this.listType !== ListType.USER || ["owner", "admin", "edit"].includes(this.listRole);
  }

  canCheckTodo() {
    return this.listType !== ListType.USER || ["owner", "admin", "edit", "check"].includes(this.listRole);
  }

  canSharePublicLink() {
    return this.listType !== ListType.USER || ["owner", "admin"].includes(this.listRole);
  }

  canReorderTodo() {
    return this.listType !== ListType.USER || ["owner", "admin", "edit"].includes(this.listRole);
  }

  canSetTodoDate() {
    return this.listType !== ListType.USER || ["owner", "admin", "edit"].includes(this.listRole);
  }

  updateMe() {
    this.uiUpdater.detectChanges();
  }

  todoTrackBy(index, todo: Todo) {
    return todo.id;
  }

  numberToDate(inDate: number): Date {
    return new Date(inDate);
  }

  isPast(inDate: number): boolean {
    return Date.now() > inDate;
  }

  isFuture(inDate: number): boolean {
    return inDate - Date.now() > this.DAY_LENGTH;
  }

  isToday(inDate: number): boolean {
    const now = Date.now();
    return now < inDate && inDate - now < this.DAY_LENGTH;
  }

  dateDisplay(date: number): SafeHtml {
    const diff = date - Date.now();
    const dateM = moment(date);
    let result;
    if (diff < 0) {
      result = `<span class="date-inner">${dateM.fromNow()}</span>`;
    } else {
      result = `<span class="date-inner">${dateM.fromNow(true)}</span>`;
    }
    return this.sanitizer.bypassSecurityTrustHtml(result);
  }

  formatDate(date) {
    return moment(date).format('dddd, D/MM/YY [at] H:mm');
  }

}
