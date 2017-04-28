(function() {
  Polymer({
    is: "loopback-data-model",
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
      hasMany: {
        type: Array
      },
      hasBelongsMany: {
        type: Array
      },
      include: {
        type: Object,
        value: ""
      },
      relations: {
        type: Object,
        value: "{}"
      },
      queue: {
        type: Array,
        value: []
      },
      urlRoot: {
        type: String
      },
      model: {
        type: String
      },
      url: {
        computed: 'computeUrl(urlRoot, model, filter)'
      },
      where: {
        type: Object,
        value: ""
      }
    },
    observers: ["fieldChanged(data.*)"],

    /*
    		Key: Polymer Unique Array Key
    		ID: SQL ID / loopback ID
    		index: native array index
     */
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
      if ((path[2] != null) && path.length < 4) {
        return this.queueData(path[1], path[2], changeEntry.value);
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
    computeUrl: function(urlRoot, model, filter) {
      console.log("computing");
      return "http://" + urlRoot + "/" + model + "?filter=" + (JSON.stringify(filter));
    },
    getItemById: function(id) {
      return _.find(this.data, function(instData) {
        console.log(instData);
        console.log(instData.id === id);
        return _$.intEqual(instData.id, id);
      });
    },
    getItemByPolymerKey: function(key) {
      return this.get("data." + key);
    },
    getIndexById: function(id) {
      return this.data.indexOf(this.getItemById(id));
    },
    getIdByPolymerKey: function(key) {
      console.log(key);
      console.log(this.getItemByPolymerKey(key));
      return this.getItemByPolymerKey(key).id;
    },
    getIndexOfChildByFk: function(relation, id, fk) {
      return _.find(this);
    },
    addRelatedByFk: function(relation, id, fk) {
      var index;
      index = this.getIndexById(id);
      relation = relations[relation];
      if (relation.type === "hasBelongs") {
        return this.xhr({
          method: "PUT",
          url: "http://" + this.urlRoot + "/" + this.model + "/" + id + "/" + relation + "/rel/" + fk
        }).then((function(_this) {
          return function(data) {
            return _this.push("data." + index + "." + relation.key, data);
          };
        })(this))["catch"]((function(_this) {
          return function(error) {
            throw error;
          };
        })(this));
      } else if (relation.type === "has") {
        return this.xhr({
          method: "PUT",
          url: "http://" + this.urlRoot + "/" + this.model + "/" + id + "/" + relation + "/" + fk
        }).then((function(_this) {
          return function(data) {
            _this.push("data." + index + "." + relation.key, data);
            return relation.element.push("data", data);
          };
        })(this))["catch"]((function(_this) {
          return function(error) {
            throw error;
          };
        })(this));
      } else if (relation.type === "belongs") {
        return Promise.resolve().then((function(_this) {
          return function() {
            throw "ERROR: Can't add an entry on the belongs side of a relaitonship.";
          };
        })(this));
      } else {
        return Promise.resolve().then((function(_this) {
          return function() {
            throw "ERROR: Can't find relationship '" + relation + "'.";
          };
        })(this));
      }
    },
    createRelated: function(relation, id, data) {
      var index;
      index = this.getIndexById(id);
      relation = relations[relation];
      if (relation.type === "hasBelongs") {
        return this.xhr({
          method: "PUT",
          url: "http://" + this.urlRoot + "/" + this.model + "/" + id + "/" + relation + "/rel/" + fk
        }).then((function(_this) {
          return function(data) {
            return _this.push("data." + index + "." + relation.key, data);
          };
        })(this))["catch"]((function(_this) {
          return function(error) {
            throw error;
          };
        })(this));
      } else if (relation.type === "has") {
        return this.xhr({
          method: "PUT",
          url: "http://" + this.urlRoot + "/" + this.model + "/" + id + "/" + relation + "/" + fk
        }).then((function(_this) {
          return function(data) {
            _this.push("data." + index + "." + relation.key, data);
            return relation.element.push("data", data);
          };
        })(this))["catch"]((function(_this) {
          return function(error) {
            throw error;
          };
        })(this));
      } else if (relation.type === "belongs") {
        return Promise.resolve().then((function(_this) {
          return function() {
            throw "ERROR: Can't add an entry on the belongs side of a relaitonship.";
          };
        })(this));
      } else {
        return Promise.resolve().then((function(_this) {
          return function() {
            throw "ERROR: Can't find relationship '" + relation + "'.";
          };
        })(this));
      }
    },
    deleteRelated: function(relation, id, fk) {
      var url;
      if (this.hasBelongsMany.indexOf(relation.pluralize()) > -1) {
        url = "http://" + this.urlRoot + "/" + this.model + "/" + id + "/" + (relation.pluralize()) + "/rel/" + fk;
      } else {
        url = "http://" + this.urlRoot + "/" + this.model + "/" + id + "/" + (relation.pluralize()) + "/" + fk;
      }
      return this.xhr({
        method: "DELETE",
        url: url
      }).then((function(_this) {
        return function(data) {
          var index, instance, instanceId, toBeRemoved;
          instanceId = _this.getIndexById(id);
          instance = _this.data[instanceId];
          console.log(instanceId);
          console.log(instance);
          toBeRemoved = _.find(instance[relation], function(instData) {
            return _$.intEqual(instData.id, fk);
          });
          console.log(toBeRemoved);
          index = instance[relation].indexOf(toBeRemoved);
          console.log(index);
          return _this.splice("data." + (_this.getIndexById(id)) + "." + relation, index, 1);
        };
      })(this))["catch"]((function(_this) {
        return function(error) {
          throw error;
        };
      })(this));
    },
    add: function(data) {
      return this.xhr({
        method: "POST",
        url: "http://" + this.urlRoot + "/" + this.model + "/",
        data: data
      }).then((function(_this) {
        return function(data) {
          _this.push("data", data);
          return data;
        };
      })(this))["catch"]((function(_this) {
        return function(error) {
          throw error;
        };
      })(this));
    },
    deleteById: function(id) {
      return this.xhr({
        method: "DELETE",
        url: "http://" + this.urlRoot + "/" + this.model + "/" + id + "/"
      }).then((function(_this) {
        return function(data) {
          var index;
          index = _this.getIndexById(id);
          return _this.splice('data', index, 1);
        };
      })(this))["catch"]((function(_this) {
        return function(error) {
          throw error;
        };
      })(this));
    },
    queueData: function(key, localProp, value) {
      if (this.timeout != null) {
        window.clearTimeout(this.timeout);
      }
      if (this.queue[key] == null) {
        this.queue[key] = {};
      }
      this.queue[key][localProp] = value;
      return this.timeout = window.setTimeout((function(_this) {
        return function() {
          var data, ref, results, xhrs;
          xhrs = [];
          ref = _this.queue;
          results = [];
          for (key in ref) {
            data = ref[key];
            results.push(_this.xhr({
              method: "PATCH",
              url: "http://" + _this.urlRoot + "/" + _this.model + "/" + (_this.getIdByPolymerKey(key)),
              data: _this.queue[key]
            }).then(function(data) {
              return delete _this.queue[key];
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

  Polymer({
    is: "loopback-has-relation",
    ready: function() {
      var child, parent;
      console.log(this.elements);
      parent = document.getElementById(this.parent.id);
      child = document.getElementById(this.child.id);
      parent.relations[this.parent.key] = {
        key: this.parent.key,
        type: "has",
        element: child
      };
      return child.relations[this.child.key] = {
        key: this.child.key,
        type: "belongs",
        element: parent
      };
    }
  });

  Polymer({
    properties: {
      elements: {
        type: Array,
        notify: true
      }
    },
    is: "loopback-has-belongs-relation",
    ready: function() {
      console.log("HAS BELONGS");
      return console.log(this.elements);

      /*
      		el1 = document.getElementById(sources[0].id)
      		el2 = document.getElementById(sources[1].id)
      		el1.relations[sources[0].key] = {key: @el1Zzz.key, type: "hasBelongs", element: el2}
      		el2.relations[sources[1].key] = {key: @el2.key, type: "hasBelongs", element: el1}
       */
    }
  });

}).call(this);
