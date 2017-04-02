(function() {
  var polymerDefinition;

  console.log("tracklistload");

  if (window.elements == null) {
    window.elements = {};
  }

  polymerDefinition = {
    is: "track-list",
    properties: {
      data: {
        type: Array
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
      return console.log("trackelemready");
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
