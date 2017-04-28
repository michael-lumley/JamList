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
      tagsDB: {
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
    ready: function() {
      return this.$.tags.addEventListener("tag-added", (function(_this) {
        return function(e) {
          console.log(e);
          _this.pop("tags", tags.legnth - 1);
          console.log(_this.tags);
          return app.data.findOrCreate("tag", {
            name: e.detail
          }).then(function(tag) {
            return app.data.link({
              model: "track",
              id: _this.trackId
            }, {
              model: "tag",
              id: tag.id
            });
          }).then(function(data) {
            return console.log(_this.tags);
          });
        };
      })(this));

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
