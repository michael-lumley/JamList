window.elements = {} if !window.elements?

window.elements.app = Polymer(
	is: "jamlist-app"
	# Polymer Inits @fold-children
	properties:
		playerActive:
			type: Boolean
			value: false
		playlists:
			type: Array
			notify: true
		tracks:
			type: Array
			notify: true
		queue:
			type: Object
			value: {}
		serviceActive:
			type: Boolean
			value: false
		tags:
			type: Array
			notify: true
		tokens:
			type: Array
		urlBase:
			type: "string"
		user:
			type: Object
			notify: true
			value: ()->
				return {login: {username: "", password: ""}, google: {}, jamlist: {}, deferred: $.Deferred()}
	listeners:
		'close-case': 'closeCase'
	###
	observers: [
		'tracksChanged(tracks.*)'
		'playlistsChanged(playlists.*)'
		'tagsChanged(tags.*)'
		'testChange(playlist.rules.splices)'
	]
	###
	# !fold

	testChange: (changeRecord)->
		console.log "PATH HIT"
		console.log @convertChangeRecord(changeRecord)
	playlistsChanged: (changeRecord)->
		console.log @convertChangeRecord(changeRecord)
	tagsChanged: (changeRecord)->
		console.log @convertChangeRecord(changeRecord)
	tracksChanged: (changeRecord)->
		console.log @convertChangeRecord(changeRecord)
		###
		console.log arguments
		console.log @tracks
		if changeRecord?
			path = changeRecord.path.split(".")
			if path[1]?
				#console.log path[1].substr(0, 1)
				if path[1].substr(0, 1) == "#"
					if path[2]?
						track = @get("tracks.#{path[1]}")
						@queueData("track", track.id, path[2], track[path[2]])
					#console.log track
			###
	convertChangeRecord: (changeRecord)->
		###
		path = changeRecord.path.split(".")
		if path[path.length-1] == "splices"
			if changeRecord.keySplices.added.length > 0
				return {
					CRUD: "C"
					basePath: entry[0]
					field: entry[2] or null
					key: changeRecord.keySplices.added[0]
				}
			if changeRecord.keySplices.removed.length > 0
				return {
					CRUD: "D"
					basePath: entry[0]
					field: entry[2] or null
					key: changeRecord.keySplices.deleted[0]
				}
		else
			return {
				elem: path[1]
			}
		###

	portal: new pluginPortals.ClientPortal("application", {
		# Plugin FNs @fold
		beforeSend: (args = {}) =>
			glogger("last").add args
			# Append the Google User to the request, UNLESS its a request for the user object itself
			if app?
				if app.__data__?
					args.user = app.user.google
			return args
		#!fold
	})

	# Lifecycle Functions @fold
	created: ()->
		window.app = @
		@urlBase = "localhost"
		@tokens = []
		console.log "sending user request"
		@portal.sendMessage({
			target: "google_music"
			fn: "userInfo"
			args: {}
		}).then((response)=>
			console.log response
			#TODO: What if no user yet?
			@user.google = response.user
			@user.deferred.resolve()
		)
	ready: ()->
		console.log("ready")
		console.log @properties
	attached: ()->									# Page JS Setup, Plugin Listener Creation
		console.log "attached"
		@routerSetup()
	# !fold

	#User Management Functions @fold
	login: ()->
		@spinner(()=>
			@xhr(
				method: "POST"
				url: "http://#{@urlBase}:3000/api/JLUsers/login"
				data:
					username: @user.login.username
					password: @user.login.password
			).then((data)=>
				Cookies.set("token", data.id)
				Cookies.set("user", data.userId)
				@setRoute("app")
			)
		)

	logout: ()->
		@xhr({method: "POST", url: "http://#{@urlBase}:3000/api/DAUsers/login"}).then((response, xhr)->
			Cookies.remove("token")
			Cookies.remove("user")
			page("/login")
		)
	# !fold

	#Router and Display @fold-children
	router: ()->
		url = location.hash.slice(1) || '/';
		route = @routes.prelim(url.substr(1))
			.then((route)=>
				if route and @routes[route]?
					@routes[route]()
			).catch((error)=>
				console.log error
			)
	routerSetup: ()->
		window.addEventListener('hashchange', @router.bind(@))
		window.addEventListener('load', @router.bind(@))
		#@router()
	setRoute: (route)->
		window.location.hash = "#/" + route;
	routes:
		prelim: (path)->
		# Returns False if Prelim Sets a new Route, otherwise returns routes[fn] to be called
			console.log path
			return new Promise((resolve, reject)=>
				if path == "/"
					app.setRoute("tracks")
					reject()
				if path != "login" and (!Cookies.get("user")? or !Cookies.get("token")?)
					app.setRoute("login")
					reject()
				else if path != "login" and (!app.playlists? or !app.tags? or !app.libraryEntries?)
					app.loadJamListData().then(()=>
						resolve(path)
					)
				else
					resolve(path)
			)
		login: ()->
			console.log "setting path"
			app.route = "login"
		app: ()->
			app.route = "app"
		sync: ()->
			console.log "syncing"
			app.user.deferred.then(()=>
				console.log "user resolved"
				app.syncWithService()
			)
		test: ()->
			app.route = "test"
	# !fold-children

	upsert: (type, data = {}, where = {}, force = false)->
		#TODO: Check library data against incoming data after an id match is found so we 'update' rather than 'skip'
		return new Promise((resolve, reject)=>
			if !force
				if type == "tag"
					tag = _.findWhere(@tags, where)
					if tag?
						console.log "skipped tag"
						resolve(tag)
						return
				else if type == "track"
					track = _.find(@tracks, (item)->
						for property, value of where
							if item.track[property] != value
								return false
							else
								return true
					)
					if track?
						console.log "skipped track"
						resolve(libraryEntry.track)
						return
			where.jlUser = Cookies.get("user")
			data.jlUserId = Cookies.get("user")
			@xhr(
				method: "POST"
				url: "http://#{@urlBase}:3000/api/#{type.pluralize()}/upsertWithWhere"
				data: data
				qs:
					where: where
			).then((data)=>
				resolve(data)
			)
		)
	syncWithService: (syncPlaylists = false)->
		console.log "syncWithService"
		return new Promise((resolve, reject)=>
			tracks = @portal.sendMessage({
				target: "google_music"
				fn: "getTracks"
			})
			playlists = @portal.sendMessage({
				target: "background"
				fn: "allPlaylists"
			})

			Promise.all([tracks, playlists]).then((data)=>
				console.log data
				serviceTracks = data[0].tracks
				servicePlaylists = data[1].playlists

				for track, key in serviceTracks
					do (track)=>
						if key < 3
							console.log track
							###
							if !@find("libraryEntry", (entry)-> entry.track.googleId == track[0])
								@upsertTrack(track).then((data)=>
									@add("libraryEntry", {
										playCount: track.playCount
										rating: track.rating
										trackId: data.id
									})
								)
							###
				for playlist, key in servicePlaylists
					do (playlist)=>
						if key < 2
							globalTag = {}
							console.log playlist
							Promise.resolve().then(()=>
								@upsert("tag", {name: playlist.name}, {name: playlist.name})
							).then((tag)=>
								console.log tag
								globalTag = tag
								@portal.sendMessage({
									target: "background"
									fn: "playlist"
									args:
										id: playlist.id
								})
							).then((playlistTracks)=>
								for track, key in playlistTracks
									@upsert("track", track, {title: track.title, artist: track.artist, millisduration: track.millisduration}).then((track)=>
										@xhr(
											type: "PUT"
											url: "http://#{@urlBase}:3000/api/tags/#{globalTag.id}/tracks/rel/#{track.id}"
										)
									)
							)
				resolve()
			)
			###
			.then((response)=>
				console.log googleTracks
				for track, key in googleTracks
					do (track) =>
						if key < 60
							if !@find("libraryEntry", (entry)-> entry.track.googleId == track[0])?
								console.log "upserting"
								@upsertTrack(track).then((data)=>
									console.log "#{track[22]} - #{track[23]} - #{track[1]} - #{track[3]}"
									@add("libraryEntry", {
										playCount: track[22]
										rating: track[23]
										trackId: data.id
									})
								)
				resolve()
			)
			###
		)
	loadJamListData: ()->
		#TODO user authentication
		return new Promise((resolve, reject)=>
			tracks = @xhr(
				method: "GET"
				url: "http://localhost:3000/api/jlUsers/#{Cookies.get("user")}/tracks"
				data:
					filter:
						include:
							relation: 'tags'
			)
			playlists = @xhr(
				method: "GET"
				url: "http://localhost:3000/api/jlUsers/#{Cookies.get("user")}/playlists"
				data:
					filter:
						include:
							relation: 'rules'
			)
			tags = @xhr(
				method: "GET"
				url: "http://localhost:3000/api/jlUsers/#{Cookies.get("user")}/tags"
			)
			Promise.all([tracks, playlists, tags]).then((data)=>
				console.log data
				@tracks = data[0]
				@playlists = data[1]
				@tags = data[2]
				resolve()
			)
		)

	getData: (type, id)->
		id = Number(id)
		return _.find(@[type.pluralize()], (instData)-> instData.id == id)
	getIndex: (type, id)->
		id = Number(id)
		return _.findIndex(@[type.pluralize()], (instData)-> instData.id == id)
	find: (type, data)->
		if typeof data == "object"
			return _.findWhere(@[type.pluralize()], data)
		if typeof data == "function"
			return _.find(@[type.pluralize()], data)
	setAttr: (type, id, localProp, value)->
		console.log arguments
		id = +id
		obj = @get(type, id)
		if localProp != 'id' #we don't want to change ID, both because it's not a changable prop, and because if we do, we change type and interfere with retreval
			obj[localProp] = value
			@queueData(type, id, localProp, value)
			return true
		return false
	add: (type, data)->
		@xhr(
			method: "POST"
			url: "http://#{@urlBase}:3000/api/jlUsers/#{@user.username}/#{type.pluralize()}"
			data: data
		)
	delete: (type, id)->
		if type == "case"
			caseData = @get('case', id)
			return new Promise((resolve, reject)=>
				app.xhr(
					method: "DELETE"
					url: "http://#{@urlBase}:3000/api/Cases/#{caseData.id}"
				).then((data)=>
					index = @cases.indexOf(caseData)
					@splice('cases', index, 1)
					resolve(data.response)
				)
			)
		else
			id = +id
			plType = type.pluralize()
			item = @get(type, id)
			return new Promise((resolve, reject)=>
				app.xhr(
					method: "DELETE"
					url: "http://#{@urlBase}:3000/api/#{plType.frontCap()}/#{id}"
				).then((data)=>
					@[plType] = _.without(@[plType], item)
					if item.caseId?
						caseElem = @get('case', item.caseId)
						caseElem[plType] = _.without(caseElem[plType], item)
					if @activeCase? and @activeCase.id == "#{item.caseId}"
						@activeCase[plType] = _.without(caseElem[plType], item)
						@activeCase._renderSubElements(type)
						if type == 'event'
							@activeCase.recalculate()
					resolve(data.response)
				)
		)
	addTag: (libraryEntryId, tag)->
		tagData = {}
		return new Promise((resolve, reject)=>
			@upsert("tag", {name: tag}, {name: tag}).then((tag)=>
				tagData = tag
				@xhr(
					method: "PUT"
					url: "http://#{@urlBase}:3000/api/libraryEntries/#{libraryEntryId}/tags/rel/#{tagData.id}"
				)
			).then((rel)=>
				localData = app.get("libraryEntry", libraryEntryId)
				localData.tags.push(tagData)
			)
		)
	deleteTag: (libraryEntryId, tag)->
		return new Promise((resolve, reject)=>
			@upsert("tag", {name: tag}, {name: tag}).then((tag)=>
				@xhr(
					method: "DELETE"
					url: "http://#{@urlBase}:3000/api/libraryEntries/#{libraryEntryId}/tags/rel/#{tag.id}"
				)
			).then((rel)=>
				localData = app.get("libraryEntry", libraryEntryId)
				localData.tags = _.filter(localData.tags, (tagData)->
					tagData.name != tag
				)
			)
		)
	# !fold

	#Data Sync Functions @fold
	load: ()->
		console.log "loading"
		@display.spinner()
	queueData: (type, id, localProp, value)->
		window.clearTimeout(@timeout) if @timeout?
		@queue[type.pluralize()] = {} if !@queue[type.pluralize()]?
		@queue[type.pluralize()][id] = {} if !@queue[type.pluralize()][id]?
		@queue[type.pluralize()][id][localProp] = value
		@timeout = window.setTimeout(()=>
			xhrs = []
			for typeKey, type of @queue
				for id, data of type
					xhrs.push(@xhr(
						method: "PATCH"
						url: "http://#{@urlBase}:3000/api/#{typeKey}/#{id}"
						data: @queue[typeKey][id]
					))
					delete @queue[typeKey][id]
			##Promise.all(xhrs).then()																								#todo - clear queue
		, "1000")
	xhr: (settings)->
		#make sure headers in place
		if !settings.headers?
			settings.headers = {}
		#set query string
		if settings.qs?
			settings.url = settings.url + "?" + $.param(settings.qs)
		#set login information
		if Cookies.get("token")?
			settings.headers.Authorization = Cookies.get("token")

		#error handling
		settings.statusCode =
			401: ()=>
				console.log "401 error"
				app.setRoute("login")
		$.ajax(settings)

	# !fold

	#Modal Display Functions @fold
	### Confirm Dialog
		@title - Title
		@message - Content
		@cb - Function
		@context - Object
	###
	spinner: (fn)->
		return new Promise((resolve, reject)=>
			if !@$.spinner.active
				@$["spinner-dialog"].open()
				fn().then((data)=>
					@hideSpinner() if @$.spinner.active
					resolve(data)
				).catch((e)=>
					@hideSpinner() if @$.spinner.active
					@fail("Error: #{e.msg}")
					console.log e
					reject(e)
				)
				@$.spinner.active=true
			else
				fn().then((data)=>
					resolve(data)
				).catch((e)=>
					reject(e)
				)
		)
	hideSpinner: ()->
		@$["spinner-dialog"].close()
		@$.spinner.active=false
	confirm: (args)->
		console.log args
		@$.confirmDialog.open()
		@$.confirmTitle.innerHTML = args.title if args.title?
		@$.confirmContent.innerHTML = args.message if args.message?
		$(@$.confirmButton).off()
		$(@$.confirmButton).on("click", ()=>
			args.cb(args.context)
			@$.confirmDialog.close()
		)
	fail: (msg)->
		@$.toast.text=msg
		@$.toast.toggle()
	# !fold

	#Sorting Functions @fold
	getSortProperty: (item, field)->
		fields = field.split(".")
		if fields.length > 1
			for field, key in fields
				if key != fields.length
					returnProperty = item[field]
				item = item[field]
		else
			returnProperty = item[field]
		return returnProperty
	preliminarySort: (aProp, bProp)->
		return -1 if aProp == "" or !aProp?
		return 1 if bProp == "" or !bProp?
		return -1 if aProp == "n/a"
		return 1 if bProp == "n/a"
		return null
	sortByDefault: (a, b, field)->
		aProp = @getSortProperty(a, field)
		bProp = @getSortProperty(b, field)
		return @preliminarySort(aProp, bProp) if @preliminarySort(aProp, bProp)?
		return 1 if aProp < bProp
		return -1 if aProp > bProp
		return null
	sortByDate: (a, b, field)->
		aProp = @getSortProperty(a, field)
		bProp = @getSortProperty(b, field)
		return @preliminarySort(aProp, bProp) if @preliminarySort(aProp, bProp)?
		return -1 if moment(aProp).isAfter(moment(bProp))
		return 1 if moment(aProp).isBefore(moment(bProp))
		return null
	# !fold
);
