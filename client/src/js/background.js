(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var background;

console.log("backgroundjs");

background = {
  tabs: {
    musicExtension: null,
    app: null
  },
  setup: function() {
    console.log("setting up listener");
    return chrome.runtime.onMessage.addListener((function(_this) {
      return function(message, sender, sendResponse) {
        console.log("Got Message at Background!");
        console.log(sender);
        console.log(_this);
        console.log(message.action);
        console.log(_this[message.action]);
        if (_this[message.action] != null) {
          return _this[message.action](message, sender, sendResponse);
        } else {
          console.log("ERROR: Recieved Message At Background Without An Action");
          return console.log(message);
        }
      };
    })(this));
  },
  userToBackground: function(message, sender, sendResponse) {
    console.log("subroutine");
    message.user.tabId = sender.tab.id;
    this.user = message.user;
    this.tabs.musicExtension = sender.tab.id;
    console.log("createtab");
    return chrome.tabs.create({
      url: "html/container.html"
    }, (function(_this) {
      return function(tab) {
        return _this.tabs.app = tab.id;
      };
    })(this));
  },
  userToApp: function(message, sender, sendResponse) {
    return sendResponse(this.user);
  },
  testMessage: function(message, sender, sendResponse) {
    return console.log(sender.tab.id);
  }
};

background.setup();


},{}]},{},[1]);
