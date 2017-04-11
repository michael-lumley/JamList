(function() {
  if (window.elements == null) {
    window.elements = {};
  }

  window.elements.tag = {};

  window.elements.tag.base = {
    properties: {
      id: {
        type: Number,
        notify: true
      },
      name: {
        type: String,
        notify: true,
        value: "New Playlist"
      },
      libraryEntries: {
        type: Array,
        notify: true
      },
      filteredEntries: {
        type: Array,
        notify: true
      }
    },
    listeners: {
      ruleDelete: "deleteRule",
      toggleRules: "toggleRules",
      test: "test"
    },
    factoryImpl: function(id) {
      var key, playlistData, property, results;
      if (id != null) {
        playlistData = app.get("playlist", id);
        results = [];
        for (key in playlistData) {
          property = playlistData[key];
          results.push(this[key] = property);
        }
        return results;
      }
    },
    test: function() {
      return console.log(this.filteredEntries);
    },
    _filterTracks: function(entry) {
      var i, len, ref, tag;
      ref = entry.tags;
      for (i = 0, len = ref.length; i < len; i++) {
        tag = ref[i];
        if (_$.intEqual(this.id, tag.id)) {
          return true;
        }
      }
      return false;
    },
    openMergeDialog: function() {
      return new Promise((function(_this) {
        return function(resolve, reject) {
          var confirm;
          _this.$.merge.open();
          confirm = function(answer) {
            _this.$.merge.close();
            $(_this.$.confirmButton).off();
            $(_this.$.rejectButton).off();
            return resolve(answer);
          };
          $(_this.$.confirmButton).on("click", function() {
            return confirm(true);
          });
          return $(_this.$.rejectButton).on("click", function() {
            return confirm(false);
          });
        };
      })(this));
    },
    mergedelete: function() {
      return app.spinner((function(_this) {
        return function() {
          return _this.merge().then(function() {
            return _this["delete"]();
          });
        };
      })(this));
    },
    merge: function() {
      return app.spinner((function(_this) {
        return function() {
          return _this.openMergeDialog().then(function() {
            var tag;
            console.log(_this.mergeTagId);
            tag = app.get("tag", _this.mergeTagId);
            return _$.allForPromise(_this.filteredEntries, function(entry, key) {
              var entryIndex, tags;
              entryIndex = app.getIndex("libraryEntry", entry.id);
              tags = entry.tags;
              if (!tags.includes(tag)) {
                return app.xhr({
                  type: "PUT",
                  url: "http://" + app.urlBase + ":3000/api/tags/" + tag.id + "/libraryEntries/rel/" + entry.id
                }).then(function(data) {
                  tags.push(tag);
                  console.log(entryIndex);
                  return app.set("libraryEntries." + entryIndex + ".tags", tags);
                });
              } else {
                return null;
              }
            });
          });
        };
      })(this));
    },
    "delete": function() {
      return app.spinner((function(_this) {
        return function() {
          var tag;
          tag = app.get("tag", _this.id);
          return _$.allForPromise(_this.filteredEntries, function(entry, key) {
            var entryIndex, tags;
            entryIndex = app.getIndex("libraryEntry", entry.id);
            tags = entry.tags;
            tags = _.without(tags, tag);
            return app.set("libraryEntries." + entryIndex + ".tags", tags);
          }).then(function(data) {
            return app.set("tags", _.without(app.tags, tag));
          }).then(function(data) {
            return app.xhr({
              type: "DELETE",
              url: "http://" + app.urlBase + ":3000/api/tags/" + tag.id + "/libraryEntries"
            });
          }).then(function(data) {
            return app.xhr({
              type: "DELETE",
              url: "http://" + app.urlBase + ":3000/api/tags/" + tag.id
            });
          });
        };
      })(this));
    }
  };

  window.elements.tag.detail = Polymer(_$.deepSafeExtend(window.elements.tag.base, {
    is: "tag-detail",
    created: function() {},
    ready: function() {},
    attached: function() {}
  }));

  console.log("playlist");

}).call(this);
