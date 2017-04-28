Polymer({
	is: "loopback-data-model"
	properties:
		data:
			type: Object
			notify: true
		fields:
			type: Array
		filter:
			computed: 'computeFilter(where, include)'
		hasMany:
			type: Array
		hasBelongsMany:
			type: Array
		include:
			type: Object
			value: ""
		queue:
			type: Array
			value: []
		urlRoot:
			type: String
		model:
			type: String
		url:
			computed: 'computeUrl(urlRoot, model, filter)'
		where:
			type: Object
			value: ""
	observers: [
		"fieldChanged(data.*)"
	]
	###
		Key: Polymer Unique Array Key
		ID: SQL ID / loopback ID
		index: native array index
	###

	#@fold Polymer FNS and Init.
	ready: ()->
		console.log "ready"
	handleResponse: (e)->
		console.log @data
	fieldChanged: (changeEntry)->
		console.log changeEntry
		path = changeEntry.path.split(".")
		if path[2]? and path.length < 4
			@queueData(path[1], path[2], changeEntry.value)
	#!fold

	#@fold Variable Computers
	computeFilter: (where, include)->
		ret = {
			where: where if where?
			include: include if include?
		}
		console.log ret
		return ret
	computeUrl: (urlRoot, model, filter)->
		console.log "computing"
		return "http://#{urlRoot}/#{model}?filter=#{JSON.stringify(filter)}"
	#!fold

	#@fold Data Accessors
	getItemById: (id)->
		return _.find(@data, (instData)-> console.log(instData); console.log instData.id == id; _$.intEqual(instData.id, id))
	getItemByPolymerKey: (key)->
		return @get("data.#{key}")
	getIndexById: (id)->
		return @data.indexOf(@getItemById(id))
	getIdByPolymerKey: (key)->
		console.log key
		console.log @getItemByPolymerKey(key)
		return @getItemByPolymerKey(key).id
	#!fold

	#@fold Data Manipulatorsd
	addRelated: (relation, id, fk, data)->
		console.log "ADDING RELATED"
		console.log data
		index = @getIndexById(id)

		if @hasBelongsMany.indexOf(relation.pluralize()) > -1
			@xhr(
				method: "PUT"
				url: "http://#{@urlRoot}/#{@model}/#{id}/#{relation.pluralize()}/rel/#{fk}"
			).then((data)=>
				@push("data.#{index}.#{relation.pluralize()}", data)
			).catch((error)=>
				throw error
			)
		else
			@push("data.#{index}.#{relation.pluralize()}", data)
	deleteRelated: (relation, id, fk)->
		if @hasBelongsMany.indexOf(relation.pluralize()) > -1
			url = "http://#{@urlRoot}/#{@model}/#{id}/#{relation.pluralize()}/rel/#{fk}"
		else
			url = "http://#{@urlRoot}/#{@model}/#{id}/#{relation.pluralize()}/#{fk}"
		@xhr(
			method: "DELETE"
			url: url
		).then((data)=>
			instanceArray = @data[@getIndexById(id)][relation.pluralize()]
			index = instanceArray.indexOf(_.find(instanceArray, (instData)-> _$.intEqual(instData.id, fk)))
			@splice("data.#{[get]}#{relation}", index, 1)
		).catch((error)=>
			throw error
		)
	add: (data)->
		@xhr(
			method: "POST"
			url: "http://#{@urlRoot}/#{@model}/"
			data: data
		).then((data)=>
			@push("data", data)
			return data
		).catch((error)=>
			throw error
		)
	deleteById: (id)->
		@xhr(
			method: "DELETE"
			url: "http://#{@urlRoot}/#{@model}/#{id}/"
		).then((data)=>
			index = @getIndexById(id)
			@splice('data', index, 1)
		).catch((error)=>
			throw error
		)
	#!fold

	#@fold XHR
	queueData: (key, localProp, value)->
		window.clearTimeout(@timeout) if @timeout?
		@queue[key] = {} if !@queue[key]?
		@queue[key][localProp] = value
		@timeout = window.setTimeout(()=>
			xhrs = []
			for key, data of @queue
				@xhr(
					method: "PATCH"
					url: "http://#{@urlRoot}/#{@model}/#{@getIdByPolymerKey(key)}"
					data: @queue[key]
				).then((data)=>
					delete @queue[key]
				).catch((error)=>
					throw error
				)
		, "1000")
	xhr: (settings)->
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
				console.log "401 error"
				app.setRoute("login")
		$.ajax(settings)
	#!fold

})
