module.exports = (Rule) ->
    ###
    app = require('../../server/server')
    Q = require('q')
    _ = require('underscore')
    util = require('util')

    ###
    Rule.prototype.satisfiedBy = ()->
        console.log("checking a rule")
        defer = Q.defer()
        console.log(@ruleType("has"))
        console.log(@played)
        console.log(@ruleType("played"))
        console.log("done check")
        if @ruleType("played")
            app.models.Track.find(
                where:
                    playCount:
                        gt: @played
                fields:
                    id: true
            , (err, tracks) =>
                console.log("playedCB")
                throw err if err
                ids = _.pluck(tracks, "id")
                defer.resolve(
                    rule: @
                    ids: ids
                )
            )
        if @ruleType("has")
            app.models.Tag.find(
                where:
                    id: @tagId
                include:
                    relation: 'tracks'
                    scope:
                        fields:
                            id: true
            , (err, tags) =>
                console.log("hasCB")
                throw err if err
                tracks = tags[0].tracks()
                ids = _.pluck(tracks, "id")
                defer.resolve(
                    rule: @
                    ids: ids
                )
            )
        if @ruleType("hasNot")
            app.models.Tag.find(
                where:
                    id: @tagId
                include:
                    relation: 'tracks'
                    scope:
                        fields:
                            id: true
            , (err, tags) =>
                console.log("hasNotCB")
                throw err if err
                tracks = tags[0].tracks()
                excludeIds = _.pluck(tracks, "id")
                app.models.Track.find({}, (err, tracks)=>
                    ids = _.pluck(tracks, "id")
                    ids = _.difference(ids, excludeIds)
                    defer.resolve(
                        rule: @
                        ids: ids
                    )
                )

            )
        #if rule.rated >= 0

        return defer.promise

    Rule.prototype.ruleType = (rule)->
        if rule?
            if @has or @hasNot
                return true if rule == "tag"
            return true if @has and rule == "has"
            return true if @hasNot and rule == "hasNot"
            return true if @played >= 0 and rule == "played"
            return true if @dated and rule == "dated"
            return true if @rated >= 0 and rule == "rated"
            return false
        else
            return "has" if @has
            return "hasNot" if @hasNot
            return "played" if @played >= 0
            return "dated" if @dated
            return "rated" if @rated >= 0

    Rule.prototype.unionType = (union)->
        if union?
            if union == "join" and @hasNot
                return false
            else return true
        if @hasNot
            return "remove"
        else
            return "join"
