console.log pluginPortals

portal = new pluginPortals.ClientPortal("application", {

})

user = {}

setTimeout(()->
	console.log "executing"
	portal.sendMessage({
		target: "google_music"
		fn: "userInfo"
		args: {}
	}).then((response)->
		user = response.user
		console.log response
		portal.sendMessage({
			target: "background"
			fn: "allPlaylists"
			args:
				user: response.user
		})
		###
		portal.sendMessage({
			target: "google_music"
			fn: "getTracks"
			args:
				user: response.user
		})
		###
	).then((response)->
		console.log response
		portal.sendMessage({
			target: "background"
			fn: "playlist"
			args:
				user: user
				id: response.data.items[0].id
		})
	).then((response)->
		console.log response
	).catch((error)->
		console.log error
	)
, "2000")
###
