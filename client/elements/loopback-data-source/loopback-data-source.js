(function() {
  Polymer({
    is: "loopback-data-source",
    properties: {
      data: {
        type: Object,
        notify: true
      },
      fields: {
        type: Array
      },
      filter: {
        computed: 'computeFilter(where, include)'
      },
      include: {
        type: Object,
        value: ""
      },
      queue: {
        type: Array,
        value: []
      },
      urlRoot: {
        type: String
      },
      urlBase: {
        type: String
      },
      url: {
        computed: 'computeUrl(urlRoot, urlBase, filter)'
      },
      where: {
        type: Object,
        value: ""
      }
    },
    observers: ["fieldChanged(data.*)"],
    ready: function() {
      return console.log("ready");
    },
    handleResponse: function(e) {
      return console.log(this.data);
    },
    fieldChanged: function(changeEntry) {
      var path;
      console.log(changeEntry);
      path = changeEntry.path.split(".");
      console.log(path);
      if ((path[2] != null) && path.length < 4) {
        return this.queueData(this.getIdByPolymerKey(path[1]), path[2], changeEntry.value);
      }
    },
    computeFilter: function(where, include) {
      var ret;
      ret = {
        where: where != null ? where : void 0,
        include: include != null ? include : void 0
      };
      console.log(ret);
      return ret;
    },
    computeUrl: function(urlRoot, urlBase, filter) {
      console.log("computing");
      return "http://" + urlRoot + "/" + urlBase + "?filter=" + (JSON.stringify(filter));
    },
    getItemBySQLId: function(id) {
      return _.find(this.data, function(instData) {
        return instData.id === id;
      });
    },
    getItemByPolymerKey: function(key) {
      return this.get("data." + key);
    },
    getIndexBySQLId: function(id) {
      return this.data.indexOf(this.getItemBySId(id));
    },
    getIdByPolymerKey: function(key) {
      console.log(key);
      console.log(this.getItemByPolymerKey(key));
      return this.getItemByPolymerKey(key).id;
    },
    addRelated: function(relation, id, fk) {
      return this.xhr({
        method: "PUT",
        url: "http://" + this.urlRoot + "/" + this.urlBase + "/" + id + "/" + relation + "/" + fk
      })["catch"]((function(_this) {
        return function(error) {
          throw error;
        };
      })(this));
    },
    deleteRelated: function(relation, id, fk) {
      return this.xhr({
        method: "DELETE",
        url: "http://" + this.urlRoot + "/" + this.urlBase + "/" + id + "/" + relation + "/" + fk
      })["catch"]((function(_this) {
        return function(error) {
          throw error;
        };
      })(this));
    },
    add: function(data) {
      return this.xhr({
        method: "POST",
        url: "http://" + this.urlRoot + "/" + this.urlBase + "/",
        data: data
      })["catch"]((function(_this) {
        return function(error) {
          throw error;
        };
      })(this));
    },
    deleteById: function(id) {
      return this.xhr({
        method: "DELETE",
        url: "http://" + this.urlRoot + "/" + this.urlBase + "/" + id + "/" + relation + "/" + fk
      })["catch"]((function(_this) {
        return function(error) {
          throw error;
        };
      })(this));
    },
    queueData: function(id, localProp, value) {
      if (this.timeout != null) {
        window.clearTimeout(this.timeout);
      }
      if (this.queue[id] == null) {
        this.queue[id] = {};
      }
      this.queue[id][localProp] = value;
      return this.timeout = window.setTimeout((function(_this) {
        return function() {
          var data, ref, results, xhrs;
          xhrs = [];
          ref = _this.queue;
          results = [];
          for (id in ref) {
            data = ref[id];
            results.push(_this.xhr({
              method: "PATCH",
              url: "http://" + _this.urlRoot + "/" + _this.urlBase + "/" + id,
              data: _this.queue[id]
            }).then(function(data) {
              return delete _this.queue[id];
            })["catch"](function(error) {
              throw error;
            }));
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
      settings.statusCode = {
        401: (function(_this) {
          return function() {
            console.log("401 error");
            return app.setRoute("login");
          };
        })(this)
      };
      return $.ajax(settings);
    }
  });

}).call(this);
