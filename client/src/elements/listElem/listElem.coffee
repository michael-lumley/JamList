window.elements.listElem = {
  # Polymer properties @fold-children
  properties:
    localData:
      type: Array
      value: []
    filters:
      type: Array
      notify: true
      value: []
    activeFilterId:
      type: Number
      value: null
      #observer: 'filter'
      notify: true
  listeners:
    'cell-tap': 'cellTap'
  cellListeners:
    'Docket': 'docketTap'
  # !fold-children

  # Lifecycle @fold
  ready: ()->
    console.log "listelem ready"
    app.patchDatatable(@$.datatableList, @)
    console.log @dataPath
    console.log app
    console.log app.libraryEntries
    console.log app[@dataPath]
    @localData = app[@dataPath]
    console.log @localData
  refresh: ()->
    @$.datatableList.data=[]
    @filter()
    @$.datatableList.data = @localData
  attached: ()->
    console.log "attached"
    console.log trace()
  filter: ()->
    if @activeFilterId != null
      filter = @filters[@activeFilterId]
      @localData = filter.filter(app.cases)
    else
      @localData = app.cases
  # !fold

  # Cell Events @fold
  cellTap: (e)->
    @[@cellListeners[e.detail.column.header]](e) if @cellListeners[e.detail.column.header]?
  docketTap: (e)->
    if e.detail.item.case?
      app.displayCase(e.detail.item.case.id)
    else
      app.displayCase(e.detail.item.id)
  # !fold
}
