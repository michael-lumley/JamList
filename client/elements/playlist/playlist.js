(function() {
  if (window.elements == null) {
    window.elements = {};
  }

  window.elements.playlist = {};

  window.elements.playlist.base = {
    properties: {
      id: {
        type: Number
      },
      name: {
        type: String,
        notify: true,
        value: "New Playlist"
      },
      collapseRules: {
        type: Boolean,
        notify: true,
        value: false
      },
      rules: {
        type: Array,
        notify: true,
        value: []
      },
      tracks: {
        type: Array,
        notify: true
      },
      filteredEntries: {
        type: Array,
        notify: true
      },
      formattedRules: {
        computed: 'formatRules(rules.*)'
      }
    },
    listeners: {
      ruleDelete: "deleteRule",
      toggleRules: "toggleRules"
    },
    observers: ["playlistLevelObserver(name)"],
    playlistLevelObserver: (function(_this) {
      return function(changeRecord) {
        return console.log(app.convertChangeRecord(changeRecord));
      };
    })(this),
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
    addRule: function(e) {
      return this.push("rules", {
        group: e.target.parentElement.key
      });
    },
    deleteRule: function(e) {
      var index;
      console.log(e.detail.id);
      index = _.findIndex(this.rules, function(item) {
        return _$.intEqual(item.id, e.detail.id);
      });
      return app.xhr({
        method: "DELETE",
        url: "http://" + app.urlBase + ":3000/api/Rules/" + e.detail.id
      }).then((function(_this) {
        return function() {
          return _this.splice('rules', index, 1);
        };
      })(this));
    },
    addRuleGroup: function() {
      var key;
      if (this.formattedRules.length > 0) {
        key = this.formattedRules[this.formattedRules.length - 1].key + 1;
      } else {
        key = 0;
      }
      return this.push("rules", {
        group: key
      });
    },
    toggleRules: function() {
      this.$.rulesExpand.toggleAttribute("rotate");
      return this.$.rulesCollapse.toggle();
    },
    formatRules: function(rules) {
      var group, i, key, len, map, ref, ret, rule;
      map = {};
      ret = [];
      if (rules != null) {
        ref = rules.base;
        for (i = 0, len = ref.length; i < len; i++) {
          rule = ref[i];
          this.validateRule(rule);
          if (map[Number(rule.group)] == null) {
            map[Number(rule.group)] = [];
          }
          map[Number(rule.group)].push(rule);
        }
        for (key in map) {
          group = map[key];
          ret.push({
            key: Number(key),
            rules: group
          });
        }
      }
      return ret;
    },
    validateRule: function(rule) {
      if (rule.ruleType === "rated" && rule.rule > 5) {
        return rule.rule = 5;
      }
    },
    filterTracks: function(rules) {
      var ent, group, i, j, k, len, len1, len2, passingTracks, ref, ref1, remaining, results, rule, track;
      remaining = this.tracks;
      ref = this.formattedRules;
      for (i = 0, len = ref.length; i < len; i++) {
        group = ref[i];
        passingTracks = [];
        ref1 = group.rules;
        for (j = 0, len1 = ref1.length; j < len1; j++) {
          rule = ref1[j];
          if (this.filters[rule.ruleType] != null) {
            ent = this.filters[rule.ruleType](remaining, rule);
            passingTracks = passingEntries.concat(ent);
          }
        }
        remaining = _.uniq(passingEntries);
      }
      results = [];
      for (k = 0, len2 = remaining.length; k < len2; k++) {
        track = remaining[k];
        results.push(this.$.selector.select(track));
      }
      return results;
    },
    filters: {
      rated: function(libraryEntries, rule) {
        var i, len, libraryEntry, ret;
        ret = [];
        for (i = 0, len = libraryEntries.length; i < len; i++) {
          libraryEntry = libraryEntries[i];
          console.log(rule.greater + ": " + libraryEntry.rating + " - " + rule.rule);
          if (rule.greater && libraryEntry.rating >= rule.rule) {
            ret.push(libraryEntry);
          } else if (!rule.greater && libraryEntry.rating <= rule.rule) {
            ret.push(libraryEntry);
          }
        }
        return ret;
      },
      has: function(libraryEntries, rule) {
        var i, j, len, len1, libraryEntry, ref, ret, tag;
        ret = [];
        for (i = 0, len = libraryEntries.length; i < len; i++) {
          libraryEntry = libraryEntries[i];
          ref = libraryEntry.tags;
          for (j = 0, len1 = ref.length; j < len1; j++) {
            tag = ref[j];
            if (_$.intEqual(tag.id, rule.rule)) {
              console.log("including");
              ret.push(libraryEntry);
              break;
            }
          }
        }
        return ret;
      },
      hasNot: function(libraryEntries, rule) {
        var i, j, len, len1, libraryEntry, ref, ret, select, tag;
        ret = [];
        for (i = 0, len = libraryEntries.length; i < len; i++) {
          libraryEntry = libraryEntries[i];
          select = true;
          ref = libraryEntry.tags;
          for (j = 0, len1 = ref.length; j < len1; j++) {
            tag = ref[j];
            if (_$.intEqual(tag.id, rule.rule)) {
              console.log("excluded");
              select = false;
            }
          }
          if (select) {
            console.log("including");
            ret.push(libraryEntry);
          }
        }
        return ret;
      },
      playcount: function(libraryEntries, rule) {
        var i, len, libraryEntry, ret;
        ret = [];
        for (i = 0, len = libraryEntries.length; i < len; i++) {
          libraryEntry = libraryEntries[i];
          if (rule.greater > 0 && libraryEntry.playCount >= rule.rule) {
            ret.push(libraryEntry);
          } else if (rule.greater < 0 && libraryEntry.playCount <= rule.rule) {
            ret.push(libraryEntry);
          }
        }
        return ret;
      },
      added: function(libraryEntries, rule) {},
      played: function(libraryEntries, rule) {},
      recorded: function(libraryEntries, rule) {}
    },
    savePlaylist: function() {
      var data, key, property, ref;
      data = {};
      ref = this.properties;
      for (key in ref) {
        property = ref[key];
        console.log(key);
        if (property.source === "playlist") {
          console.log(this[key]);
          data[key] = this[key];
        }
      }
      console.log(data);
      return app.upsert("playlist", data, {
        id: this.id
      }, true).then((function(_this) {
        return function(data) {
          var i, len, playlist, ref1, results, rule;
          _this.id = data.id;
          playlist = _.findWhere(app.playlists, {
            id: data.id
          });
          if (playlist != null) {
            playlist = data;
          } else {
            app.push("playlists", data);
          }
          ref1 = _this.rules;
          results = [];
          for (i = 0, len = ref1.length; i < len; i++) {
            rule = ref1[i];
            console.log(rule.ruleType);
            data = {};
            for (key in rule) {
              property = rule[key];
              console.log(key);
              console.log(property);
              data[key] = rule[key];
            }
            data.playlistId = _this.id;
            results.push(app.upsert("rule", data, {
              id: rule.id
            }, true));
          }
          return results;
        };
      })(this)).then((function(_this) {
        return function(data) {
          return _this.filterTracks(_this.rules);
        };
      })(this));
    }
  };

  window.elements.playlist.detail = Polymer(_$.deepSafeExtend(window.elements.playlist.base, {
    is: "playlist-detail",
    created: function() {},
    ready: function() {
      return this.filterTracks();
    },
    attached: function() {}
  }));

  console.log("playlist");

}).call(this);
