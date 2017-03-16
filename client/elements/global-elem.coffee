window.daElements = {} if !window.daElements?

window.daElements.globalElem = {
	# Calculators @fold
	_isInstantized: ()->
		if @id? and @id != "" and @id != " " and @id != "undefined" and @id != "pending"
			return true
		return false
	_isAttached: ()->
		return true if $.contains(document, @)
		return false
	_ignoredProperty: (property)->
		return true if _.find(@ignoredProperties, (instance)-> return true if instance == property; return false)?
		return false
	_calculatedProperty: (property)->
		return true if _.find(@calculatedProperties, (instance)-> return true if instance == property; return false)?
		return false
	_mergeProperty: (property)->
		return true if _.find(@mergeProperties, (instance)-> return true if instance == property; return false)?
		return false
	# !fold

	# Setup @fold
	loadFromLocalData: (id, type)->
		elementData = app.get(type, id)
		for property, value of elementData
			if !@_mergeProperty(property)
				@[property] = value if value != null
			else
				@["pre_merge_#{property}"] = value
	setupListeners: ()->
		glog = _.glog(["App Setup", "Setup Listeners", @dataSource, @id])
		for property of @properties
			glog.add("Setting up property #{property}")
			if !@_ignoredProperty(property)
				glog.add("Adding Listener")
				@addEventListener("#{property.toDash()}-changed", ((e)=>
					localProp = "#{property}"
					()=>
						subGlog = _.glog(["Attribute Changes", @dataSource, @id, localProp]).open "Detected change of attr #{localProp} for a #{@dataSource}..."
						subGlog.add @id
						subGlog.add localProp
						subGlog.add @[localProp]
						if @_isAttached()
							subGlog.add "   ...is attached"
							@updateAttr(localProp, @[localProp])
							#@fire("#{type}-update")
							@recalculate() if @recalculate?
						else
							subGlog.add "   ...not attached"
				)())
	# !fold

	# Data Maintenance @fold
	updateAttr: (property, value) ->
		glog = _.glog("last").add "   ...updating attr"
		if @_isInstantized()
			glog.add "   ...is instantized"
			localData = app.get(@dataSource, @id)
			if !@_ignoredProperty(property) and !@_mergeProperty(property)
				localData[property] = value
			#Do not create new DB entry
			if !@_ignoredProperty(property) and !@_calculatedProperty(property) and !@_mergeProperty(property)
				#not an ignored prperty
				glog.add "   ...not ignored"
				glog.add "      SENDING."
				app.queueData(@dataSource, @id, property, value)
			else
				glog.add "   ...but ignored, calced or merged."
		else
			glog.add "   ...not instantized"
			payload = {}
			payload[property] = value
			if @id != "pending"
				glog.add "   ...id not pending, creating element."
				subGlog = glog.open "Reviewing forced attributes"
				for key, property of @forceProperties
					subGlog.add "Forcing #{property} with value #{@[property]}"
					payload[property] = @[property]
				glog.add payload
				app.add(@dataSource, @caseId, payload).then((response)=>
					@id = response.id
					glog.add "      ...data returned with id #{@id}."
					glog.add response
				)
				@id = "pending"
			else
				glog.add "   ...element is pending, delaying data."
				delaySend = (property, value)=>
					glog.add "   ...delay set."
					setTimeout(()=>
						glog.add "   ...checking delayed send, id is #{@id}."
						if @id != "pending"
							app.queueData(@dataSource, @id, property, value)
						else
							delaySend(property, value)
					, "100")
				delaySend(property, value)
	# ! fold
}
