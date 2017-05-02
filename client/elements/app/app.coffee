window.elements = {} if !window.elements?

window.elements.app = Polymer(
	is: "jamlist-app"
	# Polymer Inits @fold-children
	properties:
		path:
			type: String
			notify: true
		playlists:
			type: Array
			notify: true
		queue:
			type: Object
			value: {}
		rules:
			type: Array
			notify: true
		status: # A string used to determine the status of the app (used by loopback-data to disable live syncing)
			type: String
			notify: true
			value: "active"
		tags:
			type: Array
			notify: true
		tracks:
			type: Array
			notify: true
		user:
			type: Object
			notify: true
			value: ()->
				###
					Google: The Google user's info
						email:
						id:
						obfid:
						tier:
						xt:
					Jamlist:
						user:
						password:
						token:
					Deferred: resolved when Google User is Loaded
				###
				return {google: {}, jamlist: {}, deferred: $.Deferred()}
	observers: [
		'pathChange(path)'
	]
	# !fold
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
	ready: ()->
		# Bind to the window and to the data element
		window.app = @
		@data = @$.data

		#Bind path to url hash (in combo with pathChagne Observer)
		window.addEventListener('hashchange', (hash)=>
			@path = location.hash.substring(2)
		)
		@path = location.hash.substring(2)

		#Get Google Login
		@portal.sendMessage({
			target: "google_music"
			fn: "userInfo"
			args: {}
		}).then((response)=>
			console.log response
			@user.google = response.user
			@user.deferred.resolve()
		)

		#Import User Data from Cookies
		@set("user.jamlist.username", Cookies.get("user"))
		@set("user.jamlist.token", Cookies.get("token"))

		#Listen for Data Events
		@data.addEventListener("401", ()=>
			@fail("You need to login!")
			@path = "login"
		)
	# !fold

	#User Management Functions @fold
	login: ()->
		@spinner(()=>
			@xhr(
				method: "POST"
				url: "http://localhost:3000/api/JLUsers/login"
				data:
					username: @user.jamlist.username
					password: @user.jamlist.password
			).then((data)=>
				Cookies.set("token", data.id)
				Cookies.set("user", data.userId)
				@user.jamlist.token = data.id
				@data.load()
				@set("path", "tracks")
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
	pathChange: (path)->
		window.location.hash = "#/" + path
	# !fold-children

	#@fold
	syncWithService: (syncPlaylists = false)->
		console.log "starting sync"
		ops = [] #an array for all async operations needed to complete sync. When done, resolve promise
		@status = "syncWithService"
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
				###
				for track, key in serviceTracks
					do (track)=>
						if key < 3
							console.log track
				###
				_$.forPromise(servicePlaylists, (playlist, key)=>
					return new Promise((resolve, reject)=>
						if key < 999
							do (playlist)=>
								tag = @data.findOrCreate("tag", {name: playlist.name})
								tracks = @portal.sendMessage({
									target: "background"
									fn: "playlist"
									args:
										id: playlist.id
								})
								Promise.all([tag, tracks]).then((data)=>
									tag = data[0]
									tracks = data[1]
									_$.allForPromise(tracks, (track, key)=>
										@data.findOrCreate("track", {
											title: track.title,
											artist: track.artist,
											album: track.album,
											millisduration: track.millisduration
										}).then((track)=>
											@data.link({
												model: "tag"
												id: tag.id
											},{
												model: "track"
												id: track.id
											})
										)
									).then(()=>
										resolve()
									)
								).catch((error)=>
									@fail(error)
									resolve()
								)
					)
				)
			).then((data)=>
				app.status = "active"
				resolve()
			)
		)
	loadJamListData: ()->
		#TODO user authentication
		###
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
		###

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
		console.log fn
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
