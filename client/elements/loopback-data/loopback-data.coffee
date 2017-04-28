console.log querystring

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
		data:
			type: Object
			notify: true
			value: {}
		queue:
			type: Object
			value: {}
	is: "loopback-data"
	#!fold

	#@fold Init and misc.
	ready: ()->
		window.data = @
		@load()
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
				@[model.model.pluralize()] = model.data
				@models[model.model] = model
			# loop our queried models
			for model in models
				#loop the relaitonships of this model
				for relationKey, relationDefinition of model.json.relations
					#did we get data from this relationship?
					if model.data[0][relationKey]?
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
		console.log model.pluralize()
		console.log _.findWhere(@[model.pluralize()], properties)
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

	### @fold Relations

	###
	link: (sideA, sideB)->
		definitionA = @models[sideA.model.pluralize()]
		relation = definitionA.json.relations[sideB.model.pluralize()] || definitionA.json.relations[sideB.model.pluralize(false)]
		if relation.type == "hasAndBelongsToMany"
			return @xhr(
				method: "PUT"
				url: "http://localhost:3000/api/#{sideA.model.pluralize()}/#{sideA.id}/#{sideB.model.pluralize()}/rel/#{sideB.id}"
				headers: @buildHeader()
			).then((data)=>
				@push("#{sideA.model.pluralize()}.#{@getIndexById(sideA.model, sideA.id)}.#{sideB.model.pluralize()}", @getById(sideB.model, sideB.id))
				@push("#{sideB.model.pluralize()}.#{@getIndexById(sideB.model, sideB.id)}.#{sideA.model.pluralize()}", @getById(sideA.model, sideA.id))
			)
		#We process has / belongs relationships with the belongs on the A side, so switch if not
		if relation.type == "hasMany"
			sideA = swap
			sideA = sideB
			sideB = swap
		if relation.type == "belongsTo"
			return @xhr(
				method: "PATCH"
				url: "http://localhost:3000/api/#{sideA.model.pluralize()}/#{sideA.id}"
				headers: @buildHeader()
				data:
					"#{sideB.model}Id": sideB.id
			).then((data)=>
				console.log sideA
				console.log sideB
				@push("#{sideB.model.pluralize()}.#{@getIndexById(sideB.model, sideB.id)}.#{sideA.model.pluralize()}", @getById(sideA.model, sideA.id))
				@set("#{sideA.model.pluralize()}.#{@getIndexById(sideA.model, sideA.id)}.#{sideB.model.pluralize()}", @getById(sideB.model, sideB.id))
				console.log @[sideA.model.pluralize()][@getIndexById(sideA.model, sideA.id)]
				console.log @[sideB.model.pluralize()][@getIndexById(sideB.model, sideB.id)]
			)
	#!fold

	observerFunction: (changeEntry)->
		path = changeEntry.path.split(".")
		if path[2]? and path.length < 4 and !Array.isArray(changeEntry.value)
			@queueData(path[0], path[1], path[2], changeEntry.value)

	#@fold XHR
	findOrCreate: (model, data)->
		return new Promise((resolve, reject)=>
			#make sure we have something to check for
			if data?
				#is there a local instance matching all the data properties?
				if localData = @getByProperties(model, data)
					resolve(localData)
					return
				#create a new instance with the data
				else
					@create(model, data).then((data)-> resolve(data))
			else
				reject("No Data to Check Against!")
		)
	create: (model, data)->
		return new Promise((resolve, reject)=>
			@xhr(
				method: "POST"
				url: @buildUrl(@models[model.pluralize()])
				headers: @buildHeader(@models[model.pluralize()])
				data: data
			).then((data)=>
				#need to create a base for new relations to be added to
				for relation in @models[model.pluralize()].property.relations
					data[relation] = [] if relation.type != "belongsTo"
				@push("#{model.pluralize()}", data)
				resolve(data)
			)
		)
	queueData: (model, key, localProp, value)->
		window.clearTimeout(@timeout) if @timeout?
		@queue[key] = {} if !@queue[key]?
		@queue[key][localProp] = value
		@timeout = window.setTimeout(()=>
			xhrs = []
			for key, data of @queue
				@xhr(
					method: "PATCH"
					url: "http://#{@urlRoot}/#{model}/#{@getIdByPolymerKey(model, key)}"
					data: @queue[key]
					headers: @buildHeader()
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
				@fire("401")
		$.ajax(settings)
	#!fold

}

Polymer(_$.deepSafeExtend(loopbackDataModel, {
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
	requestFilter: (definition)->
		return {}
	buildUrl: (definition)->
		return "http://localhost:3000/api/jlUsers/#{app.user.jamlist.username}/#{definition.model.pluralize()}"
	buildHeader: (definition)->
		return {
			Authorization: app.user.jamlist.token
		}
	is: "jamlist-data"
}))
