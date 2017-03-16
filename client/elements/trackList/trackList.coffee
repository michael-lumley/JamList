window.elements = {} if !window.elements?
polymerDefinition = {
	is: "track-list"
	# Polymer Inits @fold-children
	properties:
		activeTrack:
			type: Object
		dataPath:
			type: String
			value: "libraryEntries"
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
		console.log "trackelemready"
		console.log app.libraryEntries
		grid = @$["vaadin-grid"]
		grid.items = app.libraryEntries
		grid.addEventListener('sort-order-changed', ()->
			sortOrder = grid.sortOrder[0]
			sortProperty = grid.columns[sortOrder.column].name
			sortDirection = sortOrder.direction
			grid.items.sort((a, b)->
				path = sortProperty.split('.')
				for field in path
					a = a[field]
					b = b[field]
				if !isNaN(a)
					res = parseInt(a, 10) - parseInt(b, 10)
				else
					res = a.localeCompare(b)

				if sortDirection == 'desc'
					res *= -1

				return res
			)
		)
		grid.addEventListener('selected-items-changed', ()=>
			item = grid.selection.selected()[0]
			if item?
				grid.getItem(item, (err, item)=>
					app.fail(err) if err?
					app.display.track(item)
				)
		)

		console.log grid.columns
	attached: ()->
	# !fold

	# Event Functions @fold
	_deleteConfirm: (e)->
		console.log e
		console.log e.srcElement.id
		@activeCase = app.get("case", e.srcElement.eid)
		console.log "deleteConfirm"
		console.log (@activeCase)
		@$.confirmDelete.open()
}
window.elements.trackList = Polymer(polymerDefinition);
