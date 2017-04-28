window.elements = {} if !window.elements?
window.elements.playlist = {}
window.elements.playlist.base = {
	properties:
		id:
			type: Number
			notify: true
			value: 0
		name:
			type: String
			notify: true
			value: "New Playlist"
		collapseRules:
			type: Boolean
			notify: true
			value: false
		rules:
			type: Array
			notify: true
			value: []
		tags:
			type: Array
			notify: true
			value: []
		tracks:
			type: Array
			notify: true
		filteredEntries:
			type: Array
			notify: true
		formattedRules:
			type: Array
			notify: true
			value: []
	listeners:
		ruleDelete: "deleteRule"
		toggleRules: "toggleRules"
	observers: [
		"filterTracks(tracks, formattedRules)"
	]
	# !fold
	#@fold Data Funcs
	addRule: (e)->
		app.spinner(()=>
			#Was this an add request from a specific group?
			if e.target.parentElement.key?
				group = e.target.parentElement.key
			#Or are we creating a new rule group?
			else
				#Determine the lowest value key availlable
				if @formattedRules.length > 0
					group = @formattedRules[@formattedRules.length-1].key + 1
				else
				 	group = 0
			app.data.create("rule", {group: group}).then((data)=>
				app.data.link({
					model: "rule",
					id: data.id
				},{
					model: "playlist"
					id: @id
				}).then((data)=>
					@formatRules()
				)
			)
		)
	deleteRule: (e)->
		app.spinner(()=>
			app.data.playlists.deleteRelated("rule", @id, e.detail.id)
		).then((data)->
			app.data.rules.deleteById(e.detail.id)
		).catch((error)->
			throw error
		)
	toggleRules: ()->
		@$.rulesExpand.toggleAttribute("rotate")
		@$.rulesCollapse.toggle()
	#!fold

	#@fold Coumputers
	#We need an array of arrays of each group, from an array just containing all rules with group # as a property
	formatRules: (rules)->
		console.log "formattingRules"
		console.log @rules
		map = {}
		ret = []
		for rule in @rules
			#filter out all rules not beloinging to the playlist (because our rules data includes all rules)
			if rule.playlistId == @id
				#@validateRule(rule)
				map[Number(rule.group)] = [] if !map[Number(rule.group)]?
				map[Number(rule.group)].push(rule)
		for key, group of map
			ret.push({key: Number(key), rules: group})
		@set("formattedRules", ret)
		console.log @formattedRules
		return ret
	#!fold

	displayRule: (rule, group)->
		if _$.intEqual(rule.playlistId, @id) and _$.intEqual(rule.group, group)
			return true
		return false

	validateRule: (rule)->
		if rule.ruleType == "rated" and rule.rule > 5
			rule.rule = 5

	#@fold-children Filtering
	filterTracks: (rules)->
		remaining = @tracks
		for group in @formattedRules
			passingTracks = []
			for rule in group.rules
				if @filters[rule.ruleType]?
					ent = @filters[rule.ruleType](remaining, rule)
					passingTracks = passingTracks.concat(ent)
			remaining = _.uniq(passingTracks)
		for track in remaining
			@$.selector.select(track)
	filters:
		rated: (libraryEntries, rule)->
			ret = []
			for libraryEntry in libraryEntries
				console.log "#{rule.greater}: #{libraryEntry.rating} - #{rule.rule}"
				if rule.greater and libraryEntry.rating >= rule.rule
			 		ret.push(libraryEntry)
				else if !rule.greater and libraryEntry.rating <= rule.rule
					ret.push(libraryEntry)
			return ret
		has: (libraryEntries, rule)->
			ret = []
			for libraryEntry in libraryEntries
				for tag in libraryEntry.tags
					#console.log "#{libraryEntry.track.title} - tagged #{rule.rule}, #{tag.id} - #{tag.name}"
					if _$.intEqual(tag.id, rule.rule)
						console.log "including"
						ret.push(libraryEntry)
						break
			return ret
		hasNot: (libraryEntries, rule)->
			ret = []
			for libraryEntry in libraryEntries
				select = true
				for tag in libraryEntry.tags
					#console.log "#{libraryEntry.track.title} - not tagged #{rule.rule}, #{tag.id} - #{tag.name}"
					if _$.intEqual(tag.id, rule.rule)
						console.log "excluded"
						select = false
				if select
					console.log "including"
					ret.push(libraryEntry)
			return ret
		playcount: (libraryEntries, rule)->
			ret = []
			for libraryEntry in libraryEntries
				if rule.greater > 0 and libraryEntry.playCount >= rule.rule
					ret.push(libraryEntry)
				else if rule.greater < 0 and libraryEntry.playCount <= rule.rule
					ret.push(libraryEntry)
			return ret
		added: (libraryEntries, rule)->
		played: (libraryEntries, rule)->
		recorded: (libraryEntries, rule)->
	#!fold-children

	#@fold Sync Funcs
	savePlaylist: ()->
		data = {}
		for key, property of @properties
			console.log key
			if property.source == "playlist"
				console.log @[key]
				data[key] = @[key]
		console.log data
		app.upsert("playlist", data, {id: @id}, true).then((data)=>
			#Update Synced Data Locally
			@id = data.id
			playlist = _.findWhere(app.playlists, {id: data.id})
			if playlist?
				playlist = data
			else
				app.push("playlists", data)
			for rule in @rules
				console.log rule.ruleType
				data = {}
				for key, property of rule
					console.log key
					console.log property
					data[key] = rule[key]
				data.id = @id
				app.upsert("rule", data, {id: rule.id}, true)
		).then((data)=>
			@filterTracks(@rules)
		)
	#!fold

}

window.elements.playlist.detail = Polymer(_$.deepSafeExtend(window.elements.playlist.base, {
	is: "playlist-detail"
	created: ()->
	ready: ()->
		window.test = @
		@formatRules()
	attached: ()->
}))
