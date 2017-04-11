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
    ready: function() {},
    attached: function() {},
    addPlaylist: function() {
      return app.xhr({
        method: "POST",
        url: "http://" + app.urlBase + ":3000/api/playlists",
        data: {
          name: "New Playlist"
        }
      }).then((function(_this) {
        return function(data) {
          _this.push("playlists", {
            name: data.name,
            rules: [],
            id: data.id
          });
          return _this.activeList = data.id;
        };
      })(this));
    }
  };

  window.elements.trackList = Polymer(polymerDefinition);

}).call(this);
