window.elements = {} if !window.elements?
window.elements.rule = {}
window.elements.rule.base = {
	properties:
		id:
			type: Number
		ruleType:
			type: String
			notify: true
			value: ""
		rule:
			type: Number
			notify: true
			value: 0
		greater:
			type: Number
			notify: true
			value: 0
		playlistId:
			type: Number
			notify: true
		tagId:
			type: Number
			notify: true


	#@fold Polymer Display Selectors
	ruleTypeIs: (display, ruleType)-> #Polymer helper to determine which sub view to show
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
		if display == "days" and greater == "0" # If greater == 0, we have a "within last X days" rule
			return true
		else if display == "picker" and greater != "0"
			return true
		else
			return false
	libraryTags: ()->
		return app.tags
	deleteRule: ()->
		@fire('ruleDelete', {id: @id})
	#!fold
}

window.elements.rule.detail =  Polymer(_$.deepSafeExtend(window.elements.rule.base, {
	is: "rule-detail"
	created: ()->
	ready: ()->
	attached: ()->
}))
