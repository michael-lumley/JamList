(function() {
  var converter, pluginPortals, portal;

  console.log("google music content");

  window.glogger = require("../resources/glogger/glog.js");

  pluginPortals = require("../resources/plugin-portals/src/plugin-portals.js");

  converter = require("./converter.js");

  portal = new pluginPortals.ClientPortal("google_music", {
    userInfo: function() {
      var promise;
      console.log("here");
      return promise = new Promise(function(resolve, reject) {
        var codeToInject, injectFunc;
        codeToInject = function() {
          console.log(window.USER_CONTEXT);
          if (window.USER_CONTEXT !== '') {
            return window.postMessage({
              id: window.USER_ID,
              email: window.USER_CONTEXT[12],
              tier: window.USER_CONTEXT[13],
              obfid: window.USER_CONTEXT[25],
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
        window.addEventListener('message', (function(_this) {
          return function(event) {
            if (event.origin === "https://play.google.com") {
              return resolve({
                user: event.data
              });
            }
          };
        })(this));
        return injectFunc(codeToInject);
      });
    },

    /* Gets All Tracks Belonging to a User
    		@object args.user
     */
    getTracks: function(args) {
      var user;
      user = args.user;
      return new Promise((function(_this) {
        return function(resolve, reject) {
          var DBOpenRequest, tracks;
          tracks = [];
          DBOpenRequest = window.indexedDB.open("music_" + user.id, 6);
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
                  tracks.push(converter.google.track(track));
                }
                return cursor["continue"]();
              } else {
                console.log(tracks);
                return resolve({
                  tracks: tracks
                });
              }
            };
          };
        };
      })(this));
    }
  });

}).call(this);
