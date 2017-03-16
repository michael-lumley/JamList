(function() {
  if (window.elements == null) {
    window.elements = {};
  }

  window.elements.app = Polymer({
    is: "jamlist-app",
    properties: {
      libraryEntries: {
        type: Array
      },
      playerActive: {
        type: Boolean,
        value: false
      },
      playlists: {
        type: Array
      },
      queue: {
        type: Object,
        value: {}
      },
      serviceActive: {
        type: Boolean,
        value: false
      },
      tags: {
        type: Array
      },
      tokens: {
        type: Array
      },
      urlBase: {
        type: "string"
      },
      user: {
        type: Object,
        notify: true,
        value: function() {
          return {
            google: {},
            jamlist: {},
            deferred: $.Deferred()
          };
        }
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
            if (app.__data__ != null) {
              args.user = app.user.google;
            }
          }
          return args;
        };
      })(this)
    }),
    created: function() {
      window.app = this;
      this.urlBase = "localhost";
      this.tokens = [];
      return this.portal.sendMessage({
        target: "google_music",
        fn: "userInfo",
        args: {}
      }).then((function(_this) {
        return function(response) {
          console.log(response);
          _this.user.google = response.user;
          return _this.user.deferred.resolve();
        };
      })(this));
    },
    ready: function() {
      return console.log("ready");
    },
    attached: function() {
      console.log("attached");
      return this.routerSetup();
    },
    login: function(username, password) {
      this.display.spinner();
      return this.xhr({
        method: "POST",
        url: "http://" + this.urlBase + ":3000/api/JLUsers/login",
        data: {
          username: username,
          password: password
        }
      }).then((function(_this) {
        return function(data) {
          Cookies.set("token", data.id);
          Cookies.set("user", data.userId);
          _this.setRoute("tracks");
          return _this.display.hideSpinner();
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
    router: function() {
      var route, url;
      url = location.hash.slice(1) || '/';
      return route = this.routes.prelim(url.substr(1)).then((function(_this) {
        return function(route) {
          if (route && (_this.routes[route] != null)) {
            return _this.routes[route]();
          }
        };
      })(this))["catch"]((function(_this) {
        return function(error) {
          return console.log(error);
        };
      })(this));
    },
    routerSetup: function() {
      window.addEventListener('hashchange', this.router.bind(this));
      return this.router();
    },
    setRoute: function(route) {
      return window.location.hash = "#/" + route;
    },
    routes: {
      prelim: function(path) {
        console.log(path);
        while (app.$.display.firstChild != null) {
          app.$.display.removeChild(app.$.display.firstChild);
        }
        return new Promise((function(_this) {
          return function(resolve, reject) {
            if (path === "/") {
              app.setRoute("tracks");
              reject();
            }
            if (path !== "login" && ((Cookies.get("user") == null) || (Cookies.get("token") == null))) {
              app.setRoute("login");
              return reject();
            } else if (path !== "login" && ((app.playlists == null) || (app.tags == null) || (app.libraryEntries == null))) {
              return app.loadJamListData().then(function() {
                return resolve(path);
              });
            } else {
              return resolve(path);
            }
          };
        })(this));
      },
      login: function() {
        var login;
        login = new elements.login();
        return app.$.display.appendChild(login);
      },
      tracks: function() {
        var trackList;
        trackList = new elements.trackList();
        return app.$.display.appendChild(trackList);
      },
      sync: function() {
        console.log("syncing");
        return app.user.deferred.then((function(_this) {
          return function() {
            console.log("user resolved");
            return app.syncWithService();
          };
        })(this));
      },
      test: function() {
        var testElem;
        testElem = new elements.playlist.detail(1);
        return app.$.display.appendChild(testElem);
      }
    },
    display: {
      track: function(track) {
        while (app.$["trackDisplay"].firstChild != null) {
          app.$["trackDisplay"].removeChild(app.$["trackDisplay"].firstChild);
        }
        app.$["trackDisplay"].appendChild(new elements.libraryEntry.details(track.id));
        return app.$["trackDisplay"].open();
      },
      spinner: function() {
        app.$["spinner-dialog"].open();
        return app.$.spinner.active = true;
      },
      hideSpinner: function() {
        app.$["spinner-dialog"].close();
        return app.$.spinner.active = false;
      }
    },
    upsert: function(type, data, where, force) {
      if (data == null) {
        data = {};
      }
      if (where == null) {
        where = {};
      }
      if (force == null) {
        force = false;
      }
      return new Promise((function(_this) {
        return function(resolve, reject) {
          var libraryEntry, tag;
          if (!force) {
            if (type === "libraryEntry") {
              libraryEntry = _.findWhere(_this.libraryEntries, where);
              if (libraryEntry != null) {
                console.log("skipped library entry");
                resolve(libraryEntry);
                return;
              }
            } else if (type === "tag") {
              tag = _.findWhere(_this.tags, where);
              if (tag != null) {
                console.log("skipped tag");
                resolve(tag);
                return;
              }
            } else if (type === "track") {
              libraryEntry = _.find(_this.libraryEntries, function(item) {
                var property, value;
                for (property in where) {
                  value = where[property];
                  if (item.track[property] !== value) {
                    return false;
                  } else {
                    return true;
                  }
                }
              });
              if (libraryEntry != null) {
                console.log("skipped track");
                resolve(libraryEntry.track);
                return;
              }
            }
          }
          if (type !== "track") {
            where.jlUser = Cookies.get("user");
            data.jlUserId = Cookies.get("user");
          }
          return _this.xhr({
            method: "POST",
            url: "http://" + _this.urlBase + ":3000/api/" + (type.pluralize()) + "/upsertWithWhere",
            data: data,
            qs: {
              where: where
            }
          }).then(function(data) {
            return resolve(data);
          });
        };
      })(this));
    },
    syncWithService: function(syncPlaylists) {
      if (syncPlaylists == null) {
        syncPlaylists = false;
      }
      console.log("syncWithService");
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
              if (key < 999999) {
                globalTag = {};
                console.log(playlist);
                return Promise.resolve().then(function() {
                  return _this.upsert("tag", {
                    name: playlist.name
                  }, {
                    name: playlist.name
                  });
                }).then(function(tag) {
                  console.log(tag);
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
                  results = [];
                  for (key = k = 0, len2 = playlistEntries.length; k < len2; key = ++k) {
                    track = playlistEntries[key];
                    results.push(_this.upsert("track", track, {
                      title: track.title,
                      artist: track.artist,
                      millisduration: track.millisduration
                    }).then(function(track) {
                      var id;
                      console.log(track);
                      id = track.id;
                      track.trackId = id;
                      delete track.id;
                      return _this.upsert("libraryEntry", track, {
                        trackId: id
                      });
                    }).then(function(libraryEntry) {
                      console.log(libraryEntry);
                      return _this.xhr({
                        type: "PUT",
                        url: "http://" + _this.urlBase + ":3000/api/tags/" + globalTag.id + "/libraryEntries/rel/" + libraryEntry.id
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
            url: "http://localhost:3000/api/jlUsers/" + (Cookies.get("user")) + "/libraryEntries",
            data: {
              filter: {
                include: ['track', 'tags']
              }
            }
          });
          playlists = _this.xhr({
            method: "GET",
            url: "http://localhost:3000/api/jlUsers/" + (Cookies.get("user")) + "/playlists",
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
            url: "http://localhost:3000/api/jlUsers/" + (Cookies.get("user")) + "/tags"
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
      console.log("GETTING");
      console.log(id);
      id = +id;
      console.log(type);
      console.log(type.pluralize());
      console.log(this[type.pluralize()]);
      console.log(id);
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
      console.log(arguments);
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
    addTag: function(libraryEntryId, tag) {
      var tagData;
      tagData = {};
      return new Promise((function(_this) {
        return function(resolve, reject) {
          return _this.upsert("tag", {
            name: tag
          }, {
            name: tag
          }).then(function(tag) {
            tagData = tag;
            return _this.xhr({
              method: "PUT",
              url: "http://" + _this.urlBase + ":3000/api/libraryEntries/" + libraryEntryId + "/tags/rel/" + tagData.id
            });
          }).then(function(rel) {
            var localData;
            localData = app.get("libraryEntry", libraryEntryId);
            return localData.tags.push(tagData);
          });
        };
      })(this));
    },
    deleteTag: function(libraryEntryId, tag) {
      return new Promise((function(_this) {
        return function(resolve, reject) {
          return _this.upsert("tag", {
            name: tag
          }, {
            name: tag
          }).then(function(tag) {
            return _this.xhr({
              method: "DELETE",
              url: "http://" + _this.urlBase + ":3000/api/libraryEntries/" + libraryEntryId + "/tags/rel/" + tag.id
            });
          }).then(function(rel) {
            var localData;
            localData = app.get("libraryEntry", libraryEntryId);
            return localData.tags = _.filter(localData.tags, function(tagData) {
              return tagData.name !== tag;
            });
          });
        };
      })(this));
    },
    load: function() {
      console.log("loading");
      return this.display.spinner();
    },
    queueData: function(type, id, localProp, value) {
      if (this.timeout != null) {
        window.clearTimeout(this.timeout);
      }
      if (this.queue[type.pluralize()] == null) {
        this.queue[type.pluralize()] = {};
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
                  method: "PATCH",
                  url: "http://" + this.urlBase + ":3000/api/" + typeKey + "/" + id,
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
        settings.url = settings.url + "?" + $.param(settings.qs);
      }
      if (Cookies.get("token") != null) {
        settings.headers.Authorization = Cookies.get("token");
      }
      settings.statusCode = {
        401: (function(_this) {
          return function() {
            console.log("401 error");
            return app.setRoute("login");
          };
        })(this)
      };
      return $.ajax(settings);
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
