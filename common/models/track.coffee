module.exports = (track)->
  track.upsertTrack = (trackData, cb)->
    console.log "upserting"
    console.log trackData.googleId
    return new Promise((resolve, reject)=>
      track.find({
        where:
          googleId: trackData.googleId
      }, (err, returnedInstances)=>
        console.log "return"
        console.log returnedInstances
        if returnedInstances.length == 0
          console.log "Creating..."
          track.create(trackData, (err, obj)=>
            console.log err
            console.log "track created"
            console.log obj
            resolve(obj)
          )
        else
          resolve(returnedInstances[0])
      )
    )

  track.remoteMethod('upsertTrack',
    accepts: [{arg: "track", type: "object", required: "true"}]
    http: {path: "/upsertTrack", verb: "post"}
    returns: {root: true}
  )
