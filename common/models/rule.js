module.exports = function(Rule) {

  /*
  app = require('../../server/server')
  Q = require('q')
  _ = require('underscore')
  util = require('util')
   */
  Rule.prototype.satisfiedBy = function() {
    var defer;
    console.log("checking a rule");
    defer = Q.defer();
    console.log(this.ruleType("has"));
    console.log(this.played);
    console.log(this.ruleType("played"));
    console.log("done check");
    if (this.ruleType("played")) {
      app.models.Track.find({
        where: {
          playCount: {
            gt: this.played
          }
        },
        fields: {
          id: true
        }
      }, (function(_this) {
        return function(err, tracks) {
          var ids;
          console.log("playedCB");
          if (err) {
            throw err;
          }
          ids = _.pluck(tracks, "id");
          return defer.resolve({
            rule: _this,
            ids: ids
          });
        };
      })(this));
    }
    if (this.ruleType("has")) {
      app.models.Tag.find({
        where: {
          id: this.tagId
        },
        include: {
          relation: 'tracks',
          scope: {
            fields: {
              id: true
            }
          }
        }
      }, (function(_this) {
        return function(err, tags) {
          var ids, tracks;
          console.log("hasCB");
          if (err) {
            throw err;
          }
          tracks = tags[0].tracks();
          ids = _.pluck(tracks, "id");
          return defer.resolve({
            rule: _this,
            ids: ids
          });
        };
      })(this));
    }
    if (this.ruleType("hasNot")) {
      app.models.Tag.find({
        where: {
          id: this.tagId
        },
        include: {
          relation: 'tracks',
          scope: {
            fields: {
              id: true
            }
          }
        }
      }, (function(_this) {
        return function(err, tags) {
          var excludeIds, tracks;
          console.log("hasNotCB");
          if (err) {
            throw err;
          }
          tracks = tags[0].tracks();
          excludeIds = _.pluck(tracks, "id");
          return app.models.Track.find({}, function(err, tracks) {
            var ids;
            ids = _.pluck(tracks, "id");
            ids = _.difference(ids, excludeIds);
            return defer.resolve({
              rule: _this,
              ids: ids
            });
          });
        };
      })(this));
    }
    return defer.promise;
  };
  Rule.prototype.ruleType = function(rule) {
    if (rule != null) {
      if (this.has || this.hasNot) {
        if (rule === "tag") {
          return true;
        }
      }
      if (this.has && rule === "has") {
        return true;
      }
      if (this.hasNot && rule === "hasNot") {
        return true;
      }
      if (this.played >= 0 && rule === "played") {
        return true;
      }
      if (this.dated && rule === "dated") {
        return true;
      }
      if (this.rated >= 0 && rule === "rated") {
        return true;
      }
      return false;
    } else {
      if (this.has) {
        return "has";
      }
      if (this.hasNot) {
        return "hasNot";
      }
      if (this.played >= 0) {
        return "played";
      }
      if (this.dated) {
        return "dated";
      }
      if (this.rated >= 0) {
        return "rated";
      }
    }
  };
  return Rule.prototype.unionType = function(union) {
    if (union != null) {
      if (union === "join" && this.hasNot) {
        return false;
      } else {
        return true;
      }
    }
    if (this.hasNot) {
      return "remove";
    } else {
      return "join";
    }
  };
};
