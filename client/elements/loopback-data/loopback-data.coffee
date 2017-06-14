loopbackDataModel = {
	#@fold
	properties:
		models:
			type: Object
			value: {}
		urlRoot:
			type: String
		modelsPath:
			type: String
		patchQueue:
			type: Object
			value: {}
		createQueue:
			type: Object
			value: {}
		pendingRequests:
			type: Object
			value:
				create: {}
				update: {}
	is: "loopback-data"
	#!fold

	#@fold Init and misc.
	ready: ()->
		window.data = @
	load: ()-> #Get Data From Server
		#we only want to operate on "model" properties, filter the others out
		models = {}
		for key, property of @properties
			if property.model
				models[key] = property
				@_addComplexObserverEffect("observerFunction(#{key}.*)")

		#operate on "model" by importing the loobpack json, loading the model data and then creating the links
		_$.allForPromise(models, (property, key)=>
			ret = {
				model: key
				property: property
			}
			$.getJSON("#{@modelsPath}/#{key.pluralize(false)}.json").then((data)=>
				ret.json = data
				url = @buildUrl(ret)
				filter = @requestFilter(ret)
				if ret.property.relations?
					filter.include = []
					for relation in ret.property.relations
						filter.include.push({
							relation: relation
							scope:
								fields: ['id']
						})
				filter = {filter: filter}
				url += "?" + $.param(filter) if filter?
				@xhr(
					method: "GET"
					url: url
					headers: @buildHeader()
				)
			).then((data)=>
				ret.data = data
				return ret
			)
		).then((models)=>
			for model in models
				console.log "creating #{model.model}"
				@[model.model.pluralize()] = model.data
				@models[model.model] = model
			# loop our queried models
			for model in models
				#loop the relaitonships of this model
				for relationKey, relationDefinition of model.json.relations
					#did we get data from this relationship?
					if model.data[0]? and model.data[0][relationKey]? #throws error when there is no model data
						#loop through the data in this model
						for modelData, modelKey in model.data
							#loop through the individual relationships for the model
							for relationData, relationIndex in modelData[relationKey]
								modelData[relationKey][relationIndex] = @getById(relationKey.pluralize(), relationData.id)
		)
	#These should be overwritten by user, if not, empty value returned
	requestFilter: ()->
		return {}
	buildURL: ()->
		return ""
	buildHeader: ()->
		return {}
	#!fold

	### @fold Getters
		Key: Polymer Unique Array Key
		Id: SQL ID / loopback ID
		Index: native array index
	###
	getByProperties: (model, properties)->
		_$.falsifyUndefined(_.findWhere(@[model.pluralize()], properties))
	getById: (model, id)->
		_$.falsifyUndefined(_.find(@[model.pluralize()], (instData)->
			_$.intEqual(instData.id, id)
		))
	getByPolymerKey: (model, key)->
		_$.falsifyUndefined(@get("#{model}.#{key}"))
	getIndexById: (model, id)->
		_$.falsifyUndefined(@[model.pluralize()].indexOf(@getById(model, id)))
	getIdByPolymerKey: (model, key)->
		_$.falsifyUndefined(@getByPolymerKey(model, key).id)
	#!fold

	# @fold-children Relations
	### Links two model instances
		side:
			type (String)
			id (int)
	###
	link: (sideA, sideB)->
		#load necessary additional data
		aData = @getById(sideA.model, sideA.id)
		bData = @getById(sideB.model, sideB.id)
		definitionA = @models[sideA.model.pluralize()]
		relation = definitionA.json.relations[sideB.model.pluralize()] || definitionA.json.relations[sideB.model.pluralize(false)]
		linked = false #for check if these items are already linked
		#deterine what kind of link we have prior to operation
		if relation.type == "hasAndBelongsToMany"
			#Determine if these models are already linked
			for key, entry of aData[sideB.model.pluralize()]
				linked = true if _$.intEqual(entry.id, sideB.id)
			for key, entry of bData[sideA.model.pluralize()]
				linked = true if _$.intEqual(entry.id, sideA.id)
			#Link the Items
			if !linked
				return @xhr(
					method: "PUT"
					url: "http://localhost:3000/api/#{sideA.model.pluralize()}/#{sideA.id}/#{sideB.model.pluralize()}/rel/#{sideB.id}"
					headers: @buildHeader()
				).then((data)=>
					@push("#{sideA.model.pluralize()}.#{@getIndexById(sideA.model, sideA.id)}.#{sideB.model.pluralize()}", bData)
					@push("#{sideB.model.pluralize()}.#{@getIndexById(sideB.model, sideB.id)}.#{sideA.model.pluralize()}", aData)
				)
		if relation.type == "hasMany"
			#We process has / belongs relationships with the belongs on the A side, so switch if not
			console.log "hasMany"
			sideA = swap
			sideA = sideB
			sideB = swap
		if relation.type == "belongsTo"
			console.log "belongsTo"
			if aData[sideB.model] == bData
				linked = true
			if !linked
				return @xhr(
					method: "PATCH"
					url: "http://localhost:3000/api/#{sideA.model.pluralize()}/#{sideA.id}"
					headers: @buildHeader()
					data:
						"#{sideB.model}Id": sideB.id
				).then((data)=>
					@push("#{sideB.model.pluralize()}.#{@getIndexById(sideB.model, sideB.id)}.#{sideA.model.pluralize()}", aData)
					@set("#{sideA.model.pluralize()}.#{@getIndexById(sideA.model, sideA.id)}.#{sideB.model}", bData)
				)
		return Promise.resolve()
		#
	#!fold-children

	observerFunction: (changeEntry)->
		# is Enabled is a method set in the extension class to disable/enable the observer if we want to make unobserved changes
		if @isEnabled()
			path = changeEntry.path.split(".")
			model = @models[path[0]]
			key = path[1]
			property = path[2]
			if path.length > 2 and !model.json.relations[property]? and !Array.isArray(changeEntry.value)
				@patchQueueData(path[0], path[1], path[2], changeEntry.value)

	#@fold XHR
	findOrCreate: (model, data)->
		return new Promise((resolve, reject)=>
			#make sure we have something to check for
			if data?
				#is there a local instance matching all the data properties?
				if localData = @getByProperties(model, data)
					if localData.promise?
						localData.promise.then(()=>
							resolve(localData)
						)
					else
						resolve(localData)
					return
				#create a new instance with the data
				else
					@create(model, data).then((data)->
						resolve(data)
					)
			else
				reject("No Data to Check Against!")
		)
	create: (model, data)->
		# CREATE THE MODEL LOCALLY WITH A PROMISE TO REPRESENT THE FACT THAT ITS PENDING WITH SERVER

		promise = @bulkCreate(model, data).then((data)=>
			#need to create a base for new relations to be added to
			for relation in @models[model.pluralize()].property.relations
				localModel[relation] = [] if relation.type != "belongsTo"
			localModel.id = data.id
			localModel.promise = null
			return localModel
		)

		localModel = _.extend(data, {
			promise: promise
		})
		@push("#{model.pluralize()}", localModel)

		return localModel.promise

	bulkCreate: (model, data)->
		# MAKE PROMISE REPRESENTING COMPLETED SERVER CALL
		outsideResolve = false; outsideReject = false;
		promise = new Promise((resolve, reject)=>
			outsideResolve = resolve
			outsideReject = reject
		)

		# Push the data and the promise into the queue, send the index of the promise so that we
		# can resolve on return
		@pendingRequests.create[model] = {data: [], promises: []} if !@pendingRequests.create[model]
		index = @pendingRequests.create[model].data.push(data) - 1
		@pendingRequests.create[model].data[index].promiseIndex = index
		@pendingRequests.create[model].promises[index] = {promise: promise, resolve: outsideResolve, reject: outsideReject}

		# We want to pass our data into a scope to preserve it, because once we send it, the queue
		# is deleted to prevent double send and won't be available at callback
		sendData = (queue)=>
			for model of queue
				console.log model
				@xhr(
					method: "POST"
					url: @buildUrl(@models[model.pluralize()])
					headers: @buildHeader(@models[model.pluralize()])
					data: JSON.stringify(queue[model].data)
					contentType: "application/json"
				).then((data)=>
					for modelInstance in data
						promiseIndex = modelInstance.promiseIndex
						modelInstance.promiseIndex = null
						queue[model].promises[promiseIndex].resolve(modelInstance)
					return
				)
			return

		# Now we need to decide if the queue should be passed into the scope by timeout
		# or by hitting the maximum # of models
		@createTimeout = window.setTimeout(()=>
			sendData(@pendingRequests.create)
			@pendingRequests.create = []
		, "500")
		#Don't wait for the timeout if our queue is getting full
		if @pendingRequests.create[model].data.length > 250
			sendData(@pendingRequests.create)
			@pendingRequests.create = []
			window.clearTimeout(@createTimeout) if @createTimeout?

		#Return our promise whichh will resolve once this model comes back from server
		return promise

	bulkUpdate: (model, data)->
		console.log "bulk Update"

	patchQueueData: (model, key, localProp, value)->
		console.log("queueing Data")
		console.log(arguments)
		window.clearTimeout(@patchTimeout) if @patchTimeout?
		@patchQueue[key] = {} if !@patchQueue[key]?
		@patchQueue[key][localProp] = value
		@patchTimeout = window.setTimeout(()=>
			xhrs = []
			for key, data of @patchQueue
				@xhr(
					method: "PATCH"
					url: "http://#{@urlRoot}/#{model}/#{@getIdByPolymerKey(model, key)}"
					data: @patchQueue[key]
					headers: @buildHeader()
				).then((data)=>
					delete @patchQueue[key]
				).catch((error)=>
					throw error
				)
		, "1000")
	xhr: (settings)->
		console.log "xhr"
		#make sure headers in place
		if !settings.headers?
			settings.headers = {}
		#set query string
		if settings.qs?
			settings.url = settings.url + "?" + $.param(settings.qs)
		#set login information
		#if Cookies.get("token")?
		#	settings.headers.Authorization = Cookies.get("token")

		#error handling
		settings.statusCode =
			401: ()=>
				@fire("401")
		$.ajax(settings)
	#!fold

}

