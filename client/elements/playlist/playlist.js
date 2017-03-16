(function() {
  if (window.elements == null) {
    window.elements = {};
  }

  window.elements.playlist = {};

  window.elements.playlist.base = {
    properties: {
      id: {
        type: Number,
        source: "ID"
      },
      name: {
        type: String,
        source: "playlist",
        notify: true,
        value: "New Playlist"
      },
      rules: {
        type: Array,
        source: "playlist",
        notify: true,
        value: []
      },
      formattedRules: {
        source: "computed",
        computed: 'formatRules(rules.*)'
      },
      tracks: {
        source: "computed",
        computed: 'filterTracks(rules.*)'
      }
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
    addRule: function(e) {
      return this.push("rules", {
        group: e.target.parentElement.key
      });
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
    formatRules: function(rules) {
      var group, i, key, len, map, ref, ret, rule;
      map = {};
      ret = [];
      if (rules != null) {
        ref = rules.base;
        for (i = 0, len = ref.length; i < len; i++) {
          rule = ref[i];
          this.validateRule(rule);
          if (map[rule.group] == null) {
            map[rule.group] = [];
          }
          map[rule.group].push(rule);
        }
        for (key in map) {
          group = map[key];
          ret.push({
            key: key,
            rules: group
          });
        }
      }
      console.log(ret);
      return ret;
    },
    validateRule: function(rule) {
      if (rule.ruleType === "rated" && rule.rule > 5) {
        return rule.rule = 5;
      }
    },
    filterTracks: function(rules) {
      var i, len, ret, rule;
      console.log("filtering");
      ret = app.libraryEntries;
      for (i = 0, len = rules.length; i < len; i++) {
        rule = rules[i];
        console.log(rule);
        console.log(this.filters[rule.ruleType]);
        if (this.filters[rule.ruleType] != null) {
          ret = this.filters[rule.ruleType](ret, rule);
        }
        console.log(ret);
      }
      console.log(ret);
      return ret;
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
            if (tag.id === rule.rule) {
              ret.push(libraryEntry);
            }
          }
        }
        return ret;
      },
      hasNot: function(libraryEntries, rule) {
        var i, j, len, len1, libraryEntry, ref, ret, select, tag;
        ret = [];
        select = true;
        for (i = 0, len = libraryEntries.length; i < len; i++) {
          libraryEntry = libraryEntries[i];
          ref = libraryEntry.tags;
          for (j = 0, len1 = ref.length; j < len1; j++) {
            tag = ref[j];
            if (tag.id === rule.rule) {
              select = false;
            }
          }
          if (select) {
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
          console.log(rule.greater + ": " + libraryEntry.playCount + " - " + rule.rule);
          if (rule.greater && libraryEntry.playCount >= rule.rule) {
            ret.push(libraryEntry);
          } else if (!rule.greater && libraryEntry.playCount <= rule.rule) {
            console.log(push);
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
    created: function() {
      return console.log("playlistCreate");
    },
    ready: function() {
      return console.log("playlistReady");
    },
    attached: function() {
      console.log("playlistAttach");
      return console.log(this.rating);
    }
  }));

  console.log("playlist");

}).call(this);
