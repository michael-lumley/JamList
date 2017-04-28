window.elements = {} if !window.elements?
window.elements.track = {}
window.elements.track.base = {
	# Polymer Inits @fold-children
	properties:
		album:
			type: String
			notify: true
		albumArtLink:
			type: String
			notify: true
		artist:
			type: String
			notify: true
		trackId:
			type: Number
			notify: true
		millisduration:
			type: Number
			notify: true
		playCount:
			type: Number
			notify: true
		rating:
			type: Number
			notify: true
		tags:
			type: Array
			notify: true
			value: []
		tagsDB:
			type: Array
			notify: true
			value: []
		miscArray:
			type: Array
			notify: true
			value: []
		title:
			type: String
			notify: true
		trackId:
			type: Number
			notify: true
	# !fold

	# Lifecycle Functions @fold
	ready: ()->
		@$.tags.addEventListener("tag-added", (e)=>
			console.log e
			@pop("tags", tags.legnth-1)
			console.log @tags
			app.data.findOrCreate("tag", {name: e.detail}).then((tag)=>
				app.data.link({
					model: "track"
					id: @trackId
				},{
					model: "tag"
					id: tag.id
				})
			).then((data)=>
				console.log @tags
			)
		)
		###
		@addEventListener("tag-added", (e)=>
			app.addTag(@libraryEntryId, e.detail)
		)
		@addEventListener("tag-removed", (e)=>
			console.log e
			app.deleteTag(@libraryEntryId, e.detail.item)
		)
		#@factoryImpl(@id)
		###
}

window.elements.track.details = Polymer(_$.deepSafeExtend(window.elements.track.base, {
	is: "track-details"
}));
