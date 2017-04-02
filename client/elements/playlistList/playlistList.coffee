console.log "tracklistload"

window.elements = {} if !window.elements?
polymerDefinition = {
	is: "playlist-list"
	# Polymer Inits @fold-children
	properties:
		playlists:
			type: Array
			notify: true
		libraryEntries:
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
		console.log @libraryEntries
		###
		list = @.$.playlistList
		list.addEventListener('expanding-item', (e)=>
			expandedItem = e.detail.item
			@async(()=>
				item = document.getElementById("Playlist" + expandedItem.id)
				console.log item
				item.addEventListener('iron-overlay-closed', (e)=>
					list.collapseItem(expandedItem) #need to collapseItem so that the next click isn't a 'close' event on the detail
				)
				item.fitInto = window
				item.resetFit()
				item.open()
			, "50")
		)
		###
	attached: ()->
	# !fold

	# Event Functions @fold
}

window.elements.trackList = Polymer(polymerDefinition);
