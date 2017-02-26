console.log("tracklist")

window.elements = {} if !window.elements?
polymerDefinition = _.deepSafeExtend(window.elements.listElem, {
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
  ready: ()->       # Create Filters; Row Style Func
    console.log "trackelemready"
    console.log app.libraryEntries
    grid = @$["vaadin-grid"]
    grid.items = app.libraryEntries
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
})
window.elements.trackList = Polymer(polymerDefinition);
