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
	observers: [
		"trackLevelObserver(tags.*)"
	]
	# !fold
	trackLevelObserver: (changeRecord)=>
		console.log changeRecord
	# Lifecycle Functions @fold
	ready: ()->
		console.log "ready"
		console.log @tags
		setTimeout(()=>
			@push("tags", {name: "testtag"})
		, "2500")
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
