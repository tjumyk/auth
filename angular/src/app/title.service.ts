import {Injectable} from '@angular/core';
import {Title} from "@angular/platform-browser";
import {environment} from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TitleService {
  readonly env = environment;
  private readonly splitter = ' - ';

  constructor(
    private title: Title
  ) {
  }

  setTitle(...segments: string[]) {
    const appTitle = this.env.title;
    let newTitle;
    if (segments && segments.length)
      newTitle = segments.join(this.splitter) + this.splitter + appTitle;
    else
      newTitle = appTitle;
    this.title.setTitle(newTitle)
  }
}
