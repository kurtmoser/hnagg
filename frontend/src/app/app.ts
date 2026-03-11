import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DateBar } from './components/date-bar/date-bar';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, DateBar],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App { }
