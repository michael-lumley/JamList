(function() {
  var constructor, loopbackDataModel;

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
      patchQueue: {
        type: Object,
        value: {}
      },
      createQueue: {
        type: Object,
        value: {}
      },
      pendingRequests: {
        type: Object,
        value: {
          create: {},
          update: {}
        }
      }
    },
    is: "loopback-data",
    ready: function() {
      return window.data = this;
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
            console.log("creating " + model.model);
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
                if ((model.data[0] != null) && (model.data[0][relationKey] != null)) {
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

    /* Links two model instances
    		side:
    			type (String)
    			id (int)
     */
    link: function(sideA, sideB) {
      var aData, bData, definitionA, entry, key, linked, obj, ref, ref1, relation;
      aData = this.getById(sideA.model, sideA.id);
      bData = this.getById(sideB.model, sideB.id);
      definitionA = this.models[sideA.model.pluralize()];
      relation = definitionA.json.relations[sideB.model.pluralize()] || definitionA.json.relations[sideB.model.pluralize(false)];
      linked = false;
      if (relation.type === "hasAndBelongsToMany") {
        ref = aData[sideB.model.pluralize()];
        for (key in ref) {
          entry = ref[key];
          if (_$.intEqual(entry.id, sideB.id)) {
            linked = true;
          }
        }
        ref1 = bData[sideA.model.pluralize()];
        for (key in ref1) {
          entry = ref1[key];
          if (_$.intEqual(entry.id, sideA.id)) {
            linked = true;
          }
        }
        if (!linked) {
          return this.xhr({
            method: "PUT",
            url: "http://localhost:3000/api/" + (sideA.model.pluralize()) + "/" + sideA.id + "/" + (sideB.model.pluralize()) + "/rel/" + sideB.id,
            headers: this.buildHeader()
          }).then((function(_this) {
            return function(data) {
              _this.push((sideA.model.pluralize()) + "." + (_this.getIndexById(sideA.model, sideA.id)) + "." + (sideB.model.pluralize()), bData);
              return _this.push((sideB.model.pluralize()) + "." + (_this.getIndexById(sideB.model, sideB.id)) + "." + (sideA.model.pluralize()), aData);
            };
          })(this));
        }
      }
      if (relation.type === "hasMany") {
        console.log("hasMany");
        sideA = swap;
        sideA = sideB;
        sideB = swap;
      }
      if (relation.type === "belongsTo") {
        console.log("belongsTo");
        if (aData[sideB.model] === bData) {
          linked = true;
        }
        if (!linked) {
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
              _this.push((sideB.model.pluralize()) + "." + (_this.getIndexById(sideB.model, sideB.id)) + "." + (sideA.model.pluralize()), aData);
              return _this.set((sideA.model.pluralize()) + "." + (_this.getIndexById(sideA.model, sideA.id)) + "." + sideB.model, bData);
            };
          })(this));
        }
      }
      return Promise.resolve();
    },
    observerFunction: function(changeEntry) {
      var key, model, path, property;
      if (this.isEnabled()) {
        path = changeEntry.path.split(".");
        model = this.models[path[0]];
        key = path[1];
        property = path[2];
        if (path.length > 2 && (model.json.relations[property] == null) && !Array.isArray(changeEntry.value)) {
          return this.patchQueueData(path[0], path[1], path[2], changeEntry.value);
        }
      }
    },
    findOrCreate: function(model, data) {
      return new Promise((function(_this) {
        return function(resolve, reject) {
          var localData;
          if (data != null) {
            if (localData = _this.getByProperties(model, data)) {
              if (localData.promise != null) {
                localData.promise.then(function() {
                  return resolve(localData);
                });
              } else {
                resolve(localData);
              }
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
      var localModel, promise;
      promise = this.bulkCreate(model, data).then((function(_this) {
        return function(data) {
          var i, len, ref, relation;
          ref = _this.models[model.pluralize()].property.relations;
          for (i = 0, len = ref.length; i < len; i++) {
            relation = ref[i];
            if (relation.type !== "belongsTo") {
              localModel[relation] = [];
            }
          }
          localModel.id = data.id;
          localModel.promise = null;
          return localModel;
        };
      })(this));
      localModel = _.extend(data, {
        promise: promise
      });
      this.push("" + (model.pluralize()), localModel);
      return localModel.promise;
    },
    bulkCreate: function(model, data) {
      var index, outsideReject, outsideResolve, promise, sendData;
      outsideResolve = false;
      outsideReject = false;
      promise = new Promise((function(_this) {
        return function(resolve, reject) {
          outsideResolve = resolve;
          return outsideReject = reject;
        };
      })(this));
      if (!this.pendingRequests.create[model]) {
        this.pendingRequests.create[model] = {
          data: [],
          promises: []
        };
      }
      index = this.pendingRequests.create[model].data.push(data) - 1;
      this.pendingRequests.create[model].data[index].promiseIndex = index;
      this.pendingRequests.create[model].promises[index] = {
        promise: promise,
        resolve: outsideResolve,
        reject: outsideReject
      };
      sendData = (function(_this) {
        return function(queue) {
          for (model in queue) {
            console.log(model);
            _this.xhr({
              method: "POST",
              url: _this.buildUrl(_this.models[model.pluralize()]),
              headers: _this.buildHeader(_this.models[model.pluralize()]),
              data: JSON.stringify(queue[model].data),
              contentType: "application/json"
            }).then(function(data) {
              var i, len, modelInstance, promiseIndex;
              for (i = 0, len = data.length; i < len; i++) {
                modelInstance = data[i];
                promiseIndex = modelInstance.promiseIndex;
                modelInstance.promiseIndex = null;
                queue[model].promises[promiseIndex].resolve(modelInstance);
              }
            });
          }
        };
      })(this);
      this.createTimeout = window.setTimeout((function(_this) {
        return function() {
          sendData(_this.pendingRequests.create);
          return _this.pendingRequests.create = [];
        };
      })(this), "500");
      if (this.pendingRequests.create[model].data.length > 250) {
        sendData(this.pendingRequests.create);
        this.pendingRequests.create = [];
        if (this.createTimeout != null) {
          window.clearTimeout(this.createTimeout);
        }
      }
      return promise;
    },
    bulkUpdate: function(model, data) {
      return console.log("bulk Update");
    },
    patchQueueData: function(model, key, localProp, value) {
      console.log("queueing Data");
      console.log(arguments);
      if (this.patchTimeout != null) {
        window.clearTimeout(this.patchTimeout);
      }
      if (this.patchQueue[key] == null) {
        this.patchQueue[key] = {};
      }
      this.patchQueue[key][localProp] = value;
      return this.patchTimeout = window.setTimeout((function(_this) {
        return function() {
          var data, ref, results, xhrs;
          xhrs = [];
          ref = _this.patchQueue;
          results = [];
          for (key in ref) {
            data = ref[key];
            results.push(_this.xhr({
              method: "PATCH",
              url: "http://" + _this.urlRoot + "/" + model + "/" + (_this.getIdByPolymerKey(model, key)),
              data: _this.patchQueue[key],
              headers: _this.buildHeader()
            }).then(function(data) {
              return delete _this.patchQueue[key];
            })["catch"](function(error) {
              throw error;
            }));
          }
          return results;
        };
      })(this), "1000");
    },
    xhr: function(settings) {
      console.log("xhr");
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

  constructor = Polymer(_$.deepSafeExtend(loopbackDataModel, {
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
    isEnabled: function() {
      if (app.status === "syncWithService") {
        return false;
      }
      return true;
    },
    syncWithService: function() {
      var syncedData, t0;
      console.log("starting sync");
      t0 = performance.now();
      syncedData = new constructor();
      syncedData.tracks = this.tracks;
      syncedData.tags = this.tags;
      app.status = "syncWithService";
      return app.portal.sendMessage({
        target: "google_music",
        fn: "getTracks"
      }).then((function(_this) {
        return function(serviceTracks) {
          return _$.allForPromise(serviceTracks.tracks, function(track, key) {
            return syncedData.findOrCreate("track", {
              title: track.title,
              artist: track.artist,
              album: track.album,
              playCount: track.playCount,
              rating: track.rating,
              googleId: track.googleId,
              albumArtLink: track.albumArtLink
            });
          });
        };
      })(this)).then((function(_this) {
        return function() {
          var playlists;
          return playlists = app.portal.sendMessage({
            target: "background",
            fn: "allPlaylists"
          });
        };
      })(this)).then((function(_this) {
        return function(servicePlaylists) {
          return _$.allForPromise(servicePlaylists.playlists, function(playlist, key) {
            var tag, tracks;
            tag = syncedData.findOrCreate("tag", {
              name: playlist.name
            });
            tracks = app.portal.sendMessage({
              target: "background",
              fn: "playlist",
              args: {
                id: playlist.id
              }
            });
            return Promise.all([tag, tracks]).then(function(data) {
              var trackIds;
              tag = data[0];
              tracks = data[1];
              trackIds = [];
              return _$.allForPromise(tracks, function(track, key) {
                return syncedData.findOrCreate("track", {
                  title: track.title,
                  artist: track.artist,
                  album: track.album,
                  playCount: track.playCount,
                  rating: track.rating,
                  googleId: track.googleId,
                  albumArtLink: track.albumArtLink
                }).then(function(track) {
                  var entry, linked, ref, ref1;
                  linked = false;
                  ref = track.tags;
                  for (key in ref) {
                    entry = ref[key];
                    if (_$.intEqual(entry.id, track.id)) {
                      linked = true;
                    }
                  }
                  ref1 = tag.tracks;
                  for (key in ref1) {
                    entry = ref1[key];
                    if (_$.intEqual(entry.id, tag.id)) {
                      linked = true;
                    }
                  }
                  if (!linked) {
                    _this.push("tracks." + (_this.getIndexById("track", track.id)) + ".tags", tag);
                    _this.push("tags." + (_this.getIndexById("tag", tag.id)) + ".tracks", track);
                    trackIds.push(track.id);
                  }
                });
              }).then(function() {
                return _this.xhr({
                  method: "POST",
                  url: "http://localhost:3000/api/tags/" + tag.id + "/tracks/linkById",
                  headers: _this.buildHeader(),
                  data: {
                    tracks: trackIds
                  }
                });
              });
            })["catch"](function(e) {
              return app.fail(e);
            });
          });
        };
      })(this)).then((function(_this) {
        return function() {
          console.log("complete");
          _this.set("tracks", syncedData.tracks);
          _this.set("tags", syncedData.tags);
          console.log("set done");
          return console.log(performance.now() - t0);
        };
      })(this));
    },
    is: "jamlist-data"
  }));

}).call(this);
