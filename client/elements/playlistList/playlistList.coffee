console.log "tracklistload"

window.elements = {} if !window.elements?
polymerDefinition = {
	is: "playlist-list"
	# Polymer Inits @fold-children
	properties:
		playlists:
			type: Array
			notify: true
		tracks:
			type: Array
			notify: true
	listeners:
		'_deleteConfirm': '_deleteConfirm'
		'_generateNote': '_generateNote'
		'_generateLabel': '_generateLabel'
		'_generateDWIVideoRequest': '_generateDWIVideoRequest'
		'_fill911': '_fill911'
	# !fold

	# Lifecycle Functions @fold
	created: ()->
		console.log "listelemcreate"
		console.log @
	ready: ()->			 # Create Filters; Row Style Func
	attached: ()->

	addPlaylist: ()->
		app.xhr({
			method: "POST"
			url: "http://#{app.urlBase}:3000/api/playlists"
			data:
				name: "New Playlist"
		}).then((data)=>
			@push("playlists", {
				name: data.name
				rules: []
				id: data.id
			})
			@activeList = data.id
		)

	# !fold

	# Event Functions @fold
}

window.elements.trackList = Polymer(polymerDefinition);
