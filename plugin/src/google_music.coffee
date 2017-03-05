console.log "google music content"

window.glogger = require("../resources/glogger/glog.js")
pluginPortals = require("../resources/plugin-portals/src/plugin-portals.js")
converter = require("./converter.js")

# Portal
portal = new pluginPortals.ClientPortal("google_music", {
	# Portal Funcs @fold-children
	userInfo: ()->
		console.log "here"
		promise = new Promise((resolve, reject)->
			codeToInject = ()->
				console.log window.USER_CONTEXT
				if window.USER_CONTEXT != ''
					window.postMessage(
						id: window.USER_ID,
						email: window.USER_CONTEXT[12]
						tier: window.USER_CONTEXT[13]
						obfid: window.USER_CONTEXT[25]
						xt: window._GU_getCookie('xt')
					, 'https://play.google.com')

			# Injects the passed function into the document, runs it, then removes it
			injectFunc = (func)->
					script = document.createElement('script');
					script.textContent = "(#{func})()"
					(document.head || document.documentElement).appendChild(script);
					script.parentNode.removeChild(script)

			window.addEventListener('message', (event)=>
				if event.origin == "https://play.google.com"
					resolve({user: event.data})
			)
			injectFunc(codeToInject)
		)
	### Gets All Tracks Belonging to a User
		@object args.user
	###
	getTracks: (args)->
		user = args.user
		return new Promise((resolve, reject)=>
			tracks = []
			DBOpenRequest = window.indexedDB.open("music_#{user.id}", 6)
			DBOpenRequest.onsuccess = (event)->
				db = DBOpenRequest.result
				transaction = db.transaction(['tracks', 'info'], 'readonly')
				transaction.objectStore('tracks').openCursor().onsuccess = (event)->
					cursor = event.target.result
					if cursor
						shard = JSON.parse(cursor.value)
						console.log "looping shard"
						for id, track of shard
							tracks.push(converter.google.track(track))
						cursor.continue()
					else
						console.log tracks
						resolve({tracks: tracks})
			)
	# !fold-children
})
