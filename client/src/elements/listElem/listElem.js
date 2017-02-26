(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
window.elements.listElem = {
  properties: {
    localData: {
      type: Array,
      value: []
    },
    filters: {
      type: Array,
      notify: true,
      value: []
    },
    activeFilterId: {
      type: Number,
      value: null,
      notify: true
    }
  },
  listeners: {
    'cell-tap': 'cellTap'
  },
  cellListeners: {
    'Docket': 'docketTap'
  },
  ready: function() {
    console.log("listelem ready");
    app.patchDatatable(this.$.datatableList, this);
    console.log(this.dataPath);
    console.log(app);
    console.log(app.libraryEntries);
    console.log(app[this.dataPath]);
    this.localData = app[this.dataPath];
    return console.log(this.localData);
  },
  refresh: function() {
    this.$.datatableList.data = [];
    this.filter();
    return this.$.datatableList.data = this.localData;
  },
  attached: function() {
    console.log("attached");
    return console.log(trace());
  },
  filter: function() {
    var filter;
    if (this.activeFilterId !== null) {
      filter = this.filters[this.activeFilterId];
      return this.localData = filter.filter(app.cases);
    } else {
      return this.localData = app.cases;
    }
  },
  cellTap: function(e) {
    if (this.cellListeners[e.detail.column.header] != null) {
      return this[this.cellListeners[e.detail.column.header]](e);
    }
  },
  docketTap: function(e) {
    if (e.detail.item["case"] != null) {
      return app.displayCase(e.detail.item["case"].id);
    } else {
      return app.displayCase(e.detail.item.id);
    }
  }
};


},{}]},{},[1]);
