module.exports = (Playlist) ->
    ###
    app = require('../../server/server')
    Q = require('q')
    _ = require('underscore')
    ###
    Playlist.refresh = (id, cb)->
        #internal asynchronous function to resolve group rules
        satisfiesGroup = (ruleGroup) ->
            defer = Q.defer()
            app.allAsync(ruleGroup, (rule)->
                rule.satisfiedBy()
            ).done((rules)->
                satisfyingIds = []
                _.each(rules, (rule)->
                    satisfyingIds = _.union(satisfyingIds, rule.ids)
                )
                console.log(satisfyingIds)
                defer.resolve(satisfyingIds)
            )
            return defer.promise

        tracks = app.wrapper("Rule", "find", [
            where:
                playlistId: id
        ]).then((rules)=>
            defer = Q.defer()
            groups = _.pluck(rules, "group")
            uniqueGroups = []
            _.each(groups, (el)=>
                if(!_.contains(uniqueGroups, el))
                    uniqueGroups.push(el)
            )
            ruleGroups = []
            _.each(uniqueGroups, (key)=>
                ruleGroup = _.where(rules, {group: key})
                ruleGroups.push(ruleGroup)
            )

            app.allAsync(ruleGroups, satisfiesGroup).done((ruleGroups)->
                results = ruleGroups[0]
                _.each(ruleGroups, (ruleGroup)->
                    results = _.intersection(results, ruleGroup)
                )
                defer.resolve(results)
            )
            return defer.promise
        )
        playlist = app.wrapper("Playlist", "findOne", [
            where:
                id: id
            include:
                relation: 'tracks'
                scope:
                    fields: 'id'
        ])

        Q.all([playlist, tracks]).done((args)->
            playlist = args[0]
            tracks = args[1]
            deferreds = new Array()


            _.each(_.pluck(playlist.tracks(), 'id'), (track)->
                #console.log("checking a track")
                if !_.contains(tracks, track.id)
                    playlist.tracks.remove(track.id, ()->
                        #console.log("removed a track")
                    )
                else
                    #console.log("track passed")
            )

            _.each(tracks, (track)->
                defer = Q.defer();
                deferreds.push(defer.promise)
                playlist.tracks.add(track, {}, ()->
                    defer.resolve()
                )
            )

            Q.all(deferreds).done(()->
                console.log("sending playlist")
                playlist = app.wrapper("Playlist", "findOne", [
                    where:
                        id: id
                    include: [{
                        relation: 'tracks'
                        scope:
                            fields: "id"
                    },{
                        relation: 'rules'
                        scope:
                            fields: "id"
                    }]
                ]).done((playlist)->
                    console.log("going to server with playlist tracks")
                    playlist.toServer(
                        success: (data, res) ->
                            console.log("calling back")
                            cb(null, playlist)
                    )
                )
            )
            console.log("wtf")
            return
        )

    Playlist.makeNew = (name, cb)->
        console.log("starting create")
        app.pm.createPlaylist(
            name: name
            success: (data)->
                console.log(data)
                console.log(typeof data)
                console.log(data["mutate_response"][0].id)
                app.models.Playlist.create({
                    id: data["mutate_response"][0].id
                    name: name
                }, (err, playlist)->
                    throw err if err
                    console.log(err)
                    console.log(playlist)
                    console.log("done")
                    cb(null, playlist)
                )
        )

    ###
        Options Hash

    ###
    Playlist.prototype.toServer = (options) ->
        app.pm.addTracksToPlaylist(
            trackIds: _.pluck(@tracks(), "id")
            playlistId: @id
            success: (data, res)->
                options.success(data, res) if options.success
            error: (data, res) ->
                options.error(data, res) if options.error
        )

    Playlist.remoteMethod("makeNew",
        accepts: [{arg: 'name', type: 'string', required: true}]
        http: {path: '/makeNew', verb: 'post'}
        returns: {root: true}
    )

    Playlist.remoteMethod("refresh",
        accepts: [{arg: 'id', type: 'string', required: true}]
        http: {path: '/:id/refresh', verb: 'post'}
        returns: {root: true}
    )
