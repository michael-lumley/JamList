(function() {
  if (window.elements == null) {
    window.elements = {};
  }

  window.elements.app = Polymer({
    is: "jamlist-app",
    properties: {
      playerActive: {
        type: Boolean,
        value: false
      },
      serviceActive: {
        type: Boolean,
        value: false
      },
      libraryEntries: {
        type: Array
      },
      playlists: {
        type: Array
      },
      tags: {
        type: Array
      },
      user: {
        type: Object,
        notify: true,
        value: function() {
          return {
            google: {},
            jamlist: {}
          };
        }
      },
      urlBase: {
        type: "string"
      },
      tokens: {
        type: Array
      }
    },
    listeners: {
      'close-case': 'closeCase'
    },
    portal: new pluginPortals.ClientPortal("application", {
      beforeSend: (function(_this) {
        return function(args) {
          if (args == null) {
            args = {};
          }
          glogger("last").add(args);
          if (typeof app !== "undefined" && app !== null) {
            console.log(app);
            if (app.__data__ != null) {
              console.log(app.__data__);
              args.user = app.user.google;
            }
          }
          return args;
        };
      })(this)
    }),
    created: function() {
      console.log("creating app");
      window.app = this;
      this.urlBase = "localhost";
      this.tokens = [];
      console.log("sending message");
      return this.portal.sendMessage({
        target: "google_music",
        fn: "userInfo",
        args: {}
      }).then((function(_this) {
        return function(response) {
          return _this.user.google = response.user;
        };
      })(this));
    },
    ready: function() {
      return console.log("ready");
    },
    attached: function() {
      console.log("attached");
      this.routerSetup();
      if (app.tokens[app.user.email] == null) {
        return this.setRoute("login");
      }
    },
    router: function() {
      var url;
      url = location.hash.slice(1) || '/';
      if (this.routes[url.substr(1)] != null) {
        return this.routes[url.substr(1)].bind(this)();
      }
    },
    routerSetup: function() {
      this.routes = {
        "login": function() {
          return this.display.login.bind(this)();
        },
        "tracks": function() {
          return this.display.trackList.bind(this)();
        }
      };
      window.addEventListener('hashchange', this.router.bind(this));
      window.addEventListener('load', this.router.bind(this));
      return this.router();
    },
    setRoute: function(route) {
      return window.location.hash = "#/" + route;
    },
    upsert: function(type, data, where) {
      if (data == null) {
        data = {};
      }
      if (where == null) {
        where = {};
      }
      if (type !== "track") {
        where.jlUser = this.user.jamlist.username;
        data.jlUserId = this.user.jamlist.username;
      }
      return this.xhr({
        method: "POST",
        url: "http://" + this.urlBase + ":3000/api/" + (type.pluralize()) + "/upsertWithWhere",
        data: data,
        qs: {
          where: where
        }
      });
    },
    syncWithService: function() {
      return new Promise((function(_this) {
        return function(resolve, reject) {
          var playlists, tracks;
          tracks = _this.portal.sendMessage({
            target: "google_music",
            fn: "getTracks"
          });
          playlists = _this.portal.sendMessage({
            target: "background",
            fn: "allPlaylists"
          });
          return Promise.all([tracks, playlists]).then(function(data) {
            var fn, fn1, i, j, key, len, len1, playlist, servicePlaylists, serviceTracks, track;
            console.log(data);
            serviceTracks = data[0].tracks;
            servicePlaylists = data[1].playlists;
            fn = function(track) {
              if (key < 3) {
                return console.log(track);

                /*
                							if !@find("libraryEntry", (entry)-> entry.track.googleId == track[0])
                								@upsertTrack(track).then((data)=>
                									@add("libraryEntry", {
                										playCount: track.playCount
                										rating: track.rating
                										trackId: data.id
                									})
                								)
                 */
              }
            };
            for (key = i = 0, len = serviceTracks.length; i < len; key = ++i) {
              track = serviceTracks[key];
              fn(track);
            }
            fn1 = function(playlist) {
              var globalTag;
              if (key < 3) {
                globalTag = {};
                console.log(playlist);
                return Promise.resolve().then(function() {
                  return _this.upsert("tag", {
                    name: playlist.name
                  }, {
                    name: playlist.name
                  });
                }).then(function(tag) {
                  globalTag = tag;
                  return _this.portal.sendMessage({
                    target: "background",
                    fn: "playlist",
                    args: {
                      id: playlist.id
                    }
                  });
                }).then(function(playlistEntries) {
                  var k, len2, results;
                  console.log(playlistEntries);
                  results = [];
                  for (key = k = 0, len2 = playlistEntries.length; k < len2; key = ++k) {
                    track = playlistEntries[key];
                    console.log(track);
                    results.push(_this.upsert("track", track, {
                      title: track.title,
                      artist: track.artist,
                      millisduration: track.millisduration
                    }).then(function(track) {
                      var id;
                      id = track.id;
                      track.trackId = id;
                      delete track.id;
                      return _this.upsert("libraryEntry", track, {
                        trackId: id
                      });
                    }).then(function(libraryEntry) {
                      return _this.xhr({
                        type: "PUT",
                        url: "http://localhost:3000/api/tags/" + globalTag.id + "/libraryEntries/rel/" + libraryEntry.id
                      });
                    }));
                  }
                  return results;
                });
              }
            };
            for (key = j = 0, len1 = servicePlaylists.length; j < len1; key = ++j) {
              playlist = servicePlaylists[key];
              fn1(playlist);
            }
            return resolve();
          });

          /*
          			.then((response)=>
          				console.log googleTracks
          				for track, key in googleTracks
          					do (track) =>
          						if key < 60
          							if !@find("libraryEntry", (entry)-> entry.track.googleId == track[0])?
          								console.log "upserting"
          								@upsertTrack(track).then((data)=>
          									console.log "#{track[22]} - #{track[23]} - #{track[1]} - #{track[3]}"
          									@add("libraryEntry", {
          										playCount: track[22]
          										rating: track[23]
          										trackId: data.id
          									})
          								)
          				resolve()
          			)
           */
        };
      })(this));
    },
    loadJamListData: function() {
      return new Promise((function(_this) {
        return function(resolve, reject) {
          var libraryEntries, playlists, tags;
          libraryEntries = _this.xhr({
            method: "GET",
            url: "http://localhost:3000/api/jlUsers/" + _this.user.jamlist.username + "/libraryEntries",
            data: {
              filter: {
                include: ['track', 'tags']
              }
            }
          });
          playlists = _this.xhr({
            method: "GET",
            url: "http://localhost:3000/api/jlUsers/" + _this.user.jamlist.username + "/playlists",
            data: {
              filter: {
                include: {
                  relation: 'rules'
                }
              }
            }
          });
          tags = _this.xhr({
            method: "GET",
            url: "http://localhost:3000/api/jlUsers/" + _this.user.jamlist.username + "/playlists"
          });
          return Promise.all([libraryEntries, playlists, tags]).then(function(data) {
            console.log(data);
            _this.libraryEntries = data[0];
            _this.playlists = data[1];
            _this.tags = data[2];
            return resolve();
          });
        };
      })(this));
    },
    get: function(type, id) {
      id = +id;
      return _.find(this[type.pluralize()], function(instData) {
        return instData.id === id;
      });
    },
    find: function(type, data) {
      if (typeof data === "object") {
        return _.findWhere(this[type.pluralize()], data);
      }
      if (typeof data === "function") {
        return _.find(this[type.pluralize()], data);
      }
    },
    setAttr: function(type, id, localProp, value) {
      var obj;
      id = +id;
      obj = this.get(type, id);
      if (localProp !== 'id') {
        obj[localProp] = value;
        this.queueData(type, id, localProp, value);
        return true;
      }
      return false;
    },
    add: function(type, data) {
      return this.xhr({
        method: "POST",
        url: "http://" + this.urlBase + ":3000/api/jlUsers/" + this.user.username + "/" + (type.pluralize()),
        data: data
      });
    },
    "delete": function(type, id) {
      var caseData, item, plType;
      if (type === "case") {
        caseData = this.get('case', id);
        return new Promise((function(_this) {
          return function(resolve, reject) {
            return app.xhr({
              method: "DELETE",
              url: "http://" + _this.urlBase + ":3000/api/Cases/" + caseData.id
            }).then(function(data) {
              var index;
              index = _this.cases.indexOf(caseData);
              _this.splice('cases', index, 1);
              return resolve(data.response);
            });
          };
        })(this));
      } else {
        id = +id;
        plType = type.pluralize();
        item = this.get(type, id);
        return new Promise((function(_this) {
          return function(resolve, reject) {
            return app.xhr({
              method: "DELETE",
              url: "http://" + _this.urlBase + ":3000/api/" + (plType.frontCap()) + "/" + id
            }).then(function(data) {
              var caseElem;
              _this[plType] = _.without(_this[plType], item);
              if (item.caseId != null) {
                caseElem = _this.get('case', item.caseId);
                caseElem[plType] = _.without(caseElem[plType], item);
              }
              if ((_this.activeCase != null) && _this.activeCase.id === ("" + item.caseId)) {
                _this.activeCase[plType] = _.without(caseElem[plType], item);
                _this.activeCase._renderSubElements(type);
                if (type === 'event') {
                  _this.activeCase.recalculate();
                }
              }
              return resolve(data.response);
            });
          };
        })(this));
      }
    },
    load: function() {
      console.log("loading");
      return this.displaySpinner();
    },
    queueData: function(type, id, localProp, value) {
      var calcedVars;
      calcedVars = {
        "case": ["nextOn", "onFor", "thirtyThirty", "thirtyThirtyNextDate"]
      };
      if (this.timeout != null) {
        window.clearTimeout(this.timeout);
      }
      if (this.queue[type.pluralize()][id] == null) {
        this.queue[type.pluralize()][id] = {};
      }
      this.queue[type.pluralize()][id][localProp] = value;
      return this.timeout = window.setTimeout((function(_this) {
        return function() {
          var data, ref, results, typeKey, xhrs;
          xhrs = [];
          ref = _this.queue;
          results = [];
          for (typeKey in ref) {
            type = ref[typeKey];
            results.push((function() {
              var results1;
              results1 = [];
              for (id in type) {
                data = type[id];
                xhrs.push(this.xhr({
                  method: "PUT",
                  url: "http://" + this.urlBase + ":3000/api/" + (typeKey.frontCap()) + "/" + id,
                  data: this.queue[typeKey][id]
                }));
                results1.push(delete this.queue[typeKey][id]);
              }
              return results1;
            }).call(_this));
          }
          return results;
        };
      })(this), "1000");
    },
    xhr: function(settings) {
      if (settings.headers == null) {
        settings.headers = {};
      }
      if (settings.qs != null) {
        console.log(settings.qs);
        console.log(JSON.stringify(settings.qs));
        settings.url = settings.url + "?" + $.param(settings.qs);
      }
      if (Cookies.get("token") != null) {
        settings.headers.Authorization = Cookies.get("token");
      }
      return $.ajax(settings);
    },
    login: function(username, password) {
      this.user.jamlist.username = username;
      this.displaySpinner();
      return this.xhr({
        method: "POST",
        url: "http://" + this.urlBase + ":3000/api/JLUsers/login",
        data: {
          username: username,
          password: password
        }
      }).then((function(_this) {
        return function(data) {
          console.log(data);

          /*
          			if data.xhr.status == 401
          				@fail("Incorrect or unknown username/password!")
          				return
           */
          Cookies.set("token", data.id);
          Cookies.set("user", data.userId);
          return _this.loadJamListData().then(function(data) {
            console.log(_this.libraryEntries);
            console.log(_this.playlists);
            return _this.syncWithService();
          }).then(function(data) {
            _this.setRoute("tracks");
            return _this.hideSpinner();
          })["catch"](function(error) {
            return console.log(error);
          });
        };
      })(this));
    },
    logout: function() {
      return this.xhr({
        method: "POST",
        url: "http://" + this.urlBase + ":3000/api/DAUsers/login"
      }).then(function(response, xhr) {
        Cookies.remove("token");
        Cookies.remove("user");
        return page("/login");
      });
    },
    display: {
      prelim: function() {
        var results;
        results = [];
        while (this.$.display.firstChild != null) {
          results.push(this.$.display.removeChild(this.$.display.firstChild));
        }
        return results;
      },
      login: function(firstArg) {
        var login;
        this.display.prelim.bind(this)();
        login = new elements.login();
        return this.$.display.appendChild(login);
      },
      trackList: function() {
        var trackList;
        this.display.prelim.bind(this)();
        trackList = new elements.trackList();
        return this.$.display.appendChild(trackList);
      }
    },
    displaySpinner: function() {
      this.$["spinner-dialog"].open();
      return this.$.spinner.active = true;
    },
    hideSpinner: function() {
      this.$["spinner-dialog"].close();
      return this.$.spinner.active = false;
    },

    /* Confirm Dialog
    		@title - Title
    		@message - Content
    		@cb - Function
    		@context - Object
     */
    confirm: function(args) {
      console.log(args);
      this.$.confirmDialog.open();
      if (args.title != null) {
        this.$.confirmTitle.innerHTML = args.title;
      }
      if (args.message != null) {
        this.$.confirmContent.innerHTML = args.message;
      }
      $(this.$.confirmButton).off();
      return $(this.$.confirmButton).on("click", (function(_this) {
        return function() {
          args.cb(args.context);
          return _this.$.confirmDialog.close();
        };
      })(this));
    },
    fail: function(msg) {
      this.$.errorDialog.open();
      console.log(this.$);
      this.$.message.innerHTML = msg;
      return window.setTimeout((function(_this) {
        return function() {
          return _this.$.errorDialog.close();
        };
      })(this), "10000");
    },
    getSortProperty: function(item, field) {
      var fields, i, key, len, returnProperty;
      fields = field.split(".");
      if (fields.length > 1) {
        for (key = i = 0, len = fields.length; i < len; key = ++i) {
          field = fields[key];
          if (key !== fields.length) {
            returnProperty = item[field];
          }
          item = item[field];
        }
      } else {
        returnProperty = item[field];
      }
      return returnProperty;
    },
    preliminarySort: function(aProp, bProp) {
      if (aProp === "" || (aProp == null)) {
        return -1;
      }
      if (bProp === "" || (bProp == null)) {
        return 1;
      }
      if (aProp === "n/a") {
        return -1;
      }
      if (bProp === "n/a") {
        return 1;
      }
      return null;
    },
    sortByDefault: function(a, b, field) {
      var aProp, bProp;
      aProp = this.getSortProperty(a, field);
      bProp = this.getSortProperty(b, field);
      if (this.preliminarySort(aProp, bProp) != null) {
        return this.preliminarySort(aProp, bProp);
      }
      if (aProp < bProp) {
        return 1;
      }
      if (aProp > bProp) {
        return -1;
      }
      return null;
    },
    sortByDate: function(a, b, field) {
      var aProp, bProp;
      aProp = this.getSortProperty(a, field);
      bProp = this.getSortProperty(b, field);
      if (this.preliminarySort(aProp, bProp) != null) {
        return this.preliminarySort(aProp, bProp);
      }
      if (moment(aProp).isAfter(moment(bProp))) {
        return -1;
      }
      if (moment(aProp).isBefore(moment(bProp))) {
        return 1;
      }
      return null;
    }
  });

}).call(this);
