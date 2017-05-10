import { Component, OnInit } from '@angular/core';
import {NumbersService} from './numbers.service';
import {Http} from '@angular/http';

@Component({
  selector: 'app-numbers',
  templateUrl: './numbers.component.html',
  styleUrls: ['./numbers.component.css']
})
export class NumbersComponent implements OnInit {

  trackings: any = [];

  constructor(private numbersService: NumbersService, private http: Http) { }

  ngOnInit() {
    this.numbersService.getAllNumbers().subscribe(trackings => {
      this.trackings = trackings;
    });
  }
}
