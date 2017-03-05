console.log "background"

glogger = require("../resources/glogger/glog.js")
pluginPortals = require("../resources/plugin-portals/src/plugin-portals.js")
$ = require("jquery")
qs = require("../../node_modules/querystring")
converter = require("./converter.js")

#@fold
authedGMRequest = (options)->
	console.log "authed request"
	console.log options
	promise = new Promise((resolve, reject)->
		chrome.identity.getAuthToken((token)->
			console.log token
			if options.skyjam
				request =
					url: "https://www.googleapis.com/sj/v2.5/#{options.endpoint}?#{qs.stringify(options.params)}"
					type: options.method
					data: options.data
					headers: {
						Authorization: "Bearer #{token}"
						Accept: "application/json"
					}
					dataType: "json"
				console.log request
			else
				request =
					url: "https://play.google.com/music/services/#{options.endpoint}?#{qs.stringify(options.params)}"
					type: options.method
					data: JSON.stringify(options.data)
					dataType: "json"
			$.ajax(request).done((data)->
				console.log data
				resolve(data)
			).fail((error)->
				console.log error
				reject(error)
			)
		)
	)
#!fold

portal = new pluginPortals.BackgroundPortal({
	#@fold
	open: ()->
		promise = new Promise((resolve, reject)->
			chrome.tabs.create({url: "http://music.google.com"}, (tab)->
				setInterval(()->
					console.log tab.status
				, "50")
				resolve(true)
			)
		)
	allPlaylists: (args)->
		promise = new Promise((resolve, reject)->
			console.log args
			authedGMRequest(
				endpoint: 'playlists',
				skyjam: true
				method: "GET",
				data: null
				params: {
					"dv": 0,
					"hl": "en-US",
					"tier": args.user.tier,
					"max-results": 100
				}
			).then((response)->
				resolve({playlists: response.data.items})
			).catch((error)->
				console.log error
				reject(error)
			)
		)
	playlist: (args)->
		console.log args
		promise = new Promise((resolve, reject)->
			console.log "making request"
			authedGMRequest({
				endpoint: 'loaduserplaylist'
				skyjam: false
				method: "POST",
				data: null
				user: args.user
				params: {
					u: 0,
					xt: args.user.xt,
					format: "jsarray",
					dv: "0"
					obfid: args.user.obfid
				}
				data: [["", 1], [args.id]]
			}).then((response)->
				ret = []
				for track, key in response[1][0]
					ret.push(converter.google.track(track))
				resolve(ret)
			).catch((error)->
				reject(error)
			)
		)
	#!fold
})

console.log glogger

###
console.log "backgroundjs"

background = {
  tabs:
    musicExtension: null
    app: null
  setup: ()->
    console.log "setting up listener"
    chrome.runtime.onMessage.addListener((message, sender, sendResponse)=>
      console.log("Got Message at Background!")
      console.log sender
      console.log @
      console.log message.action
      console.log @[message.action]
      if @[message.action]?
        @[message.action](message, sender, sendResponse)
      else
        console.log("ERROR: Recieved Message At Background Without An Action")
        console.log(message)
    )
  userToBackground: (message, sender, sendResponse)->
    console.log("subroutine")
    message.user.tabId = sender.tab.id
    @user = message.user
    @tabs.musicExtension = sender.tab.id
    console.log("createtab")
    chrome.tabs.create({
      url: "html/container.html"
    }, (tab)=>
      @tabs.app = tab.id
    )
  userToApp: (message, sender, sendResponse)->
    sendResponse(@user)
  testMessage: (message, sender, sendResponse)->
    console.log sender.tab.id
}

background.setup()
###
