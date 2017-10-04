import { Injectable } from '@angular/core';
import { Todo } from '../models/Todo';
import { TodoList } from '../models/TodoList';
import { ListType } from '../models/ListType';
import { Share } from '../models/Share';

export interface TodoListManager {
  watch(listType: ListType, listName: string, onChange: (error, t: Todo[], l: string) => void, usernameOrPassword: string);
  deleteTodo(todoId: string);
  updateTodo(todoId: string, done: boolean, username?: string);
  addTodo(todoName, parent?: string): string;
  setTodoIndex(todoId: string, index: number);
  setTodoDate(todoId: string, date: number);
  unwatch();

  deleteList(ownerUsername: string, listName: string);

  watchShares(ownerUsername: string, listName: string, onChange: (error, shares: Share[], publicShare: string) => void): void;
  updateShare(ownerUsername: string, listName: string, user: string, role: string): Promise<void>;
  updatePublicShare(ownerUsername: string, listName: string, role: string);
  unwatchShares();

  addToHistory(username: string, listType: ListType, listName: string): void;
  deleteFromHistory(username: string, listType: ListType, listName: string): void;

  addToShareHistory(usernameMe: string, usernameOther: string): void;
  deleteFromShareHistory(usernameMe: string, usernameOther: string): void;

  watchUser(username: string, onChange: (error, lists: any[], history: any[], shareHistory: any[]) => void);
  unwatchUser();

  watchRole(username: string, ownerUsername: string, listName: string,
            onChange: (error, role: string, privateRole: string, publicRole: string) => void): void;
  unwatchRole();
}



declare const firebase: any;
declare const sha512: (string) => string;

const TODO_ORDER_HOP = 2048;


@Injectable()
export class ListService {

  constructor() { }

