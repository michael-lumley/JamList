window.elements = {} if !window.elements?
window.elements.tag = {}
window.elements.tag.base = {
	properties:
		id:
			type: Number
			notify: true
		name:
			type: String
			notify: true
			value: "New Playlist"
		libraryEntries:
			type: Array
			notify: true
			#observer: "filterTracks"
		filteredEntries:
			type: Array
			notify: true
	listeners:
		ruleDelete: "deleteRule"
		toggleRules: "toggleRules"
		test: "test"

	#@fold Polymer Inits
	factoryImpl: (id)->
		if id?
			playlistData = app.get("playlist", id)
			for key, property of playlistData
				@[key] = property
	#!fold

	test: ()->
		console.log @filteredEntries

	#@fold-children Filtering
	_filterTracks: (entry)->
		for tag in entry.tags
			#console.log "#{libraryEntry.track.title} - tagged #{@id}, #{tag.id} - #{tag.name}"
			if _$.intEqual(@id, tag.id)
				return true
		return false

	openMergeDialog: ()->
		return new Promise((resolve, reject)=>
			@$.merge.open()
			confirm = (answer)=>
				@$.merge.close()
				$(@$.confirmButton).off()
				$(@$.rejectButton).off()
				resolve(answer)
			$(@$.confirmButton).on("click", ()=> confirm(true))
			$(@$.rejectButton).on("click", ()=> confirm(false))
		)

	mergedelete: ()->
		app.spinner(()=>
			@merge().then(()=>@delete())
		)

	merge: ()->
		app.spinner(()=>
			@openMergeDialog().then(()=>
				console.log @mergeTagId
				tag = app.get("tag", @mergeTagId)
				_$.allForPromise(@filteredEntries, (entry, key)=>
					entryIndex = app.getIndex("libraryEntry", entry.id)
					tags = entry.tags
					if !tags.includes(tag)
						return app.xhr(
							type: "PUT"
							url: "http://#{app.urlBase}:3000/api/tags/#{tag.id}/libraryEntries/rel/#{entry.id}"
						).then((data)=>
							tags.push(tag)
							console.log entryIndex
							app.set("libraryEntries.#{entryIndex}.tags", tags)
						)
					else
						return null
			)
		)
	)
	delete: ()->
		app.spinner(()=>
			tag = app.get("tag", @id)
			_$.allForPromise(@filteredEntries, (entry, key)=>
				#take the tag off of all entries
				entryIndex = app.getIndex("libraryEntry", entry.id)
				tags = entry.tags
				tags = _.without(tags, tag)
				app.set("libraryEntries.#{entryIndex}.tags", tags)
			).then((data)=>
				#take the tag itself out of the database
				app.set("tags", _.without(app.tags, tag))
			).then((data)=>
				app.xhr(
					type: "DELETE"
					url: "http://#{app.urlBase}:3000/api/tags/#{tag.id}/libraryEntries"
				)
			).then((data)=>
				app.xhr(
					type: "DELETE"
					url: "http://#{app.urlBase}:3000/api/tags/#{tag.id}"
				)
			)
		)
	#!fold-children
}


window.elements.tag.detail = Polymer(_$.deepSafeExtend(window.elements.tag.base, {
	is: "tag-detail"
	created: ()->
	ready: ()->
		#@filterTracks()
	attached: ()->
}))

console.log "playlist"
