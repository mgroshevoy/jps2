import { Injectable } from '@angular/core';
import {Http} from '@angular/http';
import {tokenNotExpired} from 'angular2-jwt';
import {Router} from '@angular/router'

@Injectable()
export class AuthService {

  constructor(private http: Http, private router: Router) {}

  login(credentials) {
    this.http.post('/api/login', credentials)
      .map(res => res.json())
      .subscribe(
        // We're assuming the response will be an object
        // with the JWT on an id_token key
        data => {
          localStorage.setItem('token', data.token);
          this.router.navigateByUrl('/');
        },
        error => console.log(error)
      );
  }

  loggedIn() {
    return tokenNotExpired();
  }

  logout() {
    localStorage.removeItem('token');
    this.router.navigateByUrl('/login');
  }
}
