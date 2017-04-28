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
		activeList:
			type: Number
			notify: true
		rules:
			type: Array
			notify: true
		tags:
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
		window.test = @
	attached: ()->

	addPlaylist: ()->
		app.data.create("playlist", {
			name: "New Playlist"
			jlUserId: "lumleym"
		}).then((data)=>
			@activeList = data.id
		)
	# !fold

	# Event Functions @fold
}

window.elements.trackList = Polymer(polymerDefinition);
