import {Component, OnInit} from '@angular/core';
import {AuthService} from './auth.service';

interface Credentials {
  username: string,
  password: string
}

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})

export class LoginComponent {

  credentials: Credentials;

  constructor(public auth: AuthService) {}

  onLogin(credentials) {
    this.auth.login(credentials);
  }
}
