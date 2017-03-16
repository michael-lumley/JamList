window.elements = {} if !window.elements?
window.elements.playlist = {}
window.elements.playlist.base = {
	properties:
		id:
			type: Number
			source: "ID"
		name:
			type: String
			source: "playlist"
			notify: true
			value: "New Playlist"
		rules:
			type: Array
			source: "playlist"
			notify: true
			value: []
		formattedRules:
			source: "computed"
			computed: 'formatRules(rules.*)'
		tracks:
			source: "computed"
			computed: 'filterTracks(rules.*)'

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
	addRuleGroup: ()->
		if @formattedRules.length > 0
			key = @formattedRules[@formattedRules.length-1].key + 1
		else
			key = 0
		@push("rules", {group: key})
	#!fold

	#@fold Coumputers
	formatRules: (rules)->
		map = {}
		ret = []
		if rules?
			for rule in rules.base
				@validateRule(rule)
				map[rule.group] = [] if !map[rule.group]?
				map[rule.group].push(rule)
			for key, group of map
				ret.push({key: key, rules: group})
		console.log ret
		return ret
	#!fold

	validateRule: (rule)->
		if rule.ruleType == "rated" and rule.rule > 5
			rule.rule = 5

	#@fold-children Filtering
	filterTracks: (rules)->
		console.log "filtering"
		ret = app.libraryEntries
		for rule in rules
			console.log rule
			console.log @filters[rule.ruleType]
			ret = @filters[rule.ruleType](ret, rule) if @filters[rule.ruleType]?
			console.log ret
		console.log ret
		return ret
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
					if tag.id == rule.rule
						ret.push(libraryEntry)
			return ret
		hasNot: (libraryEntries, rule)->
			ret = []
			select = true
			for libraryEntry in libraryEntries
				for tag in libraryEntry.tags
					if tag.id == rule.rule
						select = false
				ret.push(libraryEntry) if select
			return ret
		playcount: (libraryEntries, rule)->
			ret = []
			for libraryEntry in libraryEntries
				console.log "#{rule.greater}: #{libraryEntry.playCount} - #{rule.rule}"
				if rule.greater and libraryEntry.playCount >= rule.rule
					ret.push(libraryEntry)
				else if !rule.greater and libraryEntry.playCount <= rule.rule
					console.log push
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
		console.log "playlistCreate"
	ready: ()->
		console.log "playlistReady"
	attached: ()->
		console.log "playlistAttach"
		console.log @rating
}))

console.log "playlist"
