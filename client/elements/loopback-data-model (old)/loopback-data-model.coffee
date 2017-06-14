Polymer({
	is: "loopback-data-model"
	properties:
		data:
			type: Object
			notify: true
		fields:
			type: Array
		filter:
			computed: 'computeFilter(where, include)'Array[19]
		hasMany:
			type: Array
		hasBelongsMany:
			type: Array
		include:
			type: Object
			value: ""
		relations:
			type: Object
			value: "{}"
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
	getIndexOfChildByFk: (relation, id, fk)->
		return _.find(@)
	#!fold

	#@fold Data Manipulators
	addRelatedByFk: (relation, id, fk)->
		index = @getIndexById(id)
		relation = relations[relation]
		if relation.type == "hasBelongs"
			return @xhr(
				method: "PUT"
				url: "http://#{@urlRoot}/#{@model}/#{id}/#{relation}/rel/#{fk}"
			).then((data)=>
				@push("data.#{index}.#{relation.key}", data)
			).catch((error)=>
				throw error
			)
		else if relation.type == "has"
			return @xhr(
				method: "PUT"
				url: "http://#{@urlRoot}/#{@model}/#{id}/#{relation}/#{fk}"
			).then((data)=>
				@push("data.#{index}.#{relation.key}", data)
				relation.element.push("data", data)
			).catch((error)=>
				throw error
			)
		else if relation.type == "belongs"
			return Promise.resolve().then(()=>
				throw "ERROR: Can't add an entry on the belongs side of a relaitonship."
			)
		else
			return Promise.resolve().then(()=>
				throw "ERROR: Can't find relationship '#{relation}'."
			)
	createRelated: (relation, id, data)->
		index = @getIndexById(id)
		relation = relations[relation]
		if relation.type == "hasBelongs"
			return @xhr(
				method: "PUT"
				url: "http://#{@urlRoot}/#{@model}/#{id}/#{relation}/rel/#{fk}"
			).then((data)=>
				@push("data.#{index}.#{relation.key}", data)
			).catch((error)=>
				throw error
			)
		else if relation.type == "has"
			return @xhr(
				method: "PUT"
				url: "http://#{@urlRoot}/#{@model}/#{id}/#{relation}/#{fk}"
			).then((data)=>
				@push("data.#{index}.#{relation.key}", data)
				relation.element.push("data", data)
			).catch((error)=>
				throw error
			)
		else if relation.type == "belongs"
			return Promise.resolve().then(()=>
				throw "ERROR: Can't add an entry on the belongs side of a relaitonship."
			)
		else
			return Promise.resolve().then(()=>
				throw "ERROR: Can't find relationship '#{relation}'."
			)
	deleteRelated: (relation, id, fk)->
		if @hasBelongsMany.indexOf(relation.pluralize()) > -1
			url = "http://#{@urlRoot}/#{@model}/#{id}/#{relation.pluralize()}/rel/#{fk}"
		else
			url = "http://#{@urlRoot}/#{@model}/#{id}/#{relation.pluralize()}/#{fk}"
		@xhr(
			method: "DELETE"
			url: url
		).then((data)=>
			instanceId = @getIndexById(id)
			instance = @data[instanceId]
			console.log instanceId
			console.log instance
			toBeRemoved = _.find(instance[relation], (instData)-> _$.intEqual(instData.id, fk))
			console.log toBeRemoved
			index = instance[relation].indexOf(toBeRemoved)
			console.log index
			@splice("data.#{@getIndexById(id)}.#{relation}", index, 1)
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

Polymer({
	is: "loopback-has-relation"
	ready: ()->
		console.log @elements
		parent = document.getElementById(@parent.id)
		child = document.getElementById(@child.id)
		parent.relations[@parent.key] = {key: @parent.key, type: "has", element: child}
		child.relations[@child.key] = {key: @child.key, type: "belongs", element: parent}
})

Polymer({
	properties:
		elements:
			type: Array
			notify: true
	is: "loopback-has-belongs-relation"
	ready: ()->
		console.log "HAS BELONGS"
		console.log @elements
		###
		el1 = document.getElementById(sources[0].id)
		el2 = document.getElementById(sources[1].id)
		el1.relations[sources[0].key] = {key: @el1Zzz.key, type: "hasBelongs", element: el2}
		el2.relations[sources[1].key] = {key: @el2.key, type: "hasBelongs", element: el1}
		###
})
