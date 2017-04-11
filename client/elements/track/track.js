(function() {
  if (window.elements == null) {
    window.elements = {};
  }

  window.elements.track = {};

  window.elements.track.base = {
    properties: {
      album: {
        type: String,
        notify: true
      },
      albumArtLink: {
        type: String,
        notify: true
      },
      artist: {
        type: String,
        notify: true
      },
      trackId: {
        type: Number,
        notify: true
      },
      millisduration: {
        type: Number,
        notify: true
      },
      playCount: {
        type: Number,
        notify: true
      },
      rating: {
        type: Number,
        notify: true
      },
      tags: {
        type: Array,
        notify: true,
        value: []
      },
      miscArray: {
        type: Array,
        notify: true,
        value: []
      },
      title: {
        type: String,
        notify: true
      },
      trackId: {
        type: Number,
        notify: true
      }
    },
    observers: ["trackLevelObserver(tags.*)"],
    trackLevelObserver: (function(_this) {
      return function(changeRecord) {
        return console.log(changeRecord);
      };
    })(this),
    ready: function() {
      console.log("ready");
      console.log(this.tags);
      return setTimeout((function(_this) {
        return function() {
          return _this.push("tags", {
            name: "testtag"
          });
        };
      })(this), "2500");

      /*
      		@addEventListener("tag-added", (e)=>
      			app.addTag(@libraryEntryId, e.detail)
      		)
      		@addEventListener("tag-removed", (e)=>
      			console.log e
      			app.deleteTag(@libraryEntryId, e.detail.item)
      		)
      		#@factoryImpl(@id)
       */
    }
  };

  window.elements.track.details = Polymer(_$.deepSafeExtend(window.elements.track.base, {
    is: "track-details"
  }));

}).call(this);
