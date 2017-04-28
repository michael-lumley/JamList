(function() {
  if (window.elements == null) {
    window.elements = {};
  }

  window.elements.rule = {};

  window.elements.rule.base = {
    properties: {
      id: {
        type: Number
      },
      ruleType: {
        type: String,
        notify: true,
        value: ""
      },
      rule: {
        type: Number,
        notify: true,
        value: 0
      },
      greater: {
        type: Number,
        notify: true,
        value: 0
      },
      playlistId: {
        type: Number,
        notify: true
      },
      tagId: {
        type: Number,
        notify: true
      }
    },
    ruleTypeIs: function(display, ruleType) {
      if (display === "rated" && ruleType === "rated") {
        return true;
      } else if (display === "tag" && (ruleType === "has" || ruleType === "hasNot")) {
        return true;
      } else if (display === "playcount" && ruleType === "playcount") {
        return true;
      } else if (display === "date" && (ruleType === "added" || ruleType === "played" || ruleType === "recorded")) {
        return true;
      } else {
        return false;
      }
    },
    dateDisplayIs: function(display, greater) {
      if (display === "days" && greater === "0") {
        return true;
      } else if (display === "picker" && greater !== "0") {
        return true;
      } else {
        return false;
      }
    },
    libraryTags: function() {
      return app.tags;
    },
    deleteRule: function() {
      return this.fire('ruleDelete', {
        id: this.id
      });
    }
  };

  window.elements.rule.detail = Polymer(_$.deepSafeExtend(window.elements.rule.base, {
    is: "rule-detail",
    created: function() {},
    ready: function() {},
    attached: function() {}
  }));

}).call(this);
