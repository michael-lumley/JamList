Polymer({
	is: "loopback-data-source"
	properties:
		data:
			type: Object
			notify: true
		fields:
			type: Array
		filter:
			computed: 'computeFilter(where, include)'
		include:
			type: Object
			value: ""
		queue:
			type: Array
			value: []
		urlRoot:
			type: String
		urlBase:
			type: String
		url:
			computed: 'computeUrl(urlRoot, urlBase, filter)'
		where:
			type: Object
			value: ""
	observers: [
		"fieldChanged(data.*)"
	]

	#@fold Polymer FNS and Init.
	ready: ()->
		console.log "ready"
	handleResponse: (e)->
		console.log @data
	fieldChanged: (changeEntry)->
		console.log changeEntry
		path = changeEntry.path.split(".")
		console.log path
		if path[2]? and path.length < 4
			@queueData(@getIdByPolymerKey(path[1]), path[2], changeEntry.value)
	#!fold

	#@fold Variable Computers
	computeFilter: (where, include)->
		ret = {
			where: where if where?
			include: include if include?
		}
		console.log ret
		return ret
	computeUrl: (urlRoot, urlBase, filter)->
		console.log "computing"
		return "http://#{urlRoot}/#{urlBase}?filter=#{JSON.stringify(filter)}"
	#!fold

	#@fold Data Accessors
	getItemBySQLId: (id)->
		return _.find(@data, (instData)-> instData.id == id)
	getItemByPolymerKey: (key)->
		return @get("data.#{key}")
	getIndexBySQLId: (id)->
		return @data.indexOf(@getItemBySId(id))
	getIdByPolymerKey: (key)->
		console.log key
		console.log @getItemByPolymerKey(key)
		return @getItemByPolymerKey(key).id
	#!fold

	#@fold Data Manipulators
	addRelated: (relation, id, fk)->
		@xhr(
			method: "PUT"
			url: "http://#{@urlRoot}/#{@urlBase}/#{id}/#{relation}/#{fk}"
		).catch((error)=>
			throw error
		)
	deleteRelated: (relation, id, fk)->
		@xhr(
			method: "DELETE"
			url: "http://#{@urlRoot}/#{@urlBase}/#{id}/#{relation}/#{fk}"
		).catch((error)=>
			throw error
		)
	add: (data)->
		@xhr(
			method: "POST"
			url: "http://#{@urlRoot}/#{@urlBase}/"
			data: data
		).catch((error)=>
			throw error
		)
	deleteById: (id)->
		@xhr(
			method: "DELETE"
			url: "http://#{@urlRoot}/#{@urlBase}/#{id}/#{relation}/#{fk}"
		).catch((error)=>
			throw error
		)
	#!fold

	#@fold XHR
	queueData: (id, localProp, value)->
		window.clearTimeout(@timeout) if @timeout?
		@queue[id] = {} if !@queue[id]?
		@queue[id][localProp] = value
		@timeout = window.setTimeout(()=>
			xhrs = []
			for id, data of @queue
				@xhr(
					method: "PATCH"
					url: "http://#{@urlRoot}/#{@urlBase}/#{id}"
					data: @queue[id]
				).then((data)=>
					delete @queue[id]
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
