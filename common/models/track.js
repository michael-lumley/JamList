module.exports = function(track) {
  track.upsertTrack = function(trackData, cb) {
    console.log("upserting");
    console.log(trackData.googleId);
    return new Promise((function(_this) {
      return function(resolve, reject) {
        return track.find({
          where: {
            googleId: trackData.googleId
          }
        }, function(err, returnedInstances) {
          console.log("return");
          console.log(returnedInstances);
          if (returnedInstances.length === 0) {
            console.log("Creating...");
            return track.create(trackData, function(err, obj) {
              console.log(err);
              console.log("track created");
              console.log(obj);
              return resolve(obj);
            });
          } else {
            return resolve(returnedInstances[0]);
          }
        });
      };
    })(this));
  };
  return track.remoteMethod('upsertTrack', {
    accepts: [
      {
        arg: "track",
        type: "object",
        required: "true"
      }
    ],
    http: {
      path: "/upsertTrack",
      verb: "post"
    },
    returns: {
      root: true
    }
  });
};