  getListManager(): TodoListManager {
    const Watcher = {
      currentList: null,
      currentType: null,
      usernameOrPassword: null,
      biggestOrders: new Map<string, number>(),
      ref: null,

      shareRef: null,
      publicShareRef: null,

      user: null,
      userRef: null,
      userHistoryRef: null,
      userShareHistoryRef: null,

      roleRef: null,
      publicRoleRef: null,
      publicRole: null,
      privateRole: null,

      callbacks: new Map(),

      watch(listType: ListType, listName: string, onChange, usernameOrPassword=null) {
        if (this.ref) this.ref.off();
        this.currentList = listName;
        this.currentType = listType;
        this.usernameOrPassword = usernameOrPassword;

        this.ref = firebase.database().ref(ListService.listItemsPath(listType, listName, usernameOrPassword));
        console.log("ref");
        console.log(this.ref);

        this.ref.orderByChild('parent').on('value', (snapshot) => {
          let todoes = snapshot.val();
          if (!todoes) todoes = {};
          todoes = ListService.mapTodoList(todoes);
          this.biggestOrders.clear();
          if (todoes.length > 0) {
            this.biggestOrders.set(null, todoes[todoes.length-1].order);
            for (const todo of todoes) {
              if (todo.children.length > 0) {
                this.biggestOrders.set(todo.id, todo.children[todo.children.length-1].order);
              }
            }
          }
          window.setTimeout(onChange, 0, null, todoes, listName);
        }, error => {
          window.setTimeout(onChange, 0, error);
        });
      },

      deleteTodo(todoId: string) {
        ListService.touchList(this.currentType, this.currentList, this.usernameOrPassword);
        this.ref.orderByChild('parent').startAt(todoId).endAt(todoId).once('value', snap => {
          if (!snap.exists()) {
            return;
          }
          console.log(Object.keys(snap.val()));
          for (const toRemove of Object.keys(snap.val())) {
            this.ref.child(toRemove).remove();
          }
        });
        this.ref.child(todoId).remove();
      },

      updateTodo(todoId: string, done: boolean, username='anonymous') {
        this.ref.child(todoId+'/done').set(done);
        if (this.currentType === ListType.USER) {
          this.ref.child(todoId+'/checkedAt').set(Date.now());
          this.ref.child(todoId+'/checkedBy').set(username);
        }
        ListService.touchList(this.currentType, this.currentList, this.usernameOrPassword);
      },

      addTodo(todoName, parent: string=null): string {
        const newTodo = this.ref.push();
        const biggestOrder = this.biggestOrders.get(parent);
        console.log(JSON.stringify({
          name: todoName,
          done: false,
          parent,
          order: biggestOrder ? biggestOrder + TODO_ORDER_HOP : 0
        }));
        newTodo.set({
          name: todoName,
          done: false,
          parent,
          order: biggestOrder ? biggestOrder + TODO_ORDER_HOP : 0
        });
        ListService.touchList(this.currentType, this.currentList, this.usernameOrPassword);
        return newTodo.id;
      },

      setTodoIndex(todoId: string, index: number) {
        this.ref.transaction((currentItems: object) => {
          const todo = currentItems[todoId];
          if (!todo) return;
          const ids = new Map<object, string>();
          const parent = todo.parent;
          const ofParent = [];
          for (const otherTodo of Object.keys(currentItems)) {
            const todoItem = currentItems[otherTodo];
            if (todoItem.parent === parent) {
              ofParent.push(currentItems[otherTodo]);
              ids.set(todoItem, otherTodo);
            }
          }
          if (ofParent.length === 1) {
            return;
          }
          ofParent.sort(ListService.compareByOrder);
          if (index <= 0) {
            todo.order = ofParent[0].order - TODO_ORDER_HOP;
          } else if (index >= ofParent.length) {
            todo.order = ofParent[ofParent.length-1].order + TODO_ORDER_HOP;
          } else {
            let prev = ofParent[index-1].order;
            const next = ofParent[index].order;
            if (ids.get(ofParent[index-1]) === todoId) {
              prev = ofParent[index+1].order;
            } else {
              prev = ofParent[index-1].order;
            }

            if (next - prev > 1) {
              todo.order = Math.ceil((next+prev)/2);
            } else {
              let currentIndex;
              for (let i=0; i<ofParent.length; i++) {
                if (ids.get(ofParent[i]) === todoId) {
                  currentIndex = i;
                  break;
                }
              }
              ofParent.splice(index, 0, ofParent.splice(currentIndex, 1)[0]); // place at final index
              let order = 0;
              for (const otherTodo of ofParent) {
                otherTodo.order = order;
                order += TODO_ORDER_HOP;
              }
            }
          }

          return currentItems;
        });
      },

      setTodoDate(todoId: string, date: number) {
        console.log("setting "+date);
        this.ref.child(todoId+'/date').set(date);
      },

      unwatch() {
        if (this.ref) this.ref.off();
        this.biggestOrders.clear();
      },

      deleteList(ownerUsername: string, listName: string) {
        firebase.database().ref(ListService.listPath(ListType.USER, listName, ownerUsername)).remove();
      },

      addToHistory(username: string, listType: ListType, listName: string): void {
        const listTypeString = listType === ListType.OPEN ? "open" : "password";
        firebase.database().ref(`/users/${username}/history/${listTypeString}_${listName}`).set({time: Date.now()});
      },

      deleteFromHistory(username: string, listType: ListType, listName: string): void {
        const listTypeString = listType === ListType.OPEN ? "open" : "password";
        firebase.database().ref(`/users/${username}/history/${listTypeString}_${listName}`).set(null);
      },

      addToShareHistory(usernameMe: string, usernameOther: string): void {
        firebase.database().ref(`/users/${usernameMe}/shareHistory/${usernameOther}`).set({time: Date.now()});
      },

      deleteFromShareHistory(usernameMe: string, usernameOther: string): void {
        firebase.database().ref(`/users/${usernameMe}/shareHistory/${usernameOther}`).set(null);
      },

      watchUser(username: string, onChange: (lists: any[], history: any[]) => void) {
        if (this.user === username && this.userRef) return;
        if (this.userRef) this.userRef.off();
        if (this.userHistoryRef) this.userHistoryRef.off();
        if (this.userShareHistoryRef) this.userShareHistoryRef.off();

        this.user = username;


        window.setTimeout(() => {
          this.userRef = firebase.database().ref(`/users/${username}/shares`);
          this.userHistoryRef = firebase.database().ref(`/users/${username}/history`);
          this.userShareHistoryRef = firebase.database().ref(`/users/${username}/shareHistory`);
          this.userRef.on('value', (snapshot) => {
            let lists = snapshot.val();
            if (!lists) lists = [];
            lists = ListService.mapUserLists(lists, this.user);
            window.setTimeout(onChange, 0, null, lists, null);
          }, error => {
            error.entity = 'lists';
            window.setTimeout(onChange, 0, error);
          });

          this.userHistoryRef.orderByChild("time").limitToLast(15).on('value', (snapshot) => {
            let history = snapshot.val();
            if (!history) history = {};
            history = ListService.mapHistory(history);
            window.setTimeout(onChange, 0, null, null, history);
            if (history.length > 0) {
              const lastTime = history[history.length - 1].time.getTime();
              this.userHistoryRef.orderByChild("time").endAt(lastTime - 1).once("value", snap => {
                const updates = {};
                const toDelete = snap.val();
                for (const key of Object.keys(toDelete)) {
                  updates[key] = null;
                }
                snap.ref.update(updates);
              });
            }
          }, error => {
            console.error(error);
            error.entity = 'history';
            window.setTimeout(onChange, 0, error);
          });
          this.userShareHistoryRef.orderByChild("time").limitToLast(200).on('value', (snapshot) => {
            let history = snapshot.val();
            if (!history) history = {};
            history = ListService.mapShareHistory(history);
            window.setTimeout(onChange, 0, null, null, null, history);
            if (history.length > 0) {
              const lastTime = history[history.length - 1].time.getTime();
              this.userShareHistoryRef.orderByChild("time").endAt(lastTime - 1).once("value", snap => {
                const updates = {};
                const toDelete = snap.val();
                for (const key of Object.keys(toDelete)) {
                  updates[key] = null;
                }
                snap.ref.update(updates);
              });
            }
          }, error => {
            console.error(error);
            error.entity = 'shareHistory';
            window.setTimeout(onChange, 0, error);
          });

        }, 400);
      },

      unwatchUser() {
        if (this.userRef) this.userRef.off();
        if (this.userHistoryRef) this.userHistoryRef.off();
        if (this.userShareHistoryRef) this.userShareHistoryRef.off();
        this.user = null;
      },

      watchRole(username: string, ownerUsername: string, listName: string, onChange: (error, role: string) => void): void {
        if (this.roleRef) this.roleRef.off();
        if (this.publicRoleRef) this.publicRoleRef.off('value', this.callbacks.get(this.publicRoleRef));
        if (username === ownerUsername) {
          window.setTimeout(onChange, 0, null, "owner");
        } else {
          this.publicRoleRef = firebase.database().ref(`/userLists/${ownerUsername}/${listName}/publicSharing`);
          const publicCallback = (snapshot) => {
            this.publicRole = snapshot.val();
            window.setTimeout(onChange, 0, null, ListService.getBiggerRole(snapshot.val(), this.privateRole),
              this.privateRole, this.publicRole);
          };
          this.callbacks.set(this.publicRoleRef, publicCallback);
          this.publicRoleRef.on('value', publicCallback, error => {
            window.setTimeout(onChange, 0, error);
          });
          if (username) {
            this.roleRef = firebase.database().ref(`/userLists/${ownerUsername}/${listName}/shares/${username}`);
            this.roleRef.on('value', (snapshot) => {
              this.privateRole = snapshot.val();
              window.setTimeout(onChange, 0, null, ListService.getBiggerRole(snapshot.val(), this.publicRole),
                this.privateRole, this.publicRole);
            }, error => {
              window.setTimeout(onChange, 0, error);
            });
          }
        }
      },

      unwatchRole() {
        if (this.roleRef) this.roleRef.off();
        if (this.publicRoleRef) this.publicRoleRef.off('value', this.callbacks.get(this.publicRoleRef));;
        this.privateRole = null;
        this.publicRole = null;
      },

      watchShares(ownerUsername: string, listName: string, onChange: (error, shares: Share[], publicShare: string) => void): void {
        if (this.shareRef) this.shareRef.off();
        if (this.publicShareRef) this.publicShareRef.off('value', this.callbacks.get(this.publicShareRef));
        this.shareRef = firebase.database().ref(`/userLists/${ownerUsername}/${listName}/shares/`);
        this.publicShareRef = firebase.database().ref(`/userLists/${ownerUsername}/${listName}/publicSharing`);
        this.shareRef.on('value', (snapshot) => {
          let shares = snapshot.val();
          if (!shares) shares = {};
          window.setTimeout(onChange, 0, null, ListService.mapShares(shares));
        }, error => {
          error.entity = 'shares';
          window.setTimeout(onChange, 0, error);
        });
        const publicCallback = (snapshot) => {
          const publicShare = snapshot.val();

          window.setTimeout(onChange, 0, null, null, publicShare);
        };
        this.callbacks.set(this.publicShareRef, publicCallback);
        this.publicShareRef.on('value', publicCallback, error => {
          error.entity = 'publicShare';
          window.setTimeout(onChange, 0, error);
        });
      },

      updateShare(ownerUsername: string, listName: string, user: string, role: string) {
        return firebase.database().ref(`/userLists/${ownerUsername}/${listName}/shares/${user}`).set(role);
      },

      updatePublicShare(ownerUsername: string, listName: string, role: string) {
        firebase.database().ref(`/userLists/${ownerUsername}/${listName}/publicSharing`).set(role);
      },

      unwatchShares() {
        if (this.shareRef) this.shareRef.off();
        if (this.publicShareRef) this.publicShareRef.off('value', this.callbacks.get(this.publicShareRef));
      }
    };
    return Watcher;
  }

