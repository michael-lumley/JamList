window.elements = {} if !window.elements?
window.elements.rule = {}
window.elements.rule.base = {
	properties:
		id:
			type: Number
		ruleType:
			type: String
			notify: true
		rule:
			type: Number
			notify: true
		greater:
			type: Number
			notify: true
		playlistId:
			type: Number
			notify: true
		tagId:
			type: Number
			notify: true

	#@fold Polymer Display Selectors
	ruleTypeIs: (display, ruleType)-> #Polymer helper to determine which sub view to show
		console.log ruleType
		console.log @ruleType
		if display == "rated" and ruleType == "rated"
			return true
		else if display == "tag" and (ruleType == "has" or ruleType == "hasNot")
			return true
		else if display == "playcount" and ruleType == "playcount"
			return true
		else if display == "date" and (ruleType == "added" or ruleType == "played" or ruleType == "recorded")
			return true
		else
			return false
	dateDisplayIs: (display, greater)-> #Polymer helper to determine which date input to show, compares
		console.log display
		console.log greater
		if display == "days" and greater == "0" # If greater == 0, we have a "within last X days" rule
			return true
		else if display == "picker" and greater != "0"
			return true
		else
			return false
	libraryTags: ()->
		console.log "gettingTags"
		console.log app.tags
		return app.tags
	#!fold

}

window.elements.rule.detail =  Polymer(_$.deepSafeExtend(window.elements.rule.base, {
	is: "rule-detail"
	created: ()->
		console.log "playlistCreate"
	ready: ()->
		console.log "playlistReady"
		@ruleType = "has"
	attached: ()->
		console.log "playlistAttach"
		console.log @rating
}))

console.log "rule"
