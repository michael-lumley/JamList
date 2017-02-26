(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var polymerDefinition;

console.log("tracklist");

if (window.elements == null) {
  window.elements = {};
}

polymerDefinition = _.deepSafeExtend(window.elements.listElem, {
  is: "track-list",
  properties: {
    activeTrack: {
      type: Object
    },
    dataPath: {
      type: String,
      value: "libraryEntries"
    }
  },
  listeners: {
    '_deleteConfirm': '_deleteConfirm',
    '_generateNote': '_generateNote',
    '_generateLabel': '_generateLabel',
    '_generateDWIVideoRequest': '_generateDWIVideoRequest',
    '_fill911': '_fill911'
  },
  created: function() {
    console.log("listelemcreate");
    return console.log(this);
  },
  ready: function() {
    var grid;
    console.log("trackelemready");
    console.log(app.libraryEntries);
    grid = this.$["vaadin-grid"];
    grid.items = app.libraryEntries;
    return console.log(grid.columns);
  },
  attached: function() {},
  _deleteConfirm: function(e) {
    console.log(e);
    console.log(e.srcElement.id);
    this.activeCase = app.get("case", e.srcElement.eid);
    console.log("deleteConfirm");
    console.log(this.activeCase);
    return this.$.confirmDelete.open();
  }
});

window.elements.trackList = Polymer(polymerDefinition);


},{}]},{},[1]);