  static touchList(listType: ListType, listName, usernameOrToken=null) {
    firebase.database().ref(ListService.listPath(listType, listName, usernameOrToken)+"/lastAccess").set(Date.now());
  }

  static listItemsPath(listType: ListType, listName, usernameOrToken=null) {
    if (listType === ListType.USER) {
      return `userListItems/${usernameOrToken}/${listName}`;
    } else {
      return ListService.listPath(listType, listName, usernameOrToken)+"/items";
    }
  }

  static listPath(listType: ListType, listName, usernameOrToken=null) {
    if (listType === ListType.OPEN) return `openLists/${sha512(sha512(listName))}`;
    else if (listType === ListType.PASSWORD) {
      const token = sha512(sha512(listName)+usernameOrToken);
      return `passwordLists/${token}`;
    } else if (listType === ListType.USER) {
      return `userLists/${usernameOrToken}/${listName}`;
    }
  }

  static mapTodoList(listObject): Todo[] {
    const result: Todo[] = [];
    const parents = new Map<string, Todo>();

    let lastParent: Todo = null;
    for (const todoId of Object.keys(listObject)) {
      const todo = listObject[todoId];
      if (!todo.parent) {
        const todoItem = {id: todoId, name: todo.name, done: todo.done, order: todo.order, date: todo.date, children: []};
        parents.set(todoId, todoItem);
        result.push(todoItem);
      } else {
        const parent = parents.get(todo.parent);
        if (!parent) continue;
        if (lastParent) {
          if (lastParent.id !== todo.parent) {
            lastParent.children.sort(ListService.compareByOrder);
            lastParent = parent;
          }
        } else {
          lastParent = parent;
        }
        const todoItem = {id: todoId, name: todo.name, done: todo.done, order: todo.order, parent, date: todo.date, children: []};
        parent.children.push(todoItem);
      }
    }

    if (lastParent) {
      lastParent.children.sort(ListService.compareByOrder);
    }
    result.sort((a, b) => a.order - b.order);

    return result;
  }

