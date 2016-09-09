module.exports = (Tag) ->
    ###
    app = require('../../server/server')
    Q = require('q')
    _ = require('underscore')
    ###
    
    Tag.merge = (baseId, mergeId, name, cb)->
        console.log("merge call")
        base = app.wrapper("Tag", "findById", [baseId])
        merge = app.wrapper("Tag", "findOne", [
            where:
                id: mergeId
            include: 'tracks'
        ])
        console.log("Qall call")
        Q.all([base, merge]).done((deps) ->
            console.log("all done")
            base = deps[0]
            merge = deps[1]
            console.log(base)
            console.log(merge)
            base.updateAttributes({name: name})
            console.log("first all")
            app.allAsync(merge.tracks(), (track) ->
                defer = Q.defer()
                base.tracks.add(track, ()->
                    console.log("adding track")
                    defer.resolve()
                )
                return defer.promise
            ).then(()->
                console.log("second all")
                app.allAsync(merge.tracks(), (track) ->
                    defer = Q.defer()
                    merge.tracks.remove(track, ()->
                        console.log("deleting track")
                        defer.resolve()
                    )
                    return defer.promise
                )
            ).done(()->
                console.log("done")
                console.log(merge)
                base.save()
                merge.destroy()
                cb(null, base)
            )
        )



    Tag.remoteMethod("merge",
        accepts: [
            {arg: 'baseId', type: 'string', required: true}
            {arg: 'mergeId', type: 'string', required: true}
            {arg: 'name', type: 'string', required: true}
        ]
        http: {path: '/:baseId/merge/:mergeId', verb: 'put'}
        returns: {root: true}
    )
