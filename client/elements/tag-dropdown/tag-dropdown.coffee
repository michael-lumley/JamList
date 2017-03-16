window.elements = {} if !window.elements?
polymerDefinition = {
	is: "tag-dropdown"
	# Polymer Inits @fold-children
	properties:
		allTags:
			type: Array
			notify: true
			value: ["testing", "testing1", "testing2"]
		selectedTags:
			type: Array
			notify: true
	# !fold

	# Lifecycle Functions @fold
	ready: ()->
		console.log "ready"
		console.log @allTags
	# !fold
}
window.elements.tagDropdown = Polymer(polymerDefinition);
