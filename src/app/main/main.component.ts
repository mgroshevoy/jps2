import { Component, OnInit } from '@angular/core';
import {ToasterService, ToasterConfig} from 'angular2-toaster';

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.css']
})
export class MainComponent implements OnInit {

  private toasterService: ToasterService;
  public toasterconfig : ToasterConfig =
    new ToasterConfig({
      positionClass: "toast-top-center",
      timeout: 5000
    });

  constructor(toasterService: ToasterService) {
    this.toasterService = toasterService;
  }

  ngOnInit() {
  }

}
