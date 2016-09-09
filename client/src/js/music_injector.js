(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var codeToInject, getTracks, injectFunc;

console.log("Advanced Database Running");

codeToInject = function() {
  console.log("injected code");
  console.log(window.USER_CONTEXT);
  if (window.USER_CONTEXT !== '') {
    return window.postMessage({
      id: window.USER_ID,
      email: window.USER_CONTEXT[12],
      tier: window.USER_CONTEXT[13],
      xt: window._GU_getCookie('xt')
    }, 'https://play.google.com');
  }
};

injectFunc = function(func) {
  var script;
  script = document.createElement('script');
  script.textContent = "(" + func + ")()";
  (document.head || document.documentElement).appendChild(script);
  return script.parentNode.removeChild(script);
};

getTracks = function() {
  var DBOpenRequest, tracks;
  console.log(user);
  tracks = [];
  DBOpenRequest = window.indexedDB.open("music_" + user.id, 6);
  return new Promise((function(_this) {
    return function(resolve, reject) {
      return DBOpenRequest.onsuccess = function(event) {
        var db, transaction;
        db = DBOpenRequest.result;
        transaction = db.transaction(['tracks', 'info'], 'readonly');
        return transaction.objectStore('tracks').openCursor().onsuccess = function(event) {
          var cursor, id, shard, track;
          cursor = event.target.result;
          if (cursor) {
            shard = JSON.parse(cursor.value);
            console.log("looping shard");
            for (id in shard) {
              track = shard[id];
              tracks.push(track);
            }
            return cursor["continue"]();
          } else {
            console.log(tracks);
            return resolve(tracks);
          }
        };
      };
    };
  })(this));
};

window.addEventListener('message', (function(_this) {
  return function(event) {
    var message;
    if (event.origin === "https://play.google.com") {
      window.user = event.data;
      console.log(event.data);
      message = {};
      message.user = event.data;
      message.action = "userToBackground";
      return chrome.runtime.sendMessage(message);

      /*
      console.log transaction.objectStore('info').get;
      transaction.objectStore('info').get('sync_token').onsuccess = (event)->
        console.log event.target.result
       */
    }
  };
})(this));

chrome.runtime.onMessage.addListener((function(_this) {
  return function(request, sender, sendResponse) {
    console.log("Got message at Injector!");
    if (request.action === "getTracks") {
      getTracks().then(function(data) {
        return sendResponse(data);
      });
    }
    return true;
  };
})(this));

console.log("injecting");

injectFunc(codeToInject);

console.log(window.user);


},{}]},{},[1]);