constructor = Polymer(_$.deepSafeExtend(loopbackDataModel, {
	#@fold
	properties:
		tracks:
			notify: true
			model: true
			relations: ['tags']
		tags:
			type: Array
			notify: true
			model: true
			relations: ['tracks']
		playlists:
			type: Array
			notify: true
			model: true
			relations: ['rules']
		rules:
			type: Array
			notify: true
			model: true
			relations: ['playlist']
	#!fold

	#@fold
	requestFilter: (definition)->
		return {}
	buildUrl: (definition)->
		return "http://localhost:3000/api/jlUsers/#{app.user.jamlist.username}/#{definition.model.pluralize()}"
	buildHeader: (definition)->
		return {
			Authorization: app.user.jamlist.token
		}
	isEnabled: ()->
		if app.status == "syncWithService"
			return false
		return true
	syncWithService: ()->
		console.log "starting sync"
		t0 = performance.now()
		# Need to create a seperate data structure during sync to prevent changes from live updating until all data is cocmplete
		syncedData = new constructor()
		syncedData.tracks = @tracks
		syncedData.tags = @tags

		app.status = "syncWithService"
		return app.portal.sendMessage({
			target: "google_music"
			fn: "getTracks"
		}).then((serviceTracks)=>
			return _$.allForPromise(serviceTracks.tracks, (track, key)=>
				return syncedData.findOrCreate("track", {
					title: track.title,
					artist: track.artist,
					album: track.album,
					playCount: track.playCount,
					rating: track.rating,
					googleId: track.googleId,
					albumArtLink: track.albumArtLink
				})
			)
		).then(()=>
			playlists = app.portal.sendMessage({
				target: "background"
				fn: "allPlaylists"
			})
		).then((servicePlaylists)=>
			return _$.allForPromise(servicePlaylists.playlists, (playlist, key)=>
				tag = syncedData.findOrCreate("tag", {name: playlist.name})
				tracks = app.portal.sendMessage({
					target: "background"
					fn: "playlist"
					args:
						id: playlist.id
				})
				return Promise.all([tag, tracks]).then((data)=>
					tag = data[0]
					tracks = data[1]
					trackIds = []
					_$.allForPromise(tracks, (track, key)=>
						syncedData.findOrCreate("track", {
							title: track.title,
							artist: track.artist,
							album: track.album,
							playCount: track.playCount,
							rating: track.rating,
							googleId: track.googleId,
							albumArtLink: track.albumArtLink
						}).then((track)=>
							## Don't use the 'lin' method of loopback-data because we want to batch the calls for efficiency
							#load necessary additional data
							linked = false #for check if these items are already linked
							#Determine if these models are already linked
							for key, entry of track.tags
								linked = true if _$.intEqual(entry.id, track.id)
							for key, entry of tag.tracks
								linked = true if _$.intEqual(entry.id, tag.id)
							#Link the Items, if not linked
							if !linked
								@push("tracks.#{@getIndexById("track", track.id)}.tags", tag)
								@push("tags.#{@getIndexById("tag", tag.id)}.tracks", track)
								trackIds.push(track.id)
							return
						)
					).then(()=>
						@xhr(
							method: "POST"
							url: "http://localhost:3000/api/tags/#{tag.id}/tracks/linkById"
							headers: @buildHeader()
							data:
								tracks: trackIds
						)
					)
				).catch((e)=>
					app.fail(e)
				)

			)
		).then(()=>
			console.log "complete"
			@set("tracks", syncedData.tracks)
			@set("tags", syncedData.tags)
			console.log "set done"
			console.log performance.now() - t0
		)
	is: "jamlist-data"
	#!fold
}))
