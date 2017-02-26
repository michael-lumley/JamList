(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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
    tracks: {
      type: Array
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
        return {};
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
  messages: {
    none: null
  },
  setupListeners: function() {
    return chrome.runtime.onMessage.addListener((function(_this) {
      return function(request, sender, sendResponse) {
        console.log("Got Message at App!");
        if (_this.messages[message.action] != null) {
          _this.messages[message.action](message, sender, sendResponse);
        } else {
          console.log("ERROR: Recieved Message At App Without An Action" + message);
        }
        return true;
      };
    })(this));
  },
  created: function() {
    console.log("created");
    this.setupListeners();
    window.app = this;
    this.urlBase = "localhost";
    this.tokens = [];
    return this.getUser().then((function(_this) {
      return function(user) {
        return _this.user = user;
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
    console.log(url);
    console.log(this.routes);
    console.log(url.substr(1));
    console.log(this.routes[url.substr(1)] != null);
    if (this.routes[url.substr(1)] != null) {
      console.log("calling " + (url.substr(1)));
      return this.routes[url.substr(1)].bind(this)();
    }
  },
  routerSetup: function() {
    this.routes = {
      "login": function() {
        console.log("login route");
        console.log(this);
        console.log(this.display);
        return this.display.login.bind(this)();
      },
      "tracks": function() {
        console.log("track route");
        console.log(this);
        console.log(this.display);
        return this.display.trackList.bind(this)();
      }
    };
    window.addEventListener('hashchange', this.router.bind(this));
    window.addEventListener('load', this.router.bind(this));
    console.log(this.routes);
    return this.router();
  },
  setRoute: function(route) {
    return window.location.hash = "#/" + route;
  },
  getUser: function() {
    return new Promise((function(_this) {
      return function(resolve, reject) {
        return chrome.runtime.sendMessage({
          action: "userToApp"
        }, function(user) {
          return resolve(user);
        });
      };
    })(this));
  },
  getPlaylists: function() {
    return new Promise((function(_this) {
      return function(resolve, reject) {
        return _this.xhr({
          method: "POST",
          url: "https://play.google.com/music/services/loadplaylists?format=jsarray&u=0&xt=" + _this.user.xt,
          data: [["", 1], []]
        }).then(function(data) {
          return resolve(data.response[1][0]);
        });
      };
    })(this));
  },
  getGoogleTracks: function() {
    return new Promise((function(_this) {
      return function(resolve, reject) {
        return chrome.tabs.sendMessage(_this.user.tabId, {
          action: "getTracks"
        }, function(tracks) {
          return resolve(tracks);
        });
      };
    })(this));
  },
  getPlaylistTracks: function(playlistId) {
    return new Promise((function(_this) {
      return function(resolve, reject) {
        return _this.xhr({
          method: "POST",
          url: "https://play.google.com/music/services/loaduserplaylist?format=jsarray&u=0&xt=" + _this.user.xt,
          data: [["", 1], [playlistId]]
        }).then(function(data) {
          return resolve(data.response[1][0]);
        });
      };
    })(this));
  },
  upsertTrack: function(track) {
    return this.xhr({
      method: "POST",
      url: "http://" + this.urlBase + ":3000/api/tracks/upsertTrack",
      data: {
        track: {
          googleId: track[0],
          artist: track[3],
          title: track[1],
          album: track[4]
        }
      }
    });
  },
  syncFromService: function() {
    return new Promise((function(_this) {
      return function(resolve, reject) {
        return _this.getGoogleTracks().then(function(googleTracks) {
          var fn, i, key, len, track;
          console.log(googleTracks);
          fn = function(track) {
            if (key < 60) {
              if (_this.find("libraryEntry", function(entry) {
                return entry.track.googleId === track[0];
              }) == null) {
                console.log("upserting");
                return _this.upsertTrack(track).then(function(data) {
                  console.log(track[22] + " - " + track[23] + " - " + track[1] + " - " + track[3]);
                  return _this.add("libraryEntry", {
                    playCount: track[22],
                    rating: track[23],
                    trackId: data.id
                  });
                });
              }
            }
          };
          for (key = i = 0, len = googleTracks.length; i < len; key = ++i) {
            track = googleTracks[key];
            fn(track);
          }
          return resolve();
        });
      };
    })(this));
  },
  loadServiceData: function() {
    return new Promise((function(_this) {
      return function(resolve, reject) {
        var libraryEntries, playlists;
        libraryEntries = _this.xhr({
          method: "GET",
          url: "http://localhost:3000/api/jlUsers/" + _this.user.username + "/libraryEntries",
          data: {
            filter: {
              include: ['track', 'tags']
            }
          }
        });
        playlists = _this.xhr({
          method: "GET",
          url: "http://localhost:3000/api/jlUsers/" + _this.user.username + "/playlists",
          data: {
            filter: {
              include: {
                relation: 'rules'
              }
            }
          }
        });
        return Promise.all([libraryEntries, playlists]).then(function(data) {
          _this.libraryEntries = data[0];
          _this.playlists = data[1];
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
    this.displaySpinner();
    return new Promise((function(_this) {
      return function(resolve, reject) {
        _this.xhr({
          method: "GET",
          url: "http://" + _this.urlBase + ":3000/api/DAUsers/" + _this.user.name + "/profile"
        }).then(function(data) {
          console.log(data);
          return _this.user = _.extend(_this.user, data.response.profile);
        });
        return _this.xhr({
          method: "GET",
          url: "http://" + _this.urlBase + ":3000/api/DAUsers/" + _this.user.name + "/loadOpenCases"
        }).then(function(data) {
          var caseData, event, i, j, k, l, len, len1, len2, len3, len4, m, notification, ref, ref1, ref2, ref3, ref4, todo, witness;
          console.log(data);
          _this.cases = data.response.cases;
          _this.onDates = [];
          ref = _this.cases;
          for (i = 0, len = ref.length; i < len; i++) {
            caseData = ref[i];
            _this.onDates = _.union(_this.onDates, [moment(caseData.nextOn).format("MM-DD-YYYY")]);
            ref1 = caseData.todos;
            for (j = 0, len1 = ref1.length; j < len1; j++) {
              todo = ref1[j];
              todo["case"] = caseData;
              _this.push('todos', todo);
            }
            ref2 = caseData.events;
            for (k = 0, len2 = ref2.length; k < len2; k++) {
              event = ref2[k];
              _this.push('events', event);
            }
            ref3 = caseData.witnesses;
            for (l = 0, len3 = ref3.length; l < len3; l++) {
              witness = ref3[l];
              _this.push('witnesses', witness);
            }
            if (caseData.nextEvent != null) {
              ref4 = caseData.nextEvent.notifications;
              for (m = 0, len4 = ref4.length; m < len4; m++) {
                notification = ref4[m];
                _this.push('notifications', notification);
              }
            }
          }
          _this.onDates.sort(function(a, b) {
            if (moment(a).isBefore(moment(b))) {
              return -1;
            }
            if (moment(b).isBefore(moment(a))) {
              return 1;
            }
            return 0;
          });
          _this.hideSpinner();
          _this.xhr({
            method: "GET",
            url: "http://" + _this.urlBase + ":3000/api/DAUsers/" + _this.user.name + "/loadClosedCases"
          }).then(function(data) {
            var len5, n, ref5, results;
            ref5 = data.response.cases;
            results = [];
            for (n = 0, len5 = ref5.length; n < len5; n++) {
              caseData = ref5[n];
              results.push(_this.push('cases', caseData));
            }
            return results;
          });
          return resolve();
        });
      };
    })(this));
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
    if (Cookies.get("token") != null) {
      settings.headers.Authorization = Cookies.get("token");
    }
    return $.ajax(settings);
  },
  login: function(username, password) {
    console.log("login");
    this.user.username = username;
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
        return _this.loadServiceData().then(function(data) {
          console.log(_this.libraryEntries);
          return console.log(_this.playlists);
        }).then(function(data) {
          return _this.syncFromService();
        }).then(function(data) {
          console.log("done with sync");
          _this.setRoute("tracks");
          return _this.hideSpinner();
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
      console.trace();
      console.log("display prelim");
      console.log(this);
      results = [];
      while (this.$.display.firstChild != null) {
        results.push(this.$.display.removeChild(this.$.display.firstChild));
      }
      return results;
    },
    login: function(firstArg) {
      var login;
      console.log(firstArg);
      console.log(this);
      this.display.prelim.bind(this)();
      console.log("display login func");
      login = new elements.login();
      console.log(this.properties);
      console.log(this.$);
      return this.$.display.appendChild(login);
    },
    trackList: function() {
      var trackList;
      console.log(this);
      this.display.prelim.bind(this)();
      console.log("display trackList");
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

  /*
  displayPrelim: (ctx, next)->
    console.log "prelim"
    console.log ctx.path
    if !@menu?
      console.log daElements.daLogin
      console.log daElements.daHome
      console.log daElements.daMenu
      @menu = new daElements.daMenu()
      @$.menuDrawer.appendChild(@menu)
    @.menu.closeSlide()
    while @$.display.firstChild?
      @$.display.removeChild(@$.display.firstChild)
    if ctx.path == "/test" or ctx.path == "/logout"
      console.log "found test or logout path"
      next()
    if ctx.path == "/login" or !Cookies.get('token')? or !Cookies.get('user')?
      @hideSpinner()
      login = new daElements.daLogin()
      @$.display.appendChild(login)
      return
    else
      if !@cases? or !@events? or !@todos?
        console.log "loading"
        @load().then(()->
          console.log "running next"
          next()
        )
      else
        next();
  displayLogout: (ctx, next)->
  displayHome: (ctx, next)->
    @home = new daElements.daHome() if !@home?
    @$.display.appendChild(@home)
  displayCases: (ctx, next)->
    console.log "displaying cases"
    @caseList = new daElements.daCaseList() if !@caseList?
    @$.display.appendChild(@caseList)
  displayToDoList: ()->
    @todoList = new daElements.daTodoList() if !@todoList?
    @$.display.appendChild(@todoList)
  displayNotificationsList: ()->
    @notificationsElem = new daElements.daNotificationList() if !@notificationsElem?
    @notificationsElem.user = @user.name
    @$.display.appendChild(@notificationsElem)
  displayNineOneOneList: ()->
    console.log "yes"
    @nooElem = new daElements.da911List() if !@nooElem?
    @$.display.appendChild(@nooElem)
  displayCrbList: ()->
    @crbElem = new daElements.daCrbList() if !@crbElem?
    @$.display.appendChild(@crbElem)
  displayTest: ()->
    console.log "test path"
    #@$.display.appendChild(@testElem)
    @testElem = new daElements.daTestSuite() if !@testElem?
    @testElem.testCaseConverter()
  refreshAllViews: ()->
    @caseList.refresh() if @caseList?
   */
  displayCase: function(id) {
    var caseElem;
    this.displaySpinner();
    while (this.$.DACaseDisplay.firstChild != null) {
      this.$.DACaseDisplay.removeChild(this.$.DACaseDisplay.firstChild);
    }
    caseElem = new daElements.daCase(id);
    this.$.DACaseDisplay.appendChild(caseElem);
    this.$.DACaseDisplay.open();
    this.$.DACaseDisplay.notifyResize();
    this.$.DACaseDisplay.sizingTarget = caseElem;
    this.$.DACaseDisplay._onDescendantIronResize = function() {
      return null;
    };
    app.activeCase = caseElem;
    return this.hideSpinner();
  },
  closeCase: function() {
    app.activeCase = null;
    this.$.DACaseDisplay.close();
    if (this.caseList != null) {
      this.caseList.refresh();
    }
    if (this.crbList != null) {
      this.crbList.refresh();
    }
    if (this.nooElem != null) {
      return this.nooElem.refresh();
    }
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
  patchDatatable: function(datatable, element) {
    return datatable._internalSort = function(column) {
      if (this._internalSortEnabled) {
        this._rowKeys.sort((function(_this) {
          return function(a, b) {
            var c, i, key, len, properties, sort, sorts, valA, valB;
            if (column.sortDirection === 'desc') {
              c = a;
              a = b;
              b = c;
            }
            valA = _this._getByKey(a);
            valB = _this._getByKey(b);
            if (typeof column.sort === 'function') {
              return column.sort(valA, valB);
            } else {
              console.log(column.sort);
              sorts = column.sort.split("/");
              properties = column.property.split("/");
              for (key = i = 0, len = sorts.length; i < len; key = ++i) {
                sort = sorts[key];
                if (app[sort](valA, valB, properties[key]) != null) {
                  return app[sort](valA, valB, properties[key]);
                }
              }
              return 0;
            }
          };
        })(this));
        return this.set("_rowKeys", JSON.parse(JSON.stringify(this._rowKeys)));
      }
    };
  },
  setupElement: function(element, id, type) {
    var elementData, property, ref, results, value;
    elementData = this.get(type, id);
    for (property in elementData) {
      value = elementData[property];
      if (value !== null) {
        element[property] = value;
      }
    }
    ref = element.properties;
    results = [];
    for (property in ref) {
      value = ref[property];
      results.push(element.addEventListener((property.toDash()) + "-changed", ((function(_this) {
        return function(e) {
          var localProp;
          localProp = "" + property;
          return function() {
            console.log("event update");
            _this.setAttr(type, id, localProp, element[localProp]);
            element.fire(type + "-update");
            if ((_this.activeCase != null) && type === "event") {
              return _this.activeCase.recalculate();
            }
          };
        };
      })(this))()));
    }
    return results;
  },
  bindToParent: function(path, element) {
    var rebind;
    rebind = (function(_this) {
      return function(path, element) {
        var key, ref, results, value;
        element[path] = _this[path];
        ref = element[path];
        results = [];
        for (key in ref) {
          value = ref[key];
          console.log("notifying " + path + "." + key + " with " + value);
          results.push(element.notifyPath(path + "." + key, value));
        }
        return results;
      };
    })(this);
    rebind(path, element);
    return this.addEventListener((path.toDash()) + "-changed", rebind(path, element));
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
  },
  sortByEventType: function(a, b, field) {
    var aProp, aVal, bProp, bVal;
    aProp = this.getSortProperty(a, field);
    bProp = this.getSortProperty(b, field);
    if (this.preliminarySort(aProp, bProp) != null) {
      return this.preliminarySort(aProp, bProp);
    }
    aVal = (function() {
      switch (false) {
        case aProp !== "CRB":
          return 1;
        case aProp !== "R+D":
          return 2;
        case aProp !== "TL":
          return 3;
        case aProp !== "H+TL":
          return 4;
        default:
          return '0';
      }
    })();
    bVal = (function() {
      switch (false) {
        case bProp !== "CRB":
          return 1;
        case bProp !== "R+D":
          return 2;
        case bProp !== "TL":
          return 3;
        case bProp !== "H+TL":
          return 4;
        default:
          return '0';
      }
    })();
    if (aVal < bVal) {
      return -1;
    }
    if (aVal > bVal) {
      return 1;
    }
    return null;
  },
  sortByCharge: function(a, b, field) {
    return this.sortByDefault(a, b, field);
  },
  sortByTicking: function(a, b, field) {
    return -this.sortByDefault(a, b, field);
  },
  sortBy3030: function(a, b, field) {
    return this.sortByDefault(a, b, field);
  },
  sortByColor: function(a, b, field) {
    var aProp, aVal, bProp, bVal;
    aProp = this.getSortProperty(a, field);
    bProp = this.getSortProperty(b, field);
    if (this.preliminarySort(aProp, bProp) != null) {
      return this.preliminarySort(aProp, bProp);
    }
    aVal = (function() {
      switch (false) {
        case aProp !== "grey":
          return 1;
        case aProp !== "brown":
          return 2;
        case aProp !== "blue":
          return 3;
        case aProp !== "green":
          return 4;
        case aProp !== "yellow":
          return 4.5;
        case aProp !== "orange":
          return 5;
        case aProp !== "red":
          return 5.5;
        case aProp !== "purple":
          return 6;
      }
    })();
    bVal = (function() {
      switch (false) {
        case bProp !== "grey":
          return 1;
        case bProp !== "brown":
          return 2;
        case bProp !== "blue":
          return 3;
        case bProp !== "green":
          return 4;
        case bProp !== "yellow":
          return 4.5;
        case bProp !== "orange":
          return 5;
        case bProp !== "red":
          return 5.5;
        case bProp !== "purple":
          return 6;
      }
    })();
    if (aVal < bVal) {
      return -1;
    }
    if (aVal > bVal) {
      return 1;
    }
    return null;
  }
});


},{}]},{},[1]);
