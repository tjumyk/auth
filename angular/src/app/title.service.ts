import {Injectable} from '@angular/core';
import {Title} from "@angular/platform-browser";

@Injectable({
  providedIn: 'root'
})
export class TitleService {
  private readonly splitter = ' - ';
  private readonly appTitle = '深圳大学数据科学与工程研究组';

  constructor(
    private title: Title
  ) {
  }

  setTitle(...segments: string[]) {
    let newTitle;
    if (segments && segments.length)
      newTitle = segments.join(this.splitter) + this.splitter + this.appTitle;
    else
      newTitle = this.appTitle;
    this.title.setTitle(newTitle)
  }
}
