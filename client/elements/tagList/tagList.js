(function() {
  var polymerDefinition;

  console.log("taglistload");

  if (window.elements == null) {
    window.elements = {};
  }

  polymerDefinition = {
    is: "tag-list",
    properties: {
      tags: {
        type: Array,
        notify: true
      },
      libraryEntries: {
        type: Array,
        notify: true
      }
    },
    listeners: {},
    created: function() {
      console.log("listelemcreate");
      return console.log(this);
    },
    ready: function() {},
    attached: function() {},
    sortFunction: function(a, b) {
      if (a.name < b.name) {
        return -1;
      }
      if (b.name < a.name) {
        return 1;
      }
      return 0;
    }
  };

  window.elements.tagList = Polymer(polymerDefinition);

}).call(this);
