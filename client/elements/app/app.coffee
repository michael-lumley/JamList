window.elements = {} if !window.elements?

window.elements.app = Polymer(
	is: "jamlist-app"
	# Polymer Inits @fold-children
	properties:
		#Set to true when message recieved from Play Music that a user has been loaded into the app
		playerActive:
			type: Boolean
			value: false
		serviceActive:
			type: Boolean
			value: false
		libraryEntries:
			type: Array
		playlists:
			type: Array
		tags:
			type: Array
		user:
			type: Object
			notify: true
			value: ()->
				return {google: {}, jamlist: {}}
		urlBase:
			type: "string"
		tokens:
			type: Array
	listeners:
		'close-case': 'closeCase'
	# !fold

	portal: new pluginPortals.ClientPortal("application", {
		# Plugin FNs @fold
		beforeSend: (args = {}) =>
			glogger("last").add args
			if app?
				console.log app
				if app.__data__?
					console.log app.__data__
					args.user = app.user.google
			return args
		#!fold
	})

	# Lifecycle Functions @fold
	created: ()->
		console.log "creating app"
		window.app = @
		@urlBase = "localhost"
		@tokens = []
		console.log "sending message"
		@portal.sendMessage({
			target: "google_music"
			fn: "userInfo"
			args: {}
		}).then((response)=>
			#TODO: What if no user yet?
			@user.google = response.user
		)
	ready: ()->
		console.log("ready")
	attached: ()->									# Page JS Setup, Plugin Listener Creation
		console.log "attached"
		@routerSetup()
		if !app.tokens[app.user.email]?
			@setRoute("login")
	# !fold

	#Router @fold
	router: ()->
		url = location.hash.slice(1) || '/';
		if @routes[url.substr(1)]?
			@routes[url.substr(1)].bind(@)()
	routerSetup: ()->
		@routes = {
			"login": ()->
				@display.login.bind(@)()
			"tracks": ()->
				@display.trackList.bind(@)()
		}
		window.addEventListener('hashchange', @router.bind(@))
		window.addEventListener('load', @router.bind(@))
		@router()
	setRoute: (route)->
		window.location.hash = "#/" + route;

	upsert: (type, data = {}, where = {})->
		if type != "track"
			where.jlUser = @user.jamlist.username
			data.jlUserId = @user.jamlist.username
		@xhr(
			method: "POST"
			url: "http://#{@urlBase}:3000/api/#{type.pluralize()}/upsertWithWhere"
			data: data
			qs:
				where: where
		)
	syncWithService: ()->
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
						if key < 3
							globalTag = {}
							console.log playlist
							Promise.resolve().then(()=>
								@upsert("tag", {name: playlist.name}, {name: playlist.name})
							).then((tag)=>
								globalTag = tag
								@portal.sendMessage({
									target: "background"
									fn: "playlist"
									args:
										id: playlist.id
								})
							).then((playlistEntries)=>
								console.log playlistEntries
								for track, key in playlistEntries
									console.log track
									@upsert("track", track, {title: track.title, artist: track.artist, millisduration: track.millisduration}).then((track)=>
										id = track.id
										track.trackId = id
										delete track.id
										@upsert("libraryEntry", track, {trackId: id})
									).then((libraryEntry)=>
										@xhr(
											type: "PUT"
											url: "http://localhost:3000/api/tags/#{globalTag.id}/libraryEntries/rel/#{libraryEntry.id}"
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
			libraryEntries = @xhr(
				method: "GET"
				url: "http://localhost:3000/api/jlUsers/#{@user.jamlist.username}/libraryEntries"
				data:
					filter:
						include: ['track', 'tags'] 
			)
			playlists = @xhr(
				method: "GET"
				url: "http://localhost:3000/api/jlUsers/#{@user.jamlist.username}/playlists"
				data:
					filter:
						include:
							relation: 'rules'
			)
			tags = @xhr(
				method: "GET"
				url: "http://localhost:3000/api/jlUsers/#{@user.jamlist.username}/playlists"
			)
			Promise.all([libraryEntries, playlists, tags]).then((data)=>
				console.log data
				@libraryEntries = data[0]
				@playlists = data[1]
				@tags = data[2]
				resolve()
			)
		)

	get: (type, id)->
		id = +id
		return _.find(@[type.pluralize()], (instData)-> instData.id == id)
	find: (type, data)->
		if typeof data == "object"
			return _.findWhere(@[type.pluralize()], data)
		if typeof data == "function"
			return _.find(@[type.pluralize()], data)
	setAttr: (type, id, localProp, value)->
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
	# !fold

	#Data Sync Functions @fold
	load: ()->
		console.log "loading"
		@displaySpinner()
	queueData: (type, id, localProp, value)->
		calcedVars = {																															#todo - don't send calked vars
			case: ["nextOn", "onFor", "thirtyThirty", "thirtyThirtyNextDate"]
		}
		window.clearTimeout(@timeout) if @timeout?
		@queue[type.pluralize()][id] = {} if !@queue[type.pluralize()][id]?
		@queue[type.pluralize()][id][localProp] = value
		@timeout = window.setTimeout(()=>
			xhrs = []
			for typeKey, type of @queue
				for id, data of type
					xhrs.push(@xhr(
						method: "PUT"
						url: "http://#{@urlBase}:3000/api/#{typeKey.frontCap()}/#{id}"
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
			console.log settings.qs
			console.log JSON.stringify(settings.qs)
			settings.url = settings.url + "?" + $.param(settings.qs)
		#set login information
		if Cookies.get("token")?
			settings.headers.Authorization = Cookies.get("token")
		return $.ajax(settings)
	# !fold

	#User Management Functions @fold
	login: (username, password)->
		@user.jamlist.username = username
		@displaySpinner()
		@xhr(
			method: "POST"
			url: "http://#{@urlBase}:3000/api/JLUsers/login"
			data:
				username: username
				password: password
		).then((data)=>
			# TODO: failure handling
			console.log data
			###
			if data.xhr.status == 401
				@fail("Incorrect or unknown username/password!")
				return
			###
			Cookies.set("token", data.id)
			Cookies.set("user", data.userId)
			#@syncFromService()
			@loadJamListData().then((data)=>
				console.log(@libraryEntries)
				console.log(@playlists)
				@syncWithService()
			).then((data)=>
				@setRoute("tracks")
				@hideSpinner()
			).catch((error)=>
				console.log error
			)
		)
	logout: ()->
		@xhr({method: "POST", url: "http://#{@urlBase}:3000/api/DAUsers/login"}).then((response, xhr)->
			Cookies.remove("token")
			Cookies.remove("user")
			page("/login")
		)
	# !fold

	#Main Display Functions @fold
	display:
		prelim: ()->
			while @$.display.firstChild?
				@$.display.removeChild(@$.display.firstChild)
		login: (firstArg)->
			@display.prelim.bind(@)()
			login = new elements.login()
			@$.display.appendChild(login)
		trackList: ()->
			@display.prelim.bind(@)()
			trackList = new elements.trackList()
			@$.display.appendChild(trackList)
	# !fold

	#Aux Display Functions
	displaySpinner: ()->
		@$["spinner-dialog"].open()
		@$.spinner.active=true
	hideSpinner: ()->
		@$["spinner-dialog"].close()
		@$.spinner.active=false
	# !fold

	#Modal Display Functions @fold
	### Confirm Dialog
		@title - Title
		@message - Content
		@cb - Function
		@context - Object
	###
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
		@$.errorDialog.open()
		console.log @$
		@$.message.innerHTML = msg
		window.setTimeout(()=>
			@$.errorDialog.close()
		, "10000")
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
