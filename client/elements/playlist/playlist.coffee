window.elements = {} if !window.elements?
window.elements.playlist = {}
window.elements.playlist.base = {
	properties:
		id:
			type: Number
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
		tracks:
			type: Array
			notify: true
		filteredEntries:
			type: Array
			notify: true
		formattedRules:
			computed: 'formatRules(rules.*)'
	listeners:
		ruleDelete: "deleteRule"
		toggleRules: "toggleRules"
	observers: [
		"playlistLevelObserver(name)"
	]
	# !fold
	playlistLevelObserver: (changeRecord)=>
		console.log app.convertChangeRecord(changeRecord)

	#@fold Polymer Inits
	factoryImpl: (id)->
		if id?
			playlistData = app.get("playlist", id)
			for key, property of playlistData
				@[key] = property
	#!fold

	#@fold Data Funcs
	addRule: (e)->
		@push("rules", {group: e.target.parentElement.key})
	deleteRule: (e)->
		console.log e.detail.id
		index = _.findIndex(@rules, (item)->
			_$.intEqual(item.id, e.detail.id)
		)
		app.xhr(
			method: "DELETE"
			url: "http://#{app.urlBase}:3000/api/Rules/#{e.detail.id}"
		).then(()=>
			@splice('rules', index, 1)
		)
	addRuleGroup: ()->
		if @formattedRules.length > 0
			key = @formattedRules[@formattedRules.length-1].key + 1
		else
			key = 0
		@push("rules", {group: key})
	toggleRules: ()->
		@$.rulesExpand.toggleAttribute("rotate")
		@$.rulesCollapse.toggle()
	#!fold

	#@fold Coumputers
	formatRules: (rules)->
		map = {}
		ret = []
		if rules?
			for rule in rules.base
				@validateRule(rule)
				map[Number(rule.group)] = [] if !map[Number(rule.group)]?
				map[Number(rule.group)].push(rule)
			for key, group of map
				ret.push({key: Number(key), rules: group})
		return ret
	#!fold

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
					passingTracks = passingEntries.concat(ent)
			remaining = _.uniq(passingEntries)
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
				data.playlistId = @id
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
		@filterTracks()
	attached: ()->
}))

console.log "playlist"
