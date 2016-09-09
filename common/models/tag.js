module.exports = function(Tag) {

  /*
  app = require('../../server/server')
  Q = require('q')
  _ = require('underscore')
   */
  Tag.merge = function(baseId, mergeId, name, cb) {
    var base, merge;
    console.log("merge call");
    base = app.wrapper("Tag", "findById", [baseId]);
    merge = app.wrapper("Tag", "findOne", [
      {
        where: {
          id: mergeId
        },
        include: 'tracks'
      }
    ]);
    console.log("Qall call");
    return Q.all([base, merge]).done(function(deps) {
      console.log("all done");
      base = deps[0];
      merge = deps[1];
      console.log(base);
      console.log(merge);
      base.updateAttributes({
        name: name
      });
      console.log("first all");
      return app.allAsync(merge.tracks(), function(track) {
        var defer;
        defer = Q.defer();
        base.tracks.add(track, function() {
          console.log("adding track");
          return defer.resolve();
        });
        return defer.promise;
      }).then(function() {
        console.log("second all");
        return app.allAsync(merge.tracks(), function(track) {
          var defer;
          defer = Q.defer();
          merge.tracks.remove(track, function() {
            console.log("deleting track");
            return defer.resolve();
          });
          return defer.promise;
        });
      }).done(function() {
        console.log("done");
        console.log(merge);
        base.save();
        merge.destroy();
        return cb(null, base);
      });
    });
  };
  return Tag.remoteMethod("merge", {
    accepts: [
      {
        arg: 'baseId',
        type: 'string',
        required: true
      }, {
        arg: 'mergeId',
        type: 'string',
        required: true
      }, {
        arg: 'name',
        type: 'string',
        required: true
      }
    ],
    http: {
      path: '/:baseId/merge/:mergeId',
      verb: 'put'
    },
    returns: {
      root: true
    }
  });
};
