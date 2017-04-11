console.log "taglistload"

window.elements = {} if !window.elements?
polymerDefinition = {
	is: "tag-list"
	# Polymer Inits @fold-children
	properties:
		tags:
			type: Array
			notify: true
		libraryEntries:
			type: Array
			notify: true
	listeners: {}
	# !fold

	# Lifecycle Functions @fold
	created: ()->
		console.log "listelemcreate"
		console.log @
	ready: ()->
	attached: ()->
	sortFunction: (a, b)->
		return -1 if a.name < b.name
		return 1 if b.name < a.name
		return 0
	# !fold

	# Event Functions @fold
}

window.elements.tagList = Polymer(polymerDefinition);
