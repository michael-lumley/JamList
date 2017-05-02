(function() {
  if (window.elements == null) {
    window.elements = {};
  }

  window.elements.app = Polymer({
    is: "jamlist-app",
    properties: {
      path: {
        type: String,
        notify: true
      },
      playlists: {
        type: Array,
        notify: true
      },
      queue: {
        type: Object,
        value: {}
      },
      rules: {
        type: Array,
        notify: true
      },
      status: {
        type: String,
        notify: true,
        value: "active"
      },
      tags: {
        type: Array,
        notify: true
      },
      tracks: {
        type: Array,
        notify: true
      },
      user: {
        type: Object,
        notify: true,
        value: function() {

          /*
          					Google: The Google user's info
          						email:
          						id:
          						obfid:
          						tier:
          						xt:
          					Jamlist:
          						user:
          						password:
          						token:
          					Deferred: resolved when Google User is Loaded
           */
          return {
            google: {},
            jamlist: {},
            deferred: $.Deferred()
          };
        }
      }
    },
    observers: ['pathChange(path)'],
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
    ready: function() {
      window.app = this;
      this.data = this.$.data;
      window.addEventListener('hashchange', (function(_this) {
        return function(hash) {
          return _this.path = location.hash.substring(2);
        };
      })(this));
      this.path = location.hash.substring(2);
      this.portal.sendMessage({
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
      this.set("user.jamlist.username", Cookies.get("user"));
      this.set("user.jamlist.token", Cookies.get("token"));
      return this.data.addEventListener("401", (function(_this) {
        return function() {
          _this.fail("You need to login!");
          return _this.path = "login";
        };
      })(this));
    },
    login: function() {
      return this.spinner((function(_this) {
        return function() {
          return _this.xhr({
            method: "POST",
            url: "http://localhost:3000/api/JLUsers/login",
            data: {
              username: _this.user.jamlist.username,
              password: _this.user.jamlist.password
            }
          }).then(function(data) {
            Cookies.set("token", data.id);
            Cookies.set("user", data.userId);
            _this.user.jamlist.token = data.id;
            _this.data.load();
            return _this.set("path", "tracks");
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
    pathChange: function(path) {
      return window.location.hash = "#/" + path;
    },
    syncWithService: function(syncPlaylists) {
      var ops;
      if (syncPlaylists == null) {
        syncPlaylists = false;
      }
      console.log("starting sync");
      ops = [];
      this.status = "syncWithService";
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
            var servicePlaylists, serviceTracks;
            console.log(data);
            serviceTracks = data[0].tracks;
            servicePlaylists = data[1].playlists;

            /*
            				for track, key in serviceTracks
            					do (track)=>
            						if key < 3
            							console.log track
             */
            return _$.forPromise(servicePlaylists, function(playlist, key) {
              return new Promise(function(resolve, reject) {
                if (key < 999) {
                  return (function(playlist) {
                    var tag;
                    tag = _this.data.findOrCreate("tag", {
                      name: playlist.name
                    });
                    tracks = _this.portal.sendMessage({
                      target: "background",
                      fn: "playlist",
                      args: {
                        id: playlist.id
                      }
                    });
                    return Promise.all([tag, tracks]).then(function(data) {
                      tag = data[0];
                      tracks = data[1];
                      return _$.allForPromise(tracks, function(track, key) {
                        return _this.data.findOrCreate("track", {
                          title: track.title,
                          artist: track.artist,
                          album: track.album,
                          millisduration: track.millisduration
                        }).then(function(track) {
                          return _this.data.link({
                            model: "tag",
                            id: tag.id
                          }, {
                            model: "track",
                            id: track.id
                          });
                        });
                      }).then(function() {
                        return resolve();
                      });
                    })["catch"](function(error) {
                      _this.fail(error);
                      return resolve();
                    });
                  })(playlist);
                }
              });
            });
          }).then(function(data) {
            app.status = "active";
            return resolve();
          });
        };
      })(this));
    },
    loadJamListData: function() {

      /*
      		return new Promise((resolve, reject)=>
      			tracks = @xhr(
      				method: "GET"
      				url: "http://localhost:3000/api/jlUsers/#{Cookies.get("user")}/tracks"
      				data:
      					filter:
      						include:
      							relation: 'tags'
      			)
      			playlists = @xhr(
      				method: "GET"
      				url: "http://localhost:3000/api/jlUsers/#{Cookies.get("user")}/playlists"
      				data:
      					filter:
      						include:
      							relation: 'rules'
      			)
      			tags = @xhr(
      				method: "GET"
      				url: "http://localhost:3000/api/jlUsers/#{Cookies.get("user")}/tags"
      			)
      			Promise.all([tracks, playlists, tags]).then((data)=>
      				console.log data
      				@tracks = data[0]
      				@playlists = data[1]
      				@tags = data[2]
      				resolve()
      			)
      		)
       */
    },
    getData: function(type, id) {
      id = Number(id);
      return _.find(this[type.pluralize()], function(instData) {
        return instData.id === id;
      });
    },
    getIndex: function(type, id) {
      id = Number(id);
      return _.findIndex(this[type.pluralize()], function(instData) {
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
    spinner: function(fn) {
      console.log(fn);
      return new Promise((function(_this) {
        return function(resolve, reject) {
          if (!_this.$.spinner.active) {
            _this.$["spinner-dialog"].open();
            fn().then(function(data) {
              if (_this.$.spinner.active) {
                _this.hideSpinner();
              }
              return resolve(data);
            })["catch"](function(e) {
              if (_this.$.spinner.active) {
                _this.hideSpinner();
              }
              _this.fail("Error: " + e.msg);
              console.log(e);
              return reject(e);
            });
            return _this.$.spinner.active = true;
          } else {
            return fn().then(function(data) {
              return resolve(data);
            })["catch"](function(e) {
              return reject(e);
            });
          }
        };
      })(this));
    },
    hideSpinner: function() {
      this.$["spinner-dialog"].close();
      return this.$.spinner.active = false;
    },
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
      this.$.toast.text = msg;
      return this.$.toast.toggle();
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
