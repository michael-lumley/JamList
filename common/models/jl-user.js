module.exports = function(jlUser) {

  /*
  app = require('../../server/server')
  Q = require('q')
  _ = require('underscore')
  apiRequest = require('googleapis/lib/apirequest')
  #/##
  
  jlUser.prototype.openConnection = (cb)->
      if !@connectorType?
          console.log("no connector")
          cb({
              number: 404
              message: "No Connector"
          }, null)
          return
      if !@tokens?
          console.log("no tokens")
          cb({
              number: 403
              message: "Missing All Tokens"
              url: app.connectors[@connectorType].getTokenUrl(auth, @id)
          }, null)
          return
      if !@tokens.master?
          console.log("no master tokens")
          cb({
              number: 403
              message: "Missing Master Token"
              url: app.connectors[@connectorType].getTokenUrl(auth, @id)
          }, null)
          return
      if !@tokens.music?
          console.log("no music tokens")
          cb({
              number: 403
              message: "Missing Music Token"
              url: app.connectors[@connectorType].getTokenUrl(auth, @id)
          }, null)
          return
      console.log("found connector and tokens")
      cb(null, {
          connector: app.connectors[@connectorType],
          auth: app.connectors[@connectorType].getAuth(@tokens)
      })
  
  
  
  jlUser.recieveAuth = (code, state, cb)->
      state = JSON.parse(state)
      if app.connectors.google.pendingTokenRequests[state.userId] = state.verification
          jlUser.findById(state.userId, (err, user)->
              throw err if err
              oAuth2Client =  app.connectors.google.getAuth(user)
              oAuth2Client.getToken(code, (err, tokens)->
                  user.tokens = JSON.stringify(tokens)
                  user.save()
              )
          )
      cb(null, "success")
  jlUser.remoteMethod("recieveAuth",
      accepts: [
          {arg: 'code', type: 'string', required: true},
          {arg: 'state', type: 'string', required: true}
      ]
      http: {path: '/recieveAuth', verb: 'get'}
      returns: {root: true}
  )
  
  jlUser.syncLibrary = (id, cb)->
      jlUser.findById(id, (err, user)->
          cb(err, null) if err?
          user.openConnection((err, access)->
              cb(err, null) if err?
              if access?
                  connector = access.connector
                  auth = access.auth
                  connector.syncLibrary({
                      auth: auth
                      user: user
                  }, (err, success)->
                      cb(err, null) if err?
                      cb(null, success) if success?
                  )
          )
      )
  jlUser.remoteMethod("syncLibrary",
      accepts: [{arg: 'id', type: 'string', required: true}]
      http: {path: '/:id/syncLibrary', verb: 'post'}
      returns: {root: true}
  )
  #/##
      @getLibrary(
                  userId: user.id
                  maxResults: 10
              ).then((library)->
                  defer = Q.defer()
                  entries = []
                  for track in library.items
                      if track.playCount > 1
                          console.log(track.title)
                          entries.push(connector.createEntryFromServer(track, user))
                  Q.all(entries).then(()->
                      console.log("Library Refreshed")
                      defer.resolve()
                  )
                  return defer.promise
               * add playlists as tags to library
              ).then(()->
                  playlists = @getPlaylists(userId: user.id)
                  plEntries = @getPlaylistEntries(userId: user.id)
                  #/##
                  Q.all([playlists, plEntries]).done(deps)->
                      playlists = deps[0]
                      plEntries = deps[1]
                      for playlist in playlists.items
                          console.log("pushing")
                          console.log(playlist)
                          entries.push(connector.createTagFromServer(playlist, user)).done((tag)->
                              entries = _.filter(plEntries.items, (entry)->
                                  return true if entry.playlistId == playlist.id
                                  return false
                              )
                              #for entry in entries
  
                  )
                  #/##
              ).then((playlists)->
                  defer = Q.defer()
                  entries = []
                  console.log(playlists.items)
  
                  Q.all(entries).then(()->
                      console.log("playlists converted to tags")
                      defer.resolve()
                  )
                  return defer.promise
              ).then(()->
                  return @getPlaylistEntries(
                      userId: user.id
                      maxResults: 10
                  )
              ).done((plentries) ->
                  defer = Q.defer()
                  entries = []
                  for entry in plentries.items
                      #console.log("plentry push")
                      entries.push(connector.processPlaylistEntry(entry, user))
              )
  #/##
  jlUser.testPath = (method, data, cb)->
      jlUser.findById(1, (err, user)->
          throw err if err
          user.openConnection((err, access)->
              try
                  data = JSON.parse(data)
              catch
                  data = {}
              args = _.extend({auth: access.auth}, {data: data})
              access.connector[method](args, (err, success)->
                  access.connector.handleError(err, user, cb) if err?
                  cb(null, success) if success?
              )
          )
      )
  jlUser.remoteMethod("testPath",
      accepts: [
          {arg: 'method', type: 'string', required: true},
          {arg: 'data', type: 'string', required: true}]
      http: {path: '/testPath', verb: 'post'}
      returns: {root: true}
  )
  
  jlUser.testIncomingPath = (maxResults, req,  cb)->
      console.log(req)
      console.log("Max-Results:")
      console.log(maxResults)
      cb(null, maxResults)
  
  jlUser.remoteMethod("testIncomingPath",
      accepts: [
          {arg: 'max-results', type: 'string'}
          {arg: 'req', type: 'object', http: (ctx)->
              return ctx.req
          }
      ]
      http: {path: '/testIncomingPath', verb: 'post'}
      returns: {root: true}
  )
   */
};
