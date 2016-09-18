window.daElements.listElem = {
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
      observer: 'filter'
      notify: true
    user:
      type: String
  listeners:
    'cell-tap': 'cellTap'
  cellListeners:
    'Docket': 'docketTap'
  # !fold-children

  # Lifecycle @fold
  ready: ()->
    app.patchDatatable(@$.datatableList, @)
  refresh: ()->
    @$.datatableList.data=[]
    @filter()
    @$.datatableList.data = @localData
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
