window.elements = {} if !window.elements?
window.elements.libraryEntry = {}
window.elements.libraryEntry.base = {
	# Polymer Inits @fold-children
	properties:
		album:
			type: String
			source: "track"
			notify: true
		albumArtLink:
			type: String
			source: "track"
			notify: true
		artist:
			type: String
			source: "track"
			notify: true
		libraryEntryId:
			type: Number
			source: "id"
			notify: true
		millisduration:
			type: Number
			source: "track"
			notify: true
		playCount:
			type: Number
			source: "libraryEntry"
			notify: true
		rating:
			type: Number
			source: "libraryEntry"
			notify: true
		tags:
			type: Array
			source: "tags"
			notify: true
		title:
			type: String
			source: "track"
			notify: true
		trackId:
			type: Number
			source: "id"
			notify: true
	# !fold

	# Lifecycle Functions @fold
	ready: ()->
		console.log "ready"
		console.log @tags
		@addEventListener("tag-added", (e)=>
			app.addTag(@libraryEntryId, e.detail)
		)
		@addEventListener("tag-removed", (e)=>
			console.log e 
			app.deleteTag(@libraryEntryId, e.detail.item)
		)
		#@factoryImpl(@id)
	###
	factoryImpl: (id)->
		# LOAD DATA INTO ELEMENT DYNAMICALLY
		libraryEntryId = id
		trackData = app.get("libraryEntry", id)
		console.log trackData
		for key, property of @properties
			console.log key
			if property.source == "track"
				@[key] = trackData.track[key]
			else if property.source == "libraryEntry"
				@[key] = trackData[key]
			else if property.source == "id"
				if key == "libraryEntryId"
					@[key] = trackData.id
				else if key == "trackId"
					@[key] = trackData.track.id
			else if property.source == "tags"
				for entry in trackData[key]
					@push("tags", entry["name"])
			console.log @[key]
			@setupPropertyListener(key, property)
	setupPropertyListener: (key, property) ->
		console.log key.toDash()
		if property.source != "tags"
			@addEventListener("#{key.toDash()}-changed", (e)=>
				console.log "#{key.toDash()}-changed"
				do (key, property)=>
					localData = app.get("libraryEntry", @libraryEntryId)
					if property.source == "track"
						localData.track[key] = @[key] #todo - move into a successful promise to ensure call was a success
						app.queueData("track", @trackId, key, @[key])
					else if property.source == "libraryEntry"
						localData[key] = @[key]
						app.queueData("libraryEntry", @libraryEntryId, key, @[key])
			)
		else if property.source == "tags"
			@addEventListener("tag-added", (e)=>
				app.addTag(@libraryEntryId, e.detail)
			)
			@addEventListener("tag-removed", (e)=>
				console.log e
				app.deleteTag(@libraryEntryId, e.detail.item)
			)
	###
	# !fold
}

window.elements.libraryEntry.details = Polymer(_$.deepSafeExtend(window.elements.libraryEntry.base, {
	is: "library-entry-details"
}));
