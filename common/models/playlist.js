module.exports = function(Playlist) {

  /*
  app = require('../../server/server')
  Q = require('q')
  _ = require('underscore')
   */
  Playlist.refresh = function(id, cb) {
    var playlist, satisfiesGroup, tracks;
    satisfiesGroup = function(ruleGroup) {
      var defer;
      defer = Q.defer();
      app.allAsync(ruleGroup, function(rule) {
        return rule.satisfiedBy();
      }).done(function(rules) {
        var satisfyingIds;
        satisfyingIds = [];
        _.each(rules, function(rule) {
          return satisfyingIds = _.union(satisfyingIds, rule.ids);
        });
        console.log(satisfyingIds);
        return defer.resolve(satisfyingIds);
      });
      return defer.promise;
    };
    tracks = app.wrapper("Rule", "find", [
      {
        where: {
          playlistId: id
        }
      }
    ]).then((function(_this) {
      return function(rules) {
        var defer, groups, ruleGroups, uniqueGroups;
        defer = Q.defer();
        groups = _.pluck(rules, "group");
        uniqueGroups = [];
        _.each(groups, function(el) {
          if (!_.contains(uniqueGroups, el)) {
            return uniqueGroups.push(el);
          }
        });
        ruleGroups = [];
        _.each(uniqueGroups, function(key) {
          var ruleGroup;
          ruleGroup = _.where(rules, {
            group: key
          });
          return ruleGroups.push(ruleGroup);
        });
        app.allAsync(ruleGroups, satisfiesGroup).done(function(ruleGroups) {
          var results;
          results = ruleGroups[0];
          _.each(ruleGroups, function(ruleGroup) {
            return results = _.intersection(results, ruleGroup);
          });
          return defer.resolve(results);
        });
        return defer.promise;
      };
    })(this));
    playlist = app.wrapper("Playlist", "findOne", [
      {
        where: {
          id: id
        },
        include: {
          relation: 'tracks',
          scope: {
            fields: 'id'
          }
        }
      }
    ]);
    return Q.all([playlist, tracks]).done(function(args) {
      var deferreds;
      playlist = args[0];
      tracks = args[1];
      deferreds = new Array();
      _.each(_.pluck(playlist.tracks(), 'id'), function(track) {
        if (!_.contains(tracks, track.id)) {
          return playlist.tracks.remove(track.id, function() {});
        } else {

        }
      });
      _.each(tracks, function(track) {
        var defer;
        defer = Q.defer();
        deferreds.push(defer.promise);
        return playlist.tracks.add(track, {}, function() {
          return defer.resolve();
        });
      });
      Q.all(deferreds).done(function() {
        console.log("sending playlist");
        return playlist = app.wrapper("Playlist", "findOne", [
          {
            where: {
              id: id
            },
            include: [
              {
                relation: 'tracks',
                scope: {
                  fields: "id"
                }
              }, {
                relation: 'rules',
                scope: {
                  fields: "id"
                }
              }
            ]
          }
        ]).done(function(playlist) {
          console.log("going to server with playlist tracks");
          return playlist.toServer({
            success: function(data, res) {
              console.log("calling back");
              return cb(null, playlist);
            }
          });
        });
      });
      console.log("wtf");
    });
  };
  Playlist.makeNew = function(name, cb) {
    console.log("starting create");
    return app.pm.createPlaylist({
      name: name,
      success: function(data) {
        console.log(data);
        console.log(typeof data);
        console.log(data["mutate_response"][0].id);
        return app.models.Playlist.create({
          id: data["mutate_response"][0].id,
          name: name
        }, function(err, playlist) {
          if (err) {
            throw err;
          }
          console.log(err);
          console.log(playlist);
          console.log("done");
          return cb(null, playlist);
        });
      }
    });
  };

  /*
      Options Hash
   */
  Playlist.prototype.toServer = function(options) {
    return app.pm.addTracksToPlaylist({
      trackIds: _.pluck(this.tracks(), "id"),
      playlistId: this.id,
      success: function(data, res) {
        if (options.success) {
          return options.success(data, res);
        }
      },
      error: function(data, res) {
        if (options.error) {
          return options.error(data, res);
        }
      }
    });
  };
  Playlist.remoteMethod("makeNew", {
    accepts: [
      {
        arg: 'name',
        type: 'string',
        required: true
      }
    ],
    http: {
      path: '/makeNew',
      verb: 'post'
    },
    returns: {
      root: true
    }
  });
  return Playlist.remoteMethod("refresh", {
    accepts: [
      {
        arg: 'id',
        type: 'string',
        required: true
      }
    ],
    http: {
      path: '/:id/refresh',
      verb: 'post'
    },
    returns: {
      root: true
    }
  });
};
