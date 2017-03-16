(function() {
  if (window.elements == null) {
    window.elements = {};
  }

  window.elements.libraryEntry = {};

  window.elements.libraryEntry.base = {
    properties: {
      album: {
        type: String,
        source: "track",
        notify: true
      },
      albumArtLink: {
        type: String,
        source: "track",
        notify: true
      },
      artist: {
        type: String,
        source: "track",
        notify: true
      },
      libraryEntryId: {
        type: Number,
        source: "id",
        notify: true
      },
      millisduration: {
        type: Number,
        source: "track",
        notify: true
      },
      playCount: {
        type: Number,
        source: "libraryEntry",
        notify: true
      },
      rating: {
        type: Number,
        source: "libraryEntry",
        notify: true
      },
      tags: {
        type: Array,
        source: "tags",
        notify: true
      },
      title: {
        type: String,
        source: "track",
        notify: true
      },
      trackId: {
        type: Number,
        source: "id",
        notify: true
      }
    },
    factoryImpl: function(id) {
      var entry, i, key, len, libraryEntryId, property, ref, ref1, results, trackData;
      libraryEntryId = id;
      trackData = app.get("libraryEntry", id);
      console.log(trackData);
      ref = this.properties;
      results = [];
      for (key in ref) {
        property = ref[key];
        console.log(key);
        if (property.source === "track") {
          this[key] = trackData.track[key];
        } else if (property.source === "libraryEntry") {
          this[key] = trackData[key];
        } else if (property.source === "id") {
          if (key === "libraryEntryId") {
            this[key] = trackData.id;
          } else if (key === "trackId") {
            this[key] = trackData.track.id;
          }
        } else if (property.source === "tags") {
          ref1 = trackData[key];
          for (i = 0, len = ref1.length; i < len; i++) {
            entry = ref1[i];
            this.push("tags", entry["name"]);
          }
        }
        console.log(this[key]);
        results.push(this.setupPropertyListener(key, property));
      }
      return results;
    },
    setupPropertyListener: function(key, property) {
      console.log(key.toDash());
      if (property.source !== "tags") {
        return this.addEventListener((key.toDash()) + "-changed", (function(_this) {
          return function(e) {
            console.log((key.toDash()) + "-changed");
            return (function(key, property) {
              var localData;
              localData = app.get("libraryEntry", _this.libraryEntryId);
              if (property.source === "track") {
                localData.track[key] = _this[key];
                return app.queueData("track", _this.trackId, key, _this[key]);
              } else if (property.source === "libraryEntry") {
                localData[key] = _this[key];
                return app.queueData("libraryEntry", _this.libraryEntryId, key, _this[key]);
              }
            })(key, property);
          };
        })(this));
      } else if (property.source === "tags") {
        this.addEventListener("tag-added", (function(_this) {
          return function(e) {
            return app.addTag(_this.libraryEntryId, e.detail);
          };
        })(this));
        return this.addEventListener("tag-removed", (function(_this) {
          return function(e) {
            console.log(e);
            return app.deleteTag(_this.libraryEntryId, e.detail.item);
          };
        })(this));
      }
    }
  };

  window.elements.libraryEntry.details = Polymer(_$.deepSafeExtend(window.elements.libraryEntry.base, {
    is: "library-entry-details",
    created: function() {
      return console.log("trackCreate");
    },
    ready: function() {
      return console.log("trackReady");
    },
    attached: function() {
      console.log("trackAttach");
      return console.log(this.rating);
    }
  }));

}).call(this);
