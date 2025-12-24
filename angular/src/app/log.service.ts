import {Injectable} from '@angular/core';

export interface Logger {
  debug: (message: any) => void;
  info: (message: any) => void;
  warn: (message: any) => void;
  error: (message: any) => void
}

@Injectable({
  providedIn: 'root'
})
export class LogService {
  private css_tag: string = 'background: white; padding: 0 3px 0 3px; font-weight: bold; color: black; border-left: 4px solid;';
  private css_message: string = '';

  constructor() {
  }

  get_logger(tag: string): Logger {
    return {
      debug: console.debug.bind(window.console, `%c${tag}%c %s`, this.css_tag + 'border-color: #767676;', this.css_message),
      info: console.info.bind(window.console, `%c${tag}%c %s`, this.css_tag + 'border-color: #2185d0;', this.css_message),
      warn: console.warn.bind(window.console, `%c${tag}%c %s`, this.css_tag + 'border-color: #db2828;', this.css_message),
      error: console.error.bind(window.console, `%c${tag}%c %s`, this.css_tag + 'border-color: #db2828;', this.css_message),
    }
  }
}
