(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var polymerDefinition;

console.log("tracklist");

if (window.elements == null) {
  window.elements = {};
}

polymerDefinition = _.deepSafeExtend(window.elements.listElem, {
  is: "da-case-list",
  properties: {
    activeCase: {
      type: Object
    },
    cases: {
      type: Array,
      notify: true
    },
    deleteAuditCases: {
      type: Array,
      notify: true,
      value: []
    },
    filters: {
      type: Array,
      notify: true,
      value: []
    },
    newAuditCases: {
      type: Array,
      notify: true,
      value: []
    },
    syncAuditCases: {
      type: Array,
      notify: true,
      value: []
    },
    tickingCount: {
      type: Number,
      computed: '_tickingCount(cases)'
    },
    user: {
      type: String,
      notify: true
    }
  },
  listeners: {
    '_deleteConfirm': '_deleteConfirm',
    '_generateNote': '_generateNote',
    '_generateLabel': '_generateLabel',
    '_generateDWIVideoRequest': '_generateDWIVideoRequest',
    '_fill911': '_fill911'
  },
  created: function() {},
  ready: function() {
    window.daElements.listElem.ready.call(this);
    return this.$.datatableList.customRowStyle = (function(_this) {
      return function(item) {
        if (moment(item.nextOn).isBefore(moment().add(-1, "days"))) {
          return "background: #FFFACD";
        } else {
          console.log(_.indexOf(app.onDates, moment(item.nextOn).format("MM-DD-YYYY")) % 2);
          if (_.indexOf(app.onDates, moment(item.nextOn).format("MM-DD-YYYY")) % 2 === 1) {
            return "background: #F1F1F1";
          }
          return "";
        }
      };
    })(this);

    /*
    @push("filters", new window.daElements.daCaseFilter(
      properties:
        name: "All Cases"
    ))
    @push("filters", new window.daElements.daCaseFilter(
      properties:
        name: "Two Week Trial List"
        onFor: ["TL", "H+TL"]
        nextDateIn: 140
        noDispos: true
    ))
    @push("filters", new window.daElements.daCaseFilter(
      properties:
        name: "Open Cases"
        open: true
    ))
    @push("filters", new window.daElements.daCaseFilter(
      properties:
        name: "Closed Cases"
        open: false
    ))
    @push("filters", new window.daElements.daCaseFilter(
      properties:
        name: "Ticking Cases"
        ticking: true
    ))
    @activeFilterId = 2
    @refresh()
     */
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
