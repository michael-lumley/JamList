(function() {
  var $, authedGMRequest, converter, glogger, pluginPortals, portal, qs;

  console.log("background");

  glogger = require("../resources/glogger/glog.js");

  pluginPortals = require("../resources/plugin-portals/src/plugin-portals.js");

  $ = require("jquery");

  qs = require("../../node_modules/querystring");

  converter = require("./converter.js");

  authedGMRequest = function(options) {
    var promise;
    console.log("authed request");
    console.log(options);
    return promise = new Promise(function(resolve, reject) {
      return chrome.identity.getAuthToken(function(token) {
        var request;
        console.log(token);
        if (options.skyjam) {
          request = {
            url: "https://www.googleapis.com/sj/v2.5/" + options.endpoint + "?" + (qs.stringify(options.params)),
            type: options.method,
            data: options.data,
            headers: {
              Authorization: "Bearer " + token,
              Accept: "application/json"
            },
            dataType: "json"
          };
          console.log(request);
        } else {
          request = {
            url: "https://play.google.com/music/services/" + options.endpoint + "?" + (qs.stringify(options.params)),
            type: options.method,
            data: JSON.stringify(options.data),
            dataType: "json"
          };
        }
        return $.ajax(request).done(function(data) {
          console.log(data);
          return resolve(data);
        }).fail(function(error) {
          console.log(error);
          return reject(error);
        });
      });
    });
  };

  portal = new pluginPortals.BackgroundPortal({
    open: function() {
      var promise;
      return promise = new Promise(function(resolve, reject) {
        return chrome.tabs.create({
          url: "http://music.google.com"
        }, function(tab) {
          setInterval(function() {
            return console.log(tab.status);
          }, "50");
          return resolve(true);
        });
      });
    },
    allPlaylists: function(args) {
      var promise;
      return promise = new Promise(function(resolve, reject) {
        console.log(args);
        return authedGMRequest({
          endpoint: 'playlists',
          skyjam: true,
          method: "GET",
          data: null,
          params: {
            "dv": 0,
            "hl": "en-US",
            "tier": args.user.tier,
            "max-results": 100
          }
        }).then(function(response) {
          return resolve({
            playlists: response.data.items
          });
        })["catch"](function(error) {
          console.log(error);
          return reject(error);
        });
      });
    },
    playlist: function(args) {
      var promise;
      console.log(args);
      return promise = new Promise(function(resolve, reject) {
        console.log("making request");
        return authedGMRequest({
          endpoint: 'loaduserplaylist',
          skyjam: false,
          method: "POST",
          data: null,
          user: args.user,
          params: {
            u: 0,
            xt: args.user.xt,
            format: "jsarray",
            dv: "0",
            obfid: args.user.obfid
          },
          data: [["", 1], [args.id]]
        }).then(function(response) {
          var i, key, len, ref, ret, track;
          ret = [];
          ref = response[1][0];
          for (key = i = 0, len = ref.length; i < len; key = ++i) {
            track = ref[key];
            ret.push(converter.google.track(track));
          }
          return resolve(ret);
        })["catch"](function(error) {
          return reject(error);
        });
      });
    }
  });

  console.log(glogger);


  /*
  console.log "backgroundjs"
  
  background = {
    tabs:
      musicExtension: null
      app: null
    setup: ()->
      console.log "setting up listener"
      chrome.runtime.onMessage.addListener((message, sender, sendResponse)=>
        console.log("Got Message at Background!")
        console.log sender
        console.log @
        console.log message.action
        console.log @[message.action]
        if @[message.action]?
          @[message.action](message, sender, sendResponse)
        else
          console.log("ERROR: Recieved Message At Background Without An Action")
          console.log(message)
      )
    userToBackground: (message, sender, sendResponse)->
      console.log("subroutine")
      message.user.tabId = sender.tab.id
      @user = message.user
      @tabs.musicExtension = sender.tab.id
      console.log("createtab")
      chrome.tabs.create({
        url: "html/container.html"
      }, (tab)=>
        @tabs.app = tab.id
      )
    userToApp: (message, sender, sendResponse)->
      sendResponse(@user)
    testMessage: (message, sender, sendResponse)->
      console.log sender.tab.id
  }
  
  background.setup()
   */

}).call(this);
