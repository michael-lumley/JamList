(function() {
  var polymerDefinition;

  console.log("tracklistload");

  if (window.elements == null) {
    window.elements = {};
  }

  polymerDefinition = {
    is: "playlist-list",
    properties: {
      playlists: {
        type: Array,
        notify: true
      },
      tracks: {
        type: Array,
        notify: true
      },
      activeList: {
        type: Number,
        notify: true
      },
      rules: {
        type: Array,
        notify: true
      },
      tags: {
        type: Array,
        notify: true
      }
    },
    listeners: {
      '_deleteConfirm': '_deleteConfirm',
      '_generateNote': '_generateNote',
      '_generateLabel': '_generateLabel',
      '_generateDWIVideoRequest': '_generateDWIVideoRequest',
      '_fill911': '_fill911'
    },
    created: function() {
      console.log("listelemcreate");
      return console.log(this);
    },
    ready: function() {
      return window.test = this;
    },
    attached: function() {},
    addPlaylist: function() {
      return app.data.create("playlist", {
        name: "New Playlist",
        jlUserId: "lumleym"
      }).then((function(_this) {
        return function(data) {
          return _this.activeList = data.id;
        };
      })(this));
    }
  };

  window.elements.trackList = Polymer(polymerDefinition);

}).call(this);
