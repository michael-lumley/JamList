(function() {
  var polymerDefinition;

  if (window.elements == null) {
    window.elements = {};
  }

  polymerDefinition = {
    is: "tag-dropdown",
    properties: {
      allTags: {
        type: Array,
        notify: true,
        value: ["testing", "testing1", "testing2"]
      },
      selectedTags: {
        type: Array,
        notify: true
      }
    },
    ready: function() {
      console.log("ready");
      return console.log(this.allTags);
    }
  };

  window.elements.tagDropdown = Polymer(polymerDefinition);

}).call(this);
