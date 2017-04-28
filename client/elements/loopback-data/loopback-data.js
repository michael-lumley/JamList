(function() {
  var loopbackDataModel;

  console.log(querystring);

  loopbackDataModel = {
    properties: {
      models: {
        type: Object,
        value: {}
      },
      urlRoot: {
        type: String
      },
      modelsPath: {
        type: String
      },
      data: {
        type: Object,
        notify: true,
        value: {}
      },
      queue: {
        type: Object,
        value: {}
      }
    },
    is: "loopback-data",
    ready: function() {
      window.data = this;
      return this.load();
    },
    load: function() {
      var key, models, property, ref;
      models = {};
      ref = this.properties;
      for (key in ref) {
        property = ref[key];
        if (property.model) {
          models[key] = property;
          this._addComplexObserverEffect("observerFunction(" + key + ".*)");
        }
      }
      return _$.allForPromise(models, (function(_this) {
        return function(property, key) {
          var ret;
          ret = {
            model: key,
            property: property
          };
          return $.getJSON(_this.modelsPath + "/" + (key.pluralize(false)) + ".json").then(function(data) {
            var filter, i, len, ref1, relation, url;
            ret.json = data;
            url = _this.buildUrl(ret);
            filter = _this.requestFilter(ret);
            if (ret.property.relations != null) {
              filter.include = [];
              ref1 = ret.property.relations;
              for (i = 0, len = ref1.length; i < len; i++) {
                relation = ref1[i];
                filter.include.push({
                  relation: relation,
                  scope: {
                    fields: ['id']
                  }
                });
              }
            }
            filter = {
              filter: filter
            };
            if (filter != null) {
              url += "?" + $.param(filter);
            }
            return _this.xhr({
              method: "GET",
              url: url,
              headers: _this.buildHeader()
            });
          }).then(function(data) {
            ret.data = data;
            return ret;
          });
        };
      })(this)).then((function(_this) {
        return function(models) {
          var i, j, len, len1, model, modelData, modelKey, relationData, relationDefinition, relationIndex, relationKey, results;
          for (i = 0, len = models.length; i < len; i++) {
            model = models[i];
            _this[model.model.pluralize()] = model.data;
            _this.models[model.model] = model;
          }
          results = [];
          for (j = 0, len1 = models.length; j < len1; j++) {
            model = models[j];
            results.push((function() {
              var ref1, results1;
              ref1 = model.json.relations;
              results1 = [];
              for (relationKey in ref1) {
                relationDefinition = ref1[relationKey];
                if (model.data[0][relationKey] != null) {
                  results1.push((function() {
                    var k, len2, ref2, results2;
                    ref2 = model.data;
                    results2 = [];
                    for (modelKey = k = 0, len2 = ref2.length; k < len2; modelKey = ++k) {
                      modelData = ref2[modelKey];
                      results2.push((function() {
                        var l, len3, ref3, results3;
                        ref3 = modelData[relationKey];
                        results3 = [];
                        for (relationIndex = l = 0, len3 = ref3.length; l < len3; relationIndex = ++l) {
                          relationData = ref3[relationIndex];
                          results3.push(modelData[relationKey][relationIndex] = this.getById(relationKey.pluralize(), relationData.id));
                        }
                        return results3;
                      }).call(this));
                    }
                    return results2;
                  }).call(this));
                } else {
                  results1.push(void 0);
                }
              }
              return results1;
            }).call(_this));
          }
          return results;
        };
      })(this));
    },
    requestFilter: function() {
      return {};
    },
    buildURL: function() {
      return "";
    },
    buildHeader: function() {
      return {};
    },

    /* @fold Getters
    		Key: Polymer Unique Array Key
    		Id: SQL ID / loopback ID
    		Index: native array index
     */
    getByProperties: function(model, properties) {
      console.log(model.pluralize());
      console.log(_.findWhere(this[model.pluralize()], properties));
      return _$.falsifyUndefined(_.findWhere(this[model.pluralize()], properties));
    },
    getById: function(model, id) {
      return _$.falsifyUndefined(_.find(this[model.pluralize()], function(instData) {
        return _$.intEqual(instData.id, id);
      }));
    },
    getByPolymerKey: function(model, key) {
      return _$.falsifyUndefined(this.get(model + "." + key));
    },
    getIndexById: function(model, id) {
      return _$.falsifyUndefined(this[model.pluralize()].indexOf(this.getById(model, id)));
    },
    getIdByPolymerKey: function(model, key) {
      return _$.falsifyUndefined(this.getByPolymerKey(model, key).id);
    },

    /* @fold Relations
     */
    link: function(sideA, sideB) {
      var definitionA, obj, relation;
      definitionA = this.models[sideA.model.pluralize()];
      relation = definitionA.json.relations[sideB.model.pluralize()] || definitionA.json.relations[sideB.model.pluralize(false)];
      if (relation.type === "hasAndBelongsToMany") {
        return this.xhr({
          method: "PUT",
          url: "http://localhost:3000/api/" + (sideA.model.pluralize()) + "/" + sideA.id + "/" + (sideB.model.pluralize()) + "/rel/" + sideB.id,
          headers: this.buildHeader()
        }).then((function(_this) {
          return function(data) {
            _this.push((sideA.model.pluralize()) + "." + (_this.getIndexById(sideA.model, sideA.id)) + "." + (sideB.model.pluralize()), _this.getById(sideB.model, sideB.id));
            return _this.push((sideB.model.pluralize()) + "." + (_this.getIndexById(sideB.model, sideB.id)) + "." + (sideA.model.pluralize()), _this.getById(sideA.model, sideA.id));
          };
        })(this));
      }
      if (relation.type === "hasMany") {
        sideA = swap;
        sideA = sideB;
        sideB = swap;
      }
      if (relation.type === "belongsTo") {
        return this.xhr({
          method: "PATCH",
          url: "http://localhost:3000/api/" + (sideA.model.pluralize()) + "/" + sideA.id,
          headers: this.buildHeader(),
          data: (
            obj = {},
            obj[sideB.model + "Id"] = sideB.id,
            obj
          )
        }).then((function(_this) {
          return function(data) {
            console.log(sideA);
            console.log(sideB);
            _this.push((sideB.model.pluralize()) + "." + (_this.getIndexById(sideB.model, sideB.id)) + "." + (sideA.model.pluralize()), _this.getById(sideA.model, sideA.id));
            _this.set((sideA.model.pluralize()) + "." + (_this.getIndexById(sideA.model, sideA.id)) + "." + (sideB.model.pluralize()), _this.getById(sideB.model, sideB.id));
            console.log(_this[sideA.model.pluralize()][_this.getIndexById(sideA.model, sideA.id)]);
            return console.log(_this[sideB.model.pluralize()][_this.getIndexById(sideB.model, sideB.id)]);
          };
        })(this));
      }
    },
    observerFunction: function(changeEntry) {
      var path;
      path = changeEntry.path.split(".");
      if ((path[2] != null) && path.length < 4 && !Array.isArray(changeEntry.value)) {
        return this.queueData(path[0], path[1], path[2], changeEntry.value);
      }
    },
    findOrCreate: function(model, data) {
      return new Promise((function(_this) {
        return function(resolve, reject) {
          var localData;
          if (data != null) {
            if (localData = _this.getByProperties(model, data)) {
              resolve(localData);
            } else {
              return _this.create(model, data).then(function(data) {
                return resolve(data);
              });
            }
          } else {
            return reject("No Data to Check Against!");
          }
        };
      })(this));
    },
    create: function(model, data) {
      return new Promise((function(_this) {
        return function(resolve, reject) {
          return _this.xhr({
            method: "POST",
            url: _this.buildUrl(_this.models[model.pluralize()]),
            headers: _this.buildHeader(_this.models[model.pluralize()]),
            data: data
          }).then(function(data) {
            var i, len, ref, relation;
            ref = _this.models[model.pluralize()].property.relations;
            for (i = 0, len = ref.length; i < len; i++) {
              relation = ref[i];
              if (relation.type !== "belongsTo") {
                data[relation] = [];
              }
            }
            _this.push("" + (model.pluralize()), data);
            return resolve(data);
          });
        };
      })(this));
    },
    queueData: function(model, key, localProp, value) {
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
              url: "http://" + _this.urlRoot + "/" + model + "/" + (_this.getIdByPolymerKey(model, key)),
              data: _this.queue[key],
              headers: _this.buildHeader()
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
            return _this.fire("401");
          };
        })(this)
      };
      return $.ajax(settings);
    }
  };

  Polymer(_$.deepSafeExtend(loopbackDataModel, {
    properties: {
      tracks: {
        notify: true,
        model: true,
        relations: ['tags']
      },
      tags: {
        type: Array,
        notify: true,
        model: true,
        relations: ['tracks']
      },
      playlists: {
        type: Array,
        notify: true,
        model: true,
        relations: ['rules']
      },
      rules: {
        type: Array,
        notify: true,
        model: true,
        relations: ['playlist']
      }
    },
    requestFilter: function(definition) {
      return {};
    },
    buildUrl: function(definition) {
      return "http://localhost:3000/api/jlUsers/" + app.user.jamlist.username + "/" + (definition.model.pluralize());
    },
    buildHeader: function(definition) {
      return {
        Authorization: app.user.jamlist.token
      };
    },
    is: "jamlist-data"
  }));

}).call(this);
