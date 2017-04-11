(function() {
  var polymerDefinition;

  console.log("tracklistload");

  if (window.elements == null) {
    window.elements = {};
  }

  polymerDefinition = {
    is: "track-list",
    properties: {
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
    created: function() {},
    ready: function() {
      var expandedItem, table;
      table = this.$.table;
      expandedItem = {};
      table.addEventListener('expanding-item', function(e) {
        if (expandedItem !== {}) {
          table.collapseItem(expandedItem);
        }
        return expandedItem = e.detail.item;
      });
    },
    attached: function() {}
  };

  window.elements.trackList = Polymer(polymerDefinition);

}).call(this);