  static mapUserLists(userListObject, user): any[] {
    const myLists: any[] = [];
    const sharedLists: any[] = [];

    for (const owner of Object.keys(userListObject)) {
      const listsOfOwner = userListObject[owner];
      for (const list of Object.keys(listsOfOwner)) {
        if (owner === user) {
          myLists.push({name: list, owner, role: listsOfOwner[list]});
        } else {
          sharedLists.push({name: list, owner, role: listsOfOwner[list]});
        }
      }
    }
       myLists.push(...sharedLists);
    return myLists;
  }


  static mapHistory(history: any): any[] {
    const result = [];
    for (const list of Object.keys(history)) {
      const type_name = list.split("_", 2);
      const type = type_name[0] === "open" ? ListType.OPEN : ListType.PASSWORD;
      const time = new Date(history[list].time);
      result.push({type, name: type_name[1], time, typeString: type_name[0]});
    }
    result.sort((h1, h2) => h2.time - h1.time);
    return result;
  }

  static mapShares(shares: any): Share[] {
    const result = [];
    for (const share of Object.keys(shares)) {
      result.push({username: share, role: shares[share]});
    }
    return result;
  }

  static mapShareHistory(history: any): any[] {
    const result = [];
    for (const username of Object.keys(history)) {
      const time = new Date(history[username].time);
      result.push({username, time});
    }
    result.sort((h1, h2) => h2.time - h1.time);
    return result;
  }

  private static escapeAddressBar(s) {
    return s.replace(/ /g, '%20').replace(/:/g, '%3A');
  }

  static hashAddressBar(list: TodoList): string {
    switch (list.type) {
      case ListType.OPEN:
        return '/open/'+ListService.escapeAddressBar(list.name);
      case ListType.PASSWORD:
        return '/secret/'+ListService.escapeAddressBar(list.name);
      case ListType.USER:
        return `/u/${ListService.escapeAddressBar(list.ownerUsername)}/${ListService.escapeAddressBar(list.name)}`;
    }
    return null;
  }

  static unhashAddressBar(hash): TodoList {
    hash = hash.split('/');
    if (hash.length === 3 && hash[1] === 'open') {
      return {
        type: ListType.OPEN,
        name: hash[2]
      };
    } else if (hash.length === 3 && hash[1] === 'secret') {
      return {
        type: ListType.PASSWORD,
        name: hash[2]
      };
    } else if (hash.length === 4 && hash[1] === 'u') {
      return {
        type: ListType.USER,
        name: hash[3],
        ownerUsername: hash[2]
      };
    }
    return null;
  }

  static sameList(a: TodoList, b: TodoList): boolean {
    if (!a && b || a && !b) return false;
    if (a.type !== b.type || a.name !== b.name) return false;
    if (a.type === ListType.USER && a.ownerUsername !== b.ownerUsername) return false;
    return !(a.type === ListType.PASSWORD && a.password && b.password && a.password !== b.password);
  }

  static getBiggerRole(roleA: string, roleB: string): string {
    const line = ['owner', 'admin', 'edit', 'check', 'read'];
    for (const role of line) {
      if (role === roleA || role === roleB) {
        return role;
      }
    }
    return null;
  }

  static compareByOrder(a: Todo, b: Todo) {
    return a.order - b.order;
  }
}
