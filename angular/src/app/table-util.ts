export class PageEntry {
  page?: number;
  is_ellipse?: boolean = false;
  is_current?: boolean = false;
}

export class Pagination<T> {
  readonly itemsPerPageOptions = [10, 20, 50, 100, 200, 500];
  readonly _pageEntryPadding = 3;
  private _fieldComparators: { [key: string]: (a: any, b: any) => number } = {};
  private _searchMatcher: ((item: T, key: string) => boolean) | undefined;

  private _page: number | undefined;
  private _pages: number | undefined;
  private _itemsPerPage: number; // make sure use one of itemsPerPageOptions as the default value

  private _sortField: string | undefined;
  private _isSortDescending: boolean | undefined;
  private _searchKey: string | undefined;

  private _sourceItems: T[] | undefined;
  private _items: T[] | undefined;
  private _itemPages: T[][] | undefined;
  private _pageItems: T[] | undefined;
  private _pageEntries: PageEntry[] | undefined;

  constructor(sourceItems?: T[], itemsPerPage: number = 20) {
    this._sourceItems = sourceItems;
    this._itemsPerPage = itemsPerPage;
    this.updatePages()
  }

  get pages(): number | undefined {
    return this._pages
  }

  get page(): number | undefined {
    return this._page
  }

  set page(page: number | undefined) {
    if (page !== this._page) {
      this._page = page;
      this.updatePage()
    }
  }

  get itemsPerPage(): number {
    return this._itemsPerPage
  }

  set itemsPerPage(itemsPerPage: number) {
    if (itemsPerPage !== this.itemsPerPage) {
      this._itemsPerPage = itemsPerPage;
      this.updatePages()
    }
  }

  get sourceItems(): T[] | undefined {
    return this._sourceItems
  }

  set sourceItems(items: T[] | undefined) {
    if (items !== this._sourceItems) {
      this._sourceItems = items;
      this.updatePages()
    }
  }

  get items(): T[] | undefined {
    return this._items;
  }

  get pageItems(): T[] | undefined {
    return this._pageItems;
  }

  get pageEntries(): PageEntry[] | undefined {
    return this._pageEntries;
  }

  get sortField(): string | undefined {
    return this._sortField
  }

  get isSortDescending(): boolean | undefined {
    return this._isSortDescending;
  }

  get startRow(): number | undefined { // start from 1
    if (this._page === undefined) {
      return undefined;
    }
    return (this._page - 1) * this._itemsPerPage + 1
  }

  get endRow(): number | undefined { // start from 1, inclusive
    if (this._page === undefined || this._pageItems === undefined) {
      return undefined;
    }
    return (this._page - 1) * this._itemsPerPage + this._pageItems.length
  }

  reload() {
    this.updatePages()
  }

  private updatePages() {
    // no items or invalid itemsPerPage
    if (!this._sourceItems || !this._sourceItems.length || this._itemsPerPage <= 0) {
      this._items = [];
      this._itemPages = [[]];
      this._pages = 1;
      this._page = 1;
      this._pageItems = this._itemPages[0];
      this.makeEntries();
      return
    }

    let items = this._sourceItems;
    let usingSource = true;

    // do filtering if required
    if (this._searchMatcher && this._searchKey) {
      const _searchMatcher = this._searchMatcher;
      const _searchKey = this._searchKey;
      items = items.filter((item) => _searchMatcher(item, _searchKey));
      usingSource = false;
    }

    // do sorting if required
    if (this._sortField) {
      const _sortField = this._sortField;
      if (usingSource) {
        items = items.slice(); // make a copy first
        usingSource = false;
      }
      // find compare function
      const compareFn = this._fieldComparators[this._sortField];

      const startTime = new Date().getTime();
      items.sort((a: any, b: any) => {
        const fa = a[_sortField];
        const fb = b[_sortField];

        if (fa === undefined || fa === null) {
          return (fb === undefined || fb === null) ? 0 : 1;
        }
        if (fb === undefined || fb === null)
          return -1;

        const val = compareFn ? compareFn(fa, fb) : (fa < fb ? -1 : (fa > fb ? 1 : 0));
        if (this._isSortDescending)
          return -val;
        else
          return val
      });
      console.info(new Date().getTime() - startTime)
    }
    this._items = items;

    // compute pages
    this._pages = Math.ceil(this._items.length / this._itemsPerPage) || 1; // at least 1 page
    this._page = 1;
    this._itemPages = [];
    for (let i = 0; i < this._pages; ++i) {
      this._itemPages.push(this._items.slice(i * this._itemsPerPage, (i + 1) * this._itemsPerPage))
    }

    // update current page
    this.updatePage();
  }

  private updatePage() {
    this.makeEntries();
    if (this._page === undefined || this._pages === undefined || this._itemPages === undefined) {
      this._pageItems = undefined;
      return;
    }
    if (this._page < 1 || this._page > this._pages) {
      this._pageItems = [];
      return
    }
    this._pageItems = this._itemPages[this._page - 1];
  }

  private makeEntries() {
    if (this._page === undefined || this._pages === undefined) {
      return;
    }
    const start = Math.max(1, this._page - this._pageEntryPadding);
    const end = Math.min(this._pages, this._page + this._pageEntryPadding);

    this._pageEntries = [];
    for (let i = start; i <= end; ++i) {
      let entry: PageEntry = {page: i};
      if (i == this._page)
        entry.is_current = true;
      this._pageEntries.push(entry)
    }
    if (start > 2) {
      this._pageEntries.unshift({is_ellipse: true})
    }
    if (start > 1) {
      this._pageEntries.unshift({page: 1})
    }
    if (end < this._pages - 1) {
      this._pageEntries.push({is_ellipse: true})
    }
    if (end < this._pages) {
      this._pageEntries.push({page: this._pages})
    }
  }

  nextPage() {
    if (this._page === undefined || this._pages === undefined) {
      return;
    }
    if (this._page < this._pages) {
      this.page = this._page + 1;
    }
  }

  previousPage() {
    if (this._page === undefined) {
      return;
    }
    if (this._page > 1) {
      this.page = this._page - 1;
    }
  }

  firstPage() {
    this.page = 1
  }

  lastPage() {
    this.page = this._pages;
  }

  sort(field: string | undefined, isDescending: boolean = false) {
    if (field !== this._sortField || isDescending != this._isSortDescending) {
      this._sortField = field;
      this._isSortDescending = isDescending;
      this.updatePages();
    }
  }

  search(key: string) {
    if (key != this._searchKey) {
      this._searchKey = key;
      this.updatePages()
    }
  }

  setSearchMatcher(matcher: (item: T, key: string) => boolean) {
    this._searchMatcher = matcher;
  }

  setFieldComparator(field: string, compareFn: (a: any, b: any) => number) {
    this._fieldComparators[field] = compareFn
  }

}
