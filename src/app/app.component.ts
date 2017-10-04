import {ChangeDetectorRef, Component, OnInit} from '@angular/core';
import { TodoList } from './models/TodoList';
import { ThemingService, Theme } from './theming/index';
import {UsersService} from "./services/users.service";
import {ListType} from "./models/ListType";

function initAds(d) {

  const params = {
    id: "b966d64c-ded9-4864-8e11-5eee8ae618c2",
    d:  "c2hhcmV0b2RvbGlzdC5ldQ==",
    wid: "370231",
    cb: (new Date()).getTime()
  };

  const qs=[];
  for (const key in params) qs.push(key+'='+encodeURIComponent(params[key]));
  const s = d.createElement('script');s.type='text/javascript';s.async=true;
  const p = 'https:' === document.location.protocol ? 'https' : 'http';
  s.src = p + "://api.content-ad.net/Scripts/widget2.aspx?" + qs.join('&');
  d.getElementById("contentad370231").appendChild(s);
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.sass']
})
export class AppComponent implements OnInit {
  title = 'SHARE YOUR TODO LIST';
  selectedList: TodoList;
  theme: Theme = ThemingService.emptyTheme;
  adHidden = false;
  // adHiddenClass = false;

  constructor(private themingService: ThemingService, private usersService: UsersService,
    private uiUpdater: ChangeDetectorRef) {
    let adHiddenTime: any = window.localStorage.getItem("adHiddenTime");
    adHiddenTime = parseInt(adHiddenTime, 10);
    if (adHiddenTime) {
      if (Date.now() - adHiddenTime < 1000*60*60*17) {
        this.adHidden = window.localStorage.getItem("adHidden") === 'true';
      }
    } else {
      window.localStorage.setItem("adHiddenTime", Date.now()+"");
      window.localStorage.setItem("adHidden", 'true');
      this.adHidden = true;
    }

  }

  ngOnInit() {
    this.themingService.setThemingRules({
      'body-background': {
        directVariable: true
      },
      'header-background': {
        directVariable: true
      },
      'header-color': {
        directVariable: true
      },
      'main-background': {
        directVariable: true
      },
      'footer-background': {
        directVariable: true
      },
      'footer-color': {
        directVariable: true
      }
    });
    this.themingService.theme.subscribe(theme => {
      this.theme = theme;
      this.uiUpdater.detectChanges();
    });
    this.usersService.currentUser.subscribe(user => {
      const username = user ? user.username : null;
      this.themingService.setUser(username);
    });


    // initAds(document);
  }

  onListSelected(todoList: TodoList) {
    this.selectedList = todoList;
    this.uiUpdater.detectChanges();
  }

  onHideAd() {
    window.localStorage.setItem("adHiddenTime", Date.now()+"");
    window.localStorage.setItem("adHidden", 'true');
    // this.adHiddenClass = true;
    this.adHidden = true;
    this.uiUpdater.detectChanges();
  }

  onShowAd() {
    // window.localStorage.removeItem("adHiddenTime");
    window.localStorage.removeItem("adHidden");
    // if (this.adHidden) {
    //   window.setTimeout(initAds, 300, document);
    // }
    this.adHidden = false;
    // this.adHiddenClass = false;
    this.uiUpdater.detectChanges();
  }
}
