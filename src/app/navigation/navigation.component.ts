import { Component } from '@angular/core';
import {AuthService} from '../login/auth.service';

@Component({
  selector: 'app-navigation',
  templateUrl: './navigation.component.html',
  styleUrls: ['./navigation.component.css']
})
export class NavigationComponent {

  constructor(public auth: AuthService) {}

  loggedIn () {
    return this.auth.loggedIn();
  }
  logout () {
    this.auth.logout();
  }
}
