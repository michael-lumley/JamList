console.log "tracklistload"

window.elements = {} if !window.elements?
polymerDefinition = {
	is: "track-list"
	# Polymer Inits @fold-children
	properties:
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
	ready: ()->			 # Create Filters; Row Style Func
		table = @$.table
		expandedItem = {}
		table.addEventListener('expanding-item', (e)->
			if expandedItem != {}
				table.collapseItem(expandedItem)
			expandedItem = e.detail.item
		)
		return
	attached: ()->
	# !fold
}
window.elements.trackList = Polymer(polymerDefinition);
