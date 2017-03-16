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
        notify: true
      },
      rule: {
        type: Number,
        notify: true
      },
      greater: {
        type: Number,
        notify: true
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
      console.log(ruleType);
      console.log(this.ruleType);
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
      console.log(display);
      console.log(greater);
      if (display === "days" && greater === "0") {
        return true;
      } else if (display === "picker" && greater !== "0") {
        return true;
      } else {
        return false;
      }
    },
    libraryTags: function() {
      console.log("gettingTags");
      console.log(app.tags);
      return app.tags;
    }
  };

  window.elements.rule.detail = Polymer(_$.deepSafeExtend(window.elements.rule.base, {
    is: "rule-detail",
    created: function() {
      return console.log("playlistCreate");
    },
    ready: function() {
      console.log("playlistReady");
      return this.ruleType = "has";
    },
    attached: function() {
      console.log("playlistAttach");
      return console.log(this.rating);
    }
  }));

  console.log("rule");

}).call(this);
