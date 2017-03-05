(function() {
  var polymerDefinition;

  console.log("tracklist");

  if (window.elements == null) {
    window.elements = {};
  }

  polymerDefinition = {
    is: "track-list",
    properties: {
      activeTrack: {
        type: Object
      },
      dataPath: {
        type: String,
        value: "libraryEntries"
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
      var grid;
      console.log("trackelemready");
      console.log(app.libraryEntries);
      grid = this.$["vaadin-grid"];
      grid.items = app.libraryEntries;
      grid.addEventListener('sort-order-changed', function() {
        var sortDirection, sortOrder, sortProperty;
        sortOrder = grid.sortOrder[0];
        sortProperty = grid.columns[sortOrder.column].name;
        sortDirection = sortOrder.direction;
        return grid.items.sort(function(a, b) {
          var field, i, len, path, res;
          path = sortProperty.split('.');
          for (i = 0, len = path.length; i < len; i++) {
            field = path[i];
            a = a[field];
            b = b[field];
          }
          if (!isNaN(a)) {
            res = parseInt(a, 10) - parseInt(b, 10);
          } else {
            res = a.localeCompare(b);
          }
          if (sortDirection === 'desc') {
            res *= -1;
          }
          return res;
        });
      });
      return console.log(grid.columns);
    },
    attached: function() {},
    _deleteConfirm: function(e) {
      console.log(e);
      console.log(e.srcElement.id);
      this.activeCase = app.get("case", e.srcElement.eid);
      console.log("deleteConfirm");
      console.log(this.activeCase);
      return this.$.confirmDelete.open();
    }
  };

  window.elements.trackList = Polymer(polymerDefinition);

}).call(this);
