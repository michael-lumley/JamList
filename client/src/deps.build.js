(function () {
function resolve() {
document.body.removeAttribute('unresolved');
}
if (window.WebComponents) {
addEventListener('WebComponentsReady', resolve);
} else {
if (document.readyState === 'interactive' || document.readyState === 'complete') {
resolve();
} else {
addEventListener('DOMContentLoaded', resolve);
}
}
}());
window.Polymer = {
Settings: function () {
var settings = window.Polymer || {};
if (!settings.noUrlSettings) {
var parts = location.search.slice(1).split('&');
for (var i = 0, o; i < parts.length && (o = parts[i]); i++) {
o = o.split('=');
o[0] && (settings[o[0]] = o[1] || true);
}
}
settings.wantShadow = settings.dom === 'shadow';
settings.hasShadow = Boolean(Element.prototype.createShadowRoot);
settings.nativeShadow = settings.hasShadow && !window.ShadowDOMPolyfill;
settings.useShadow = settings.wantShadow && settings.hasShadow;
settings.hasNativeImports = Boolean('import' in document.createElement('link'));
settings.useNativeImports = settings.hasNativeImports;
settings.useNativeCustomElements = !window.CustomElements || window.CustomElements.useNative;
settings.useNativeShadow = settings.useShadow && settings.nativeShadow;
settings.usePolyfillProto = !settings.useNativeCustomElements && !Object.__proto__;
settings.hasNativeCSSProperties = !navigator.userAgent.match('AppleWebKit/601') && window.CSS && CSS.supports && CSS.supports('box-shadow', '0 0 0 var(--foo)');
settings.useNativeCSSProperties = settings.hasNativeCSSProperties && settings.lazyRegister && settings.useNativeCSSProperties;
return settings;
}()
};
(function () {
var userPolymer = window.Polymer;
window.Polymer = function (prototype) {
if (typeof prototype === 'function') {
prototype = prototype.prototype;
}
if (!prototype) {
prototype = {};
}
var factory = desugar(prototype);
prototype = factory.prototype;
var options = { prototype: prototype };
if (prototype.extends) {
options.extends = prototype.extends;
}
Polymer.telemetry._registrate(prototype);
document.registerElement(prototype.is, options);
return factory;
};
var desugar = function (prototype) {
var base = Polymer.Base;
if (prototype.extends) {
base = Polymer.Base._getExtendedPrototype(prototype.extends);
}
prototype = Polymer.Base.chainObject(prototype, base);
prototype.registerCallback();
return prototype.constructor;
};
if (userPolymer) {
for (var i in userPolymer) {
Polymer[i] = userPolymer[i];
}
}
Polymer.Class = desugar;
}());
Polymer.telemetry = {
registrations: [],
_regLog: function (prototype) {
console.log('[' + prototype.is + ']: registered');
},
_registrate: function (prototype) {
this.registrations.push(prototype);
Polymer.log && this._regLog(prototype);
},
dumpRegistrations: function () {
this.registrations.forEach(this._regLog);
}
};
Object.defineProperty(window, 'currentImport', {
enumerable: true,
configurable: true,
get: function () {
return (document._currentScript || document.currentScript).ownerDocument;
}
});
Polymer.RenderStatus = {
_ready: false,
_callbacks: [],
whenReady: function (cb) {
if (this._ready) {
cb();
} else {
this._callbacks.push(cb);
}
},
_makeReady: function () {
this._ready = true;
for (var i = 0; i < this._callbacks.length; i++) {
this._callbacks[i]();
}
this._callbacks = [];
},
_catchFirstRender: function () {
requestAnimationFrame(function () {
Polymer.RenderStatus._makeReady();
});
},
_afterNextRenderQueue: [],
_waitingNextRender: false,
afterNextRender: function (element, fn, args) {
this._watchNextRender();
this._afterNextRenderQueue.push([
element,
fn,
args
]);
},
hasRendered: function () {
return this._ready;
},
_watchNextRender: function () {
if (!this._waitingNextRender) {
this._waitingNextRender = true;
var fn = function () {
Polymer.RenderStatus._flushNextRender();
};
if (!this._ready) {
this.whenReady(fn);
} else {
requestAnimationFrame(fn);
}
}
},
_flushNextRender: function () {
var self = this;
setTimeout(function () {
self._flushRenderCallbacks(self._afterNextRenderQueue);
self._afterNextRenderQueue = [];
self._waitingNextRender = false;
});
},
_flushRenderCallbacks: function (callbacks) {
for (var i = 0, h; i < callbacks.length; i++) {
h = callbacks[i];
h[1].apply(h[0], h[2] || Polymer.nar);
}
}
};
if (window.HTMLImports) {
HTMLImports.whenReady(function () {
Polymer.RenderStatus._catchFirstRender();
});
} else {
Polymer.RenderStatus._catchFirstRender();
}
Polymer.ImportStatus = Polymer.RenderStatus;
Polymer.ImportStatus.whenLoaded = Polymer.ImportStatus.whenReady;
(function () {
'use strict';
var settings = Polymer.Settings;
Polymer.Base = {
__isPolymerInstance__: true,
_addFeature: function (feature) {
this.extend(this, feature);
},
registerCallback: function () {
if (settings.lazyRegister === 'max') {
if (this.beforeRegister) {
this.beforeRegister();
}
} else {
this._desugarBehaviors();
this._doBehavior('beforeRegister');
}
this._registerFeatures();
if (!settings.lazyRegister) {
this.ensureRegisterFinished();
}
},
createdCallback: function () {
if (!this.__hasRegisterFinished) {
this._ensureRegisterFinished(this.__proto__);
}
Polymer.telemetry.instanceCount++;
this.root = this;
this._doBehavior('created');
this._initFeatures();
},
ensureRegisterFinished: function () {
this._ensureRegisterFinished(this);
},
_ensureRegisterFinished: function (proto) {
if (proto.__hasRegisterFinished !== proto.is || !proto.is) {
if (settings.lazyRegister === 'max') {
proto._desugarBehaviors();
proto._doBehaviorOnly('beforeRegister');
}
proto.__hasRegisterFinished = proto.is;
if (proto._finishRegisterFeatures) {
proto._finishRegisterFeatures();
}
proto._doBehavior('registered');
if (settings.usePolyfillProto && proto !== this) {
proto.extend(this, proto);
}
}
},
attachedCallback: function () {
var self = this;
Polymer.RenderStatus.whenReady(function () {
self.isAttached = true;
self._doBehavior('attached');
});
},
detachedCallback: function () {
var self = this;
Polymer.RenderStatus.whenReady(function () {
self.isAttached = false;
self._doBehavior('detached');
});
},
attributeChangedCallback: function (name, oldValue, newValue) {
this._attributeChangedImpl(name);
this._doBehavior('attributeChanged', [
name,
oldValue,
newValue
]);
},
_attributeChangedImpl: function (name) {
this._setAttributeToProperty(this, name);
},
extend: function (target, source) {
if (target && source) {
var n$ = Object.getOwnPropertyNames(source);
for (var i = 0, n; i < n$.length && (n = n$[i]); i++) {
this.copyOwnProperty(n, source, target);
}
}
return target || source;
},
mixin: function (target, source) {
for (var i in source) {
target[i] = source[i];
}
return target;
},
copyOwnProperty: function (name, source, target) {
var pd = Object.getOwnPropertyDescriptor(source, name);
if (pd) {
Object.defineProperty(target, name, pd);
}
},
_logger: function (level, args) {
if (args.length === 1 && Array.isArray(args[0])) {
args = args[0];
}
switch (level) {
case 'log':
case 'warn':
case 'error':
console[level].apply(console, args);
break;
}
},
_log: function () {
var args = Array.prototype.slice.call(arguments, 0);
this._logger('log', args);
},
_warn: function () {
var args = Array.prototype.slice.call(arguments, 0);
this._logger('warn', args);
},
_error: function () {
var args = Array.prototype.slice.call(arguments, 0);
this._logger('error', args);
},
_logf: function () {
return this._logPrefix.concat(this.is).concat(Array.prototype.slice.call(arguments, 0));
}
};
Polymer.Base._logPrefix = function () {
var color = window.chrome && !/edge/i.test(navigator.userAgent) || /firefox/i.test(navigator.userAgent);
return color ? [
'%c[%s::%s]:',
'font-weight: bold; background-color:#EEEE00;'
] : ['[%s::%s]:'];
}();
Polymer.Base.chainObject = function (object, inherited) {
if (object && inherited && object !== inherited) {
if (!Object.__proto__) {
object = Polymer.Base.extend(Object.create(inherited), object);
}
object.__proto__ = inherited;
}
return object;
};
Polymer.Base = Polymer.Base.chainObject(Polymer.Base, HTMLElement.prototype);
if (window.CustomElements) {
Polymer.instanceof = CustomElements.instanceof;
} else {
Polymer.instanceof = function (obj, ctor) {
return obj instanceof ctor;
};
}
Polymer.isInstance = function (obj) {
return Boolean(obj && obj.__isPolymerInstance__);
};
Polymer.telemetry.instanceCount = 0;
}());
(function () {
var modules = {};
var lcModules = {};
var findModule = function (id) {
return modules[id] || lcModules[id.toLowerCase()];
};
var DomModule = function () {
return document.createElement('dom-module');
};
DomModule.prototype = Object.create(HTMLElement.prototype);
Polymer.Base.extend(DomModule.prototype, {
constructor: DomModule,
createdCallback: function () {
this.register();
},
register: function (id) {
id = id || this.id || this.getAttribute('name') || this.getAttribute('is');
if (id) {
this.id = id;
modules[id] = this;
lcModules[id.toLowerCase()] = this;
}
},
import: function (id, selector) {
if (id) {
var m = findModule(id);
if (!m) {
forceDomModulesUpgrade();
m = findModule(id);
}
if (m && selector) {
m = m.querySelector(selector);
}
return m;
}
}
});
var cePolyfill = window.CustomElements && !CustomElements.useNative;
document.registerElement('dom-module', DomModule);
function forceDomModulesUpgrade() {
if (cePolyfill) {
var script = document._currentScript || document.currentScript;
var doc = script && script.ownerDocument || document;
var modules = doc.querySelectorAll('dom-module');
for (var i = modules.length - 1, m; i >= 0 && (m = modules[i]); i--) {
if (m.__upgraded__) {
return;
} else {
CustomElements.upgrade(m);
}
}
}
}
}());
Polymer.Base._addFeature({
_prepIs: function () {
if (!this.is) {
var module = (document._currentScript || document.currentScript).parentNode;
if (module.localName === 'dom-module') {
var id = module.id || module.getAttribute('name') || module.getAttribute('is');
this.is = id;
}
}
if (this.is) {
this.is = this.is.toLowerCase();
}
}
});
Polymer.Base._addFeature({
behaviors: [],
_desugarBehaviors: function () {
if (this.behaviors.length) {
this.behaviors = this._desugarSomeBehaviors(this.behaviors);
}
},
_desugarSomeBehaviors: function (behaviors) {
var behaviorSet = [];
behaviors = this._flattenBehaviorsList(behaviors);
for (var i = behaviors.length - 1; i >= 0; i--) {
var b = behaviors[i];
if (behaviorSet.indexOf(b) === -1) {
this._mixinBehavior(b);
behaviorSet.unshift(b);
}
}
return behaviorSet;
},
_flattenBehaviorsList: function (behaviors) {
var flat = [];
for (var i = 0; i < behaviors.length; i++) {
var b = behaviors[i];
if (b instanceof Array) {
flat = flat.concat(this._flattenBehaviorsList(b));
} else if (b) {
flat.push(b);
} else {
this._warn(this._logf('_flattenBehaviorsList', 'behavior is null, check for missing or 404 import'));
}
}
return flat;
},
_mixinBehavior: function (b) {
var n$ = Object.getOwnPropertyNames(b);
for (var i = 0, n; i < n$.length && (n = n$[i]); i++) {
if (!Polymer.Base._behaviorProperties[n] && !this.hasOwnProperty(n)) {
this.copyOwnProperty(n, b, this);
}
}
},
_prepBehaviors: function () {
this._prepFlattenedBehaviors(this.behaviors);
},
_prepFlattenedBehaviors: function (behaviors) {
for (var i = 0, l = behaviors.length; i < l; i++) {
this._prepBehavior(behaviors[i]);
}
this._prepBehavior(this);
},
_doBehavior: function (name, args) {
for (var i = 0; i < this.behaviors.length; i++) {
this._invokeBehavior(this.behaviors[i], name, args);
}
this._invokeBehavior(this, name, args);
},
_doBehaviorOnly: function (name, args) {
for (var i = 0; i < this.behaviors.length; i++) {
this._invokeBehavior(this.behaviors[i], name, args);
}
},
_invokeBehavior: function (b, name, args) {
var fn = b[name];
if (fn) {
fn.apply(this, args || Polymer.nar);
}
},
_marshalBehaviors: function () {
for (var i = 0; i < this.behaviors.length; i++) {
this._marshalBehavior(this.behaviors[i]);
}
this._marshalBehavior(this);
}
});
Polymer.Base._behaviorProperties = {
hostAttributes: true,
beforeRegister: true,
registered: true,
properties: true,
observers: true,
listeners: true,
created: true,
attached: true,
detached: true,
attributeChanged: true,
ready: true
};
Polymer.Base._addFeature({
_getExtendedPrototype: function (tag) {
return this._getExtendedNativePrototype(tag);
},
_nativePrototypes: {},
_getExtendedNativePrototype: function (tag) {
var p = this._nativePrototypes[tag];
if (!p) {
var np = this.getNativePrototype(tag);
p = this.extend(Object.create(np), Polymer.Base);
this._nativePrototypes[tag] = p;
}
return p;
},
getNativePrototype: function (tag) {
return Object.getPrototypeOf(document.createElement(tag));
}
});
Polymer.Base._addFeature({
_prepConstructor: function () {
this._factoryArgs = this.extends ? [
this.extends,
this.is
] : [this.is];
var ctor = function () {
return this._factory(arguments);
};
if (this.hasOwnProperty('extends')) {
ctor.extends = this.extends;
}
Object.defineProperty(this, 'constructor', {
value: ctor,
writable: true,
configurable: true
});
ctor.prototype = this;
},
_factory: function (args) {
var elt = document.createElement.apply(document, this._factoryArgs);
if (this.factoryImpl) {
this.factoryImpl.apply(elt, args);
}
return elt;
}
});
Polymer.nob = Object.create(null);
Polymer.Base._addFeature({
properties: {},
getPropertyInfo: function (property) {
var info = this._getPropertyInfo(property, this.properties);
if (!info) {
for (var i = 0; i < this.behaviors.length; i++) {
info = this._getPropertyInfo(property, this.behaviors[i].properties);
if (info) {
return info;
}
}
}
return info || Polymer.nob;
},
_getPropertyInfo: function (property, properties) {
var p = properties && properties[property];
if (typeof p === 'function') {
p = properties[property] = { type: p };
}
if (p) {
p.defined = true;
}
return p;
},
_prepPropertyInfo: function () {
this._propertyInfo = {};
for (var i = 0; i < this.behaviors.length; i++) {
this._addPropertyInfo(this._propertyInfo, this.behaviors[i].properties);
}
this._addPropertyInfo(this._propertyInfo, this.properties);
this._addPropertyInfo(this._propertyInfo, this._propertyEffects);
},
_addPropertyInfo: function (target, source) {
if (source) {
var t, s;
for (var i in source) {
t = target[i];
s = source[i];
if (i[0] === '_' && !s.readOnly) {
continue;
}
if (!target[i]) {
target[i] = {
type: typeof s === 'function' ? s : s.type,
readOnly: s.readOnly,
attribute: Polymer.CaseMap.camelToDashCase(i)
};
} else {
if (!t.type) {
t.type = s.type;
}
if (!t.readOnly) {
t.readOnly = s.readOnly;
}
}
}
}
}
});
Polymer.CaseMap = {
_caseMap: {},
_rx: {
dashToCamel: /-[a-z]/g,
camelToDash: /([A-Z])/g
},
dashToCamelCase: function (dash) {
return this._caseMap[dash] || (this._caseMap[dash] = dash.indexOf('-') < 0 ? dash : dash.replace(this._rx.dashToCamel, function (m) {
return m[1].toUpperCase();
}));
},
camelToDashCase: function (camel) {
return this._caseMap[camel] || (this._caseMap[camel] = camel.replace(this._rx.camelToDash, '-$1').toLowerCase());
}
};
Polymer.Base._addFeature({
_addHostAttributes: function (attributes) {
if (!this._aggregatedAttributes) {
this._aggregatedAttributes = {};
}
if (attributes) {
this.mixin(this._aggregatedAttributes, attributes);
}
},
_marshalHostAttributes: function () {
if (this._aggregatedAttributes) {
this._applyAttributes(this, this._aggregatedAttributes);
}
},
_applyAttributes: function (node, attr$) {
for (var n in attr$) {
if (!this.hasAttribute(n) && n !== 'class') {
var v = attr$[n];
this.serializeValueToAttribute(v, n, this);
}
}
},
_marshalAttributes: function () {
this._takeAttributesToModel(this);
},
_takeAttributesToModel: function (model) {
if (this.hasAttributes()) {
for (var i in this._propertyInfo) {
var info = this._propertyInfo[i];
if (this.hasAttribute(info.attribute)) {
this._setAttributeToProperty(model, info.attribute, i, info);
}
}
}
},
_setAttributeToProperty: function (model, attribute, property, info) {
if (!this._serializing) {
property = property || Polymer.CaseMap.dashToCamelCase(attribute);
info = info || this._propertyInfo && this._propertyInfo[property];
if (info && !info.readOnly) {
var v = this.getAttribute(attribute);
model[property] = this.deserialize(v, info.type);
}
}
},
_serializing: false,
reflectPropertyToAttribute: function (property, attribute, value) {
this._serializing = true;
value = value === undefined ? this[property] : value;
this.serializeValueToAttribute(value, attribute || Polymer.CaseMap.camelToDashCase(property));
this._serializing = false;
},
serializeValueToAttribute: function (value, attribute, node) {
var str = this.serialize(value);
node = node || this;
if (str === undefined) {
node.removeAttribute(attribute);
} else {
node.setAttribute(attribute, str);
}
},
deserialize: function (value, type) {
switch (type) {
case Number:
value = Number(value);
break;
case Boolean:
value = value != null;
break;
case Object:
try {
value = JSON.parse(value);
} catch (x) {
}
break;
case Array:
try {
value = JSON.parse(value);
} catch (x) {
value = null;
console.warn('Polymer::Attributes: couldn`t decode Array as JSON');
}
break;
case Date:
value = new Date(value);
break;
case String:
default:
break;
}
return value;
},
serialize: function (value) {
switch (typeof value) {
case 'boolean':
return value ? '' : undefined;
case 'object':
if (value instanceof Date) {
return value.toString();
} else if (value) {
try {
return JSON.stringify(value);
} catch (x) {
return '';
}
}
default:
return value != null ? value : undefined;
}
}
});
Polymer.version = '1.6.1';
Polymer.Base._addFeature({
_registerFeatures: function () {
this._prepIs();
this._prepBehaviors();
this._prepConstructor();
this._prepPropertyInfo();
},
_prepBehavior: function (b) {
this._addHostAttributes(b.hostAttributes);
},
_marshalBehavior: function (b) {
},
_initFeatures: function () {
this._marshalHostAttributes();
this._marshalBehaviors();
}
});
Polymer.Base._addFeature({
_prepTemplate: function () {
if (this._template === undefined) {
this._template = Polymer.DomModule.import(this.is, 'template');
}
if (this._template && this._template.hasAttribute('is')) {
this._warn(this._logf('_prepTemplate', 'top-level Polymer template ' + 'must not be a type-extension, found', this._template, 'Move inside simple <template>.'));
}
if (this._template && !this._template.content && window.HTMLTemplateElement && HTMLTemplateElement.decorate) {
HTMLTemplateElement.decorate(this._template);
}
},
_stampTemplate: function () {
if (this._template) {
this.root = this.instanceTemplate(this._template);
}
},
instanceTemplate: function (template) {
var dom = document.importNode(template._content || template.content, true);
return dom;
}
});
(function () {
var baseAttachedCallback = Polymer.Base.attachedCallback;
Polymer.Base._addFeature({
_hostStack: [],
ready: function () {
},
_registerHost: function (host) {
this.dataHost = host = host || Polymer.Base._hostStack[Polymer.Base._hostStack.length - 1];
if (host && host._clients) {
host._clients.push(this);
}
this._clients = null;
this._clientsReadied = false;
},
_beginHosting: function () {
Polymer.Base._hostStack.push(this);
if (!this._clients) {
this._clients = [];
}
},
_endHosting: function () {
Polymer.Base._hostStack.pop();
},
_tryReady: function () {
this._readied = false;
if (this._canReady()) {
this._ready();
}
},
_canReady: function () {
return !this.dataHost || this.dataHost._clientsReadied;
},
_ready: function () {
this._beforeClientsReady();
if (this._template) {
this._setupRoot();
this._readyClients();
}
this._clientsReadied = true;
this._clients = null;
this._afterClientsReady();
this._readySelf();
},
_readyClients: function () {
this._beginDistribute();
var c$ = this._clients;
if (c$) {
for (var i = 0, l = c$.length, c; i < l && (c = c$[i]); i++) {
c._ready();
}
}
this._finishDistribute();
},
_readySelf: function () {
this._doBehavior('ready');
this._readied = true;
if (this._attachedPending) {
this._attachedPending = false;
this.attachedCallback();
}
},
_beforeClientsReady: function () {
},
_afterClientsReady: function () {
},
_beforeAttached: function () {
},
attachedCallback: function () {
if (this._readied) {
this._beforeAttached();
baseAttachedCallback.call(this);
} else {
this._attachedPending = true;
}
}
});
}());
Polymer.ArraySplice = function () {
function newSplice(index, removed, addedCount) {
return {
index: index,
removed: removed,
addedCount: addedCount
};
}
var EDIT_LEAVE = 0;
var EDIT_UPDATE = 1;
var EDIT_ADD = 2;
var EDIT_DELETE = 3;
function ArraySplice() {
}
ArraySplice.prototype = {
calcEditDistances: function (current, currentStart, currentEnd, old, oldStart, oldEnd) {
var rowCount = oldEnd - oldStart + 1;
var columnCount = currentEnd - currentStart + 1;
var distances = new Array(rowCount);
for (var i = 0; i < rowCount; i++) {
distances[i] = new Array(columnCount);
distances[i][0] = i;
}
for (var j = 0; j < columnCount; j++)
distances[0][j] = j;
for (i = 1; i < rowCount; i++) {
for (j = 1; j < columnCount; j++) {
if (this.equals(current[currentStart + j - 1], old[oldStart + i - 1]))
distances[i][j] = distances[i - 1][j - 1];
else {
var north = distances[i - 1][j] + 1;
var west = distances[i][j - 1] + 1;
distances[i][j] = north < west ? north : west;
}
}
}
return distances;
},
spliceOperationsFromEditDistances: function (distances) {
var i = distances.length - 1;
var j = distances[0].length - 1;
var current = distances[i][j];
var edits = [];
while (i > 0 || j > 0) {
if (i == 0) {
edits.push(EDIT_ADD);
j--;
continue;
}
if (j == 0) {
edits.push(EDIT_DELETE);
i--;
continue;
}
var northWest = distances[i - 1][j - 1];
var west = distances[i - 1][j];
var north = distances[i][j - 1];
var min;
if (west < north)
min = west < northWest ? west : northWest;
else
min = north < northWest ? north : northWest;
if (min == northWest) {
if (northWest == current) {
edits.push(EDIT_LEAVE);
} else {
edits.push(EDIT_UPDATE);
current = northWest;
}
i--;
j--;
} else if (min == west) {
edits.push(EDIT_DELETE);
i--;
current = west;
} else {
edits.push(EDIT_ADD);
j--;
current = north;
}
}
edits.reverse();
return edits;
},
calcSplices: function (current, currentStart, currentEnd, old, oldStart, oldEnd) {
var prefixCount = 0;
var suffixCount = 0;
var minLength = Math.min(currentEnd - currentStart, oldEnd - oldStart);
if (currentStart == 0 && oldStart == 0)
prefixCount = this.sharedPrefix(current, old, minLength);
if (currentEnd == current.length && oldEnd == old.length)
suffixCount = this.sharedSuffix(current, old, minLength - prefixCount);
currentStart += prefixCount;
oldStart += prefixCount;
currentEnd -= suffixCount;
oldEnd -= suffixCount;
if (currentEnd - currentStart == 0 && oldEnd - oldStart == 0)
return [];
if (currentStart == currentEnd) {
var splice = newSplice(currentStart, [], 0);
while (oldStart < oldEnd)
splice.removed.push(old[oldStart++]);
return [splice];
} else if (oldStart == oldEnd)
return [newSplice(currentStart, [], currentEnd - currentStart)];
var ops = this.spliceOperationsFromEditDistances(this.calcEditDistances(current, currentStart, currentEnd, old, oldStart, oldEnd));
splice = undefined;
var splices = [];
var index = currentStart;
var oldIndex = oldStart;
for (var i = 0; i < ops.length; i++) {
switch (ops[i]) {
case EDIT_LEAVE:
if (splice) {
splices.push(splice);
splice = undefined;
}
index++;
oldIndex++;
break;
case EDIT_UPDATE:
if (!splice)
splice = newSplice(index, [], 0);
splice.addedCount++;
index++;
splice.removed.push(old[oldIndex]);
oldIndex++;
break;
case EDIT_ADD:
if (!splice)
splice = newSplice(index, [], 0);
splice.addedCount++;
index++;
break;
case EDIT_DELETE:
if (!splice)
splice = newSplice(index, [], 0);
splice.removed.push(old[oldIndex]);
oldIndex++;
break;
}
}
if (splice) {
splices.push(splice);
}
return splices;
},
sharedPrefix: function (current, old, searchLength) {
for (var i = 0; i < searchLength; i++)
if (!this.equals(current[i], old[i]))
return i;
return searchLength;
},
sharedSuffix: function (current, old, searchLength) {
var index1 = current.length;
var index2 = old.length;
var count = 0;
while (count < searchLength && this.equals(current[--index1], old[--index2]))
count++;
return count;
},
calculateSplices: function (current, previous) {
return this.calcSplices(current, 0, current.length, previous, 0, previous.length);
},
equals: function (currentValue, previousValue) {
return currentValue === previousValue;
}
};
return new ArraySplice();
}();
Polymer.domInnerHTML = function () {
var escapeAttrRegExp = /[&\u00A0"]/g;
var escapeDataRegExp = /[&\u00A0<>]/g;
function escapeReplace(c) {
switch (c) {
case '&':
return '&amp;';
case '<':
return '&lt;';
case '>':
return '&gt;';
case '"':
return '&quot;';
case '\xA0':
return '&nbsp;';
}
}
function escapeAttr(s) {
return s.replace(escapeAttrRegExp, escapeReplace);
}
function escapeData(s) {
return s.replace(escapeDataRegExp, escapeReplace);
}
function makeSet(arr) {
var set = {};
for (var i = 0; i < arr.length; i++) {
set[arr[i]] = true;
}
return set;
}
var voidElements = makeSet([
'area',
'base',
'br',
'col',
'command',
'embed',
'hr',
'img',
'input',
'keygen',
'link',
'meta',
'param',
'source',
'track',
'wbr'
]);
var plaintextParents = makeSet([
'style',
'script',
'xmp',
'iframe',
'noembed',
'noframes',
'plaintext',
'noscript'
]);
function getOuterHTML(node, parentNode, composed) {
switch (node.nodeType) {
case Node.ELEMENT_NODE:
var tagName = node.localName;
var s = '<' + tagName;
var attrs = node.attributes;
for (var i = 0, attr; attr = attrs[i]; i++) {
s += ' ' + attr.name + '="' + escapeAttr(attr.value) + '"';
}
s += '>';
if (voidElements[tagName]) {
return s;
}
return s + getInnerHTML(node, composed) + '</' + tagName + '>';
case Node.TEXT_NODE:
var data = node.data;
if (parentNode && plaintextParents[parentNode.localName]) {
return data;
}
return escapeData(data);
case Node.COMMENT_NODE:
return '<!--' + node.data + '-->';
default:
console.error(node);
throw new Error('not implemented');
}
}
function getInnerHTML(node, composed) {
if (node instanceof HTMLTemplateElement)
node = node.content;
var s = '';
var c$ = Polymer.dom(node).childNodes;
for (var i = 0, l = c$.length, child; i < l && (child = c$[i]); i++) {
s += getOuterHTML(child, node, composed);
}
return s;
}
return { getInnerHTML: getInnerHTML };
}();
(function () {
'use strict';
var nativeInsertBefore = Element.prototype.insertBefore;
var nativeAppendChild = Element.prototype.appendChild;
var nativeRemoveChild = Element.prototype.removeChild;
Polymer.TreeApi = {
arrayCopyChildNodes: function (parent) {
var copy = [], i = 0;
for (var n = parent.firstChild; n; n = n.nextSibling) {
copy[i++] = n;
}
return copy;
},
arrayCopyChildren: function (parent) {
var copy = [], i = 0;
for (var n = parent.firstElementChild; n; n = n.nextElementSibling) {
copy[i++] = n;
}
return copy;
},
arrayCopy: function (a$) {
var l = a$.length;
var copy = new Array(l);
for (var i = 0; i < l; i++) {
copy[i] = a$[i];
}
return copy;
}
};
Polymer.TreeApi.Logical = {
hasParentNode: function (node) {
return Boolean(node.__dom && node.__dom.parentNode);
},
hasChildNodes: function (node) {
return Boolean(node.__dom && node.__dom.childNodes !== undefined);
},
getChildNodes: function (node) {
return this.hasChildNodes(node) ? this._getChildNodes(node) : node.childNodes;
},
_getChildNodes: function (node) {
if (!node.__dom.childNodes) {
node.__dom.childNodes = [];
for (var n = node.__dom.firstChild; n; n = n.__dom.nextSibling) {
node.__dom.childNodes.push(n);
}
}
return node.__dom.childNodes;
},
getParentNode: function (node) {
return node.__dom && node.__dom.parentNode !== undefined ? node.__dom.parentNode : node.parentNode;
},
getFirstChild: function (node) {
return node.__dom && node.__dom.firstChild !== undefined ? node.__dom.firstChild : node.firstChild;
},
getLastChild: function (node) {
return node.__dom && node.__dom.lastChild !== undefined ? node.__dom.lastChild : node.lastChild;
},
getNextSibling: function (node) {
return node.__dom && node.__dom.nextSibling !== undefined ? node.__dom.nextSibling : node.nextSibling;
},
getPreviousSibling: function (node) {
return node.__dom && node.__dom.previousSibling !== undefined ? node.__dom.previousSibling : node.previousSibling;
},
getFirstElementChild: function (node) {
return node.__dom && node.__dom.firstChild !== undefined ? this._getFirstElementChild(node) : node.firstElementChild;
},
_getFirstElementChild: function (node) {
var n = node.__dom.firstChild;
while (n && n.nodeType !== Node.ELEMENT_NODE) {
n = n.__dom.nextSibling;
}
return n;
},
getLastElementChild: function (node) {
return node.__dom && node.__dom.lastChild !== undefined ? this._getLastElementChild(node) : node.lastElementChild;
},
_getLastElementChild: function (node) {
var n = node.__dom.lastChild;
while (n && n.nodeType !== Node.ELEMENT_NODE) {
n = n.__dom.previousSibling;
}
return n;
},
getNextElementSibling: function (node) {
return node.__dom && node.__dom.nextSibling !== undefined ? this._getNextElementSibling(node) : node.nextElementSibling;
},
_getNextElementSibling: function (node) {
var n = node.__dom.nextSibling;
while (n && n.nodeType !== Node.ELEMENT_NODE) {
n = n.__dom.nextSibling;
}
return n;
},
getPreviousElementSibling: function (node) {
return node.__dom && node.__dom.previousSibling !== undefined ? this._getPreviousElementSibling(node) : node.previousElementSibling;
},
_getPreviousElementSibling: function (node) {
var n = node.__dom.previousSibling;
while (n && n.nodeType !== Node.ELEMENT_NODE) {
n = n.__dom.previousSibling;
}
return n;
},
saveChildNodes: function (node) {
if (!this.hasChildNodes(node)) {
node.__dom = node.__dom || {};
node.__dom.firstChild = node.firstChild;
node.__dom.lastChild = node.lastChild;
node.__dom.childNodes = [];
for (var n = node.firstChild; n; n = n.nextSibling) {
n.__dom = n.__dom || {};
n.__dom.parentNode = node;
node.__dom.childNodes.push(n);
n.__dom.nextSibling = n.nextSibling;
n.__dom.previousSibling = n.previousSibling;
}
}
},
recordInsertBefore: function (node, container, ref_node) {
container.__dom.childNodes = null;
if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
for (var n = node.firstChild; n; n = n.nextSibling) {
this._linkNode(n, container, ref_node);
}
} else {
this._linkNode(node, container, ref_node);
}
},
_linkNode: function (node, container, ref_node) {
node.__dom = node.__dom || {};
container.__dom = container.__dom || {};
if (ref_node) {
ref_node.__dom = ref_node.__dom || {};
}
node.__dom.previousSibling = ref_node ? ref_node.__dom.previousSibling : container.__dom.lastChild;
if (node.__dom.previousSibling) {
node.__dom.previousSibling.__dom.nextSibling = node;
}
node.__dom.nextSibling = ref_node || null;
if (node.__dom.nextSibling) {
node.__dom.nextSibling.__dom.previousSibling = node;
}
node.__dom.parentNode = container;
if (ref_node) {
if (ref_node === container.__dom.firstChild) {
container.__dom.firstChild = node;
}
} else {
container.__dom.lastChild = node;
if (!container.__dom.firstChild) {
container.__dom.firstChild = node;
}
}
container.__dom.childNodes = null;
},
recordRemoveChild: function (node, container) {
node.__dom = node.__dom || {};
container.__dom = container.__dom || {};
if (node === container.__dom.firstChild) {
container.__dom.firstChild = node.__dom.nextSibling;
}
if (node === container.__dom.lastChild) {
container.__dom.lastChild = node.__dom.previousSibling;
}
var p = node.__dom.previousSibling;
var n = node.__dom.nextSibling;
if (p) {
p.__dom.nextSibling = n;
}
if (n) {
n.__dom.previousSibling = p;
}
node.__dom.parentNode = node.__dom.previousSibling = node.__dom.nextSibling = undefined;
container.__dom.childNodes = null;
}
};
Polymer.TreeApi.Composed = {
getChildNodes: function (node) {
return Polymer.TreeApi.arrayCopyChildNodes(node);
},
getParentNode: function (node) {
return node.parentNode;
},
clearChildNodes: function (node) {
node.textContent = '';
},
insertBefore: function (parentNode, newChild, refChild) {
return nativeInsertBefore.call(parentNode, newChild, refChild || null);
},
appendChild: function (parentNode, newChild) {
return nativeAppendChild.call(parentNode, newChild);
},
removeChild: function (parentNode, node) {
return nativeRemoveChild.call(parentNode, node);
}
};
}());
Polymer.DomApi = function () {
'use strict';
var Settings = Polymer.Settings;
var TreeApi = Polymer.TreeApi;
var DomApi = function (node) {
this.node = needsToWrap ? DomApi.wrap(node) : node;
};
var needsToWrap = Settings.hasShadow && !Settings.nativeShadow;
DomApi.wrap = window.wrap ? window.wrap : function (node) {
return node;
};
DomApi.prototype = {
flush: function () {
Polymer.dom.flush();
},
deepContains: function (node) {
if (this.node.contains(node)) {
return true;
}
var n = node;
var doc = node.ownerDocument;
while (n && n !== doc && n !== this.node) {
n = Polymer.dom(n).parentNode || n.host;
}
return n === this.node;
},
queryDistributedElements: function (selector) {
var c$ = this.getEffectiveChildNodes();
var list = [];
for (var i = 0, l = c$.length, c; i < l && (c = c$[i]); i++) {
if (c.nodeType === Node.ELEMENT_NODE && DomApi.matchesSelector.call(c, selector)) {
list.push(c);
}
}
return list;
},
getEffectiveChildNodes: function () {
var list = [];
var c$ = this.childNodes;
for (var i = 0, l = c$.length, c; i < l && (c = c$[i]); i++) {
if (c.localName === CONTENT) {
var d$ = dom(c).getDistributedNodes();
for (var j = 0; j < d$.length; j++) {
list.push(d$[j]);
}
} else {
list.push(c);
}
}
return list;
},
observeNodes: function (callback) {
if (callback) {
if (!this.observer) {
this.observer = this.node.localName === CONTENT ? new DomApi.DistributedNodesObserver(this) : new DomApi.EffectiveNodesObserver(this);
}
return this.observer.addListener(callback);
}
},
unobserveNodes: function (handle) {
if (this.observer) {
this.observer.removeListener(handle);
}
},
notifyObserver: function () {
if (this.observer) {
this.observer.notify();
}
},
_query: function (matcher, node, halter) {
node = node || this.node;
var list = [];
this._queryElements(TreeApi.Logical.getChildNodes(node), matcher, halter, list);
return list;
},
_queryElements: function (elements, matcher, halter, list) {
for (var i = 0, l = elements.length, c; i < l && (c = elements[i]); i++) {
if (c.nodeType === Node.ELEMENT_NODE) {
if (this._queryElement(c, matcher, halter, list)) {
return true;
}
}
}
},
_queryElement: function (node, matcher, halter, list) {
var result = matcher(node);
if (result) {
list.push(node);
}
if (halter && halter(result)) {
return result;
}
this._queryElements(TreeApi.Logical.getChildNodes(node), matcher, halter, list);
}
};
var CONTENT = DomApi.CONTENT = 'content';
var dom = DomApi.factory = function (node) {
node = node || document;
if (!node.__domApi) {
node.__domApi = new DomApi.ctor(node);
}
return node.__domApi;
};
DomApi.hasApi = function (node) {
return Boolean(node.__domApi);
};
DomApi.ctor = DomApi;
Polymer.dom = function (obj, patch) {
if (obj instanceof Event) {
return Polymer.EventApi.factory(obj);
} else {
return DomApi.factory(obj, patch);
}
};
var p = Element.prototype;
DomApi.matchesSelector = p.matches || p.matchesSelector || p.mozMatchesSelector || p.msMatchesSelector || p.oMatchesSelector || p.webkitMatchesSelector;
return DomApi;
}();
(function () {
'use strict';
var Settings = Polymer.Settings;
var DomApi = Polymer.DomApi;
var dom = DomApi.factory;
var TreeApi = Polymer.TreeApi;
var getInnerHTML = Polymer.domInnerHTML.getInnerHTML;
var CONTENT = DomApi.CONTENT;
if (Settings.useShadow) {
return;
}
var nativeCloneNode = Element.prototype.cloneNode;
var nativeImportNode = Document.prototype.importNode;
Polymer.Base.extend(DomApi.prototype, {
_lazyDistribute: function (host) {
if (host.shadyRoot && host.shadyRoot._distributionClean) {
host.shadyRoot._distributionClean = false;
Polymer.dom.addDebouncer(host.debounce('_distribute', host._distributeContent));
}
},
appendChild: function (node) {
return this.insertBefore(node);
},
insertBefore: function (node, ref_node) {
if (ref_node && TreeApi.Logical.getParentNode(ref_node) !== this.node) {
throw Error('The ref_node to be inserted before is not a child ' + 'of this node');
}
if (node.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) {
var parent = TreeApi.Logical.getParentNode(node);
if (parent) {
if (DomApi.hasApi(parent)) {
dom(parent).notifyObserver();
}
this._removeNode(node);
} else {
this._removeOwnerShadyRoot(node);
}
}
if (!this._addNode(node, ref_node)) {
if (ref_node) {
ref_node = ref_node.localName === CONTENT ? this._firstComposedNode(ref_node) : ref_node;
}
var container = this.node._isShadyRoot ? this.node.host : this.node;
if (ref_node) {
TreeApi.Composed.insertBefore(container, node, ref_node);
} else {
TreeApi.Composed.appendChild(container, node);
}
}
this.notifyObserver();
return node;
},
_addNode: function (node, ref_node) {
var root = this.getOwnerRoot();
if (root) {
var ipAdded = this._maybeAddInsertionPoint(node, this.node);
if (!root._invalidInsertionPoints) {
root._invalidInsertionPoints = ipAdded;
}
this._addNodeToHost(root.host, node);
}
if (TreeApi.Logical.hasChildNodes(this.node)) {
TreeApi.Logical.recordInsertBefore(node, this.node, ref_node);
}
var handled = this._maybeDistribute(node) || this.node.shadyRoot;
if (handled) {
if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
while (node.firstChild) {
TreeApi.Composed.removeChild(node, node.firstChild);
}
} else {
var parent = TreeApi.Composed.getParentNode(node);
if (parent) {
TreeApi.Composed.removeChild(parent, node);
}
}
}
return handled;
},
removeChild: function (node) {
if (TreeApi.Logical.getParentNode(node) !== this.node) {
throw Error('The node to be removed is not a child of this node: ' + node);
}
if (!this._removeNode(node)) {
var container = this.node._isShadyRoot ? this.node.host : this.node;
var parent = TreeApi.Composed.getParentNode(node);
if (container === parent) {
TreeApi.Composed.removeChild(container, node);
}
}
this.notifyObserver();
return node;
},
_removeNode: function (node) {
var logicalParent = TreeApi.Logical.hasParentNode(node) && TreeApi.Logical.getParentNode(node);
var distributed;
var root = this._ownerShadyRootForNode(node);
if (logicalParent) {
distributed = dom(node)._maybeDistributeParent();
TreeApi.Logical.recordRemoveChild(node, logicalParent);
if (root && this._removeDistributedChildren(root, node)) {
root._invalidInsertionPoints = true;
this._lazyDistribute(root.host);
}
}
this._removeOwnerShadyRoot(node);
if (root) {
this._removeNodeFromHost(root.host, node);
}
return distributed;
},
replaceChild: function (node, ref_node) {
this.insertBefore(node, ref_node);
this.removeChild(ref_node);
return node;
},
_hasCachedOwnerRoot: function (node) {
return Boolean(node._ownerShadyRoot !== undefined);
},
getOwnerRoot: function () {
return this._ownerShadyRootForNode(this.node);
},
_ownerShadyRootForNode: function (node) {
if (!node) {
return;
}
var root = node._ownerShadyRoot;
if (root === undefined) {
if (node._isShadyRoot) {
root = node;
} else {
var parent = TreeApi.Logical.getParentNode(node);
if (parent) {
root = parent._isShadyRoot ? parent : this._ownerShadyRootForNode(parent);
} else {
root = null;
}
}
if (root || document.documentElement.contains(node)) {
node._ownerShadyRoot = root;
}
}
return root;
},
_maybeDistribute: function (node) {
var fragContent = node.nodeType === Node.DOCUMENT_FRAGMENT_NODE && !node.__noContent && dom(node).querySelector(CONTENT);
var wrappedContent = fragContent && TreeApi.Logical.getParentNode(fragContent).nodeType !== Node.DOCUMENT_FRAGMENT_NODE;
var hasContent = fragContent || node.localName === CONTENT;
if (hasContent) {
var root = this.getOwnerRoot();
if (root) {
this._lazyDistribute(root.host);
}
}
var needsDist = this._nodeNeedsDistribution(this.node);
if (needsDist) {
this._lazyDistribute(this.node);
}
return needsDist || hasContent && !wrappedContent;
},
_maybeAddInsertionPoint: function (node, parent) {
var added;
if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE && !node.__noContent) {
var c$ = dom(node).querySelectorAll(CONTENT);
for (var i = 0, n, np, na; i < c$.length && (n = c$[i]); i++) {
np = TreeApi.Logical.getParentNode(n);
if (np === node) {
np = parent;
}
na = this._maybeAddInsertionPoint(n, np);
added = added || na;
}
} else if (node.localName === CONTENT) {
TreeApi.Logical.saveChildNodes(parent);
TreeApi.Logical.saveChildNodes(node);
added = true;
}
return added;
},
_updateInsertionPoints: function (host) {
var i$ = host.shadyRoot._insertionPoints = dom(host.shadyRoot).querySelectorAll(CONTENT);
for (var i = 0, c; i < i$.length; i++) {
c = i$[i];
TreeApi.Logical.saveChildNodes(c);
TreeApi.Logical.saveChildNodes(TreeApi.Logical.getParentNode(c));
}
},
_nodeNeedsDistribution: function (node) {
return node && node.shadyRoot && DomApi.hasInsertionPoint(node.shadyRoot);
},
_addNodeToHost: function (host, node) {
if (host._elementAdd) {
host._elementAdd(node);
}
},
_removeNodeFromHost: function (host, node) {
if (host._elementRemove) {
host._elementRemove(node);
}
},
_removeDistributedChildren: function (root, container) {
var hostNeedsDist;
var ip$ = root._insertionPoints;
for (var i = 0; i < ip$.length; i++) {
var content = ip$[i];
if (this._contains(container, content)) {
var dc$ = dom(content).getDistributedNodes();
for (var j = 0; j < dc$.length; j++) {
hostNeedsDist = true;
var node = dc$[j];
var parent = TreeApi.Composed.getParentNode(node);
if (parent) {
TreeApi.Composed.removeChild(parent, node);
}
}
}
}
return hostNeedsDist;
},
_contains: function (container, node) {
while (node) {
if (node == container) {
return true;
}
node = TreeApi.Logical.getParentNode(node);
}
},
_removeOwnerShadyRoot: function (node) {
if (this._hasCachedOwnerRoot(node)) {
var c$ = TreeApi.Logical.getChildNodes(node);
for (var i = 0, l = c$.length, n; i < l && (n = c$[i]); i++) {
this._removeOwnerShadyRoot(n);
}
}
node._ownerShadyRoot = undefined;
},
_firstComposedNode: function (content) {
var n$ = dom(content).getDistributedNodes();
for (var i = 0, l = n$.length, n, p$; i < l && (n = n$[i]); i++) {
p$ = dom(n).getDestinationInsertionPoints();
if (p$[p$.length - 1] === content) {
return n;
}
}
},
querySelector: function (selector) {
var result = this._query(function (n) {
return DomApi.matchesSelector.call(n, selector);
}, this.node, function (n) {
return Boolean(n);
})[0];
return result || null;
},
querySelectorAll: function (selector) {
return this._query(function (n) {
return DomApi.matchesSelector.call(n, selector);
}, this.node);
},
getDestinationInsertionPoints: function () {
return this.node._destinationInsertionPoints || [];
},
getDistributedNodes: function () {
return this.node._distributedNodes || [];
},
_clear: function () {
while (this.childNodes.length) {
this.removeChild(this.childNodes[0]);
}
},
setAttribute: function (name, value) {
this.node.setAttribute(name, value);
this._maybeDistributeParent();
},
removeAttribute: function (name) {
this.node.removeAttribute(name);
this._maybeDistributeParent();
},
_maybeDistributeParent: function () {
if (this._nodeNeedsDistribution(this.parentNode)) {
this._lazyDistribute(this.parentNode);
return true;
}
},
cloneNode: function (deep) {
var n = nativeCloneNode.call(this.node, false);
if (deep) {
var c$ = this.childNodes;
var d = dom(n);
for (var i = 0, nc; i < c$.length; i++) {
nc = dom(c$[i]).cloneNode(true);
d.appendChild(nc);
}
}
return n;
},
importNode: function (externalNode, deep) {
var doc = this.node instanceof Document ? this.node : this.node.ownerDocument;
var n = nativeImportNode.call(doc, externalNode, false);
if (deep) {
var c$ = TreeApi.Logical.getChildNodes(externalNode);
var d = dom(n);
for (var i = 0, nc; i < c$.length; i++) {
nc = dom(doc).importNode(c$[i], true);
d.appendChild(nc);
}
}
return n;
},
_getComposedInnerHTML: function () {
return getInnerHTML(this.node, true);
}
});
Object.defineProperties(DomApi.prototype, {
activeElement: {
get: function () {
var active = document.activeElement;
if (!active) {
return null;
}
var isShadyRoot = !!this.node._isShadyRoot;
if (this.node !== document) {
if (!isShadyRoot) {
return null;
}
if (this.node.host === active || !this.node.host.contains(active)) {
return null;
}
}
var activeRoot = dom(active).getOwnerRoot();
while (activeRoot && activeRoot !== this.node) {
active = activeRoot.host;
activeRoot = dom(active).getOwnerRoot();
}
if (this.node === document) {
return activeRoot ? null : active;
} else {
return activeRoot === this.node ? active : null;
}
},
configurable: true
},
childNodes: {
get: function () {
var c$ = TreeApi.Logical.getChildNodes(this.node);
return Array.isArray(c$) ? c$ : TreeApi.arrayCopyChildNodes(this.node);
},
configurable: true
},
children: {
get: function () {
if (TreeApi.Logical.hasChildNodes(this.node)) {
return Array.prototype.filter.call(this.childNodes, function (n) {
return n.nodeType === Node.ELEMENT_NODE;
});
} else {
return TreeApi.arrayCopyChildren(this.node);
}
},
configurable: true
},
parentNode: {
get: function () {
return TreeApi.Logical.getParentNode(this.node);
},
configurable: true
},
firstChild: {
get: function () {
return TreeApi.Logical.getFirstChild(this.node);
},
configurable: true
},
lastChild: {
get: function () {
return TreeApi.Logical.getLastChild(this.node);
},
configurable: true
},
nextSibling: {
get: function () {
return TreeApi.Logical.getNextSibling(this.node);
},
configurable: true
},
previousSibling: {
get: function () {
return TreeApi.Logical.getPreviousSibling(this.node);
},
configurable: true
},
firstElementChild: {
get: function () {
return TreeApi.Logical.getFirstElementChild(this.node);
},
configurable: true
},
lastElementChild: {
get: function () {
return TreeApi.Logical.getLastElementChild(this.node);
},
configurable: true
},
nextElementSibling: {
get: function () {
return TreeApi.Logical.getNextElementSibling(this.node);
},
configurable: true
},
previousElementSibling: {
get: function () {
return TreeApi.Logical.getPreviousElementSibling(this.node);
},
configurable: true
},
textContent: {
get: function () {
var nt = this.node.nodeType;
if (nt === Node.TEXT_NODE || nt === Node.COMMENT_NODE) {
return this.node.textContent;
} else {
var tc = [];
for (var i = 0, cn = this.childNodes, c; c = cn[i]; i++) {
if (c.nodeType !== Node.COMMENT_NODE) {
tc.push(c.textContent);
}
}
return tc.join('');
}
},
set: function (text) {
var nt = this.node.nodeType;
if (nt === Node.TEXT_NODE || nt === Node.COMMENT_NODE) {
this.node.textContent = text;
} else {
this._clear();
if (text) {
this.appendChild(document.createTextNode(text));
}
}
},
configurable: true
},
innerHTML: {
get: function () {
var nt = this.node.nodeType;
if (nt === Node.TEXT_NODE || nt === Node.COMMENT_NODE) {
return null;
} else {
return getInnerHTML(this.node);
}
},
set: function (text) {
var nt = this.node.nodeType;
if (nt !== Node.TEXT_NODE || nt !== Node.COMMENT_NODE) {
this._clear();
var d = document.createElement('div');
d.innerHTML = text;
var c$ = TreeApi.arrayCopyChildNodes(d);
for (var i = 0; i < c$.length; i++) {
this.appendChild(c$[i]);
}
}
},
configurable: true
}
});
DomApi.hasInsertionPoint = function (root) {
return Boolean(root && root._insertionPoints.length);
};
}());
(function () {
'use strict';
var Settings = Polymer.Settings;
var TreeApi = Polymer.TreeApi;
var DomApi = Polymer.DomApi;
if (!Settings.useShadow) {
return;
}
Polymer.Base.extend(DomApi.prototype, {
querySelectorAll: function (selector) {
return TreeApi.arrayCopy(this.node.querySelectorAll(selector));
},
getOwnerRoot: function () {
var n = this.node;
while (n) {
if (n.nodeType === Node.DOCUMENT_FRAGMENT_NODE && n.host) {
return n;
}
n = n.parentNode;
}
},
importNode: function (externalNode, deep) {
var doc = this.node instanceof Document ? this.node : this.node.ownerDocument;
return doc.importNode(externalNode, deep);
},
getDestinationInsertionPoints: function () {
var n$ = this.node.getDestinationInsertionPoints && this.node.getDestinationInsertionPoints();
return n$ ? TreeApi.arrayCopy(n$) : [];
},
getDistributedNodes: function () {
var n$ = this.node.getDistributedNodes && this.node.getDistributedNodes();
return n$ ? TreeApi.arrayCopy(n$) : [];
}
});
Object.defineProperties(DomApi.prototype, {
activeElement: {
get: function () {
var node = DomApi.wrap(this.node);
var activeElement = node.activeElement;
return node.contains(activeElement) ? activeElement : null;
},
configurable: true
},
childNodes: {
get: function () {
return TreeApi.arrayCopyChildNodes(this.node);
},
configurable: true
},
children: {
get: function () {
return TreeApi.arrayCopyChildren(this.node);
},
configurable: true
},
textContent: {
get: function () {
return this.node.textContent;
},
set: function (value) {
return this.node.textContent = value;
},
configurable: true
},
innerHTML: {
get: function () {
return this.node.innerHTML;
},
set: function (value) {
return this.node.innerHTML = value;
},
configurable: true
}
});
var forwardMethods = function (m$) {
for (var i = 0; i < m$.length; i++) {
forwardMethod(m$[i]);
}
};
var forwardMethod = function (method) {
DomApi.prototype[method] = function () {
return this.node[method].apply(this.node, arguments);
};
};
forwardMethods([
'cloneNode',
'appendChild',
'insertBefore',
'removeChild',
'replaceChild',
'setAttribute',
'removeAttribute',
'querySelector'
]);
var forwardProperties = function (f$) {
for (var i = 0; i < f$.length; i++) {
forwardProperty(f$[i]);
}
};
var forwardProperty = function (name) {
Object.defineProperty(DomApi.prototype, name, {
get: function () {
return this.node[name];
},
configurable: true
});
};
forwardProperties([
'parentNode',
'firstChild',
'lastChild',
'nextSibling',
'previousSibling',
'firstElementChild',
'lastElementChild',
'nextElementSibling',
'previousElementSibling'
]);
}());
Polymer.Base.extend(Polymer.dom, {
_flushGuard: 0,
_FLUSH_MAX: 100,
_needsTakeRecords: !Polymer.Settings.useNativeCustomElements,
_debouncers: [],
_staticFlushList: [],
_finishDebouncer: null,
flush: function () {
this._flushGuard = 0;
this._prepareFlush();
while (this._debouncers.length && this._flushGuard < this._FLUSH_MAX) {
while (this._debouncers.length) {
this._debouncers.shift().complete();
}
if (this._finishDebouncer) {
this._finishDebouncer.complete();
}
this._prepareFlush();
this._flushGuard++;
}
if (this._flushGuard >= this._FLUSH_MAX) {
console.warn('Polymer.dom.flush aborted. Flush may not be complete.');
}
},
_prepareFlush: function () {
if (this._needsTakeRecords) {
CustomElements.takeRecords();
}
for (var i = 0; i < this._staticFlushList.length; i++) {
this._staticFlushList[i]();
}
},
addStaticFlush: function (fn) {
this._staticFlushList.push(fn);
},
removeStaticFlush: function (fn) {
var i = this._staticFlushList.indexOf(fn);
if (i >= 0) {
this._staticFlushList.splice(i, 1);
}
},
addDebouncer: function (debouncer) {
this._debouncers.push(debouncer);
this._finishDebouncer = Polymer.Debounce(this._finishDebouncer, this._finishFlush);
},
_finishFlush: function () {
Polymer.dom._debouncers = [];
}
});
Polymer.EventApi = function () {
'use strict';
var DomApi = Polymer.DomApi.ctor;
var Settings = Polymer.Settings;
DomApi.Event = function (event) {
this.event = event;
};
if (Settings.useShadow) {
DomApi.Event.prototype = {
get rootTarget() {
return this.event.path[0];
},
get localTarget() {
return this.event.target;
},
get path() {
var path = this.event.path;
if (!Array.isArray(path)) {
path = Array.prototype.slice.call(path);
}
return path;
}
};
} else {
DomApi.Event.prototype = {
get rootTarget() {
return this.event.target;
},
get localTarget() {
var current = this.event.currentTarget;
var currentRoot = current && Polymer.dom(current).getOwnerRoot();
var p$ = this.path;
for (var i = 0; i < p$.length; i++) {
if (Polymer.dom(p$[i]).getOwnerRoot() === currentRoot) {
return p$[i];
}
}
},
get path() {
if (!this.event._path) {
var path = [];
var current = this.rootTarget;
while (current) {
path.push(current);
var insertionPoints = Polymer.dom(current).getDestinationInsertionPoints();
if (insertionPoints.length) {
for (var i = 0; i < insertionPoints.length - 1; i++) {
path.push(insertionPoints[i]);
}
current = insertionPoints[insertionPoints.length - 1];
} else {
current = Polymer.dom(current).parentNode || current.host;
}
}
path.push(window);
this.event._path = path;
}
return this.event._path;
}
};
}
var factory = function (event) {
if (!event.__eventApi) {
event.__eventApi = new DomApi.Event(event);
}
return event.__eventApi;
};
return { factory: factory };
}();
(function () {
'use strict';
var DomApi = Polymer.DomApi.ctor;
var useShadow = Polymer.Settings.useShadow;
Object.defineProperty(DomApi.prototype, 'classList', {
get: function () {
if (!this._classList) {
this._classList = new DomApi.ClassList(this);
}
return this._classList;
},
configurable: true
});
DomApi.ClassList = function (host) {
this.domApi = host;
this.node = host.node;
};
DomApi.ClassList.prototype = {
add: function () {
this.node.classList.add.apply(this.node.classList, arguments);
this._distributeParent();
},
remove: function () {
this.node.classList.remove.apply(this.node.classList, arguments);
this._distributeParent();
},
toggle: function () {
this.node.classList.toggle.apply(this.node.classList, arguments);
this._distributeParent();
},
_distributeParent: function () {
if (!useShadow) {
this.domApi._maybeDistributeParent();
}
},
contains: function () {
return this.node.classList.contains.apply(this.node.classList, arguments);
}
};
}());
(function () {
'use strict';
var DomApi = Polymer.DomApi.ctor;
var Settings = Polymer.Settings;
DomApi.EffectiveNodesObserver = function (domApi) {
this.domApi = domApi;
this.node = this.domApi.node;
this._listeners = [];
};
DomApi.EffectiveNodesObserver.prototype = {
addListener: function (callback) {
if (!this._isSetup) {
this._setup();
this._isSetup = true;
}
var listener = {
fn: callback,
_nodes: []
};
this._listeners.push(listener);
this._scheduleNotify();
return listener;
},
removeListener: function (handle) {
var i = this._listeners.indexOf(handle);
if (i >= 0) {
this._listeners.splice(i, 1);
handle._nodes = [];
}
if (!this._hasListeners()) {
this._cleanup();
this._isSetup = false;
}
},
_setup: function () {
this._observeContentElements(this.domApi.childNodes);
},
_cleanup: function () {
this._unobserveContentElements(this.domApi.childNodes);
},
_hasListeners: function () {
return Boolean(this._listeners.length);
},
_scheduleNotify: function () {
if (this._debouncer) {
this._debouncer.stop();
}
this._debouncer = Polymer.Debounce(this._debouncer, this._notify);
this._debouncer.context = this;
Polymer.dom.addDebouncer(this._debouncer);
},
notify: function () {
if (this._hasListeners()) {
this._scheduleNotify();
}
},
_notify: function () {
this._beforeCallListeners();
this._callListeners();
},
_beforeCallListeners: function () {
this._updateContentElements();
},
_updateContentElements: function () {
this._observeContentElements(this.domApi.childNodes);
},
_observeContentElements: function (elements) {
for (var i = 0, n; i < elements.length && (n = elements[i]); i++) {
if (this._isContent(n)) {
n.__observeNodesMap = n.__observeNodesMap || new WeakMap();
if (!n.__observeNodesMap.has(this)) {
n.__observeNodesMap.set(this, this._observeContent(n));
}
}
}
},
_observeContent: function (content) {
var self = this;
var h = Polymer.dom(content).observeNodes(function () {
self._scheduleNotify();
});
h._avoidChangeCalculation = true;
return h;
},
_unobserveContentElements: function (elements) {
for (var i = 0, n, h; i < elements.length && (n = elements[i]); i++) {
if (this._isContent(n)) {
h = n.__observeNodesMap.get(this);
if (h) {
Polymer.dom(n).unobserveNodes(h);
n.__observeNodesMap.delete(this);
}
}
}
},
_isContent: function (node) {
return node.localName === 'content';
},
_callListeners: function () {
var o$ = this._listeners;
var nodes = this._getEffectiveNodes();
for (var i = 0, o; i < o$.length && (o = o$[i]); i++) {
var info = this._generateListenerInfo(o, nodes);
if (info || o._alwaysNotify) {
this._callListener(o, info);
}
}
},
_getEffectiveNodes: function () {
return this.domApi.getEffectiveChildNodes();
},
_generateListenerInfo: function (listener, newNodes) {
if (listener._avoidChangeCalculation) {
return true;
}
var oldNodes = listener._nodes;
var info = {
target: this.node,
addedNodes: [],
removedNodes: []
};
var splices = Polymer.ArraySplice.calculateSplices(newNodes, oldNodes);
for (var i = 0, s; i < splices.length && (s = splices[i]); i++) {
for (var j = 0, n; j < s.removed.length && (n = s.removed[j]); j++) {
info.removedNodes.push(n);
}
}
for (i = 0, s; i < splices.length && (s = splices[i]); i++) {
for (j = s.index; j < s.index + s.addedCount; j++) {
info.addedNodes.push(newNodes[j]);
}
}
listener._nodes = newNodes;
if (info.addedNodes.length || info.removedNodes.length) {
return info;
}
},
_callListener: function (listener, info) {
return listener.fn.call(this.node, info);
},
enableShadowAttributeTracking: function () {
}
};
if (Settings.useShadow) {
var baseSetup = DomApi.EffectiveNodesObserver.prototype._setup;
var baseCleanup = DomApi.EffectiveNodesObserver.prototype._cleanup;
Polymer.Base.extend(DomApi.EffectiveNodesObserver.prototype, {
_setup: function () {
if (!this._observer) {
var self = this;
this._mutationHandler = function (mxns) {
if (mxns && mxns.length) {
self._scheduleNotify();
}
};
this._observer = new MutationObserver(this._mutationHandler);
this._boundFlush = function () {
self._flush();
};
Polymer.dom.addStaticFlush(this._boundFlush);
this._observer.observe(this.node, { childList: true });
}
baseSetup.call(this);
},
_cleanup: function () {
this._observer.disconnect();
this._observer = null;
this._mutationHandler = null;
Polymer.dom.removeStaticFlush(this._boundFlush);
baseCleanup.call(this);
},
_flush: function () {
if (this._observer) {
this._mutationHandler(this._observer.takeRecords());
}
},
enableShadowAttributeTracking: function () {
if (this._observer) {
this._makeContentListenersAlwaysNotify();
this._observer.disconnect();
this._observer.observe(this.node, {
childList: true,
attributes: true,
subtree: true
});
var root = this.domApi.getOwnerRoot();
var host = root && root.host;
if (host && Polymer.dom(host).observer) {
Polymer.dom(host).observer.enableShadowAttributeTracking();
}
}
},
_makeContentListenersAlwaysNotify: function () {
for (var i = 0, h; i < this._listeners.length; i++) {
h = this._listeners[i];
h._alwaysNotify = h._isContentListener;
}
}
});
}
}());
(function () {
'use strict';
var DomApi = Polymer.DomApi.ctor;
var Settings = Polymer.Settings;
DomApi.DistributedNodesObserver = function (domApi) {
DomApi.EffectiveNodesObserver.call(this, domApi);
};
DomApi.DistributedNodesObserver.prototype = Object.create(DomApi.EffectiveNodesObserver.prototype);
Polymer.Base.extend(DomApi.DistributedNodesObserver.prototype, {
_setup: function () {
},
_cleanup: function () {
},
_beforeCallListeners: function () {
},
_getEffectiveNodes: function () {
return this.domApi.getDistributedNodes();
}
});
if (Settings.useShadow) {
Polymer.Base.extend(DomApi.DistributedNodesObserver.prototype, {
_setup: function () {
if (!this._observer) {
var root = this.domApi.getOwnerRoot();
var host = root && root.host;
if (host) {
var self = this;
this._observer = Polymer.dom(host).observeNodes(function () {
self._scheduleNotify();
});
this._observer._isContentListener = true;
if (this._hasAttrSelect()) {
Polymer.dom(host).observer.enableShadowAttributeTracking();
}
}
}
},
_hasAttrSelect: function () {
var select = this.node.getAttribute('select');
return select && select.match(/[[.]+/);
},
_cleanup: function () {
var root = this.domApi.getOwnerRoot();
var host = root && root.host;
if (host) {
Polymer.dom(host).unobserveNodes(this._observer);
}
this._observer = null;
}
});
}
}());
(function () {
var DomApi = Polymer.DomApi;
var TreeApi = Polymer.TreeApi;
Polymer.Base._addFeature({
_prepShady: function () {
this._useContent = this._useContent || Boolean(this._template);
},
_setupShady: function () {
this.shadyRoot = null;
if (!this.__domApi) {
this.__domApi = null;
}
if (!this.__dom) {
this.__dom = null;
}
if (!this._ownerShadyRoot) {
this._ownerShadyRoot = undefined;
}
},
_poolContent: function () {
if (this._useContent) {
TreeApi.Logical.saveChildNodes(this);
}
},
_setupRoot: function () {
if (this._useContent) {
this._createLocalRoot();
if (!this.dataHost) {
upgradeLogicalChildren(TreeApi.Logical.getChildNodes(this));
}
}
},
_createLocalRoot: function () {
this.shadyRoot = this.root;
this.shadyRoot._distributionClean = false;
this.shadyRoot._hasDistributed = false;
this.shadyRoot._isShadyRoot = true;
this.shadyRoot._dirtyRoots = [];
var i$ = this.shadyRoot._insertionPoints = !this._notes || this._notes._hasContent ? this.shadyRoot.querySelectorAll('content') : [];
TreeApi.Logical.saveChildNodes(this.shadyRoot);
for (var i = 0, c; i < i$.length; i++) {
c = i$[i];
TreeApi.Logical.saveChildNodes(c);
TreeApi.Logical.saveChildNodes(c.parentNode);
}
this.shadyRoot.host = this;
},
get domHost() {
var root = Polymer.dom(this).getOwnerRoot();
return root && root.host;
},
distributeContent: function (updateInsertionPoints) {
if (this.shadyRoot) {
this.shadyRoot._invalidInsertionPoints = this.shadyRoot._invalidInsertionPoints || updateInsertionPoints;
var host = getTopDistributingHost(this);
Polymer.dom(this)._lazyDistribute(host);
}
},
_distributeContent: function () {
if (this._useContent && !this.shadyRoot._distributionClean) {
if (this.shadyRoot._invalidInsertionPoints) {
Polymer.dom(this)._updateInsertionPoints(this);
this.shadyRoot._invalidInsertionPoints = false;
}
this._beginDistribute();
this._distributeDirtyRoots();
this._finishDistribute();
}
},
_beginDistribute: function () {
if (this._useContent && DomApi.hasInsertionPoint(this.shadyRoot)) {
this._resetDistribution();
this._distributePool(this.shadyRoot, this._collectPool());
}
},
_distributeDirtyRoots: function () {
var c$ = this.shadyRoot._dirtyRoots;
for (var i = 0, l = c$.length, c; i < l && (c = c$[i]); i++) {
c._distributeContent();
}
this.shadyRoot._dirtyRoots = [];
},
_finishDistribute: function () {
if (this._useContent) {
this.shadyRoot._distributionClean = true;
if (DomApi.hasInsertionPoint(this.shadyRoot)) {
this._composeTree();
notifyContentObservers(this.shadyRoot);
} else {
if (!this.shadyRoot._hasDistributed) {
TreeApi.Composed.clearChildNodes(this);
this.appendChild(this.shadyRoot);
} else {
var children = this._composeNode(this);
this._updateChildNodes(this, children);
}
}
if (!this.shadyRoot._hasDistributed) {
notifyInitialDistribution(this);
}
this.shadyRoot._hasDistributed = true;
}
},
elementMatches: function (selector, node) {
node = node || this;
return DomApi.matchesSelector.call(node, selector);
},
_resetDistribution: function () {
var children = TreeApi.Logical.getChildNodes(this);
for (var i = 0; i < children.length; i++) {
var child = children[i];
if (child._destinationInsertionPoints) {
child._destinationInsertionPoints = undefined;
}
if (isInsertionPoint(child)) {
clearDistributedDestinationInsertionPoints(child);
}
}
var root = this.shadyRoot;
var p$ = root._insertionPoints;
for (var j = 0; j < p$.length; j++) {
p$[j]._distributedNodes = [];
}
},
_collectPool: function () {
var pool = [];
var children = TreeApi.Logical.getChildNodes(this);
for (var i = 0; i < children.length; i++) {
var child = children[i];
if (isInsertionPoint(child)) {
pool.push.apply(pool, child._distributedNodes);
} else {
pool.push(child);
}
}
return pool;
},
_distributePool: function (node, pool) {
var p$ = node._insertionPoints;
for (var i = 0, l = p$.length, p; i < l && (p = p$[i]); i++) {
this._distributeInsertionPoint(p, pool);
maybeRedistributeParent(p, this);
}
},
_distributeInsertionPoint: function (content, pool) {
var anyDistributed = false;
for (var i = 0, l = pool.length, node; i < l; i++) {
node = pool[i];
if (!node) {
continue;
}
if (this._matchesContentSelect(node, content)) {
distributeNodeInto(node, content);
pool[i] = undefined;
anyDistributed = true;
}
}
if (!anyDistributed) {
var children = TreeApi.Logical.getChildNodes(content);
for (var j = 0; j < children.length; j++) {
distributeNodeInto(children[j], content);
}
}
},
_composeTree: function () {
this._updateChildNodes(this, this._composeNode(this));
var p$ = this.shadyRoot._insertionPoints;
for (var i = 0, l = p$.length, p, parent; i < l && (p = p$[i]); i++) {
parent = TreeApi.Logical.getParentNode(p);
if (!parent._useContent && parent !== this && parent !== this.shadyRoot) {
this._updateChildNodes(parent, this._composeNode(parent));
}
}
},
_composeNode: function (node) {
var children = [];
var c$ = TreeApi.Logical.getChildNodes(node.shadyRoot || node);
for (var i = 0; i < c$.length; i++) {
var child = c$[i];
if (isInsertionPoint(child)) {
var distributedNodes = child._distributedNodes;
for (var j = 0; j < distributedNodes.length; j++) {
var distributedNode = distributedNodes[j];
if (isFinalDestination(child, distributedNode)) {
children.push(distributedNode);
}
}
} else {
children.push(child);
}
}
return children;
},
_updateChildNodes: function (container, children) {
var composed = TreeApi.Composed.getChildNodes(container);
var splices = Polymer.ArraySplice.calculateSplices(children, composed);
for (var i = 0, d = 0, s; i < splices.length && (s = splices[i]); i++) {
for (var j = 0, n; j < s.removed.length && (n = s.removed[j]); j++) {
if (TreeApi.Composed.getParentNode(n) === container) {
TreeApi.Composed.removeChild(container, n);
}
composed.splice(s.index + d, 1);
}
d -= s.addedCount;
}
for (var i = 0, s, next; i < splices.length && (s = splices[i]); i++) {
next = composed[s.index];
for (j = s.index, n; j < s.index + s.addedCount; j++) {
n = children[j];
TreeApi.Composed.insertBefore(container, n, next);
composed.splice(j, 0, n);
}
}
},
_matchesContentSelect: function (node, contentElement) {
var select = contentElement.getAttribute('select');
if (!select) {
return true;
}
select = select.trim();
if (!select) {
return true;
}
if (!(node instanceof Element)) {
return false;
}
var validSelectors = /^(:not\()?[*.#[a-zA-Z_|]/;
if (!validSelectors.test(select)) {
return false;
}
return this.elementMatches(select, node);
},
_elementAdd: function () {
},
_elementRemove: function () {
}
});
function distributeNodeInto(child, insertionPoint) {
insertionPoint._distributedNodes.push(child);
var points = child._destinationInsertionPoints;
if (!points) {
child._destinationInsertionPoints = [insertionPoint];
} else {
points.push(insertionPoint);
}
}
function clearDistributedDestinationInsertionPoints(content) {
var e$ = content._distributedNodes;
if (e$) {
for (var i = 0; i < e$.length; i++) {
var d = e$[i]._destinationInsertionPoints;
if (d) {
d.splice(d.indexOf(content) + 1, d.length);
}
}
}
}
function maybeRedistributeParent(content, host) {
var parent = TreeApi.Logical.getParentNode(content);
if (parent && parent.shadyRoot && DomApi.hasInsertionPoint(parent.shadyRoot) && parent.shadyRoot._distributionClean) {
parent.shadyRoot._distributionClean = false;
host.shadyRoot._dirtyRoots.push(parent);
}
}
function isFinalDestination(insertionPoint, node) {
var points = node._destinationInsertionPoints;
return points && points[points.length - 1] === insertionPoint;
}
function isInsertionPoint(node) {
return node.localName == 'content';
}
function getTopDistributingHost(host) {
while (host && hostNeedsRedistribution(host)) {
host = host.domHost;
}
return host;
}
function hostNeedsRedistribution(host) {
var c$ = TreeApi.Logical.getChildNodes(host);
for (var i = 0, c; i < c$.length; i++) {
c = c$[i];
if (c.localName && c.localName === 'content') {
return host.domHost;
}
}
}
function notifyContentObservers(root) {
for (var i = 0, c; i < root._insertionPoints.length; i++) {
c = root._insertionPoints[i];
if (DomApi.hasApi(c)) {
Polymer.dom(c).notifyObserver();
}
}
}
function notifyInitialDistribution(host) {
if (DomApi.hasApi(host)) {
Polymer.dom(host).notifyObserver();
}
}
var needsUpgrade = window.CustomElements && !CustomElements.useNative;
function upgradeLogicalChildren(children) {
if (needsUpgrade && children) {
for (var i = 0; i < children.length; i++) {
CustomElements.upgrade(children[i]);
}
}
}
}());
if (Polymer.Settings.useShadow) {
Polymer.Base._addFeature({
_poolContent: function () {
},
_beginDistribute: function () {
},
distributeContent: function () {
},
_distributeContent: function () {
},
_finishDistribute: function () {
},
_createLocalRoot: function () {
this.createShadowRoot();
this.shadowRoot.appendChild(this.root);
this.root = this.shadowRoot;
}
});
}
Polymer.Async = {
_currVal: 0,
_lastVal: 0,
_callbacks: [],
_twiddleContent: 0,
_twiddle: document.createTextNode(''),
run: function (callback, waitTime) {
if (waitTime > 0) {
return ~setTimeout(callback, waitTime);
} else {
this._twiddle.textContent = this._twiddleContent++;
this._callbacks.push(callback);
return this._currVal++;
}
},
cancel: function (handle) {
if (handle < 0) {
clearTimeout(~handle);
} else {
var idx = handle - this._lastVal;
if (idx >= 0) {
if (!this._callbacks[idx]) {
throw 'invalid async handle: ' + handle;
}
this._callbacks[idx] = null;
}
}
},
_atEndOfMicrotask: function () {
var len = this._callbacks.length;
for (var i = 0; i < len; i++) {
var cb = this._callbacks[i];
if (cb) {
try {
cb();
} catch (e) {
i++;
this._callbacks.splice(0, i);
this._lastVal += i;
this._twiddle.textContent = this._twiddleContent++;
throw e;
}
}
}
this._callbacks.splice(0, len);
this._lastVal += len;
}
};
new window.MutationObserver(function () {
Polymer.Async._atEndOfMicrotask();
}).observe(Polymer.Async._twiddle, { characterData: true });
Polymer.Debounce = function () {
var Async = Polymer.Async;
var Debouncer = function (context) {
this.context = context;
var self = this;
this.boundComplete = function () {
self.complete();
};
};
Debouncer.prototype = {
go: function (callback, wait) {
var h;
this.finish = function () {
Async.cancel(h);
};
h = Async.run(this.boundComplete, wait);
this.callback = callback;
},
stop: function () {
if (this.finish) {
this.finish();
this.finish = null;
this.callback = null;
}
},
complete: function () {
if (this.finish) {
var callback = this.callback;
this.stop();
callback.call(this.context);
}
}
};
function debounce(debouncer, callback, wait) {
if (debouncer) {
debouncer.stop();
} else {
debouncer = new Debouncer(this);
}
debouncer.go(callback, wait);
return debouncer;
}
return debounce;
}();
Polymer.Base._addFeature({
_setupDebouncers: function () {
this._debouncers = {};
},
debounce: function (jobName, callback, wait) {
return this._debouncers[jobName] = Polymer.Debounce.call(this, this._debouncers[jobName], callback, wait);
},
isDebouncerActive: function (jobName) {
var debouncer = this._debouncers[jobName];
return !!(debouncer && debouncer.finish);
},
flushDebouncer: function (jobName) {
var debouncer = this._debouncers[jobName];
if (debouncer) {
debouncer.complete();
}
},
cancelDebouncer: function (jobName) {
var debouncer = this._debouncers[jobName];
if (debouncer) {
debouncer.stop();
}
}
});
Polymer.DomModule = document.createElement('dom-module');
Polymer.Base._addFeature({
_registerFeatures: function () {
this._prepIs();
this._prepBehaviors();
this._prepConstructor();
this._prepTemplate();
this._prepShady();
this._prepPropertyInfo();
},
_prepBehavior: function (b) {
this._addHostAttributes(b.hostAttributes);
},
_initFeatures: function () {
this._registerHost();
if (this._template) {
this._poolContent();
this._beginHosting();
this._stampTemplate();
this._endHosting();
}
this._marshalHostAttributes();
this._setupDebouncers();
this._marshalBehaviors();
this._tryReady();
},
_marshalBehavior: function (b) {
}
});
Polymer.nar = [];
Polymer.Annotations = {
parseAnnotations: function (template) {
var list = [];
var content = template._content || template.content;
this._parseNodeAnnotations(content, list, template.hasAttribute('strip-whitespace'));
return list;
},
_parseNodeAnnotations: function (node, list, stripWhiteSpace) {
return node.nodeType === Node.TEXT_NODE ? this._parseTextNodeAnnotation(node, list) : this._parseElementAnnotations(node, list, stripWhiteSpace);
},
_bindingRegex: function () {
var IDENT = '(?:' + '[a-zA-Z_$][\\w.:$\\-*]*' + ')';
var NUMBER = '(?:' + '[-+]?[0-9]*\\.?[0-9]+(?:[eE][-+]?[0-9]+)?' + ')';
var SQUOTE_STRING = '(?:' + '\'(?:[^\'\\\\]|\\\\.)*\'' + ')';
var DQUOTE_STRING = '(?:' + '"(?:[^"\\\\]|\\\\.)*"' + ')';
var STRING = '(?:' + SQUOTE_STRING + '|' + DQUOTE_STRING + ')';
var ARGUMENT = '(?:' + IDENT + '|' + NUMBER + '|' + STRING + '\\s*' + ')';
var ARGUMENTS = '(?:' + ARGUMENT + '(?:,\\s*' + ARGUMENT + ')*' + ')';
var ARGUMENT_LIST = '(?:' + '\\(\\s*' + '(?:' + ARGUMENTS + '?' + ')' + '\\)\\s*' + ')';
var BINDING = '(' + IDENT + '\\s*' + ARGUMENT_LIST + '?' + ')';
var OPEN_BRACKET = '(\\[\\[|{{)' + '\\s*';
var CLOSE_BRACKET = '(?:]]|}})';
var NEGATE = '(?:(!)\\s*)?';
var EXPRESSION = OPEN_BRACKET + NEGATE + BINDING + CLOSE_BRACKET;
return new RegExp(EXPRESSION, 'g');
}(),
_parseBindings: function (text) {
var re = this._bindingRegex;
var parts = [];
var lastIndex = 0;
var m;
while ((m = re.exec(text)) !== null) {
if (m.index > lastIndex) {
parts.push({ literal: text.slice(lastIndex, m.index) });
}
var mode = m[1][0];
var negate = Boolean(m[2]);
var value = m[3].trim();
var customEvent, notifyEvent, colon;
if (mode == '{' && (colon = value.indexOf('::')) > 0) {
notifyEvent = value.substring(colon + 2);
value = value.substring(0, colon);
customEvent = true;
}
parts.push({
compoundIndex: parts.length,
value: value,
mode: mode,
negate: negate,
event: notifyEvent,
customEvent: customEvent
});
lastIndex = re.lastIndex;
}
if (lastIndex && lastIndex < text.length) {
var literal = text.substring(lastIndex);
if (literal) {
parts.push({ literal: literal });
}
}
if (parts.length) {
return parts;
}
},
_literalFromParts: function (parts) {
var s = '';
for (var i = 0; i < parts.length; i++) {
var literal = parts[i].literal;
s += literal || '';
}
return s;
},
_parseTextNodeAnnotation: function (node, list) {
var parts = this._parseBindings(node.textContent);
if (parts) {
node.textContent = this._literalFromParts(parts) || ' ';
var annote = {
bindings: [{
kind: 'text',
name: 'textContent',
parts: parts,
isCompound: parts.length !== 1
}]
};
list.push(annote);
return annote;
}
},
_parseElementAnnotations: function (element, list, stripWhiteSpace) {
var annote = {
bindings: [],
events: []
};
if (element.localName === 'content') {
list._hasContent = true;
}
this._parseChildNodesAnnotations(element, annote, list, stripWhiteSpace);
if (element.attributes) {
this._parseNodeAttributeAnnotations(element, annote, list);
if (this.prepElement) {
this.prepElement(element);
}
}
if (annote.bindings.length || annote.events.length || annote.id) {
list.push(annote);
}
return annote;
},
_parseChildNodesAnnotations: function (root, annote, list, stripWhiteSpace) {
if (root.firstChild) {
var node = root.firstChild;
var i = 0;
while (node) {
var next = node.nextSibling;
if (node.localName === 'template' && !node.hasAttribute('preserve-content')) {
this._parseTemplate(node, i, list, annote);
}
if (node.nodeType === Node.TEXT_NODE) {
var n = next;
while (n && n.nodeType === Node.TEXT_NODE) {
node.textContent += n.textContent;
next = n.nextSibling;
root.removeChild(n);
n = next;
}
if (stripWhiteSpace && !node.textContent.trim()) {
root.removeChild(node);
i--;
}
}
if (node.parentNode) {
var childAnnotation = this._parseNodeAnnotations(node, list, stripWhiteSpace);
if (childAnnotation) {
childAnnotation.parent = annote;
childAnnotation.index = i;
}
}
node = next;
i++;
}
}
},
_parseTemplate: function (node, index, list, parent) {
var content = document.createDocumentFragment();
content._notes = this.parseAnnotations(node);
content.appendChild(node.content);
list.push({
bindings: Polymer.nar,
events: Polymer.nar,
templateContent: content,
parent: parent,
index: index
});
},
_parseNodeAttributeAnnotations: function (node, annotation) {
var attrs = Array.prototype.slice.call(node.attributes);
for (var i = attrs.length - 1, a; a = attrs[i]; i--) {
var n = a.name;
var v = a.value;
var b;
if (n.slice(0, 3) === 'on-') {
node.removeAttribute(n);
annotation.events.push({
name: n.slice(3),
value: v
});
} else if (b = this._parseNodeAttributeAnnotation(node, n, v)) {
annotation.bindings.push(b);
} else if (n === 'id') {
annotation.id = v;
}
}
},
_parseNodeAttributeAnnotation: function (node, name, value) {
var parts = this._parseBindings(value);
if (parts) {
var origName = name;
var kind = 'property';
if (name[name.length - 1] == '$') {
name = name.slice(0, -1);
kind = 'attribute';
}
var literal = this._literalFromParts(parts);
if (literal && kind == 'attribute') {
node.setAttribute(name, literal);
}
if (node.localName === 'input' && origName === 'value') {
node.setAttribute(origName, '');
}
node.removeAttribute(origName);
var propertyName = Polymer.CaseMap.dashToCamelCase(name);
if (kind === 'property') {
name = propertyName;
}
return {
kind: kind,
name: name,
propertyName: propertyName,
parts: parts,
literal: literal,
isCompound: parts.length !== 1
};
}
},
findAnnotatedNode: function (root, annote) {
var parent = annote.parent && Polymer.Annotations.findAnnotatedNode(root, annote.parent);
if (parent) {
for (var n = parent.firstChild, i = 0; n; n = n.nextSibling) {
if (annote.index === i++) {
return n;
}
}
} else {
return root;
}
}
};
(function () {
function resolveCss(cssText, ownerDocument) {
return cssText.replace(CSS_URL_RX, function (m, pre, url, post) {
return pre + '\'' + resolve(url.replace(/["']/g, ''), ownerDocument) + '\'' + post;
});
}
function resolveAttrs(element, ownerDocument) {
for (var name in URL_ATTRS) {
var a$ = URL_ATTRS[name];
for (var i = 0, l = a$.length, a, at, v; i < l && (a = a$[i]); i++) {
if (name === '*' || element.localName === name) {
at = element.attributes[a];
v = at && at.value;
if (v && v.search(BINDING_RX) < 0) {
at.value = a === 'style' ? resolveCss(v, ownerDocument) : resolve(v, ownerDocument);
}
}
}
}
}
function resolve(url, ownerDocument) {
if (url && ABS_URL.test(url)) {
return url;
}
var resolver = getUrlResolver(ownerDocument);
resolver.href = url;
return resolver.href || url;
}
var tempDoc;
var tempDocBase;
function resolveUrl(url, baseUri) {
if (!tempDoc) {
tempDoc = document.implementation.createHTMLDocument('temp');
tempDocBase = tempDoc.createElement('base');
tempDoc.head.appendChild(tempDocBase);
}
tempDocBase.href = baseUri;
return resolve(url, tempDoc);
}
function getUrlResolver(ownerDocument) {
return ownerDocument.__urlResolver || (ownerDocument.__urlResolver = ownerDocument.createElement('a'));
}
var CSS_URL_RX = /(url\()([^)]*)(\))/g;
var URL_ATTRS = {
'*': [
'href',
'src',
'style',
'url'
],
form: ['action']
};
var ABS_URL = /(^\/)|(^#)|(^[\w-\d]*:)/;
var BINDING_RX = /\{\{|\[\[/;
Polymer.ResolveUrl = {
resolveCss: resolveCss,
resolveAttrs: resolveAttrs,
resolveUrl: resolveUrl
};
}());
Polymer.Base._addFeature({
_prepAnnotations: function () {
if (!this._template) {
this._notes = [];
} else {
var self = this;
Polymer.Annotations.prepElement = function (element) {
self._prepElement(element);
};
if (this._template._content && this._template._content._notes) {
this._notes = this._template._content._notes;
} else {
this._notes = Polymer.Annotations.parseAnnotations(this._template);
this._processAnnotations(this._notes);
}
Polymer.Annotations.prepElement = null;
}
},
_processAnnotations: function (notes) {
for (var i = 0; i < notes.length; i++) {
var note = notes[i];
for (var j = 0; j < note.bindings.length; j++) {
var b = note.bindings[j];
for (var k = 0; k < b.parts.length; k++) {
var p = b.parts[k];
if (!p.literal) {
var signature = this._parseMethod(p.value);
if (signature) {
p.signature = signature;
} else {
p.model = this._modelForPath(p.value);
}
}
}
}
if (note.templateContent) {
this._processAnnotations(note.templateContent._notes);
var pp = note.templateContent._parentProps = this._discoverTemplateParentProps(note.templateContent._notes);
var bindings = [];
for (var prop in pp) {
var name = '_parent_' + prop;
bindings.push({
index: note.index,
kind: 'property',
name: name,
propertyName: name,
parts: [{
mode: '{',
model: prop,
value: prop
}]
});
}
note.bindings = note.bindings.concat(bindings);
}
}
},
_discoverTemplateParentProps: function (notes) {
var pp = {};
for (var i = 0, n; i < notes.length && (n = notes[i]); i++) {
for (var j = 0, b$ = n.bindings, b; j < b$.length && (b = b$[j]); j++) {
for (var k = 0, p$ = b.parts, p; k < p$.length && (p = p$[k]); k++) {
if (p.signature) {
var args = p.signature.args;
for (var kk = 0; kk < args.length; kk++) {
var model = args[kk].model;
if (model) {
pp[model] = true;
}
}
if (p.signature.dynamicFn) {
pp[p.signature.method] = true;
}
} else {
if (p.model) {
pp[p.model] = true;
}
}
}
}
if (n.templateContent) {
var tpp = n.templateContent._parentProps;
Polymer.Base.mixin(pp, tpp);
}
}
return pp;
},
_prepElement: function (element) {
Polymer.ResolveUrl.resolveAttrs(element, this._template.ownerDocument);
},
_findAnnotatedNode: Polymer.Annotations.findAnnotatedNode,
_marshalAnnotationReferences: function () {
if (this._template) {
this._marshalIdNodes();
this._marshalAnnotatedNodes();
this._marshalAnnotatedListeners();
}
},
_configureAnnotationReferences: function () {
var notes = this._notes;
var nodes = this._nodes;
for (var i = 0; i < notes.length; i++) {
var note = notes[i];
var node = nodes[i];
this._configureTemplateContent(note, node);
this._configureCompoundBindings(note, node);
}
},
_configureTemplateContent: function (note, node) {
if (note.templateContent) {
node._content = note.templateContent;
}
},
_configureCompoundBindings: function (note, node) {
var bindings = note.bindings;
for (var i = 0; i < bindings.length; i++) {
var binding = bindings[i];
if (binding.isCompound) {
var storage = node.__compoundStorage__ || (node.__compoundStorage__ = {});
var parts = binding.parts;
var literals = new Array(parts.length);
for (var j = 0; j < parts.length; j++) {
literals[j] = parts[j].literal;
}
var name = binding.name;
storage[name] = literals;
if (binding.literal && binding.kind == 'property') {
if (node._configValue) {
node._configValue(name, binding.literal);
} else {
node[name] = binding.literal;
}
}
}
}
},
_marshalIdNodes: function () {
this.$ = {};
for (var i = 0, l = this._notes.length, a; i < l && (a = this._notes[i]); i++) {
if (a.id) {
this.$[a.id] = this._findAnnotatedNode(this.root, a);
}
}
},
_marshalAnnotatedNodes: function () {
if (this._notes && this._notes.length) {
var r = new Array(this._notes.length);
for (var i = 0; i < this._notes.length; i++) {
r[i] = this._findAnnotatedNode(this.root, this._notes[i]);
}
this._nodes = r;
}
},
_marshalAnnotatedListeners: function () {
for (var i = 0, l = this._notes.length, a; i < l && (a = this._notes[i]); i++) {
if (a.events && a.events.length) {
var node = this._findAnnotatedNode(this.root, a);
for (var j = 0, e$ = a.events, e; j < e$.length && (e = e$[j]); j++) {
this.listen(node, e.name, e.value);
}
}
}
}
});
Polymer.Base._addFeature({
listeners: {},
_listenListeners: function (listeners) {
var node, name, eventName;
for (eventName in listeners) {
if (eventName.indexOf('.') < 0) {
node = this;
name = eventName;
} else {
name = eventName.split('.');
node = this.$[name[0]];
name = name[1];
}
this.listen(node, name, listeners[eventName]);
}
},
listen: function (node, eventName, methodName) {
var handler = this._recallEventHandler(this, eventName, node, methodName);
if (!handler) {
handler = this._createEventHandler(node, eventName, methodName);
}
if (handler._listening) {
return;
}
this._listen(node, eventName, handler);
handler._listening = true;
},
_boundListenerKey: function (eventName, methodName) {
return eventName + ':' + methodName;
},
_recordEventHandler: function (host, eventName, target, methodName, handler) {
var hbl = host.__boundListeners;
if (!hbl) {
hbl = host.__boundListeners = new WeakMap();
}
var bl = hbl.get(target);
if (!bl) {
bl = {};
hbl.set(target, bl);
}
var key = this._boundListenerKey(eventName, methodName);
bl[key] = handler;
},
_recallEventHandler: function (host, eventName, target, methodName) {
var hbl = host.__boundListeners;
if (!hbl) {
return;
}
var bl = hbl.get(target);
if (!bl) {
return;
}
var key = this._boundListenerKey(eventName, methodName);
return bl[key];
},
_createEventHandler: function (node, eventName, methodName) {
var host = this;
var handler = function (e) {
if (host[methodName]) {
host[methodName](e, e.detail);
} else {
host._warn(host._logf('_createEventHandler', 'listener method `' + methodName + '` not defined'));
}
};
handler._listening = false;
this._recordEventHandler(host, eventName, node, methodName, handler);
return handler;
},
unlisten: function (node, eventName, methodName) {
var handler = this._recallEventHandler(this, eventName, node, methodName);
if (handler) {
this._unlisten(node, eventName, handler);
handler._listening = false;
}
},
_listen: function (node, eventName, handler) {
node.addEventListener(eventName, handler);
},
_unlisten: function (node, eventName, handler) {
node.removeEventListener(eventName, handler);
}
});
(function () {
'use strict';
var wrap = Polymer.DomApi.wrap;
var HAS_NATIVE_TA = typeof document.head.style.touchAction === 'string';
var GESTURE_KEY = '__polymerGestures';
var HANDLED_OBJ = '__polymerGesturesHandled';
var TOUCH_ACTION = '__polymerGesturesTouchAction';
var TAP_DISTANCE = 25;
var TRACK_DISTANCE = 5;
var TRACK_LENGTH = 2;
var MOUSE_TIMEOUT = 2500;
var MOUSE_EVENTS = [
'mousedown',
'mousemove',
'mouseup',
'click'
];
var MOUSE_WHICH_TO_BUTTONS = [
0,
1,
4,
2
];
var MOUSE_HAS_BUTTONS = function () {
try {
return new MouseEvent('test', { buttons: 1 }).buttons === 1;
} catch (e) {
return false;
}
}();
var IS_TOUCH_ONLY = navigator.userAgent.match(/iP(?:[oa]d|hone)|Android/);
var mouseCanceller = function (mouseEvent) {
var sc = mouseEvent.sourceCapabilities;
if (sc && !sc.firesTouchEvents) {
return;
}
mouseEvent[HANDLED_OBJ] = { skip: true };
if (mouseEvent.type === 'click') {
var path = Polymer.dom(mouseEvent).path;
for (var i = 0; i < path.length; i++) {
if (path[i] === POINTERSTATE.mouse.target) {
return;
}
}
mouseEvent.preventDefault();
mouseEvent.stopPropagation();
}
};
function setupTeardownMouseCanceller(setup) {
for (var i = 0, en; i < MOUSE_EVENTS.length; i++) {
en = MOUSE_EVENTS[i];
if (setup) {
document.addEventListener(en, mouseCanceller, true);
} else {
document.removeEventListener(en, mouseCanceller, true);
}
}
}
function ignoreMouse() {
if (IS_TOUCH_ONLY) {
return;
}
if (!POINTERSTATE.mouse.mouseIgnoreJob) {
setupTeardownMouseCanceller(true);
}
var unset = function () {
setupTeardownMouseCanceller();
POINTERSTATE.mouse.target = null;
POINTERSTATE.mouse.mouseIgnoreJob = null;
};
POINTERSTATE.mouse.mouseIgnoreJob = Polymer.Debounce(POINTERSTATE.mouse.mouseIgnoreJob, unset, MOUSE_TIMEOUT);
}
function hasLeftMouseButton(ev) {
var type = ev.type;
if (MOUSE_EVENTS.indexOf(type) === -1) {
return false;
}
if (type === 'mousemove') {
var buttons = ev.buttons === undefined ? 1 : ev.buttons;
if (ev instanceof window.MouseEvent && !MOUSE_HAS_BUTTONS) {
buttons = MOUSE_WHICH_TO_BUTTONS[ev.which] || 0;
}
return Boolean(buttons & 1);
} else {
var button = ev.button === undefined ? 0 : ev.button;
return button === 0;
}
}
function isSyntheticClick(ev) {
if (ev.type === 'click') {
if (ev.detail === 0) {
return true;
}
var t = Gestures.findOriginalTarget(ev);
var bcr = t.getBoundingClientRect();
var x = ev.pageX, y = ev.pageY;
return !(x >= bcr.left && x <= bcr.right && (y >= bcr.top && y <= bcr.bottom));
}
return false;
}
var POINTERSTATE = {
mouse: {
target: null,
mouseIgnoreJob: null
},
touch: {
x: 0,
y: 0,
id: -1,
scrollDecided: false
}
};
function firstTouchAction(ev) {
var path = Polymer.dom(ev).path;
var ta = 'auto';
for (var i = 0, n; i < path.length; i++) {
n = path[i];
if (n[TOUCH_ACTION]) {
ta = n[TOUCH_ACTION];
break;
}
}
return ta;
}
function trackDocument(stateObj, movefn, upfn) {
stateObj.movefn = movefn;
stateObj.upfn = upfn;
document.addEventListener('mousemove', movefn);
document.addEventListener('mouseup', upfn);
}
function untrackDocument(stateObj) {
document.removeEventListener('mousemove', stateObj.movefn);
document.removeEventListener('mouseup', stateObj.upfn);
stateObj.movefn = null;
stateObj.upfn = null;
}
var Gestures = {
gestures: {},
recognizers: [],
deepTargetFind: function (x, y) {
var node = document.elementFromPoint(x, y);
var next = node;
while (next && next.shadowRoot) {
next = next.shadowRoot.elementFromPoint(x, y);
if (next) {
node = next;
}
}
return node;
},
findOriginalTarget: function (ev) {
if (ev.path) {
return ev.path[0];
}
return ev.target;
},
handleNative: function (ev) {
var handled;
var type = ev.type;
var node = wrap(ev.currentTarget);
var gobj = node[GESTURE_KEY];
if (!gobj) {
return;
}
var gs = gobj[type];
if (!gs) {
return;
}
if (!ev[HANDLED_OBJ]) {
ev[HANDLED_OBJ] = {};
if (type.slice(0, 5) === 'touch') {
var t = ev.changedTouches[0];
if (type === 'touchstart') {
if (ev.touches.length === 1) {
POINTERSTATE.touch.id = t.identifier;
}
}
if (POINTERSTATE.touch.id !== t.identifier) {
return;
}
if (!HAS_NATIVE_TA) {
if (type === 'touchstart' || type === 'touchmove') {
Gestures.handleTouchAction(ev);
}
}
if (type === 'touchend') {
POINTERSTATE.mouse.target = Polymer.dom(ev).rootTarget;
ignoreMouse();
}
}
}
handled = ev[HANDLED_OBJ];
if (handled.skip) {
return;
}
var recognizers = Gestures.recognizers;
for (var i = 0, r; i < recognizers.length; i++) {
r = recognizers[i];
if (gs[r.name] && !handled[r.name]) {
if (r.flow && r.flow.start.indexOf(ev.type) > -1 && r.reset) {
r.reset();
}
}
}
for (i = 0, r; i < recognizers.length; i++) {
r = recognizers[i];
if (gs[r.name] && !handled[r.name]) {
handled[r.name] = true;
r[type](ev);
}
}
},
handleTouchAction: function (ev) {
var t = ev.changedTouches[0];
var type = ev.type;
if (type === 'touchstart') {
POINTERSTATE.touch.x = t.clientX;
POINTERSTATE.touch.y = t.clientY;
POINTERSTATE.touch.scrollDecided = false;
} else if (type === 'touchmove') {
if (POINTERSTATE.touch.scrollDecided) {
return;
}
POINTERSTATE.touch.scrollDecided = true;
var ta = firstTouchAction(ev);
var prevent = false;
var dx = Math.abs(POINTERSTATE.touch.x - t.clientX);
var dy = Math.abs(POINTERSTATE.touch.y - t.clientY);
if (!ev.cancelable) {
} else if (ta === 'none') {
prevent = true;
} else if (ta === 'pan-x') {
prevent = dy > dx;
} else if (ta === 'pan-y') {
prevent = dx > dy;
}
if (prevent) {
ev.preventDefault();
} else {
Gestures.prevent('track');
}
}
},
add: function (node, evType, handler) {
node = wrap(node);
var recognizer = this.gestures[evType];
var deps = recognizer.deps;
var name = recognizer.name;
var gobj = node[GESTURE_KEY];
if (!gobj) {
node[GESTURE_KEY] = gobj = {};
}
for (var i = 0, dep, gd; i < deps.length; i++) {
dep = deps[i];
if (IS_TOUCH_ONLY && MOUSE_EVENTS.indexOf(dep) > -1) {
continue;
}
gd = gobj[dep];
if (!gd) {
gobj[dep] = gd = { _count: 0 };
}
if (gd._count === 0) {
node.addEventListener(dep, this.handleNative);
}
gd[name] = (gd[name] || 0) + 1;
gd._count = (gd._count || 0) + 1;
}
node.addEventListener(evType, handler);
if (recognizer.touchAction) {
this.setTouchAction(node, recognizer.touchAction);
}
},
remove: function (node, evType, handler) {
node = wrap(node);
var recognizer = this.gestures[evType];
var deps = recognizer.deps;
var name = recognizer.name;
var gobj = node[GESTURE_KEY];
if (gobj) {
for (var i = 0, dep, gd; i < deps.length; i++) {
dep = deps[i];
gd = gobj[dep];
if (gd && gd[name]) {
gd[name] = (gd[name] || 1) - 1;
gd._count = (gd._count || 1) - 1;
if (gd._count === 0) {
node.removeEventListener(dep, this.handleNative);
}
}
}
}
node.removeEventListener(evType, handler);
},
register: function (recog) {
this.recognizers.push(recog);
for (var i = 0; i < recog.emits.length; i++) {
this.gestures[recog.emits[i]] = recog;
}
},
findRecognizerByEvent: function (evName) {
for (var i = 0, r; i < this.recognizers.length; i++) {
r = this.recognizers[i];
for (var j = 0, n; j < r.emits.length; j++) {
n = r.emits[j];
if (n === evName) {
return r;
}
}
}
return null;
},
setTouchAction: function (node, value) {
if (HAS_NATIVE_TA) {
node.style.touchAction = value;
}
node[TOUCH_ACTION] = value;
},
fire: function (target, type, detail) {
var ev = Polymer.Base.fire(type, detail, {
node: target,
bubbles: true,
cancelable: true
});
if (ev.defaultPrevented) {
var preventer = detail.preventer || detail.sourceEvent;
if (preventer && preventer.preventDefault) {
preventer.preventDefault();
}
}
},
prevent: function (evName) {
var recognizer = this.findRecognizerByEvent(evName);
if (recognizer.info) {
recognizer.info.prevent = true;
}
},
resetMouseCanceller: function () {
if (POINTERSTATE.mouse.mouseIgnoreJob) {
POINTERSTATE.mouse.mouseIgnoreJob.complete();
}
}
};
Gestures.register({
name: 'downup',
deps: [
'mousedown',
'touchstart',
'touchend'
],
flow: {
start: [
'mousedown',
'touchstart'
],
end: [
'mouseup',
'touchend'
]
},
emits: [
'down',
'up'
],
info: {
movefn: null,
upfn: null
},
reset: function () {
untrackDocument(this.info);
},
mousedown: function (e) {
if (!hasLeftMouseButton(e)) {
return;
}
var t = Gestures.findOriginalTarget(e);
var self = this;
var movefn = function movefn(e) {
if (!hasLeftMouseButton(e)) {
self.fire('up', t, e);
untrackDocument(self.info);
}
};
var upfn = function upfn(e) {
if (hasLeftMouseButton(e)) {
self.fire('up', t, e);
}
untrackDocument(self.info);
};
trackDocument(this.info, movefn, upfn);
this.fire('down', t, e);
},
touchstart: function (e) {
this.fire('down', Gestures.findOriginalTarget(e), e.changedTouches[0], e);
},
touchend: function (e) {
this.fire('up', Gestures.findOriginalTarget(e), e.changedTouches[0], e);
},
fire: function (type, target, event, preventer) {
Gestures.fire(target, type, {
x: event.clientX,
y: event.clientY,
sourceEvent: event,
preventer: preventer,
prevent: function (e) {
return Gestures.prevent(e);
}
});
}
});
Gestures.register({
name: 'track',
touchAction: 'none',
deps: [
'mousedown',
'touchstart',
'touchmove',
'touchend'
],
flow: {
start: [
'mousedown',
'touchstart'
],
end: [
'mouseup',
'touchend'
]
},
emits: ['track'],
info: {
x: 0,
y: 0,
state: 'start',
started: false,
moves: [],
addMove: function (move) {
if (this.moves.length > TRACK_LENGTH) {
this.moves.shift();
}
this.moves.push(move);
},
movefn: null,
upfn: null,
prevent: false
},
reset: function () {
this.info.state = 'start';
this.info.started = false;
this.info.moves = [];
this.info.x = 0;
this.info.y = 0;
this.info.prevent = false;
untrackDocument(this.info);
},
hasMovedEnough: function (x, y) {
if (this.info.prevent) {
return false;
}
if (this.info.started) {
return true;
}
var dx = Math.abs(this.info.x - x);
var dy = Math.abs(this.info.y - y);
return dx >= TRACK_DISTANCE || dy >= TRACK_DISTANCE;
},
mousedown: function (e) {
if (!hasLeftMouseButton(e)) {
return;
}
var t = Gestures.findOriginalTarget(e);
var self = this;
var movefn = function movefn(e) {
var x = e.clientX, y = e.clientY;
if (self.hasMovedEnough(x, y)) {
self.info.state = self.info.started ? e.type === 'mouseup' ? 'end' : 'track' : 'start';
if (self.info.state === 'start') {
Gestures.prevent('tap');
}
self.info.addMove({
x: x,
y: y
});
if (!hasLeftMouseButton(e)) {
self.info.state = 'end';
untrackDocument(self.info);
}
self.fire(t, e);
self.info.started = true;
}
};
var upfn = function upfn(e) {
if (self.info.started) {
movefn(e);
}
untrackDocument(self.info);
};
trackDocument(this.info, movefn, upfn);
this.info.x = e.clientX;
this.info.y = e.clientY;
},
touchstart: function (e) {
var ct = e.changedTouches[0];
this.info.x = ct.clientX;
this.info.y = ct.clientY;
},
touchmove: function (e) {
var t = Gestures.findOriginalTarget(e);
var ct = e.changedTouches[0];
var x = ct.clientX, y = ct.clientY;
if (this.hasMovedEnough(x, y)) {
if (this.info.state === 'start') {
Gestures.prevent('tap');
}
this.info.addMove({
x: x,
y: y
});
this.fire(t, ct);
this.info.state = 'track';
this.info.started = true;
}
},
touchend: function (e) {
var t = Gestures.findOriginalTarget(e);
var ct = e.changedTouches[0];
if (this.info.started) {
this.info.state = 'end';
this.info.addMove({
x: ct.clientX,
y: ct.clientY
});
this.fire(t, ct, e);
}
},
fire: function (target, touch, preventer) {
var secondlast = this.info.moves[this.info.moves.length - 2];
var lastmove = this.info.moves[this.info.moves.length - 1];
var dx = lastmove.x - this.info.x;
var dy = lastmove.y - this.info.y;
var ddx, ddy = 0;
if (secondlast) {
ddx = lastmove.x - secondlast.x;
ddy = lastmove.y - secondlast.y;
}
return Gestures.fire(target, 'track', {
state: this.info.state,
x: touch.clientX,
y: touch.clientY,
dx: dx,
dy: dy,
ddx: ddx,
ddy: ddy,
sourceEvent: touch,
preventer: preventer,
hover: function () {
return Gestures.deepTargetFind(touch.clientX, touch.clientY);
}
});
}
});
Gestures.register({
name: 'tap',
deps: [
'mousedown',
'click',
'touchstart',
'touchend'
],
flow: {
start: [
'mousedown',
'touchstart'
],
end: [
'click',
'touchend'
]
},
emits: ['tap'],
info: {
x: NaN,
y: NaN,
prevent: false
},
reset: function () {
this.info.x = NaN;
this.info.y = NaN;
this.info.prevent = false;
},
save: function (e) {
this.info.x = e.clientX;
this.info.y = e.clientY;
},
mousedown: function (e) {
if (hasLeftMouseButton(e)) {
this.save(e);
}
},
click: function (e) {
if (hasLeftMouseButton(e)) {
this.forward(e);
}
},
touchstart: function (e) {
this.save(e.changedTouches[0], e);
},
touchend: function (e) {
this.forward(e.changedTouches[0], e);
},
forward: function (e, preventer) {
var dx = Math.abs(e.clientX - this.info.x);
var dy = Math.abs(e.clientY - this.info.y);
var t = Gestures.findOriginalTarget(e);
if (isNaN(dx) || isNaN(dy) || dx <= TAP_DISTANCE && dy <= TAP_DISTANCE || isSyntheticClick(e)) {
if (!this.info.prevent) {
Gestures.fire(t, 'tap', {
x: e.clientX,
y: e.clientY,
sourceEvent: e,
preventer: preventer
});
}
}
}
});
var DIRECTION_MAP = {
x: 'pan-x',
y: 'pan-y',
none: 'none',
all: 'auto'
};
Polymer.Base._addFeature({
_setupGestures: function () {
this.__polymerGestures = null;
},
_listen: function (node, eventName, handler) {
if (Gestures.gestures[eventName]) {
Gestures.add(node, eventName, handler);
} else {
node.addEventListener(eventName, handler);
}
},
_unlisten: function (node, eventName, handler) {
if (Gestures.gestures[eventName]) {
Gestures.remove(node, eventName, handler);
} else {
node.removeEventListener(eventName, handler);
}
},
setScrollDirection: function (direction, node) {
node = node || this;
Gestures.setTouchAction(node, DIRECTION_MAP[direction] || 'auto');
}
});
Polymer.Gestures = Gestures;
}());
(function () {
'use strict';
Polymer.Base._addFeature({
$$: function (slctr) {
return Polymer.dom(this.root).querySelector(slctr);
},
toggleClass: function (name, bool, node) {
node = node || this;
if (arguments.length == 1) {
bool = !node.classList.contains(name);
}
if (bool) {
Polymer.dom(node).classList.add(name);
} else {
Polymer.dom(node).classList.remove(name);
}
},
toggleAttribute: function (name, bool, node) {
node = node || this;
if (arguments.length == 1) {
bool = !node.hasAttribute(name);
}
if (bool) {
Polymer.dom(node).setAttribute(name, '');
} else {
Polymer.dom(node).removeAttribute(name);
}
},
classFollows: function (name, toElement, fromElement) {
if (fromElement) {
Polymer.dom(fromElement).classList.remove(name);
}
if (toElement) {
Polymer.dom(toElement).classList.add(name);
}
},
attributeFollows: function (name, toElement, fromElement) {
if (fromElement) {
Polymer.dom(fromElement).removeAttribute(name);
}
if (toElement) {
Polymer.dom(toElement).setAttribute(name, '');
}
},
getEffectiveChildNodes: function () {
return Polymer.dom(this).getEffectiveChildNodes();
},
getEffectiveChildren: function () {
var list = Polymer.dom(this).getEffectiveChildNodes();
return list.filter(function (n) {
return n.nodeType === Node.ELEMENT_NODE;
});
},
getEffectiveTextContent: function () {
var cn = this.getEffectiveChildNodes();
var tc = [];
for (var i = 0, c; c = cn[i]; i++) {
if (c.nodeType !== Node.COMMENT_NODE) {
tc.push(Polymer.dom(c).textContent);
}
}
return tc.join('');
},
queryEffectiveChildren: function (slctr) {
var e$ = Polymer.dom(this).queryDistributedElements(slctr);
return e$ && e$[0];
},
queryAllEffectiveChildren: function (slctr) {
return Polymer.dom(this).queryDistributedElements(slctr);
},
getContentChildNodes: function (slctr) {
var content = Polymer.dom(this.root).querySelector(slctr || 'content');
return content ? Polymer.dom(content).getDistributedNodes() : [];
},
getContentChildren: function (slctr) {
return this.getContentChildNodes(slctr).filter(function (n) {
return n.nodeType === Node.ELEMENT_NODE;
});
},
fire: function (type, detail, options) {
options = options || Polymer.nob;
var node = options.node || this;
detail = detail === null || detail === undefined ? {} : detail;
var bubbles = options.bubbles === undefined ? true : options.bubbles;
var cancelable = Boolean(options.cancelable);
var useCache = options._useCache;
var event = this._getEvent(type, bubbles, cancelable, useCache);
event.detail = detail;
if (useCache) {
this.__eventCache[type] = null;
}
node.dispatchEvent(event);
if (useCache) {
this.__eventCache[type] = event;
}
return event;
},
__eventCache: {},
_getEvent: function (type, bubbles, cancelable, useCache) {
var event = useCache && this.__eventCache[type];
if (!event || (event.bubbles != bubbles || event.cancelable != cancelable)) {
event = new Event(type, {
bubbles: Boolean(bubbles),
cancelable: cancelable
});
}
return event;
},
async: function (callback, waitTime) {
var self = this;
return Polymer.Async.run(function () {
callback.call(self);
}, waitTime);
},
cancelAsync: function (handle) {
Polymer.Async.cancel(handle);
},
arrayDelete: function (path, item) {
var index;
if (Array.isArray(path)) {
index = path.indexOf(item);
if (index >= 0) {
return path.splice(index, 1);
}
} else {
var arr = this._get(path);
index = arr.indexOf(item);
if (index >= 0) {
return this.splice(path, index, 1);
}
}
},
transform: function (transform, node) {
node = node || this;
node.style.webkitTransform = transform;
node.style.transform = transform;
},
translate3d: function (x, y, z, node) {
node = node || this;
this.transform('translate3d(' + x + ',' + y + ',' + z + ')', node);
},
importHref: function (href, onload, onerror, optAsync) {
var link = document.createElement('link');
link.rel = 'import';
link.href = href;
var list = Polymer.Base.importHref.imported = Polymer.Base.importHref.imported || {};
var cached = list[link.href];
var imprt = cached || link;
var self = this;
if (onload) {
var loadListener = function (e) {
e.target.__firedLoad = true;
e.target.removeEventListener('load', loadListener);
return onload.call(self, e);
};
imprt.addEventListener('load', loadListener);
}
if (onerror) {
var errorListener = function (e) {
e.target.__firedError = true;
e.target.removeEventListener('error', errorListener);
return onerror.call(self, e);
};
imprt.addEventListener('error', errorListener);
}
if (cached) {
if (cached.__firedLoad) {
cached.dispatchEvent(new Event('load'));
}
if (cached.__firedError) {
cached.dispatchEvent(new Event('error'));
}
} else {
list[link.href] = link;
optAsync = Boolean(optAsync);
if (optAsync) {
link.setAttribute('async', '');
}
document.head.appendChild(link);
}
return imprt;
},
create: function (tag, props) {
var elt = document.createElement(tag);
if (props) {
for (var n in props) {
elt[n] = props[n];
}
}
return elt;
},
isLightDescendant: function (node) {
return this !== node && this.contains(node) && Polymer.dom(this).getOwnerRoot() === Polymer.dom(node).getOwnerRoot();
},
isLocalDescendant: function (node) {
return this.root === Polymer.dom(node).getOwnerRoot();
}
});
if (!Polymer.Settings.useNativeCustomElements) {
var importHref = Polymer.Base.importHref;
Polymer.Base.importHref = function (href, onload, onerror, optAsync) {
CustomElements.ready = false;
var loadFn = function (e) {
CustomElements.upgradeDocumentTree(document);
CustomElements.ready = true;
if (onload) {
return onload.call(this, e);
}
};
return importHref.call(this, href, loadFn, onerror, optAsync);
};
}
}());
Polymer.Bind = {
prepareModel: function (model) {
Polymer.Base.mixin(model, this._modelApi);
},
_modelApi: {
_notifyChange: function (source, event, value) {
value = value === undefined ? this[source] : value;
event = event || Polymer.CaseMap.camelToDashCase(source) + '-changed';
this.fire(event, { value: value }, {
bubbles: false,
cancelable: false,
_useCache: true
});
},
_propertySetter: function (property, value, effects, fromAbove) {
var old = this.__data__[property];
if (old !== value && (old === old || value === value)) {
this.__data__[property] = value;
if (typeof value == 'object') {
this._clearPath(property);
}
if (this._propertyChanged) {
this._propertyChanged(property, value, old);
}
if (effects) {
this._effectEffects(property, value, effects, old, fromAbove);
}
}
return old;
},
__setProperty: function (property, value, quiet, node) {
node = node || this;
var effects = node._propertyEffects && node._propertyEffects[property];
if (effects) {
node._propertySetter(property, value, effects, quiet);
} else if (node[property] !== value) {
node[property] = value;
}
},
_effectEffects: function (property, value, effects, old, fromAbove) {
for (var i = 0, l = effects.length, fx; i < l && (fx = effects[i]); i++) {
fx.fn.call(this, property, this[property], fx.effect, old, fromAbove);
}
},
_clearPath: function (path) {
for (var prop in this.__data__) {
if (prop.indexOf(path + '.') === 0) {
this.__data__[prop] = undefined;
}
}
}
},
ensurePropertyEffects: function (model, property) {
if (!model._propertyEffects) {
model._propertyEffects = {};
}
var fx = model._propertyEffects[property];
if (!fx) {
fx = model._propertyEffects[property] = [];
}
return fx;
},
addPropertyEffect: function (model, property, kind, effect) {
var fx = this.ensurePropertyEffects(model, property);
var propEffect = {
kind: kind,
effect: effect,
fn: Polymer.Bind['_' + kind + 'Effect']
};
fx.push(propEffect);
return propEffect;
},
createBindings: function (model) {
var fx$ = model._propertyEffects;
if (fx$) {
for (var n in fx$) {
var fx = fx$[n];
fx.sort(this._sortPropertyEffects);
this._createAccessors(model, n, fx);
}
}
},
_sortPropertyEffects: function () {
var EFFECT_ORDER = {
'compute': 0,
'annotation': 1,
'annotatedComputation': 2,
'reflect': 3,
'notify': 4,
'observer': 5,
'complexObserver': 6,
'function': 7
};
return function (a, b) {
return EFFECT_ORDER[a.kind] - EFFECT_ORDER[b.kind];
};
}(),
_createAccessors: function (model, property, effects) {
var defun = {
get: function () {
return this.__data__[property];
}
};
var setter = function (value) {
this._propertySetter(property, value, effects);
};
var info = model.getPropertyInfo && model.getPropertyInfo(property);
if (info && info.readOnly) {
if (!info.computed) {
model['_set' + this.upper(property)] = setter;
}
} else {
defun.set = setter;
}
Object.defineProperty(model, property, defun);
},
upper: function (name) {
return name[0].toUpperCase() + name.substring(1);
},
_addAnnotatedListener: function (model, index, property, path, event, negated) {
if (!model._bindListeners) {
model._bindListeners = [];
}
var fn = this._notedListenerFactory(property, path, this._isStructured(path), negated);
var eventName = event || Polymer.CaseMap.camelToDashCase(property) + '-changed';
model._bindListeners.push({
index: index,
property: property,
path: path,
changedFn: fn,
event: eventName
});
},
_isStructured: function (path) {
return path.indexOf('.') > 0;
},
_isEventBogus: function (e, target) {
return e.path && e.path[0] !== target;
},
_notedListenerFactory: function (property, path, isStructured, negated) {
return function (target, value, targetPath) {
if (targetPath) {
this._notifyPath(this._fixPath(path, property, targetPath), value);
} else {
value = target[property];
if (negated) {
value = !value;
}
if (!isStructured) {
this[path] = value;
} else {
if (this.__data__[path] != value) {
this.set(path, value);
}
}
}
};
},
prepareInstance: function (inst) {
inst.__data__ = Object.create(null);
},
setupBindListeners: function (inst) {
var b$ = inst._bindListeners;
for (var i = 0, l = b$.length, info; i < l && (info = b$[i]); i++) {
var node = inst._nodes[info.index];
this._addNotifyListener(node, inst, info.event, info.changedFn);
}
},
_addNotifyListener: function (element, context, event, changedFn) {
element.addEventListener(event, function (e) {
return context._notifyListener(changedFn, e);
});
}
};
Polymer.Base.extend(Polymer.Bind, {
_shouldAddListener: function (effect) {
return effect.name && effect.kind != 'attribute' && effect.kind != 'text' && !effect.isCompound && effect.parts[0].mode === '{';
},
_annotationEffect: function (source, value, effect) {
if (source != effect.value) {
value = this._get(effect.value);
this.__data__[effect.value] = value;
}
this._applyEffectValue(effect, value);
},
_reflectEffect: function (source, value, effect) {
this.reflectPropertyToAttribute(source, effect.attribute, value);
},
_notifyEffect: function (source, value, effect, old, fromAbove) {
if (!fromAbove) {
this._notifyChange(source, effect.event, value);
}
},
_functionEffect: function (source, value, fn, old, fromAbove) {
fn.call(this, source, value, old, fromAbove);
},
_observerEffect: function (source, value, effect, old) {
var fn = this[effect.method];
if (fn) {
fn.call(this, value, old);
} else {
this._warn(this._logf('_observerEffect', 'observer method `' + effect.method + '` not defined'));
}
},
_complexObserverEffect: function (source, value, effect) {
var fn = this[effect.method];
if (fn) {
var args = Polymer.Bind._marshalArgs(this.__data__, effect, source, value);
if (args) {
fn.apply(this, args);
}
} else if (effect.dynamicFn) {
} else {
this._warn(this._logf('_complexObserverEffect', 'observer method `' + effect.method + '` not defined'));
}
},
_computeEffect: function (source, value, effect) {
var fn = this[effect.method];
if (fn) {
var args = Polymer.Bind._marshalArgs(this.__data__, effect, source, value);
if (args) {
var computedvalue = fn.apply(this, args);
this.__setProperty(effect.name, computedvalue);
}
} else if (effect.dynamicFn) {
} else {
this._warn(this._logf('_computeEffect', 'compute method `' + effect.method + '` not defined'));
}
},
_annotatedComputationEffect: function (source, value, effect) {
var computedHost = this._rootDataHost || this;
var fn = computedHost[effect.method];
if (fn) {
var args = Polymer.Bind._marshalArgs(this.__data__, effect, source, value);
if (args) {
var computedvalue = fn.apply(computedHost, args);
this._applyEffectValue(effect, computedvalue);
}
} else if (effect.dynamicFn) {
} else {
computedHost._warn(computedHost._logf('_annotatedComputationEffect', 'compute method `' + effect.method + '` not defined'));
}
},
_marshalArgs: function (model, effect, path, value) {
var values = [];
var args = effect.args;
var bailoutEarly = args.length > 1 || effect.dynamicFn;
for (var i = 0, l = args.length; i < l; i++) {
var arg = args[i];
var name = arg.name;
var v;
if (arg.literal) {
v = arg.value;
} else if (path === name) {
v = value;
} else {
v = model[name];
if (v === undefined && arg.structured) {
v = Polymer.Base._get(name, model);
}
}
if (bailoutEarly && v === undefined) {
return;
}
if (arg.wildcard) {
var matches = path.indexOf(name + '.') === 0;
values[i] = {
path: matches ? path : name,
value: matches ? value : v,
base: v
};
} else {
values[i] = v;
}
}
return values;
}
});
Polymer.Base._addFeature({
_addPropertyEffect: function (property, kind, effect) {
var prop = Polymer.Bind.addPropertyEffect(this, property, kind, effect);
prop.pathFn = this['_' + prop.kind + 'PathEffect'];
},
_prepEffects: function () {
Polymer.Bind.prepareModel(this);
this._addAnnotationEffects(this._notes);
},
_prepBindings: function () {
Polymer.Bind.createBindings(this);
},
_addPropertyEffects: function (properties) {
if (properties) {
for (var p in properties) {
var prop = properties[p];
if (prop.observer) {
this._addObserverEffect(p, prop.observer);
}
if (prop.computed) {
prop.readOnly = true;
this._addComputedEffect(p, prop.computed);
}
if (prop.notify) {
this._addPropertyEffect(p, 'notify', { event: Polymer.CaseMap.camelToDashCase(p) + '-changed' });
}
if (prop.reflectToAttribute) {
var attr = Polymer.CaseMap.camelToDashCase(p);
if (attr[0] === '-') {
this._warn(this._logf('_addPropertyEffects', 'Property ' + p + ' cannot be reflected to attribute ' + attr + ' because "-" is not a valid starting attribute name. Use a lowercase first letter for the property instead.'));
} else {
this._addPropertyEffect(p, 'reflect', { attribute: attr });
}
}
if (prop.readOnly) {
Polymer.Bind.ensurePropertyEffects(this, p);
}
}
}
},
_addComputedEffect: function (name, expression) {
var sig = this._parseMethod(expression);
var dynamicFn = sig.dynamicFn;
for (var i = 0, arg; i < sig.args.length && (arg = sig.args[i]); i++) {
this._addPropertyEffect(arg.model, 'compute', {
method: sig.method,
args: sig.args,
trigger: arg,
name: name,
dynamicFn: dynamicFn
});
}
if (dynamicFn) {
this._addPropertyEffect(sig.method, 'compute', {
method: sig.method,
args: sig.args,
trigger: null,
name: name,
dynamicFn: dynamicFn
});
}
},
_addObserverEffect: function (property, observer) {
this._addPropertyEffect(property, 'observer', {
method: observer,
property: property
});
},
_addComplexObserverEffects: function (observers) {
if (observers) {
for (var i = 0, o; i < observers.length && (o = observers[i]); i++) {
this._addComplexObserverEffect(o);
}
}
},
_addComplexObserverEffect: function (observer) {
var sig = this._parseMethod(observer);
if (!sig) {
throw new Error('Malformed observer expression \'' + observer + '\'');
}
var dynamicFn = sig.dynamicFn;
for (var i = 0, arg; i < sig.args.length && (arg = sig.args[i]); i++) {
this._addPropertyEffect(arg.model, 'complexObserver', {
method: sig.method,
args: sig.args,
trigger: arg,
dynamicFn: dynamicFn
});
}
if (dynamicFn) {
this._addPropertyEffect(sig.method, 'complexObserver', {
method: sig.method,
args: sig.args,
trigger: null,
dynamicFn: dynamicFn
});
}
},
_addAnnotationEffects: function (notes) {
for (var i = 0, note; i < notes.length && (note = notes[i]); i++) {
var b$ = note.bindings;
for (var j = 0, binding; j < b$.length && (binding = b$[j]); j++) {
this._addAnnotationEffect(binding, i);
}
}
},
_addAnnotationEffect: function (note, index) {
if (Polymer.Bind._shouldAddListener(note)) {
Polymer.Bind._addAnnotatedListener(this, index, note.name, note.parts[0].value, note.parts[0].event, note.parts[0].negate);
}
for (var i = 0; i < note.parts.length; i++) {
var part = note.parts[i];
if (part.signature) {
this._addAnnotatedComputationEffect(note, part, index);
} else if (!part.literal) {
if (note.kind === 'attribute' && note.name[0] === '-') {
this._warn(this._logf('_addAnnotationEffect', 'Cannot set attribute ' + note.name + ' because "-" is not a valid attribute starting character'));
} else {
this._addPropertyEffect(part.model, 'annotation', {
kind: note.kind,
index: index,
name: note.name,
propertyName: note.propertyName,
value: part.value,
isCompound: note.isCompound,
compoundIndex: part.compoundIndex,
event: part.event,
customEvent: part.customEvent,
negate: part.negate
});
}
}
}
},
_addAnnotatedComputationEffect: function (note, part, index) {
var sig = part.signature;
if (sig.static) {
this.__addAnnotatedComputationEffect('__static__', index, note, part, null);
} else {
for (var i = 0, arg; i < sig.args.length && (arg = sig.args[i]); i++) {
if (!arg.literal) {
this.__addAnnotatedComputationEffect(arg.model, index, note, part, arg);
}
}
if (sig.dynamicFn) {
this.__addAnnotatedComputationEffect(sig.method, index, note, part, null);
}
}
},
__addAnnotatedComputationEffect: function (property, index, note, part, trigger) {
this._addPropertyEffect(property, 'annotatedComputation', {
index: index,
isCompound: note.isCompound,
compoundIndex: part.compoundIndex,
kind: note.kind,
name: note.name,
negate: part.negate,
method: part.signature.method,
args: part.signature.args,
trigger: trigger,
dynamicFn: part.signature.dynamicFn
});
},
_parseMethod: function (expression) {
var m = expression.match(/([^\s]+?)\(([\s\S]*)\)/);
if (m) {
var sig = {
method: m[1],
static: true
};
if (this.getPropertyInfo(sig.method) !== Polymer.nob) {
sig.static = false;
sig.dynamicFn = true;
}
if (m[2].trim()) {
var args = m[2].replace(/\\,/g, '&comma;').split(',');
return this._parseArgs(args, sig);
} else {
sig.args = Polymer.nar;
return sig;
}
}
},
_parseArgs: function (argList, sig) {
sig.args = argList.map(function (rawArg) {
var arg = this._parseArg(rawArg);
if (!arg.literal) {
sig.static = false;
}
return arg;
}, this);
return sig;
},
_parseArg: function (rawArg) {
var arg = rawArg.trim().replace(/&comma;/g, ',').replace(/\\(.)/g, '$1');
var a = { name: arg };
var fc = arg[0];
if (fc === '-') {
fc = arg[1];
}
if (fc >= '0' && fc <= '9') {
fc = '#';
}
switch (fc) {
case '\'':
case '"':
a.value = arg.slice(1, -1);
a.literal = true;
break;
case '#':
a.value = Number(arg);
a.literal = true;
break;
}
if (!a.literal) {
a.model = this._modelForPath(arg);
a.structured = arg.indexOf('.') > 0;
if (a.structured) {
a.wildcard = arg.slice(-2) == '.*';
if (a.wildcard) {
a.name = arg.slice(0, -2);
}
}
}
return a;
},
_marshalInstanceEffects: function () {
Polymer.Bind.prepareInstance(this);
if (this._bindListeners) {
Polymer.Bind.setupBindListeners(this);
}
},
_applyEffectValue: function (info, value) {
var node = this._nodes[info.index];
var property = info.name;
value = this._computeFinalAnnotationValue(node, property, value, info);
if (info.kind == 'attribute') {
this.serializeValueToAttribute(value, property, node);
} else {
var pinfo = node._propertyInfo && node._propertyInfo[property];
if (pinfo && pinfo.readOnly) {
return;
}
this.__setProperty(property, value, false, node);
}
},
_computeFinalAnnotationValue: function (node, property, value, info) {
if (info.negate) {
value = !value;
}
if (info.isCompound) {
var storage = node.__compoundStorage__[property];
storage[info.compoundIndex] = value;
value = storage.join('');
}
if (info.kind !== 'attribute') {
if (property === 'className') {
value = this._scopeElementClass(node, value);
}
if (property === 'textContent' || node.localName == 'input' && property == 'value') {
value = value == undefined ? '' : value;
}
}
return value;
},
_executeStaticEffects: function () {
if (this._propertyEffects && this._propertyEffects.__static__) {
this._effectEffects('__static__', null, this._propertyEffects.__static__);
}
}
});
(function () {
var usePolyfillProto = Polymer.Settings.usePolyfillProto;
Polymer.Base._addFeature({
_setupConfigure: function (initialConfig) {
this._config = {};
this._handlers = [];
this._aboveConfig = null;
if (initialConfig) {
for (var i in initialConfig) {
if (initialConfig[i] !== undefined) {
this._config[i] = initialConfig[i];
}
}
}
},
_marshalAttributes: function () {
this._takeAttributesToModel(this._config);
},
_attributeChangedImpl: function (name) {
var model = this._clientsReadied ? this : this._config;
this._setAttributeToProperty(model, name);
},
_configValue: function (name, value) {
var info = this._propertyInfo[name];
if (!info || !info.readOnly) {
this._config[name] = value;
}
},
_beforeClientsReady: function () {
this._configure();
},
_configure: function () {
this._configureAnnotationReferences();
this._configureInstanceProperties();
this._aboveConfig = this.mixin({}, this._config);
var config = {};
for (var i = 0; i < this.behaviors.length; i++) {
this._configureProperties(this.behaviors[i].properties, config);
}
this._configureProperties(this.properties, config);
this.mixin(config, this._aboveConfig);
this._config = config;
if (this._clients && this._clients.length) {
this._distributeConfig(this._config);
}
},
_configureInstanceProperties: function () {
for (var i in this._propertyEffects) {
if (!usePolyfillProto && this.hasOwnProperty(i)) {
this._configValue(i, this[i]);
delete this[i];
}
}
},
_configureProperties: function (properties, config) {
for (var i in properties) {
var c = properties[i];
if (c.value !== undefined) {
var value = c.value;
if (typeof value == 'function') {
value = value.call(this, this._config);
}
config[i] = value;
}
}
},
_distributeConfig: function (config) {
var fx$ = this._propertyEffects;
if (fx$) {
for (var p in config) {
var fx = fx$[p];
if (fx) {
for (var i = 0, l = fx.length, x; i < l && (x = fx[i]); i++) {
if (x.kind === 'annotation') {
var node = this._nodes[x.effect.index];
var name = x.effect.propertyName;
var isAttr = x.effect.kind == 'attribute';
var hasEffect = node._propertyEffects && node._propertyEffects[name];
if (node._configValue && (hasEffect || !isAttr)) {
var value = p === x.effect.value ? config[p] : this._get(x.effect.value, config);
value = this._computeFinalAnnotationValue(node, name, value, x.effect);
if (isAttr) {
value = node.deserialize(this.serialize(value), node._propertyInfo[name].type);
}
node._configValue(name, value);
}
}
}
}
}
}
},
_afterClientsReady: function () {
this._executeStaticEffects();
this._applyConfig(this._config, this._aboveConfig);
this._flushHandlers();
},
_applyConfig: function (config, aboveConfig) {
for (var n in config) {
if (this[n] === undefined) {
this.__setProperty(n, config[n], n in aboveConfig);
}
}
},
_notifyListener: function (fn, e) {
if (!Polymer.Bind._isEventBogus(e, e.target)) {
var value, path;
if (e.detail) {
value = e.detail.value;
path = e.detail.path;
}
if (!this._clientsReadied) {
this._queueHandler([
fn,
e.target,
value,
path
]);
} else {
return fn.call(this, e.target, value, path);
}
}
},
_queueHandler: function (args) {
this._handlers.push(args);
},
_flushHandlers: function () {
var h$ = this._handlers;
for (var i = 0, l = h$.length, h; i < l && (h = h$[i]); i++) {
h[0].call(this, h[1], h[2], h[3]);
}
this._handlers = [];
}
});
}());
(function () {
'use strict';
Polymer.Base._addFeature({
notifyPath: function (path, value, fromAbove) {
var info = {};
var v = this._get(path, this, info);
if (arguments.length === 1) {
value = v;
}
if (info.path) {
this._notifyPath(info.path, value, fromAbove);
}
},
_notifyPath: function (path, value, fromAbove) {
var old = this._propertySetter(path, value);
if (old !== value && (old === old || value === value)) {
this._pathEffector(path, value);
if (!fromAbove) {
this._notifyPathUp(path, value);
}
return true;
}
},
_getPathParts: function (path) {
if (Array.isArray(path)) {
var parts = [];
for (var i = 0; i < path.length; i++) {
var args = path[i].toString().split('.');
for (var j = 0; j < args.length; j++) {
parts.push(args[j]);
}
}
return parts;
} else {
return path.toString().split('.');
}
},
set: function (path, value, root) {
var prop = root || this;
var parts = this._getPathParts(path);
var array;
var last = parts[parts.length - 1];
if (parts.length > 1) {
for (var i = 0; i < parts.length - 1; i++) {
var part = parts[i];
if (array && part[0] == '#') {
prop = Polymer.Collection.get(array).getItem(part);
} else {
prop = prop[part];
if (array && parseInt(part, 10) == part) {
parts[i] = Polymer.Collection.get(array).getKey(prop);
}
}
if (!prop) {
return;
}
array = Array.isArray(prop) ? prop : null;
}
if (array) {
var coll = Polymer.Collection.get(array);
var old, key;
if (last[0] == '#') {
key = last;
old = coll.getItem(key);
last = array.indexOf(old);
coll.setItem(key, value);
} else if (parseInt(last, 10) == last) {
old = prop[last];
key = coll.getKey(old);
parts[i] = key;
coll.setItem(key, value);
}
}
prop[last] = value;
if (!root) {
this._notifyPath(parts.join('.'), value);
}
} else {
prop[path] = value;
}
},
get: function (path, root) {
return this._get(path, root);
},
_get: function (path, root, info) {
var prop = root || this;
var parts = this._getPathParts(path);
var array;
for (var i = 0; i < parts.length; i++) {
if (!prop) {
return;
}
var part = parts[i];
if (array && part[0] == '#') {
prop = Polymer.Collection.get(array).getItem(part);
} else {
prop = prop[part];
if (info && array && parseInt(part, 10) == part) {
parts[i] = Polymer.Collection.get(array).getKey(prop);
}
}
array = Array.isArray(prop) ? prop : null;
}
if (info) {
info.path = parts.join('.');
}
return prop;
},
_pathEffector: function (path, value) {
var model = this._modelForPath(path);
var fx$ = this._propertyEffects && this._propertyEffects[model];
if (fx$) {
for (var i = 0, fx; i < fx$.length && (fx = fx$[i]); i++) {
var fxFn = fx.pathFn;
if (fxFn) {
fxFn.call(this, path, value, fx.effect);
}
}
}
if (this._boundPaths) {
this._notifyBoundPaths(path, value);
}
},
_annotationPathEffect: function (path, value, effect) {
if (effect.value === path || effect.value.indexOf(path + '.') === 0) {
Polymer.Bind._annotationEffect.call(this, path, value, effect);
} else if (path.indexOf(effect.value + '.') === 0 && !effect.negate) {
var node = this._nodes[effect.index];
if (node && node._notifyPath) {
var p = this._fixPath(effect.name, effect.value, path);
node._notifyPath(p, value, true);
}
}
},
_complexObserverPathEffect: function (path, value, effect) {
if (this._pathMatchesEffect(path, effect)) {
Polymer.Bind._complexObserverEffect.call(this, path, value, effect);
}
},
_computePathEffect: function (path, value, effect) {
if (this._pathMatchesEffect(path, effect)) {
Polymer.Bind._computeEffect.call(this, path, value, effect);
}
},
_annotatedComputationPathEffect: function (path, value, effect) {
if (this._pathMatchesEffect(path, effect)) {
Polymer.Bind._annotatedComputationEffect.call(this, path, value, effect);
}
},
_pathMatchesEffect: function (path, effect) {
var effectArg = effect.trigger.name;
return effectArg == path || effectArg.indexOf(path + '.') === 0 || effect.trigger.wildcard && path.indexOf(effectArg + '.') === 0;
},
linkPaths: function (to, from) {
this._boundPaths = this._boundPaths || {};
if (from) {
this._boundPaths[to] = from;
} else {
this.unlinkPaths(to);
}
},
unlinkPaths: function (path) {
if (this._boundPaths) {
delete this._boundPaths[path];
}
},
_notifyBoundPaths: function (path, value) {
for (var a in this._boundPaths) {
var b = this._boundPaths[a];
if (path.indexOf(a + '.') == 0) {
this._notifyPath(this._fixPath(b, a, path), value);
} else if (path.indexOf(b + '.') == 0) {
this._notifyPath(this._fixPath(a, b, path), value);
}
}
},
_fixPath: function (property, root, path) {
return property + path.slice(root.length);
},
_notifyPathUp: function (path, value) {
var rootName = this._modelForPath(path);
var dashCaseName = Polymer.CaseMap.camelToDashCase(rootName);
var eventName = dashCaseName + this._EVENT_CHANGED;
this.fire(eventName, {
path: path,
value: value
}, {
bubbles: false,
_useCache: true
});
},
_modelForPath: function (path) {
var dot = path.indexOf('.');
return dot < 0 ? path : path.slice(0, dot);
},
_EVENT_CHANGED: '-changed',
notifySplices: function (path, splices) {
var info = {};
var array = this._get(path, this, info);
this._notifySplices(array, info.path, splices);
},
_notifySplices: function (array, path, splices) {
var change = {
keySplices: Polymer.Collection.applySplices(array, splices),
indexSplices: splices
};
var splicesPath = path + '.splices';
this._notifyPath(splicesPath, change);
this._notifyPath(path + '.length', array.length);
this.__data__[splicesPath] = {
keySplices: null,
indexSplices: null
};
},
_notifySplice: function (array, path, index, added, removed) {
this._notifySplices(array, path, [{
index: index,
addedCount: added,
removed: removed,
object: array,
type: 'splice'
}]);
},
push: function (path) {
var info = {};
var array = this._get(path, this, info);
var args = Array.prototype.slice.call(arguments, 1);
var len = array.length;
var ret = array.push.apply(array, args);
if (args.length) {
this._notifySplice(array, info.path, len, args.length, []);
}
return ret;
},
pop: function (path) {
var info = {};
var array = this._get(path, this, info);
var hadLength = Boolean(array.length);
var args = Array.prototype.slice.call(arguments, 1);
var ret = array.pop.apply(array, args);
if (hadLength) {
this._notifySplice(array, info.path, array.length, 0, [ret]);
}
return ret;
},
splice: function (path, start) {
var info = {};
var array = this._get(path, this, info);
if (start < 0) {
start = array.length - Math.floor(-start);
} else {
start = Math.floor(start);
}
if (!start) {
start = 0;
}
var args = Array.prototype.slice.call(arguments, 1);
var ret = array.splice.apply(array, args);
var addedCount = Math.max(args.length - 2, 0);
if (addedCount || ret.length) {
this._notifySplice(array, info.path, start, addedCount, ret);
}
return ret;
},
shift: function (path) {
var info = {};
var array = this._get(path, this, info);
var hadLength = Boolean(array.length);
var args = Array.prototype.slice.call(arguments, 1);
var ret = array.shift.apply(array, args);
if (hadLength) {
this._notifySplice(array, info.path, 0, 0, [ret]);
}
return ret;
},
unshift: function (path) {
var info = {};
var array = this._get(path, this, info);
var args = Array.prototype.slice.call(arguments, 1);
var ret = array.unshift.apply(array, args);
if (args.length) {
this._notifySplice(array, info.path, 0, args.length, []);
}
return ret;
},
prepareModelNotifyPath: function (model) {
this.mixin(model, {
fire: Polymer.Base.fire,
_getEvent: Polymer.Base._getEvent,
__eventCache: Polymer.Base.__eventCache,
notifyPath: Polymer.Base.notifyPath,
_get: Polymer.Base._get,
_EVENT_CHANGED: Polymer.Base._EVENT_CHANGED,
_notifyPath: Polymer.Base._notifyPath,
_notifyPathUp: Polymer.Base._notifyPathUp,
_pathEffector: Polymer.Base._pathEffector,
_annotationPathEffect: Polymer.Base._annotationPathEffect,
_complexObserverPathEffect: Polymer.Base._complexObserverPathEffect,
_annotatedComputationPathEffect: Polymer.Base._annotatedComputationPathEffect,
_computePathEffect: Polymer.Base._computePathEffect,
_modelForPath: Polymer.Base._modelForPath,
_pathMatchesEffect: Polymer.Base._pathMatchesEffect,
_notifyBoundPaths: Polymer.Base._notifyBoundPaths,
_getPathParts: Polymer.Base._getPathParts
});
}
});
}());
Polymer.Base._addFeature({
resolveUrl: function (url) {
var module = Polymer.DomModule.import(this.is);
var root = '';
if (module) {
var assetPath = module.getAttribute('assetpath') || '';
root = Polymer.ResolveUrl.resolveUrl(assetPath, module.ownerDocument.baseURI);
}
return Polymer.ResolveUrl.resolveUrl(url, root);
}
});
Polymer.CssParse = function () {
return {
parse: function (text) {
text = this._clean(text);
return this._parseCss(this._lex(text), text);
},
_clean: function (cssText) {
return cssText.replace(this._rx.comments, '').replace(this._rx.port, '');
},
_lex: function (text) {
var root = {
start: 0,
end: text.length
};
var n = root;
for (var i = 0, l = text.length; i < l; i++) {
switch (text[i]) {
case this.OPEN_BRACE:
if (!n.rules) {
n.rules = [];
}
var p = n;
var previous = p.rules[p.rules.length - 1];
n = {
start: i + 1,
parent: p,
previous: previous
};
p.rules.push(n);
break;
case this.CLOSE_BRACE:
n.end = i + 1;
n = n.parent || root;
break;
}
}
return root;
},
_parseCss: function (node, text) {
var t = text.substring(node.start, node.end - 1);
node.parsedCssText = node.cssText = t.trim();
if (node.parent) {
var ss = node.previous ? node.previous.end : node.parent.start;
t = text.substring(ss, node.start - 1);
t = this._expandUnicodeEscapes(t);
t = t.replace(this._rx.multipleSpaces, ' ');
t = t.substring(t.lastIndexOf(';') + 1);
var s = node.parsedSelector = node.selector = t.trim();
node.atRule = s.indexOf(this.AT_START) === 0;
if (node.atRule) {
if (s.indexOf(this.MEDIA_START) === 0) {
node.type = this.types.MEDIA_RULE;
} else if (s.match(this._rx.keyframesRule)) {
node.type = this.types.KEYFRAMES_RULE;
node.keyframesName = node.selector.split(this._rx.multipleSpaces).pop();
}
} else {
if (s.indexOf(this.VAR_START) === 0) {
node.type = this.types.MIXIN_RULE;
} else {
node.type = this.types.STYLE_RULE;
}
}
}
var r$ = node.rules;
if (r$) {
for (var i = 0, l = r$.length, r; i < l && (r = r$[i]); i++) {
this._parseCss(r, text);
}
}
return node;
},
_expandUnicodeEscapes: function (s) {
return s.replace(/\\([0-9a-f]{1,6})\s/gi, function () {
var code = arguments[1], repeat = 6 - code.length;
while (repeat--) {
code = '0' + code;
}
return '\\' + code;
});
},
stringify: function (node, preserveProperties, text) {
text = text || '';
var cssText = '';
if (node.cssText || node.rules) {
var r$ = node.rules;
if (r$ && !this._hasMixinRules(r$)) {
for (var i = 0, l = r$.length, r; i < l && (r = r$[i]); i++) {
cssText = this.stringify(r, preserveProperties, cssText);
}
} else {
cssText = preserveProperties ? node.cssText : this.removeCustomProps(node.cssText);
cssText = cssText.trim();
if (cssText) {
cssText = '  ' + cssText + '\n';
}
}
}
if (cssText) {
if (node.selector) {
text += node.selector + ' ' + this.OPEN_BRACE + '\n';
}
text += cssText;
if (node.selector) {
text += this.CLOSE_BRACE + '\n\n';
}
}
return text;
},
_hasMixinRules: function (rules) {
return rules[0].selector.indexOf(this.VAR_START) === 0;
},
removeCustomProps: function (cssText) {
cssText = this.removeCustomPropAssignment(cssText);
return this.removeCustomPropApply(cssText);
},
removeCustomPropAssignment: function (cssText) {
return cssText.replace(this._rx.customProp, '').replace(this._rx.mixinProp, '');
},
removeCustomPropApply: function (cssText) {
return cssText.replace(this._rx.mixinApply, '').replace(this._rx.varApply, '');
},
types: {
STYLE_RULE: 1,
KEYFRAMES_RULE: 7,
MEDIA_RULE: 4,
MIXIN_RULE: 1000
},
OPEN_BRACE: '{',
CLOSE_BRACE: '}',
_rx: {
comments: /\/\*[^*]*\*+([^\/*][^*]*\*+)*\//gim,
port: /@import[^;]*;/gim,
customProp: /(?:^[^;\-\s}]+)?--[^;{}]*?:[^{};]*?(?:[;\n]|$)/gim,
mixinProp: /(?:^[^;\-\s}]+)?--[^;{}]*?:[^{};]*?{[^}]*?}(?:[;\n]|$)?/gim,
mixinApply: /@apply\s*\(?[^);]*\)?\s*(?:[;\n]|$)?/gim,
varApply: /[^;:]*?:[^;]*?var\([^;]*\)(?:[;\n]|$)?/gim,
keyframesRule: /^@[^\s]*keyframes/,
multipleSpaces: /\s+/g
},
VAR_START: '--',
MEDIA_START: '@media',
AT_START: '@'
};
}();
Polymer.StyleUtil = function () {
var settings = Polymer.Settings;
return {
NATIVE_VARIABLES: Polymer.Settings.useNativeCSSProperties,
MODULE_STYLES_SELECTOR: 'style, link[rel=import][type~=css], template',
INCLUDE_ATTR: 'include',
toCssText: function (rules, callback) {
if (typeof rules === 'string') {
rules = this.parser.parse(rules);
}
if (callback) {
this.forEachRule(rules, callback);
}
return this.parser.stringify(rules, this.NATIVE_VARIABLES);
},
forRulesInStyles: function (styles, styleRuleCallback, keyframesRuleCallback) {
if (styles) {
for (var i = 0, l = styles.length, s; i < l && (s = styles[i]); i++) {
this.forEachRuleInStyle(s, styleRuleCallback, keyframesRuleCallback);
}
}
},
forActiveRulesInStyles: function (styles, styleRuleCallback, keyframesRuleCallback) {
if (styles) {
for (var i = 0, l = styles.length, s; i < l && (s = styles[i]); i++) {
this.forEachRuleInStyle(s, styleRuleCallback, keyframesRuleCallback, true);
}
}
},
rulesForStyle: function (style) {
if (!style.__cssRules && style.textContent) {
style.__cssRules = this.parser.parse(style.textContent);
}
return style.__cssRules;
},
isKeyframesSelector: function (rule) {
return rule.parent && rule.parent.type === this.ruleTypes.KEYFRAMES_RULE;
},
forEachRuleInStyle: function (style, styleRuleCallback, keyframesRuleCallback, onlyActiveRules) {
var rules = this.rulesForStyle(style);
var styleCallback, keyframeCallback;
if (styleRuleCallback) {
styleCallback = function (rule) {
styleRuleCallback(rule, style);
};
}
if (keyframesRuleCallback) {
keyframeCallback = function (rule) {
keyframesRuleCallback(rule, style);
};
}
this.forEachRule(rules, styleCallback, keyframeCallback, onlyActiveRules);
},
forEachRule: function (node, styleRuleCallback, keyframesRuleCallback, onlyActiveRules) {
if (!node) {
return;
}
var skipRules = false;
if (onlyActiveRules) {
if (node.type === this.ruleTypes.MEDIA_RULE) {
var matchMedia = node.selector.match(this.rx.MEDIA_MATCH);
if (matchMedia) {
if (!window.matchMedia(matchMedia[1]).matches) {
skipRules = true;
}
}
}
}
if (node.type === this.ruleTypes.STYLE_RULE) {
styleRuleCallback(node);
} else if (keyframesRuleCallback && node.type === this.ruleTypes.KEYFRAMES_RULE) {
keyframesRuleCallback(node);
} else if (node.type === this.ruleTypes.MIXIN_RULE) {
skipRules = true;
}
var r$ = node.rules;
if (r$ && !skipRules) {
for (var i = 0, l = r$.length, r; i < l && (r = r$[i]); i++) {
this.forEachRule(r, styleRuleCallback, keyframesRuleCallback, onlyActiveRules);
}
}
},
applyCss: function (cssText, moniker, target, contextNode) {
var style = this.createScopeStyle(cssText, moniker);
return this.applyStyle(style, target, contextNode);
},
applyStyle: function (style, target, contextNode) {
target = target || document.head;
var after = contextNode && contextNode.nextSibling || target.firstChild;
this.__lastHeadApplyNode = style;
return target.insertBefore(style, after);
},
createScopeStyle: function (cssText, moniker) {
var style = document.createElement('style');
if (moniker) {
style.setAttribute('scope', moniker);
}
style.textContent = cssText;
return style;
},
__lastHeadApplyNode: null,
applyStylePlaceHolder: function (moniker) {
var placeHolder = document.createComment(' Shady DOM styles for ' + moniker + ' ');
var after = this.__lastHeadApplyNode ? this.__lastHeadApplyNode.nextSibling : null;
var scope = document.head;
scope.insertBefore(placeHolder, after || scope.firstChild);
this.__lastHeadApplyNode = placeHolder;
return placeHolder;
},
cssFromModules: function (moduleIds, warnIfNotFound) {
var modules = moduleIds.trim().split(' ');
var cssText = '';
for (var i = 0; i < modules.length; i++) {
cssText += this.cssFromModule(modules[i], warnIfNotFound);
}
return cssText;
},
cssFromModule: function (moduleId, warnIfNotFound) {
var m = Polymer.DomModule.import(moduleId);
if (m && !m._cssText) {
m._cssText = this.cssFromElement(m);
}
if (!m && warnIfNotFound) {
console.warn('Could not find style data in module named', moduleId);
}
return m && m._cssText || '';
},
cssFromElement: function (element) {
var cssText = '';
var content = element.content || element;
var e$ = Polymer.TreeApi.arrayCopy(content.querySelectorAll(this.MODULE_STYLES_SELECTOR));
for (var i = 0, e; i < e$.length; i++) {
e = e$[i];
if (e.localName === 'template') {
cssText += this.cssFromElement(e);
} else {
if (e.localName === 'style') {
var include = e.getAttribute(this.INCLUDE_ATTR);
if (include) {
cssText += this.cssFromModules(include, true);
}
e = e.__appliedElement || e;
e.parentNode.removeChild(e);
cssText += this.resolveCss(e.textContent, element.ownerDocument);
} else if (e.import && e.import.body) {
cssText += this.resolveCss(e.import.body.textContent, e.import);
}
}
}
return cssText;
},
isTargetedBuild: function (buildType) {
return settings.useNativeShadow ? buildType === 'shadow' : buildType === 'shady';
},
cssBuildTypeForModule: function (module) {
var dm = Polymer.DomModule.import(module);
if (dm) {
return this.getCssBuildType(dm);
}
},
getCssBuildType: function (element) {
return element.getAttribute('css-build');
},
_findMatchingParen: function (text, start) {
var level = 0;
for (var i = start, l = text.length; i < l; i++) {
switch (text[i]) {
case '(':
level++;
break;
case ')':
if (--level === 0) {
return i;
}
break;
}
}
return -1;
},
processVariableAndFallback: function (str, callback) {
var start = str.indexOf('var(');
if (start === -1) {
return callback(str, '', '', '');
}
var end = this._findMatchingParen(str, start + 3);
var inner = str.substring(start + 4, end);
var prefix = str.substring(0, start);
var suffix = this.processVariableAndFallback(str.substring(end + 1), callback);
var comma = inner.indexOf(',');
if (comma === -1) {
return callback(prefix, inner.trim(), '', suffix);
}
var value = inner.substring(0, comma).trim();
var fallback = inner.substring(comma + 1).trim();
return callback(prefix, value, fallback, suffix);
},
rx: {
VAR_ASSIGN: /(?:^|[;\s{]\s*)(--[\w-]*?)\s*:\s*(?:([^;{]*)|{([^}]*)})(?:(?=[;\s}])|$)/gi,
MIXIN_MATCH: /(?:^|\W+)@apply\s*\(?([^);\n]*)\)?/gi,
VAR_CONSUMED: /(--[\w-]+)\s*([:,;)]|$)/gi,
ANIMATION_MATCH: /(animation\s*:)|(animation-name\s*:)/,
MEDIA_MATCH: /@media[^(]*(\([^)]*\))/,
IS_VAR: /^--/,
BRACKETED: /\{[^}]*\}/g,
HOST_PREFIX: '(?:^|[^.#[:])',
HOST_SUFFIX: '($|[.:[\\s>+~])'
},
resolveCss: Polymer.ResolveUrl.resolveCss,
parser: Polymer.CssParse,
ruleTypes: Polymer.CssParse.types
};
}();
Polymer.StyleTransformer = function () {
var styleUtil = Polymer.StyleUtil;
var settings = Polymer.Settings;
var api = {
dom: function (node, scope, useAttr, shouldRemoveScope) {
this._transformDom(node, scope || '', useAttr, shouldRemoveScope);
},
_transformDom: function (node, selector, useAttr, shouldRemoveScope) {
if (node.setAttribute) {
this.element(node, selector, useAttr, shouldRemoveScope);
}
var c$ = Polymer.dom(node).childNodes;
for (var i = 0; i < c$.length; i++) {
this._transformDom(c$[i], selector, useAttr, shouldRemoveScope);
}
},
element: function (element, scope, useAttr, shouldRemoveScope) {
if (useAttr) {
if (shouldRemoveScope) {
element.removeAttribute(SCOPE_NAME);
} else {
element.setAttribute(SCOPE_NAME, scope);
}
} else {
if (scope) {
if (element.classList) {
if (shouldRemoveScope) {
element.classList.remove(SCOPE_NAME);
element.classList.remove(scope);
} else {
element.classList.add(SCOPE_NAME);
element.classList.add(scope);
}
} else if (element.getAttribute) {
var c = element.getAttribute(CLASS);
if (shouldRemoveScope) {
if (c) {
element.setAttribute(CLASS, c.replace(SCOPE_NAME, '').replace(scope, ''));
}
} else {
element.setAttribute(CLASS, (c ? c + ' ' : '') + SCOPE_NAME + ' ' + scope);
}
}
}
}
},
elementStyles: function (element, callback) {
var styles = element._styles;
var cssText = '';
var cssBuildType = element.__cssBuild;
for (var i = 0, l = styles.length, s; i < l && (s = styles[i]); i++) {
var rules = styleUtil.rulesForStyle(s);
cssText += settings.useNativeShadow || cssBuildType === 'shady' ? styleUtil.toCssText(rules, callback) : this.css(rules, element.is, element.extends, callback, element._scopeCssViaAttr) + '\n\n';
}
return cssText.trim();
},
css: function (rules, scope, ext, callback, useAttr) {
var hostScope = this._calcHostScope(scope, ext);
scope = this._calcElementScope(scope, useAttr);
var self = this;
return styleUtil.toCssText(rules, function (rule) {
if (!rule.isScoped) {
self.rule(rule, scope, hostScope);
rule.isScoped = true;
}
if (callback) {
callback(rule, scope, hostScope);
}
});
},
_calcElementScope: function (scope, useAttr) {
if (scope) {
return useAttr ? CSS_ATTR_PREFIX + scope + CSS_ATTR_SUFFIX : CSS_CLASS_PREFIX + scope;
} else {
return '';
}
},
_calcHostScope: function (scope, ext) {
return ext ? '[is=' + scope + ']' : scope;
},
rule: function (rule, scope, hostScope) {
this._transformRule(rule, this._transformComplexSelector, scope, hostScope);
},
_transformRule: function (rule, transformer, scope, hostScope) {
rule.selector = rule.transformedSelector = this._transformRuleCss(rule, transformer, scope, hostScope);
},
_transformRuleCss: function (rule, transformer, scope, hostScope) {
var p$ = rule.selector.split(COMPLEX_SELECTOR_SEP);
if (!styleUtil.isKeyframesSelector(rule)) {
for (var i = 0, l = p$.length, p; i < l && (p = p$[i]); i++) {
p$[i] = transformer.call(this, p, scope, hostScope);
}
}
return p$.join(COMPLEX_SELECTOR_SEP);
},
_transformComplexSelector: function (selector, scope, hostScope) {
var stop = false;
var hostContext = false;
var self = this;
selector = selector.trim();
selector = selector.replace(CONTENT_START, HOST + ' $1');
selector = selector.replace(SIMPLE_SELECTOR_SEP, function (m, c, s) {
if (!stop) {
var info = self._transformCompoundSelector(s, c, scope, hostScope);
stop = stop || info.stop;
hostContext = hostContext || info.hostContext;
c = info.combinator;
s = info.value;
} else {
s = s.replace(SCOPE_JUMP, ' ');
}
return c + s;
});
if (hostContext) {
selector = selector.replace(HOST_CONTEXT_PAREN, function (m, pre, paren, post) {
return pre + paren + ' ' + hostScope + post + COMPLEX_SELECTOR_SEP + ' ' + pre + hostScope + paren + post;
});
}
return selector;
},
_transformCompoundSelector: function (selector, combinator, scope, hostScope) {
var jumpIndex = selector.search(SCOPE_JUMP);
var hostContext = false;
if (selector.indexOf(HOST_CONTEXT) >= 0) {
hostContext = true;
} else if (selector.indexOf(HOST) >= 0) {
selector = this._transformHostSelector(selector, hostScope);
} else if (jumpIndex !== 0) {
selector = scope ? this._transformSimpleSelector(selector, scope) : selector;
}
if (selector.indexOf(CONTENT) >= 0) {
combinator = '';
}
var stop;
if (jumpIndex >= 0) {
selector = selector.replace(SCOPE_JUMP, ' ');
stop = true;
}
return {
value: selector,
combinator: combinator,
stop: stop,
hostContext: hostContext
};
},
_transformSimpleSelector: function (selector, scope) {
var p$ = selector.split(PSEUDO_PREFIX);
p$[0] += scope;
return p$.join(PSEUDO_PREFIX);
},
_transformHostSelector: function (selector, hostScope) {
var m = selector.match(HOST_PAREN);
var paren = m && m[2].trim() || '';
if (paren) {
if (!paren[0].match(SIMPLE_SELECTOR_PREFIX)) {
var typeSelector = paren.split(SIMPLE_SELECTOR_PREFIX)[0];
if (typeSelector === hostScope) {
return paren;
} else {
return SELECTOR_NO_MATCH;
}
} else {
return selector.replace(HOST_PAREN, function (m, host, paren) {
return hostScope + paren;
});
}
} else {
return selector.replace(HOST, hostScope);
}
},
documentRule: function (rule) {
rule.selector = rule.parsedSelector;
this.normalizeRootSelector(rule);
if (!settings.useNativeShadow) {
this._transformRule(rule, this._transformDocumentSelector);
}
},
normalizeRootSelector: function (rule) {
if (rule.selector === ROOT) {
rule.selector = 'html';
}
},
_transformDocumentSelector: function (selector) {
return selector.match(SCOPE_JUMP) ? this._transformComplexSelector(selector, SCOPE_DOC_SELECTOR) : this._transformSimpleSelector(selector.trim(), SCOPE_DOC_SELECTOR);
},
SCOPE_NAME: 'style-scope'
};
var SCOPE_NAME = api.SCOPE_NAME;
var SCOPE_DOC_SELECTOR = ':not([' + SCOPE_NAME + '])' + ':not(.' + SCOPE_NAME + ')';
var COMPLEX_SELECTOR_SEP = ',';
var SIMPLE_SELECTOR_SEP = /(^|[\s>+~]+)((?:\[.+?\]|[^\s>+~=\[])+)/g;
var SIMPLE_SELECTOR_PREFIX = /[[.:#*]/;
var HOST = ':host';
var ROOT = ':root';
var HOST_PAREN = /(:host)(?:\(((?:\([^)(]*\)|[^)(]*)+?)\))/;
var HOST_CONTEXT = ':host-context';
var HOST_CONTEXT_PAREN = /(.*)(?::host-context)(?:\(((?:\([^)(]*\)|[^)(]*)+?)\))(.*)/;
var CONTENT = '::content';
var SCOPE_JUMP = /::content|::shadow|\/deep\//;
var CSS_CLASS_PREFIX = '.';
var CSS_ATTR_PREFIX = '[' + SCOPE_NAME + '~=';
var CSS_ATTR_SUFFIX = ']';
var PSEUDO_PREFIX = ':';
var CLASS = 'class';
var CONTENT_START = new RegExp('^(' + CONTENT + ')');
var SELECTOR_NO_MATCH = 'should_not_match';
return api;
}();
Polymer.StyleExtends = function () {
var styleUtil = Polymer.StyleUtil;
return {
hasExtends: function (cssText) {
return Boolean(cssText.match(this.rx.EXTEND));
},
transform: function (style) {
var rules = styleUtil.rulesForStyle(style);
var self = this;
styleUtil.forEachRule(rules, function (rule) {
self._mapRuleOntoParent(rule);
if (rule.parent) {
var m;
while (m = self.rx.EXTEND.exec(rule.cssText)) {
var extend = m[1];
var extendor = self._findExtendor(extend, rule);
if (extendor) {
self._extendRule(rule, extendor);
}
}
}
rule.cssText = rule.cssText.replace(self.rx.EXTEND, '');
});
return styleUtil.toCssText(rules, function (rule) {
if (rule.selector.match(self.rx.STRIP)) {
rule.cssText = '';
}
}, true);
},
_mapRuleOntoParent: function (rule) {
if (rule.parent) {
var map = rule.parent.map || (rule.parent.map = {});
var parts = rule.selector.split(',');
for (var i = 0, p; i < parts.length; i++) {
p = parts[i];
map[p.trim()] = rule;
}
return map;
}
},
_findExtendor: function (extend, rule) {
return rule.parent && rule.parent.map && rule.parent.map[extend] || this._findExtendor(extend, rule.parent);
},
_extendRule: function (target, source) {
if (target.parent !== source.parent) {
this._cloneAndAddRuleToParent(source, target.parent);
}
target.extends = target.extends || [];
target.extends.push(source);
source.selector = source.selector.replace(this.rx.STRIP, '');
source.selector = (source.selector && source.selector + ',\n') + target.selector;
if (source.extends) {
source.extends.forEach(function (e) {
this._extendRule(target, e);
}, this);
}
},
_cloneAndAddRuleToParent: function (rule, parent) {
rule = Object.create(rule);
rule.parent = parent;
if (rule.extends) {
rule.extends = rule.extends.slice();
}
parent.rules.push(rule);
},
rx: {
EXTEND: /@extends\(([^)]*)\)\s*?;/gim,
STRIP: /%[^,]*$/
}
};
}();
Polymer.ApplyShim = function () {
'use strict';
var styleUtil = Polymer.StyleUtil;
var MIXIN_MATCH = styleUtil.rx.MIXIN_MATCH;
var VAR_ASSIGN = styleUtil.rx.VAR_ASSIGN;
var BAD_VAR = /var\(\s*(--[^,]*),\s*(--[^)]*)\)/g;
var APPLY_NAME_CLEAN = /;\s*/m;
var INITIAL_INHERIT = /^\s*(initial)|(inherit)\s*$/;
var MIXIN_VAR_SEP = '_-_';
var mixinMap = {};
function mapSet(name, props) {
name = name.trim();
mixinMap[name] = {
properties: props,
dependants: {}
};
}
function mapGet(name) {
name = name.trim();
return mixinMap[name];
}
function replaceInitialOrInherit(property, value) {
var match = INITIAL_INHERIT.exec(value);
if (match) {
if (match[1]) {
value = ApplyShim._getInitialValueForProperty(property);
} else {
value = 'apply-shim-inherit';
}
}
return value;
}
function cssTextToMap(text) {
var props = text.split(';');
var property, value;
var out = {};
for (var i = 0, p, sp; i < props.length; i++) {
p = props[i];
if (p) {
sp = p.split(':');
if (sp.length > 1) {
property = sp[0].trim();
value = replaceInitialOrInherit(property, sp.slice(1).join(':'));
out[property] = value;
}
}
}
return out;
}
function invalidateMixinEntry(mixinEntry) {
var currentProto = ApplyShim.__currentElementProto;
var currentElementName = currentProto && currentProto.is;
for (var elementName in mixinEntry.dependants) {
if (elementName !== currentElementName) {
mixinEntry.dependants[elementName].__applyShimInvalid = true;
}
}
}
function produceCssProperties(matchText, propertyName, valueProperty, valueMixin) {
if (valueProperty) {
styleUtil.processVariableAndFallback(valueProperty, function (prefix, value) {
if (value && mapGet(value)) {
valueMixin = '@apply ' + value + ';';
}
});
}
if (!valueMixin) {
return matchText;
}
var mixinAsProperties = consumeCssProperties(valueMixin);
var prefix = matchText.slice(0, matchText.indexOf('--'));
var mixinValues = cssTextToMap(mixinAsProperties);
var combinedProps = mixinValues;
var mixinEntry = mapGet(propertyName);
var oldProps = mixinEntry && mixinEntry.properties;
if (oldProps) {
combinedProps = Object.create(oldProps);
combinedProps = Polymer.Base.mixin(combinedProps, mixinValues);
} else {
mapSet(propertyName, combinedProps);
}
var out = [];
var p, v;
var needToInvalidate = false;
for (p in combinedProps) {
v = mixinValues[p];
if (v === undefined) {
v = 'initial';
}
if (oldProps && !(p in oldProps)) {
needToInvalidate = true;
}
out.push(propertyName + MIXIN_VAR_SEP + p + ': ' + v);
}
if (needToInvalidate) {
invalidateMixinEntry(mixinEntry);
}
if (mixinEntry) {
mixinEntry.properties = combinedProps;
}
if (valueProperty) {
prefix = matchText + ';' + prefix;
}
return prefix + out.join('; ') + ';';
}
function fixVars(matchText, varA, varB) {
return 'var(' + varA + ',' + 'var(' + varB + '));';
}
function atApplyToCssProperties(mixinName, fallbacks) {
mixinName = mixinName.replace(APPLY_NAME_CLEAN, '');
var vars = [];
var mixinEntry = mapGet(mixinName);
if (!mixinEntry) {
mapSet(mixinName, {});
mixinEntry = mapGet(mixinName);
}
if (mixinEntry) {
var currentProto = ApplyShim.__currentElementProto;
if (currentProto) {
mixinEntry.dependants[currentProto.is] = currentProto;
}
var p, parts, f;
for (p in mixinEntry.properties) {
f = fallbacks && fallbacks[p];
parts = [
p,
': var(',
mixinName,
MIXIN_VAR_SEP,
p
];
if (f) {
parts.push(',', f);
}
parts.push(')');
vars.push(parts.join(''));
}
}
return vars.join('; ');
}
function consumeCssProperties(text) {
var m;
while (m = MIXIN_MATCH.exec(text)) {
var matchText = m[0];
var mixinName = m[1];
var idx = m.index;
var applyPos = idx + matchText.indexOf('@apply');
var afterApplyPos = idx + matchText.length;
var textBeforeApply = text.slice(0, applyPos);
var textAfterApply = text.slice(afterApplyPos);
var defaults = cssTextToMap(textBeforeApply);
var replacement = atApplyToCssProperties(mixinName, defaults);
text = [
textBeforeApply,
replacement,
textAfterApply
].join('');
MIXIN_MATCH.lastIndex = idx + replacement.length;
}
return text;
}
var ApplyShim = {
_measureElement: null,
_map: mixinMap,
_separator: MIXIN_VAR_SEP,
transform: function (styles, elementProto) {
this.__currentElementProto = elementProto;
styleUtil.forRulesInStyles(styles, this._boundTransformRule);
elementProto.__applyShimInvalid = false;
this.__currentElementProto = null;
},
transformRule: function (rule) {
rule.cssText = this.transformCssText(rule.parsedCssText);
if (rule.selector === ':root') {
rule.selector = ':host > *';
}
},
transformCssText: function (cssText) {
cssText = cssText.replace(BAD_VAR, fixVars);
cssText = cssText.replace(VAR_ASSIGN, produceCssProperties);
return consumeCssProperties(cssText);
},
_getInitialValueForProperty: function (property) {
if (!this._measureElement) {
this._measureElement = document.createElement('meta');
this._measureElement.style.all = 'initial';
document.head.appendChild(this._measureElement);
}
return window.getComputedStyle(this._measureElement).getPropertyValue(property);
}
};
ApplyShim._boundTransformRule = ApplyShim.transformRule.bind(ApplyShim);
return ApplyShim;
}();
(function () {
var prepElement = Polymer.Base._prepElement;
var nativeShadow = Polymer.Settings.useNativeShadow;
var styleUtil = Polymer.StyleUtil;
var styleTransformer = Polymer.StyleTransformer;
var styleExtends = Polymer.StyleExtends;
var applyShim = Polymer.ApplyShim;
var settings = Polymer.Settings;
Polymer.Base._addFeature({
_prepElement: function (element) {
if (this._encapsulateStyle && this.__cssBuild !== 'shady') {
styleTransformer.element(element, this.is, this._scopeCssViaAttr);
}
prepElement.call(this, element);
},
_prepStyles: function () {
if (this._encapsulateStyle === undefined) {
this._encapsulateStyle = !nativeShadow;
}
if (!nativeShadow) {
this._scopeStyle = styleUtil.applyStylePlaceHolder(this.is);
}
this.__cssBuild = styleUtil.cssBuildTypeForModule(this.is);
},
_prepShimStyles: function () {
if (this._template) {
var hasTargetedCssBuild = styleUtil.isTargetedBuild(this.__cssBuild);
if (settings.useNativeCSSProperties && this.__cssBuild === 'shadow' && hasTargetedCssBuild) {
return;
}
this._styles = this._styles || this._collectStyles();
if (settings.useNativeCSSProperties && !this.__cssBuild) {
applyShim.transform(this._styles, this);
}
var cssText = settings.useNativeCSSProperties && hasTargetedCssBuild ? this._styles.length && this._styles[0].textContent.trim() : styleTransformer.elementStyles(this);
this._prepStyleProperties();
if (!this._needsStyleProperties() && cssText) {
styleUtil.applyCss(cssText, this.is, nativeShadow ? this._template.content : null, this._scopeStyle);
}
} else {
this._styles = [];
}
},
_collectStyles: function () {
var styles = [];
var cssText = '', m$ = this.styleModules;
if (m$) {
for (var i = 0, l = m$.length, m; i < l && (m = m$[i]); i++) {
cssText += styleUtil.cssFromModule(m);
}
}
cssText += styleUtil.cssFromModule(this.is);
var p = this._template && this._template.parentNode;
if (this._template && (!p || p.id.toLowerCase() !== this.is)) {
cssText += styleUtil.cssFromElement(this._template);
}
if (cssText) {
var style = document.createElement('style');
style.textContent = cssText;
if (styleExtends.hasExtends(style.textContent)) {
cssText = styleExtends.transform(style);
}
styles.push(style);
}
return styles;
},
_elementAdd: function (node) {
if (this._encapsulateStyle) {
if (node.__styleScoped) {
node.__styleScoped = false;
} else {
styleTransformer.dom(node, this.is, this._scopeCssViaAttr);
}
}
},
_elementRemove: function (node) {
if (this._encapsulateStyle) {
styleTransformer.dom(node, this.is, this._scopeCssViaAttr, true);
}
},
scopeSubtree: function (container, shouldObserve) {
if (nativeShadow) {
return;
}
var self = this;
var scopify = function (node) {
if (node.nodeType === Node.ELEMENT_NODE) {
var className = node.getAttribute('class');
node.setAttribute('class', self._scopeElementClass(node, className));
var n$ = node.querySelectorAll('*');
for (var i = 0, n; i < n$.length && (n = n$[i]); i++) {
className = n.getAttribute('class');
n.setAttribute('class', self._scopeElementClass(n, className));
}
}
};
scopify(container);
if (shouldObserve) {
var mo = new MutationObserver(function (mxns) {
for (var i = 0, m; i < mxns.length && (m = mxns[i]); i++) {
if (m.addedNodes) {
for (var j = 0; j < m.addedNodes.length; j++) {
scopify(m.addedNodes[j]);
}
}
}
});
mo.observe(container, {
childList: true,
subtree: true
});
return mo;
}
}
});
}());
Polymer.StyleProperties = function () {
'use strict';
var matchesSelector = Polymer.DomApi.matchesSelector;
var styleUtil = Polymer.StyleUtil;
var styleTransformer = Polymer.StyleTransformer;
var IS_IE = navigator.userAgent.match('Trident');
var settings = Polymer.Settings;
return {
decorateStyles: function (styles, scope) {
var self = this, props = {}, keyframes = [], ruleIndex = 0;
var scopeSelector = styleTransformer._calcHostScope(scope.is, scope.extends);
styleUtil.forRulesInStyles(styles, function (rule, style) {
self.decorateRule(rule);
rule.index = ruleIndex++;
self.whenHostOrRootRule(scope, rule, style, function (info) {
if (rule.parent.type === styleUtil.ruleTypes.MEDIA_RULE) {
scope.__notStyleScopeCacheable = true;
}
if (info.isHost) {
var hostContextOrFunction = info.selector.split(' ').some(function (s) {
return s.indexOf(scopeSelector) === 0 && s.length !== scopeSelector.length;
});
scope.__notStyleScopeCacheable = scope.__notStyleScopeCacheable || hostContextOrFunction;
}
});
self.collectPropertiesInCssText(rule.propertyInfo.cssText, props);
}, function onKeyframesRule(rule) {
keyframes.push(rule);
});
styles._keyframes = keyframes;
var names = [];
for (var i in props) {
names.push(i);
}
return names;
},
decorateRule: function (rule) {
if (rule.propertyInfo) {
return rule.propertyInfo;
}
var info = {}, properties = {};
var hasProperties = this.collectProperties(rule, properties);
if (hasProperties) {
info.properties = properties;
rule.rules = null;
}
info.cssText = this.collectCssText(rule);
rule.propertyInfo = info;
return info;
},
collectProperties: function (rule, properties) {
var info = rule.propertyInfo;
if (info) {
if (info.properties) {
Polymer.Base.mixin(properties, info.properties);
return true;
}
} else {
var m, rx = this.rx.VAR_ASSIGN;
var cssText = rule.parsedCssText;
var value;
var any;
while (m = rx.exec(cssText)) {
value = (m[2] || m[3]).trim();
if (value !== 'inherit') {
properties[m[1].trim()] = value;
}
any = true;
}
return any;
}
},
collectCssText: function (rule) {
return this.collectConsumingCssText(rule.parsedCssText);
},
collectConsumingCssText: function (cssText) {
return cssText.replace(this.rx.BRACKETED, '').replace(this.rx.VAR_ASSIGN, '');
},
collectPropertiesInCssText: function (cssText, props) {
var m;
while (m = this.rx.VAR_CONSUMED.exec(cssText)) {
var name = m[1];
if (m[2] !== ':') {
props[name] = true;
}
}
},
reify: function (props) {
var names = Object.getOwnPropertyNames(props);
for (var i = 0, n; i < names.length; i++) {
n = names[i];
props[n] = this.valueForProperty(props[n], props);
}
},
valueForProperty: function (property, props) {
if (property) {
if (property.indexOf(';') >= 0) {
property = this.valueForProperties(property, props);
} else {
var self = this;
var fn = function (prefix, value, fallback, suffix) {
var propertyValue = self.valueForProperty(props[value], props);
if (!propertyValue || propertyValue === 'initial') {
propertyValue = self.valueForProperty(props[fallback] || fallback, props) || fallback;
} else if (propertyValue === 'apply-shim-inherit') {
propertyValue = 'inherit';
}
return prefix + (propertyValue || '') + suffix;
};
property = styleUtil.processVariableAndFallback(property, fn);
}
}
return property && property.trim() || '';
},
valueForProperties: function (property, props) {
var parts = property.split(';');
for (var i = 0, p, m; i < parts.length; i++) {
if (p = parts[i]) {
this.rx.MIXIN_MATCH.lastIndex = 0;
m = this.rx.MIXIN_MATCH.exec(p);
if (m) {
p = this.valueForProperty(props[m[1]], props);
} else {
var colon = p.indexOf(':');
if (colon !== -1) {
var pp = p.substring(colon);
pp = pp.trim();
pp = this.valueForProperty(pp, props) || pp;
p = p.substring(0, colon) + pp;
}
}
parts[i] = p && p.lastIndexOf(';') === p.length - 1 ? p.slice(0, -1) : p || '';
}
}
return parts.join(';');
},
applyProperties: function (rule, props) {
var output = '';
if (!rule.propertyInfo) {
this.decorateRule(rule);
}
if (rule.propertyInfo.cssText) {
output = this.valueForProperties(rule.propertyInfo.cssText, props);
}
rule.cssText = output;
},
applyKeyframeTransforms: function (rule, keyframeTransforms) {
var input = rule.cssText;
var output = rule.cssText;
if (rule.hasAnimations == null) {
rule.hasAnimations = this.rx.ANIMATION_MATCH.test(input);
}
if (rule.hasAnimations) {
var transform;
if (rule.keyframeNamesToTransform == null) {
rule.keyframeNamesToTransform = [];
for (var keyframe in keyframeTransforms) {
transform = keyframeTransforms[keyframe];
output = transform(input);
if (input !== output) {
input = output;
rule.keyframeNamesToTransform.push(keyframe);
}
}
} else {
for (var i = 0; i < rule.keyframeNamesToTransform.length; ++i) {
transform = keyframeTransforms[rule.keyframeNamesToTransform[i]];
input = transform(input);
}
output = input;
}
}
rule.cssText = output;
},
propertyDataFromStyles: function (styles, element) {
var props = {}, self = this;
var o = [];
styleUtil.forActiveRulesInStyles(styles, function (rule) {
if (!rule.propertyInfo) {
self.decorateRule(rule);
}
var selectorToMatch = rule.transformedSelector || rule.parsedSelector;
if (element && rule.propertyInfo.properties && selectorToMatch) {
if (matchesSelector.call(element, selectorToMatch)) {
self.collectProperties(rule, props);
addToBitMask(rule.index, o);
}
}
});
return {
properties: props,
key: o
};
},
whenHostOrRootRule: function (scope, rule, style, callback) {
if (!rule.propertyInfo) {
self.decorateRule(rule);
}
if (!rule.propertyInfo.properties) {
return;
}
var hostScope = scope.is ? styleTransformer._calcHostScope(scope.is, scope.extends) : 'html';
var parsedSelector = rule.parsedSelector;
var isRoot = parsedSelector === ':root';
var isHost = parsedSelector.indexOf(':host') === 0;
var cssBuild = scope.__cssBuild || style.__cssBuild;
if (cssBuild === 'shady') {
isRoot = parsedSelector === hostScope + ' > *.' + hostScope || parsedSelector.indexOf('html') !== -1;
isHost = !isRoot && parsedSelector.indexOf(hostScope) === 0;
}
if (cssBuild === 'shadow') {
isRoot = parsedSelector === ':host > *' || parsedSelector === 'html';
isHost = isHost && !isRoot;
}
if (!isRoot && !isHost) {
return;
}
var selectorToMatch = hostScope;
if (isHost) {
if (settings.useNativeShadow && !rule.transformedSelector) {
rule.transformedSelector = styleTransformer._transformRuleCss(rule, styleTransformer._transformComplexSelector, scope.is, hostScope);
}
selectorToMatch = rule.transformedSelector || rule.parsedSelector;
}
callback({
selector: selectorToMatch,
isHost: isHost,
isRoot: isRoot
});
},
hostAndRootPropertiesForScope: function (scope) {
var hostProps = {}, rootProps = {}, self = this;
styleUtil.forActiveRulesInStyles(scope._styles, function (rule, style) {
self.whenHostOrRootRule(scope, rule, style, function (info) {
var element = scope._element || scope;
if (matchesSelector.call(element, info.selector)) {
if (info.isHost) {
self.collectProperties(rule, hostProps);
} else {
self.collectProperties(rule, rootProps);
}
}
});
});
return {
rootProps: rootProps,
hostProps: hostProps
};
},
transformStyles: function (element, properties, scopeSelector) {
var self = this;
var hostSelector = styleTransformer._calcHostScope(element.is, element.extends);
var rxHostSelector = element.extends ? '\\' + hostSelector.slice(0, -1) + '\\]' : hostSelector;
var hostRx = new RegExp(this.rx.HOST_PREFIX + rxHostSelector + this.rx.HOST_SUFFIX);
var keyframeTransforms = this._elementKeyframeTransforms(element, scopeSelector);
return styleTransformer.elementStyles(element, function (rule) {
self.applyProperties(rule, properties);
if (!settings.useNativeShadow && !Polymer.StyleUtil.isKeyframesSelector(rule) && rule.cssText) {
self.applyKeyframeTransforms(rule, keyframeTransforms);
self._scopeSelector(rule, hostRx, hostSelector, element._scopeCssViaAttr, scopeSelector);
}
});
},
_elementKeyframeTransforms: function (element, scopeSelector) {
var keyframesRules = element._styles._keyframes;
var keyframeTransforms = {};
if (!settings.useNativeShadow && keyframesRules) {
for (var i = 0, keyframesRule = keyframesRules[i]; i < keyframesRules.length; keyframesRule = keyframesRules[++i]) {
this._scopeKeyframes(keyframesRule, scopeSelector);
keyframeTransforms[keyframesRule.keyframesName] = this._keyframesRuleTransformer(keyframesRule);
}
}
return keyframeTransforms;
},
_keyframesRuleTransformer: function (keyframesRule) {
return function (cssText) {
return cssText.replace(keyframesRule.keyframesNameRx, keyframesRule.transformedKeyframesName);
};
},
_scopeKeyframes: function (rule, scopeId) {
rule.keyframesNameRx = new RegExp(rule.keyframesName, 'g');
rule.transformedKeyframesName = rule.keyframesName + '-' + scopeId;
rule.transformedSelector = rule.transformedSelector || rule.selector;
rule.selector = rule.transformedSelector.replace(rule.keyframesName, rule.transformedKeyframesName);
},
_scopeSelector: function (rule, hostRx, hostSelector, viaAttr, scopeId) {
rule.transformedSelector = rule.transformedSelector || rule.selector;
var selector = rule.transformedSelector;
var scope = viaAttr ? '[' + styleTransformer.SCOPE_NAME + '~=' + scopeId + ']' : '.' + scopeId;
var parts = selector.split(',');
for (var i = 0, l = parts.length, p; i < l && (p = parts[i]); i++) {
parts[i] = p.match(hostRx) ? p.replace(hostSelector, scope) : scope + ' ' + p;
}
rule.selector = parts.join(',');
},
applyElementScopeSelector: function (element, selector, old, viaAttr) {
var c = viaAttr ? element.getAttribute(styleTransformer.SCOPE_NAME) : element.getAttribute('class') || '';
var v = old ? c.replace(old, selector) : (c ? c + ' ' : '') + this.XSCOPE_NAME + ' ' + selector;
if (c !== v) {
if (viaAttr) {
element.setAttribute(styleTransformer.SCOPE_NAME, v);
} else {
element.setAttribute('class', v);
}
}
},
applyElementStyle: function (element, properties, selector, style) {
var cssText = style ? style.textContent || '' : this.transformStyles(element, properties, selector);
var s = element._customStyle;
if (s && !settings.useNativeShadow && s !== style) {
s._useCount--;
if (s._useCount <= 0 && s.parentNode) {
s.parentNode.removeChild(s);
}
}
if (settings.useNativeShadow) {
if (element._customStyle) {
element._customStyle.textContent = cssText;
style = element._customStyle;
} else if (cssText) {
style = styleUtil.applyCss(cssText, selector, element.root, element._scopeStyle);
}
} else {
if (!style) {
if (cssText) {
style = styleUtil.applyCss(cssText, selector, null, element._scopeStyle);
}
} else if (!style.parentNode) {
styleUtil.applyStyle(style, null, element._scopeStyle);
}
}
if (style) {
style._useCount = style._useCount || 0;
if (element._customStyle != style) {
style._useCount++;
}
element._customStyle = style;
}
if (IS_IE) {
style.textContent = style.textContent;
}
return style;
},
mixinCustomStyle: function (props, customStyle) {
var v;
for (var i in customStyle) {
v = customStyle[i];
if (v || v === 0) {
props[i] = v;
}
}
},
updateNativeStyleProperties: function (element, properties) {
var oldPropertyNames = element.__customStyleProperties;
if (oldPropertyNames) {
for (var i = 0; i < oldPropertyNames.length; i++) {
element.style.removeProperty(oldPropertyNames[i]);
}
}
var propertyNames = [];
for (var p in properties) {
if (properties[p] !== null) {
element.style.setProperty(p, properties[p]);
propertyNames.push(p);
}
}
element.__customStyleProperties = propertyNames;
},
rx: styleUtil.rx,
XSCOPE_NAME: 'x-scope'
};
function addToBitMask(n, bits) {
var o = parseInt(n / 32);
var v = 1 << n % 32;
bits[o] = (bits[o] || 0) | v;
}
}();
(function () {
Polymer.StyleCache = function () {
this.cache = {};
};
Polymer.StyleCache.prototype = {
MAX: 100,
store: function (is, data, keyValues, keyStyles) {
data.keyValues = keyValues;
data.styles = keyStyles;
var s$ = this.cache[is] = this.cache[is] || [];
s$.push(data);
if (s$.length > this.MAX) {
s$.shift();
}
},
retrieve: function (is, keyValues, keyStyles) {
var cache = this.cache[is];
if (cache) {
for (var i = cache.length - 1, data; i >= 0; i--) {
data = cache[i];
if (keyStyles === data.styles && this._objectsEqual(keyValues, data.keyValues)) {
return data;
}
}
}
},
clear: function () {
this.cache = {};
},
_objectsEqual: function (target, source) {
var t, s;
for (var i in target) {
t = target[i], s = source[i];
if (!(typeof t === 'object' && t ? this._objectsStrictlyEqual(t, s) : t === s)) {
return false;
}
}
if (Array.isArray(target)) {
return target.length === source.length;
}
return true;
},
_objectsStrictlyEqual: function (target, source) {
return this._objectsEqual(target, source) && this._objectsEqual(source, target);
}
};
}());
Polymer.StyleDefaults = function () {
var styleProperties = Polymer.StyleProperties;
var StyleCache = Polymer.StyleCache;
var nativeVariables = Polymer.Settings.useNativeCSSProperties;
var api = {
_styles: [],
_properties: null,
customStyle: {},
_styleCache: new StyleCache(),
_element: Polymer.DomApi.wrap(document.documentElement),
addStyle: function (style) {
this._styles.push(style);
this._properties = null;
},
get _styleProperties() {
if (!this._properties) {
styleProperties.decorateStyles(this._styles, this);
this._styles._scopeStyleProperties = null;
this._properties = styleProperties.hostAndRootPropertiesForScope(this).rootProps;
styleProperties.mixinCustomStyle(this._properties, this.customStyle);
styleProperties.reify(this._properties);
}
return this._properties;
},
hasStyleProperties: function () {
return Boolean(this._properties);
},
_needsStyleProperties: function () {
},
_computeStyleProperties: function () {
return this._styleProperties;
},
updateStyles: function (properties) {
this._properties = null;
if (properties) {
Polymer.Base.mixin(this.customStyle, properties);
}
this._styleCache.clear();
for (var i = 0, s; i < this._styles.length; i++) {
s = this._styles[i];
s = s.__importElement || s;
s._apply();
}
if (nativeVariables) {
styleProperties.updateNativeStyleProperties(document.documentElement, this.customStyle);
}
}
};
return api;
}();
(function () {
'use strict';
var serializeValueToAttribute = Polymer.Base.serializeValueToAttribute;
var propertyUtils = Polymer.StyleProperties;
var styleTransformer = Polymer.StyleTransformer;
var styleDefaults = Polymer.StyleDefaults;
var nativeShadow = Polymer.Settings.useNativeShadow;
var nativeVariables = Polymer.Settings.useNativeCSSProperties;
Polymer.Base._addFeature({
_prepStyleProperties: function () {
if (!nativeVariables) {
this._ownStylePropertyNames = this._styles && this._styles.length ? propertyUtils.decorateStyles(this._styles, this) : null;
}
},
customStyle: null,
getComputedStyleValue: function (property) {
return !nativeVariables && this._styleProperties && this._styleProperties[property] || getComputedStyle(this).getPropertyValue(property);
},
_setupStyleProperties: function () {
this.customStyle = {};
this._styleCache = null;
this._styleProperties = null;
this._scopeSelector = null;
this._ownStyleProperties = null;
this._customStyle = null;
},
_needsStyleProperties: function () {
return Boolean(!nativeVariables && this._ownStylePropertyNames && this._ownStylePropertyNames.length);
},
_validateApplyShim: function () {
if (this.__applyShimInvalid) {
Polymer.ApplyShim.transform(this._styles, this.__proto__);
var cssText = styleTransformer.elementStyles(this);
if (nativeShadow) {
var templateStyle = this._template.content.querySelector('style');
if (templateStyle) {
templateStyle.textContent = cssText;
}
} else {
var shadyStyle = this._scopeStyle && this._scopeStyle.nextSibling;
if (shadyStyle) {
shadyStyle.textContent = cssText;
}
}
}
},
_beforeAttached: function () {
if ((!this._scopeSelector || this.__stylePropertiesInvalid) && this._needsStyleProperties()) {
this.__stylePropertiesInvalid = false;
this._updateStyleProperties();
}
},
_findStyleHost: function () {
var e = this, root;
while (root = Polymer.dom(e).getOwnerRoot()) {
if (Polymer.isInstance(root.host)) {
return root.host;
}
e = root.host;
}
return styleDefaults;
},
_updateStyleProperties: function () {
var info, scope = this._findStyleHost();
if (!scope._styleProperties) {
scope._computeStyleProperties();
}
if (!scope._styleCache) {
scope._styleCache = new Polymer.StyleCache();
}
var scopeData = propertyUtils.propertyDataFromStyles(scope._styles, this);
var scopeCacheable = !this.__notStyleScopeCacheable;
if (scopeCacheable) {
scopeData.key.customStyle = this.customStyle;
info = scope._styleCache.retrieve(this.is, scopeData.key, this._styles);
}
var scopeCached = Boolean(info);
if (scopeCached) {
this._styleProperties = info._styleProperties;
} else {
this._computeStyleProperties(scopeData.properties);
}
this._computeOwnStyleProperties();
if (!scopeCached) {
info = styleCache.retrieve(this.is, this._ownStyleProperties, this._styles);
}
var globalCached = Boolean(info) && !scopeCached;
var style = this._applyStyleProperties(info);
if (!scopeCached) {
style = style && nativeShadow ? style.cloneNode(true) : style;
info = {
style: style,
_scopeSelector: this._scopeSelector,
_styleProperties: this._styleProperties
};
if (scopeCacheable) {
scopeData.key.customStyle = {};
this.mixin(scopeData.key.customStyle, this.customStyle);
scope._styleCache.store(this.is, info, scopeData.key, this._styles);
}
if (!globalCached) {
styleCache.store(this.is, Object.create(info), this._ownStyleProperties, this._styles);
}
}
},
_computeStyleProperties: function (scopeProps) {
var scope = this._findStyleHost();
if (!scope._styleProperties) {
scope._computeStyleProperties();
}
var props = Object.create(scope._styleProperties);
var hostAndRootProps = propertyUtils.hostAndRootPropertiesForScope(this);
this.mixin(props, hostAndRootProps.hostProps);
scopeProps = scopeProps || propertyUtils.propertyDataFromStyles(scope._styles, this).properties;
this.mixin(props, scopeProps);
this.mixin(props, hostAndRootProps.rootProps);
propertyUtils.mixinCustomStyle(props, this.customStyle);
propertyUtils.reify(props);
this._styleProperties = props;
},
_computeOwnStyleProperties: function () {
var props = {};
for (var i = 0, n; i < this._ownStylePropertyNames.length; i++) {
n = this._ownStylePropertyNames[i];
props[n] = this._styleProperties[n];
}
this._ownStyleProperties = props;
},
_scopeCount: 0,
_applyStyleProperties: function (info) {
var oldScopeSelector = this._scopeSelector;
this._scopeSelector = info ? info._scopeSelector : this.is + '-' + this.__proto__._scopeCount++;
var style = propertyUtils.applyElementStyle(this, this._styleProperties, this._scopeSelector, info && info.style);
if (!nativeShadow) {
propertyUtils.applyElementScopeSelector(this, this._scopeSelector, oldScopeSelector, this._scopeCssViaAttr);
}
return style;
},
serializeValueToAttribute: function (value, attribute, node) {
node = node || this;
if (attribute === 'class' && !nativeShadow) {
var host = node === this ? this.domHost || this.dataHost : this;
if (host) {
value = host._scopeElementClass(node, value);
}
}
node = this.shadyRoot && this.shadyRoot._hasDistributed ? Polymer.dom(node) : node;
serializeValueToAttribute.call(this, value, attribute, node);
},
_scopeElementClass: function (element, selector) {
if (!nativeShadow && !this._scopeCssViaAttr) {
selector = (selector ? selector + ' ' : '') + SCOPE_NAME + ' ' + this.is + (element._scopeSelector ? ' ' + XSCOPE_NAME + ' ' + element._scopeSelector : '');
}
return selector;
},
updateStyles: function (properties) {
if (properties) {
this.mixin(this.customStyle, properties);
}
if (nativeVariables) {
propertyUtils.updateNativeStyleProperties(this, this.customStyle);
} else {
if (this.isAttached) {
if (this._needsStyleProperties()) {
this._updateStyleProperties();
} else {
this._styleProperties = null;
}
} else {
this.__stylePropertiesInvalid = true;
}
if (this._styleCache) {
this._styleCache.clear();
}
this._updateRootStyles();
}
},
_updateRootStyles: function (root) {
root = root || this.root;
var c$ = Polymer.dom(root)._query(function (e) {
return e.shadyRoot || e.shadowRoot;
});
for (var i = 0, l = c$.length, c; i < l && (c = c$[i]); i++) {
if (c.updateStyles) {
c.updateStyles();
}
}
}
});
Polymer.updateStyles = function (properties) {
styleDefaults.updateStyles(properties);
Polymer.Base._updateRootStyles(document);
};
var styleCache = new Polymer.StyleCache();
Polymer.customStyleCache = styleCache;
var SCOPE_NAME = styleTransformer.SCOPE_NAME;
var XSCOPE_NAME = propertyUtils.XSCOPE_NAME;
}());
Polymer.Base._addFeature({
_registerFeatures: function () {
this._prepIs();
this._prepConstructor();
this._prepStyles();
},
_finishRegisterFeatures: function () {
this._prepTemplate();
this._prepShimStyles();
this._prepAnnotations();
this._prepEffects();
this._prepBehaviors();
this._prepPropertyInfo();
this._prepBindings();
this._prepShady();
},
_prepBehavior: function (b) {
this._addPropertyEffects(b.properties);
this._addComplexObserverEffects(b.observers);
this._addHostAttributes(b.hostAttributes);
},
_initFeatures: function () {
this._setupGestures();
this._setupConfigure();
this._setupStyleProperties();
this._setupDebouncers();
this._setupShady();
this._registerHost();
if (this._template) {
this._validateApplyShim();
this._poolContent();
this._beginHosting();
this._stampTemplate();
this._endHosting();
this._marshalAnnotationReferences();
}
this._marshalInstanceEffects();
this._marshalBehaviors();
this._marshalHostAttributes();
this._marshalAttributes();
this._tryReady();
},
_marshalBehavior: function (b) {
if (b.listeners) {
this._listenListeners(b.listeners);
}
}
});
(function () {
var propertyUtils = Polymer.StyleProperties;
var styleUtil = Polymer.StyleUtil;
var cssParse = Polymer.CssParse;
var styleDefaults = Polymer.StyleDefaults;
var styleTransformer = Polymer.StyleTransformer;
var applyShim = Polymer.ApplyShim;
var debounce = Polymer.Debounce;
var settings = Polymer.Settings;
var updateDebouncer;
Polymer({
is: 'custom-style',
extends: 'style',
_template: null,
properties: { include: String },
ready: function () {
this.__appliedElement = this.__appliedElement || this;
this.__cssBuild = styleUtil.getCssBuildType(this);
if (this.__appliedElement !== this) {
this.__appliedElement.__cssBuild = this.__cssBuild;
}
this._tryApply();
},
attached: function () {
this._tryApply();
},
_tryApply: function () {
if (!this._appliesToDocument) {
if (this.parentNode && this.parentNode.localName !== 'dom-module') {
this._appliesToDocument = true;
var e = this.__appliedElement;
if (!settings.useNativeCSSProperties) {
this.__needsUpdateStyles = styleDefaults.hasStyleProperties();
styleDefaults.addStyle(e);
}
if (e.textContent || this.include) {
this._apply(true);
} else {
var self = this;
var observer = new MutationObserver(function () {
observer.disconnect();
self._apply(true);
});
observer.observe(e, { childList: true });
}
}
}
},
_updateStyles: function () {
Polymer.updateStyles();
},
_apply: function (initialApply) {
var e = this.__appliedElement;
if (this.include) {
e.textContent = styleUtil.cssFromModules(this.include, true) + e.textContent;
}
if (!e.textContent) {
return;
}
var buildType = this.__cssBuild;
var targetedBuild = styleUtil.isTargetedBuild(buildType);
if (settings.useNativeCSSProperties && targetedBuild) {
return;
}
var styleRules = styleUtil.rulesForStyle(e);
if (!targetedBuild) {
styleUtil.forEachRule(styleRules, function (rule) {
styleTransformer.documentRule(rule);
if (settings.useNativeCSSProperties && !buildType) {
applyShim.transformRule(rule);
}
});
}
if (settings.useNativeCSSProperties) {
e.textContent = styleUtil.toCssText(styleRules);
} else {
var self = this;
var fn = function fn() {
self._flushCustomProperties();
};
if (initialApply) {
Polymer.RenderStatus.whenReady(fn);
} else {
fn();
}
}
},
_flushCustomProperties: function () {
if (this.__needsUpdateStyles) {
this.__needsUpdateStyles = false;
updateDebouncer = debounce(updateDebouncer, this._updateStyles);
} else {
this._applyCustomProperties();
}
},
_applyCustomProperties: function () {
var element = this.__appliedElement;
this._computeStyleProperties();
var props = this._styleProperties;
var rules = styleUtil.rulesForStyle(element);
if (!rules) {
return;
}
element.textContent = styleUtil.toCssText(rules, function (rule) {
var css = rule.cssText = rule.parsedCssText;
if (rule.propertyInfo && rule.propertyInfo.cssText) {
css = cssParse.removeCustomPropAssignment(css);
rule.cssText = propertyUtils.valueForProperties(css, props);
}
});
}
});
}());
Polymer.Templatizer = {
properties: { __hideTemplateChildren__: { observer: '_showHideChildren' } },
_instanceProps: Polymer.nob,
_parentPropPrefix: '_parent_',
templatize: function (template) {
this._templatized = template;
if (!template._content) {
template._content = template.content;
}
if (template._content._ctor) {
this.ctor = template._content._ctor;
this._prepParentProperties(this.ctor.prototype, template);
return;
}
var archetype = Object.create(Polymer.Base);
this._customPrepAnnotations(archetype, template);
this._prepParentProperties(archetype, template);
archetype._prepEffects();
this._customPrepEffects(archetype);
archetype._prepBehaviors();
archetype._prepPropertyInfo();
archetype._prepBindings();
archetype._notifyPathUp = this._notifyPathUpImpl;
archetype._scopeElementClass = this._scopeElementClassImpl;
archetype.listen = this._listenImpl;
archetype._showHideChildren = this._showHideChildrenImpl;
archetype.__setPropertyOrig = this.__setProperty;
archetype.__setProperty = this.__setPropertyImpl;
var _constructor = this._constructorImpl;
var ctor = function TemplateInstance(model, host) {
_constructor.call(this, model, host);
};
ctor.prototype = archetype;
archetype.constructor = ctor;
template._content._ctor = ctor;
this.ctor = ctor;
},
_getRootDataHost: function () {
return this.dataHost && this.dataHost._rootDataHost || this.dataHost;
},
_showHideChildrenImpl: function (hide) {
var c = this._children;
for (var i = 0; i < c.length; i++) {
var n = c[i];
if (Boolean(hide) != Boolean(n.__hideTemplateChildren__)) {
if (n.nodeType === Node.TEXT_NODE) {
if (hide) {
n.__polymerTextContent__ = n.textContent;
n.textContent = '';
} else {
n.textContent = n.__polymerTextContent__;
}
} else if (n.style) {
if (hide) {
n.__polymerDisplay__ = n.style.display;
n.style.display = 'none';
} else {
n.style.display = n.__polymerDisplay__;
}
}
}
n.__hideTemplateChildren__ = hide;
}
},
__setPropertyImpl: function (property, value, fromAbove, node) {
if (node && node.__hideTemplateChildren__ && property == 'textContent') {
property = '__polymerTextContent__';
}
this.__setPropertyOrig(property, value, fromAbove, node);
},
_debounceTemplate: function (fn) {
Polymer.dom.addDebouncer(this.debounce('_debounceTemplate', fn));
},
_flushTemplates: function () {
Polymer.dom.flush();
},
_customPrepEffects: function (archetype) {
var parentProps = archetype._parentProps;
for (var prop in parentProps) {
archetype._addPropertyEffect(prop, 'function', this._createHostPropEffector(prop));
}
for (prop in this._instanceProps) {
archetype._addPropertyEffect(prop, 'function', this._createInstancePropEffector(prop));
}
},
_customPrepAnnotations: function (archetype, template) {
archetype._template = template;
var c = template._content;
if (!c._notes) {
var rootDataHost = archetype._rootDataHost;
if (rootDataHost) {
Polymer.Annotations.prepElement = function () {
rootDataHost._prepElement();
};
}
c._notes = Polymer.Annotations.parseAnnotations(template);
Polymer.Annotations.prepElement = null;
this._processAnnotations(c._notes);
}
archetype._notes = c._notes;
archetype._parentProps = c._parentProps;
},
_prepParentProperties: function (archetype, template) {
var parentProps = this._parentProps = archetype._parentProps;
if (this._forwardParentProp && parentProps) {
var proto = archetype._parentPropProto;
var prop;
if (!proto) {
for (prop in this._instanceProps) {
delete parentProps[prop];
}
proto = archetype._parentPropProto = Object.create(null);
if (template != this) {
Polymer.Bind.prepareModel(proto);
Polymer.Base.prepareModelNotifyPath(proto);
}
for (prop in parentProps) {
var parentProp = this._parentPropPrefix + prop;
var effects = [
{
kind: 'function',
effect: this._createForwardPropEffector(prop),
fn: Polymer.Bind._functionEffect
},
{
kind: 'notify',
fn: Polymer.Bind._notifyEffect,
effect: { event: Polymer.CaseMap.camelToDashCase(parentProp) + '-changed' }
}
];
Polymer.Bind._createAccessors(proto, parentProp, effects);
}
}
var self = this;
if (template != this) {
Polymer.Bind.prepareInstance(template);
template._forwardParentProp = function (source, value) {
self._forwardParentProp(source, value);
};
}
this._extendTemplate(template, proto);
template._pathEffector = function (path, value, fromAbove) {
return self._pathEffectorImpl(path, value, fromAbove);
};
}
},
_createForwardPropEffector: function (prop) {
return function (source, value) {
this._forwardParentProp(prop, value);
};
},
_createHostPropEffector: function (prop) {
var prefix = this._parentPropPrefix;
return function (source, value) {
this.dataHost._templatized[prefix + prop] = value;
};
},
_createInstancePropEffector: function (prop) {
return function (source, value, old, fromAbove) {
if (!fromAbove) {
this.dataHost._forwardInstanceProp(this, prop, value);
}
};
},
_extendTemplate: function (template, proto) {
var n$ = Object.getOwnPropertyNames(proto);
if (proto._propertySetter) {
template._propertySetter = proto._propertySetter;
}
for (var i = 0, n; i < n$.length && (n = n$[i]); i++) {
var val = template[n];
var pd = Object.getOwnPropertyDescriptor(proto, n);
Object.defineProperty(template, n, pd);
if (val !== undefined) {
template._propertySetter(n, val);
}
}
},
_showHideChildren: function (hidden) {
},
_forwardInstancePath: function (inst, path, value) {
},
_forwardInstanceProp: function (inst, prop, value) {
},
_notifyPathUpImpl: function (path, value) {
var dataHost = this.dataHost;
var dot = path.indexOf('.');
var root = dot < 0 ? path : path.slice(0, dot);
dataHost._forwardInstancePath.call(dataHost, this, path, value);
if (root in dataHost._parentProps) {
dataHost._templatized._notifyPath(dataHost._parentPropPrefix + path, value);
}
},
_pathEffectorImpl: function (path, value, fromAbove) {
if (this._forwardParentPath) {
if (path.indexOf(this._parentPropPrefix) === 0) {
var subPath = path.substring(this._parentPropPrefix.length);
var model = this._modelForPath(subPath);
if (model in this._parentProps) {
this._forwardParentPath(subPath, value);
}
}
}
Polymer.Base._pathEffector.call(this._templatized, path, value, fromAbove);
},
_constructorImpl: function (model, host) {
this._rootDataHost = host._getRootDataHost();
this._setupConfigure(model);
this._registerHost(host);
this._beginHosting();
this.root = this.instanceTemplate(this._template);
this.root.__noContent = !this._notes._hasContent;
this.root.__styleScoped = true;
this._endHosting();
this._marshalAnnotatedNodes();
this._marshalInstanceEffects();
this._marshalAnnotatedListeners();
var children = [];
for (var n = this.root.firstChild; n; n = n.nextSibling) {
children.push(n);
n._templateInstance = this;
}
this._children = children;
if (host.__hideTemplateChildren__) {
this._showHideChildren(true);
}
this._tryReady();
},
_listenImpl: function (node, eventName, methodName) {
var model = this;
var host = this._rootDataHost;
var handler = host._createEventHandler(node, eventName, methodName);
var decorated = function (e) {
e.model = model;
handler(e);
};
host._listen(node, eventName, decorated);
},
_scopeElementClassImpl: function (node, value) {
var host = this._rootDataHost;
if (host) {
return host._scopeElementClass(node, value);
}
return value;
},
stamp: function (model) {
model = model || {};
if (this._parentProps) {
var templatized = this._templatized;
for (var prop in this._parentProps) {
if (model[prop] === undefined) {
model[prop] = templatized[this._parentPropPrefix + prop];
}
}
}
return new this.ctor(model, this);
},
modelForElement: function (el) {
var model;
while (el) {
if (model = el._templateInstance) {
if (model.dataHost != this) {
el = model.dataHost;
} else {
return model;
}
} else {
el = el.parentNode;
}
}
}
};
Polymer({
is: 'dom-template',
extends: 'template',
_template: null,
behaviors: [Polymer.Templatizer],
ready: function () {
this.templatize(this);
}
});
Polymer._collections = new WeakMap();
Polymer.Collection = function (userArray) {
Polymer._collections.set(userArray, this);
this.userArray = userArray;
this.store = userArray.slice();
this.initMap();
};
Polymer.Collection.prototype = {
constructor: Polymer.Collection,
initMap: function () {
var omap = this.omap = new WeakMap();
var pmap = this.pmap = {};
var s = this.store;
for (var i = 0; i < s.length; i++) {
var item = s[i];
if (item && typeof item == 'object') {
omap.set(item, i);
} else {
pmap[item] = i;
}
}
},
add: function (item) {
var key = this.store.push(item) - 1;
if (item && typeof item == 'object') {
this.omap.set(item, key);
} else {
this.pmap[item] = key;
}
return '#' + key;
},
removeKey: function (key) {
if (key = this._parseKey(key)) {
this._removeFromMap(this.store[key]);
delete this.store[key];
}
},
_removeFromMap: function (item) {
if (item && typeof item == 'object') {
this.omap.delete(item);
} else {
delete this.pmap[item];
}
},
remove: function (item) {
var key = this.getKey(item);
this.removeKey(key);
return key;
},
getKey: function (item) {
var key;
if (item && typeof item == 'object') {
key = this.omap.get(item);
} else {
key = this.pmap[item];
}
if (key != undefined) {
return '#' + key;
}
},
getKeys: function () {
return Object.keys(this.store).map(function (key) {
return '#' + key;
});
},
_parseKey: function (key) {
if (key && key[0] == '#') {
return key.slice(1);
}
},
setItem: function (key, item) {
if (key = this._parseKey(key)) {
var old = this.store[key];
if (old) {
this._removeFromMap(old);
}
if (item && typeof item == 'object') {
this.omap.set(item, key);
} else {
this.pmap[item] = key;
}
this.store[key] = item;
}
},
getItem: function (key) {
if (key = this._parseKey(key)) {
return this.store[key];
}
},
getItems: function () {
var items = [], store = this.store;
for (var key in store) {
items.push(store[key]);
}
return items;
},
_applySplices: function (splices) {
var keyMap = {}, key;
for (var i = 0, s; i < splices.length && (s = splices[i]); i++) {
s.addedKeys = [];
for (var j = 0; j < s.removed.length; j++) {
key = this.getKey(s.removed[j]);
keyMap[key] = keyMap[key] ? null : -1;
}
for (j = 0; j < s.addedCount; j++) {
var item = this.userArray[s.index + j];
key = this.getKey(item);
key = key === undefined ? this.add(item) : key;
keyMap[key] = keyMap[key] ? null : 1;
s.addedKeys.push(key);
}
}
var removed = [];
var added = [];
for (key in keyMap) {
if (keyMap[key] < 0) {
this.removeKey(key);
removed.push(key);
}
if (keyMap[key] > 0) {
added.push(key);
}
}
return [{
removed: removed,
added: added
}];
}
};
Polymer.Collection.get = function (userArray) {
return Polymer._collections.get(userArray) || new Polymer.Collection(userArray);
};
Polymer.Collection.applySplices = function (userArray, splices) {
var coll = Polymer._collections.get(userArray);
return coll ? coll._applySplices(splices) : null;
};
Polymer({
is: 'dom-repeat',
extends: 'template',
_template: null,
properties: {
items: { type: Array },
as: {
type: String,
value: 'item'
},
indexAs: {
type: String,
value: 'index'
},
sort: {
type: Function,
observer: '_sortChanged'
},
filter: {
type: Function,
observer: '_filterChanged'
},
observe: {
type: String,
observer: '_observeChanged'
},
delay: Number,
renderedItemCount: {
type: Number,
notify: true,
readOnly: true
},
initialCount: {
type: Number,
observer: '_initializeChunking'
},
targetFramerate: {
type: Number,
value: 20
},
_targetFrameTime: {
type: Number,
computed: '_computeFrameTime(targetFramerate)'
}
},
behaviors: [Polymer.Templatizer],
observers: ['_itemsChanged(items.*)'],
created: function () {
this._instances = [];
this._pool = [];
this._limit = Infinity;
var self = this;
this._boundRenderChunk = function () {
self._renderChunk();
};
},
detached: function () {
this.__isDetached = true;
for (var i = 0; i < this._instances.length; i++) {
this._detachInstance(i);
}
},
attached: function () {
if (this.__isDetached) {
this.__isDetached = false;
var parent = Polymer.dom(Polymer.dom(this).parentNode);
for (var i = 0; i < this._instances.length; i++) {
this._attachInstance(i, parent);
}
}
},
ready: function () {
this._instanceProps = { __key__: true };
this._instanceProps[this.as] = true;
this._instanceProps[this.indexAs] = true;
if (!this.ctor) {
this.templatize(this);
}
},
_sortChanged: function (sort) {
var dataHost = this._getRootDataHost();
this._sortFn = sort && (typeof sort == 'function' ? sort : function () {
return dataHost[sort].apply(dataHost, arguments);
});
this._needFullRefresh = true;
if (this.items) {
this._debounceTemplate(this._render);
}
},
_filterChanged: function (filter) {
var dataHost = this._getRootDataHost();
this._filterFn = filter && (typeof filter == 'function' ? filter : function () {
return dataHost[filter].apply(dataHost, arguments);
});
this._needFullRefresh = true;
if (this.items) {
this._debounceTemplate(this._render);
}
},
_computeFrameTime: function (rate) {
return Math.ceil(1000 / rate);
},
_initializeChunking: function () {
if (this.initialCount) {
this._limit = this.initialCount;
this._chunkCount = this.initialCount;
this._lastChunkTime = performance.now();
}
},
_tryRenderChunk: function () {
if (this.items && this._limit < this.items.length) {
this.debounce('renderChunk', this._requestRenderChunk);
}
},
_requestRenderChunk: function () {
requestAnimationFrame(this._boundRenderChunk);
},
_renderChunk: function () {
var currChunkTime = performance.now();
var ratio = this._targetFrameTime / (currChunkTime - this._lastChunkTime);
this._chunkCount = Math.round(this._chunkCount * ratio) || 1;
this._limit += this._chunkCount;
this._lastChunkTime = currChunkTime;
this._debounceTemplate(this._render);
},
_observeChanged: function () {
this._observePaths = this.observe && this.observe.replace('.*', '.').split(' ');
},
_itemsChanged: function (change) {
if (change.path == 'items') {
if (Array.isArray(this.items)) {
this.collection = Polymer.Collection.get(this.items);
} else if (!this.items) {
this.collection = null;
} else {
this._error(this._logf('dom-repeat', 'expected array for `items`,' + ' found', this.items));
}
this._keySplices = [];
this._indexSplices = [];
this._needFullRefresh = true;
this._initializeChunking();
this._debounceTemplate(this._render);
} else if (change.path == 'items.splices') {
this._keySplices = this._keySplices.concat(change.value.keySplices);
this._indexSplices = this._indexSplices.concat(change.value.indexSplices);
this._debounceTemplate(this._render);
} else {
var subpath = change.path.slice(6);
this._forwardItemPath(subpath, change.value);
this._checkObservedPaths(subpath);
}
},
_checkObservedPaths: function (path) {
if (this._observePaths) {
path = path.substring(path.indexOf('.') + 1);
var paths = this._observePaths;
for (var i = 0; i < paths.length; i++) {
if (path.indexOf(paths[i]) === 0) {
this._needFullRefresh = true;
if (this.delay) {
this.debounce('render', this._render, this.delay);
} else {
this._debounceTemplate(this._render);
}
return;
}
}
}
},
render: function () {
this._needFullRefresh = true;
this._debounceTemplate(this._render);
this._flushTemplates();
},
_render: function () {
if (this._needFullRefresh) {
this._applyFullRefresh();
this._needFullRefresh = false;
} else if (this._keySplices.length) {
if (this._sortFn) {
this._applySplicesUserSort(this._keySplices);
} else {
if (this._filterFn) {
this._applyFullRefresh();
} else {
this._applySplicesArrayOrder(this._indexSplices);
}
}
} else {
}
this._keySplices = [];
this._indexSplices = [];
var keyToIdx = this._keyToInstIdx = {};
for (var i = this._instances.length - 1; i >= 0; i--) {
var inst = this._instances[i];
if (inst.isPlaceholder && i < this._limit) {
inst = this._insertInstance(i, inst.__key__);
} else if (!inst.isPlaceholder && i >= this._limit) {
inst = this._downgradeInstance(i, inst.__key__);
}
keyToIdx[inst.__key__] = i;
if (!inst.isPlaceholder) {
inst.__setProperty(this.indexAs, i, true);
}
}
this._pool.length = 0;
this._setRenderedItemCount(this._instances.length);
this.fire('dom-change');
this._tryRenderChunk();
},
_applyFullRefresh: function () {
var c = this.collection;
var keys;
if (this._sortFn) {
keys = c ? c.getKeys() : [];
} else {
keys = [];
var items = this.items;
if (items) {
for (var i = 0; i < items.length; i++) {
keys.push(c.getKey(items[i]));
}
}
}
var self = this;
if (this._filterFn) {
keys = keys.filter(function (a) {
return self._filterFn(c.getItem(a));
});
}
if (this._sortFn) {
keys.sort(function (a, b) {
return self._sortFn(c.getItem(a), c.getItem(b));
});
}
for (i = 0; i < keys.length; i++) {
var key = keys[i];
var inst = this._instances[i];
if (inst) {
inst.__key__ = key;
if (!inst.isPlaceholder && i < this._limit) {
inst.__setProperty(this.as, c.getItem(key), true);
}
} else if (i < this._limit) {
this._insertInstance(i, key);
} else {
this._insertPlaceholder(i, key);
}
}
for (var j = this._instances.length - 1; j >= i; j--) {
this._detachAndRemoveInstance(j);
}
},
_numericSort: function (a, b) {
return a - b;
},
_applySplicesUserSort: function (splices) {
var c = this.collection;
var keyMap = {};
var key;
for (var i = 0, s; i < splices.length && (s = splices[i]); i++) {
for (var j = 0; j < s.removed.length; j++) {
key = s.removed[j];
keyMap[key] = keyMap[key] ? null : -1;
}
for (j = 0; j < s.added.length; j++) {
key = s.added[j];
keyMap[key] = keyMap[key] ? null : 1;
}
}
var removedIdxs = [];
var addedKeys = [];
for (key in keyMap) {
if (keyMap[key] === -1) {
removedIdxs.push(this._keyToInstIdx[key]);
}
if (keyMap[key] === 1) {
addedKeys.push(key);
}
}
if (removedIdxs.length) {
removedIdxs.sort(this._numericSort);
for (i = removedIdxs.length - 1; i >= 0; i--) {
var idx = removedIdxs[i];
if (idx !== undefined) {
this._detachAndRemoveInstance(idx);
}
}
}
var self = this;
if (addedKeys.length) {
if (this._filterFn) {
addedKeys = addedKeys.filter(function (a) {
return self._filterFn(c.getItem(a));
});
}
addedKeys.sort(function (a, b) {
return self._sortFn(c.getItem(a), c.getItem(b));
});
var start = 0;
for (i = 0; i < addedKeys.length; i++) {
start = this._insertRowUserSort(start, addedKeys[i]);
}
}
},
_insertRowUserSort: function (start, key) {
var c = this.collection;
var item = c.getItem(key);
var end = this._instances.length - 1;
var idx = -1;
while (start <= end) {
var mid = start + end >> 1;
var midKey = this._instances[mid].__key__;
var cmp = this._sortFn(c.getItem(midKey), item);
if (cmp < 0) {
start = mid + 1;
} else if (cmp > 0) {
end = mid - 1;
} else {
idx = mid;
break;
}
}
if (idx < 0) {
idx = end + 1;
}
this._insertPlaceholder(idx, key);
return idx;
},
_applySplicesArrayOrder: function (splices) {
for (var i = 0, s; i < splices.length && (s = splices[i]); i++) {
for (var j = 0; j < s.removed.length; j++) {
this._detachAndRemoveInstance(s.index);
}
for (j = 0; j < s.addedKeys.length; j++) {
this._insertPlaceholder(s.index + j, s.addedKeys[j]);
}
}
},
_detachInstance: function (idx) {
var inst = this._instances[idx];
if (!inst.isPlaceholder) {
for (var i = 0; i < inst._children.length; i++) {
var el = inst._children[i];
Polymer.dom(inst.root).appendChild(el);
}
return inst;
}
},
_attachInstance: function (idx, parent) {
var inst = this._instances[idx];
if (!inst.isPlaceholder) {
parent.insertBefore(inst.root, this);
}
},
_detachAndRemoveInstance: function (idx) {
var inst = this._detachInstance(idx);
if (inst) {
this._pool.push(inst);
}
this._instances.splice(idx, 1);
},
_insertPlaceholder: function (idx, key) {
this._instances.splice(idx, 0, {
isPlaceholder: true,
__key__: key
});
},
_stampInstance: function (idx, key) {
var model = { __key__: key };
model[this.as] = this.collection.getItem(key);
model[this.indexAs] = idx;
return this.stamp(model);
},
_insertInstance: function (idx, key) {
var inst = this._pool.pop();
if (inst) {
inst.__setProperty(this.as, this.collection.getItem(key), true);
inst.__setProperty('__key__', key, true);
} else {
inst = this._stampInstance(idx, key);
}
var beforeRow = this._instances[idx + 1];
var beforeNode = beforeRow && !beforeRow.isPlaceholder ? beforeRow._children[0] : this;
var parentNode = Polymer.dom(this).parentNode;
Polymer.dom(parentNode).insertBefore(inst.root, beforeNode);
this._instances[idx] = inst;
return inst;
},
_downgradeInstance: function (idx, key) {
var inst = this._detachInstance(idx);
if (inst) {
this._pool.push(inst);
}
inst = {
isPlaceholder: true,
__key__: key
};
this._instances[idx] = inst;
return inst;
},
_showHideChildren: function (hidden) {
for (var i = 0; i < this._instances.length; i++) {
this._instances[i]._showHideChildren(hidden);
}
},
_forwardInstanceProp: function (inst, prop, value) {
if (prop == this.as) {
var idx;
if (this._sortFn || this._filterFn) {
idx = this.items.indexOf(this.collection.getItem(inst.__key__));
} else {
idx = inst[this.indexAs];
}
this.set('items.' + idx, value);
}
},
_forwardInstancePath: function (inst, path, value) {
if (path.indexOf(this.as + '.') === 0) {
this._notifyPath('items.' + inst.__key__ + '.' + path.slice(this.as.length + 1), value);
}
},
_forwardParentProp: function (prop, value) {
var i$ = this._instances;
for (var i = 0, inst; i < i$.length && (inst = i$[i]); i++) {
if (!inst.isPlaceholder) {
inst.__setProperty(prop, value, true);
}
}
},
_forwardParentPath: function (path, value) {
var i$ = this._instances;
for (var i = 0, inst; i < i$.length && (inst = i$[i]); i++) {
if (!inst.isPlaceholder) {
inst._notifyPath(path, value, true);
}
}
},
_forwardItemPath: function (path, value) {
if (this._keyToInstIdx) {
var dot = path.indexOf('.');
var key = path.substring(0, dot < 0 ? path.length : dot);
var idx = this._keyToInstIdx[key];
var inst = this._instances[idx];
if (inst && !inst.isPlaceholder) {
if (dot >= 0) {
path = this.as + '.' + path.substring(dot + 1);
inst._notifyPath(path, value, true);
} else {
inst.__setProperty(this.as, value, true);
}
}
}
},
itemForElement: function (el) {
var instance = this.modelForElement(el);
return instance && instance[this.as];
},
keyForElement: function (el) {
var instance = this.modelForElement(el);
return instance && instance.__key__;
},
indexForElement: function (el) {
var instance = this.modelForElement(el);
return instance && instance[this.indexAs];
}
});
Polymer({
is: 'array-selector',
_template: null,
properties: {
items: {
type: Array,
observer: 'clearSelection'
},
multi: {
type: Boolean,
value: false,
observer: 'clearSelection'
},
selected: {
type: Object,
notify: true
},
selectedItem: {
type: Object,
notify: true
},
toggle: {
type: Boolean,
value: false
}
},
clearSelection: function () {
if (Array.isArray(this.selected)) {
for (var i = 0; i < this.selected.length; i++) {
this.unlinkPaths('selected.' + i);
}
} else {
this.unlinkPaths('selected');
this.unlinkPaths('selectedItem');
}
if (this.multi) {
if (!this.selected || this.selected.length) {
this.selected = [];
this._selectedColl = Polymer.Collection.get(this.selected);
}
} else {
this.selected = null;
this._selectedColl = null;
}
this.selectedItem = null;
},
isSelected: function (item) {
if (this.multi) {
return this._selectedColl.getKey(item) !== undefined;
} else {
return this.selected == item;
}
},
deselect: function (item) {
if (this.multi) {
if (this.isSelected(item)) {
var skey = this._selectedColl.getKey(item);
this.arrayDelete('selected', item);
this.unlinkPaths('selected.' + skey);
}
} else {
this.selected = null;
this.selectedItem = null;
this.unlinkPaths('selected');
this.unlinkPaths('selectedItem');
}
},
select: function (item) {
var icol = Polymer.Collection.get(this.items);
var key = icol.getKey(item);
if (this.multi) {
if (this.isSelected(item)) {
if (this.toggle) {
this.deselect(item);
}
} else {
this.push('selected', item);
var skey = this._selectedColl.getKey(item);
this.linkPaths('selected.' + skey, 'items.' + key);
}
} else {
if (this.toggle && item == this.selected) {
this.deselect();
} else {
this.selected = item;
this.selectedItem = item;
this.linkPaths('selected', 'items.' + key);
this.linkPaths('selectedItem', 'items.' + key);
}
}
}
});
Polymer({
is: 'dom-if',
extends: 'template',
_template: null,
properties: {
'if': {
type: Boolean,
value: false,
observer: '_queueRender'
},
restamp: {
type: Boolean,
value: false,
observer: '_queueRender'
}
},
behaviors: [Polymer.Templatizer],
_queueRender: function () {
this._debounceTemplate(this._render);
},
detached: function () {
if (!this.parentNode || this.parentNode.nodeType == Node.DOCUMENT_FRAGMENT_NODE && (!Polymer.Settings.hasShadow || !(this.parentNode instanceof ShadowRoot))) {
this._teardownInstance();
}
},
attached: function () {
if (this.if && this.ctor) {
this.async(this._ensureInstance);
}
},
render: function () {
this._flushTemplates();
},
_render: function () {
if (this.if) {
if (!this.ctor) {
this.templatize(this);
}
this._ensureInstance();
this._showHideChildren();
} else if (this.restamp) {
this._teardownInstance();
}
if (!this.restamp && this._instance) {
this._showHideChildren();
}
if (this.if != this._lastIf) {
this.fire('dom-change');
this._lastIf = this.if;
}
},
_ensureInstance: function () {
var parentNode = Polymer.dom(this).parentNode;
if (parentNode) {
var parent = Polymer.dom(parentNode);
if (!this._instance) {
this._instance = this.stamp();
var root = this._instance.root;
parent.insertBefore(root, this);
} else {
var c$ = this._instance._children;
if (c$ && c$.length) {
var lastChild = Polymer.dom(this).previousSibling;
if (lastChild !== c$[c$.length - 1]) {
for (var i = 0, n; i < c$.length && (n = c$[i]); i++) {
parent.insertBefore(n, this);
}
}
}
}
}
},
_teardownInstance: function () {
if (this._instance) {
var c$ = this._instance._children;
if (c$ && c$.length) {
var parent = Polymer.dom(Polymer.dom(c$[0]).parentNode);
for (var i = 0, n; i < c$.length && (n = c$[i]); i++) {
parent.removeChild(n);
}
}
this._instance = null;
}
},
_showHideChildren: function () {
var hidden = this.__hideTemplateChildren__ || !this.if;
if (this._instance) {
this._instance._showHideChildren(hidden);
}
},
_forwardParentProp: function (prop, value) {
if (this._instance) {
this._instance.__setProperty(prop, value, true);
}
},
_forwardParentPath: function (path, value) {
if (this._instance) {
this._instance._notifyPath(path, value, true);
}
}
});
Polymer({
is: 'dom-bind',
extends: 'template',
_template: null,
created: function () {
var self = this;
Polymer.RenderStatus.whenReady(function () {
if (document.readyState == 'loading') {
document.addEventListener('DOMContentLoaded', function () {
self._markImportsReady();
});
} else {
self._markImportsReady();
}
});
},
_ensureReady: function () {
if (!this._readied) {
this._readySelf();
}
},
_markImportsReady: function () {
this._importsReady = true;
this._ensureReady();
},
_registerFeatures: function () {
this._prepConstructor();
},
_insertChildren: function () {
var parentDom = Polymer.dom(Polymer.dom(this).parentNode);
parentDom.insertBefore(this.root, this);
},
_removeChildren: function () {
if (this._children) {
for (var i = 0; i < this._children.length; i++) {
this.root.appendChild(this._children[i]);
}
}
},
_initFeatures: function () {
},
_scopeElementClass: function (element, selector) {
if (this.dataHost) {
return this.dataHost._scopeElementClass(element, selector);
} else {
return selector;
}
},
_configureInstanceProperties: function () {
},
_prepConfigure: function () {
var config = {};
for (var prop in this._propertyEffects) {
config[prop] = this[prop];
}
var setupConfigure = this._setupConfigure;
this._setupConfigure = function () {
setupConfigure.call(this, config);
};
},
attached: function () {
if (this._importsReady) {
this.render();
}
},
detached: function () {
this._removeChildren();
},
render: function () {
this._ensureReady();
if (!this._children) {
this._template = this;
this._prepAnnotations();
this._prepEffects();
this._prepBehaviors();
this._prepConfigure();
this._prepBindings();
this._prepPropertyInfo();
Polymer.Base._initFeatures.call(this);
this._children = Polymer.TreeApi.arrayCopyChildNodes(this.root);
}
this._insertChildren();
this.fire('dom-change');
}
});
Polymer.IronControlState = {
properties: {
focused: {
type: Boolean,
value: false,
notify: true,
readOnly: true,
reflectToAttribute: true
},
disabled: {
type: Boolean,
value: false,
notify: true,
observer: '_disabledChanged',
reflectToAttribute: true
},
_oldTabIndex: { type: Number },
_boundFocusBlurHandler: {
type: Function,
value: function () {
return this._focusBlurHandler.bind(this);
}
}
},
observers: ['_changedControlState(focused, disabled)'],
ready: function () {
this.addEventListener('focus', this._boundFocusBlurHandler, true);
this.addEventListener('blur', this._boundFocusBlurHandler, true);
},
_focusBlurHandler: function (event) {
if (event.target === this) {
this._setFocused(event.type === 'focus');
} else if (!this.shadowRoot) {
var target = Polymer.dom(event).localTarget;
if (!this.isLightDescendant(target)) {
this.fire(event.type, { sourceEvent: event }, {
node: this,
bubbles: event.bubbles,
cancelable: event.cancelable
});
}
}
},
_disabledChanged: function (disabled, old) {
this.setAttribute('aria-disabled', disabled ? 'true' : 'false');
this.style.pointerEvents = disabled ? 'none' : '';
if (disabled) {
this._oldTabIndex = this.tabIndex;
this._setFocused(false);
this.tabIndex = -1;
this.blur();
} else if (this._oldTabIndex !== undefined) {
this.tabIndex = this._oldTabIndex;
}
},
_changedControlState: function () {
if (this._controlStateChanged) {
this._controlStateChanged();
}
}
};
(function () {
'use strict';
var KEY_IDENTIFIER = {
'U+0008': 'backspace',
'U+0009': 'tab',
'U+001B': 'esc',
'U+0020': 'space',
'U+007F': 'del'
};
var KEY_CODE = {
8: 'backspace',
9: 'tab',
13: 'enter',
27: 'esc',
33: 'pageup',
34: 'pagedown',
35: 'end',
36: 'home',
32: 'space',
37: 'left',
38: 'up',
39: 'right',
40: 'down',
46: 'del',
106: '*'
};
var MODIFIER_KEYS = {
'shift': 'shiftKey',
'ctrl': 'ctrlKey',
'alt': 'altKey',
'meta': 'metaKey'
};
var KEY_CHAR = /[a-z0-9*]/;
var IDENT_CHAR = /U\+/;
var ARROW_KEY = /^arrow/;
var SPACE_KEY = /^space(bar)?/;
var ESC_KEY = /^escape$/;
function transformKey(key, noSpecialChars) {
var validKey = '';
if (key) {
var lKey = key.toLowerCase();
if (lKey === ' ' || SPACE_KEY.test(lKey)) {
validKey = 'space';
} else if (ESC_KEY.test(lKey)) {
validKey = 'esc';
} else if (lKey.length == 1) {
if (!noSpecialChars || KEY_CHAR.test(lKey)) {
validKey = lKey;
}
} else if (ARROW_KEY.test(lKey)) {
validKey = lKey.replace('arrow', '');
} else if (lKey == 'multiply') {
validKey = '*';
} else {
validKey = lKey;
}
}
return validKey;
}
function transformKeyIdentifier(keyIdent) {
var validKey = '';
if (keyIdent) {
if (keyIdent in KEY_IDENTIFIER) {
validKey = KEY_IDENTIFIER[keyIdent];
} else if (IDENT_CHAR.test(keyIdent)) {
keyIdent = parseInt(keyIdent.replace('U+', '0x'), 16);
validKey = String.fromCharCode(keyIdent).toLowerCase();
} else {
validKey = keyIdent.toLowerCase();
}
}
return validKey;
}
function transformKeyCode(keyCode) {
var validKey = '';
if (Number(keyCode)) {
if (keyCode >= 65 && keyCode <= 90) {
validKey = String.fromCharCode(32 + keyCode);
} else if (keyCode >= 112 && keyCode <= 123) {
validKey = 'f' + (keyCode - 112);
} else if (keyCode >= 48 && keyCode <= 57) {
validKey = String(keyCode - 48);
} else if (keyCode >= 96 && keyCode <= 105) {
validKey = String(keyCode - 96);
} else {
validKey = KEY_CODE[keyCode];
}
}
return validKey;
}
function normalizedKeyForEvent(keyEvent, noSpecialChars) {
if (keyEvent.key) {
return transformKey(keyEvent.key, noSpecialChars);
}
if (keyEvent.detail && keyEvent.detail.key) {
return transformKey(keyEvent.detail.key, noSpecialChars);
}
return transformKeyIdentifier(keyEvent.keyIdentifier) || transformKeyCode(keyEvent.keyCode) || '';
}
function keyComboMatchesEvent(keyCombo, event) {
var keyEvent = normalizedKeyForEvent(event, keyCombo.hasModifiers);
return keyEvent === keyCombo.key && (!keyCombo.hasModifiers || !!event.shiftKey === !!keyCombo.shiftKey && !!event.ctrlKey === !!keyCombo.ctrlKey && !!event.altKey === !!keyCombo.altKey && !!event.metaKey === !!keyCombo.metaKey);
}
function parseKeyComboString(keyComboString) {
if (keyComboString.length === 1) {
return {
combo: keyComboString,
key: keyComboString,
event: 'keydown'
};
}
return keyComboString.split('+').reduce(function (parsedKeyCombo, keyComboPart) {
var eventParts = keyComboPart.split(':');
var keyName = eventParts[0];
var event = eventParts[1];
if (keyName in MODIFIER_KEYS) {
parsedKeyCombo[MODIFIER_KEYS[keyName]] = true;
parsedKeyCombo.hasModifiers = true;
} else {
parsedKeyCombo.key = keyName;
parsedKeyCombo.event = event || 'keydown';
}
return parsedKeyCombo;
}, { combo: keyComboString.split(':').shift() });
}
function parseEventString(eventString) {
return eventString.trim().split(' ').map(function (keyComboString) {
return parseKeyComboString(keyComboString);
});
}
Polymer.IronA11yKeysBehavior = {
properties: {
keyEventTarget: {
type: Object,
value: function () {
return this;
}
},
stopKeyboardEventPropagation: {
type: Boolean,
value: false
},
_boundKeyHandlers: {
type: Array,
value: function () {
return [];
}
},
_imperativeKeyBindings: {
type: Object,
value: function () {
return {};
}
}
},
observers: ['_resetKeyEventListeners(keyEventTarget, _boundKeyHandlers)'],
keyBindings: {},
registered: function () {
this._prepKeyBindings();
},
attached: function () {
this._listenKeyEventListeners();
},
detached: function () {
this._unlistenKeyEventListeners();
},
addOwnKeyBinding: function (eventString, handlerName) {
this._imperativeKeyBindings[eventString] = handlerName;
this._prepKeyBindings();
this._resetKeyEventListeners();
},
removeOwnKeyBindings: function () {
this._imperativeKeyBindings = {};
this._prepKeyBindings();
this._resetKeyEventListeners();
},
keyboardEventMatchesKeys: function (event, eventString) {
var keyCombos = parseEventString(eventString);
for (var i = 0; i < keyCombos.length; ++i) {
if (keyComboMatchesEvent(keyCombos[i], event)) {
return true;
}
}
return false;
},
_collectKeyBindings: function () {
var keyBindings = this.behaviors.map(function (behavior) {
return behavior.keyBindings;
});
if (keyBindings.indexOf(this.keyBindings) === -1) {
keyBindings.push(this.keyBindings);
}
return keyBindings;
},
_prepKeyBindings: function () {
this._keyBindings = {};
this._collectKeyBindings().forEach(function (keyBindings) {
for (var eventString in keyBindings) {
this._addKeyBinding(eventString, keyBindings[eventString]);
}
}, this);
for (var eventString in this._imperativeKeyBindings) {
this._addKeyBinding(eventString, this._imperativeKeyBindings[eventString]);
}
for (var eventName in this._keyBindings) {
this._keyBindings[eventName].sort(function (kb1, kb2) {
var b1 = kb1[0].hasModifiers;
var b2 = kb2[0].hasModifiers;
return b1 === b2 ? 0 : b1 ? -1 : 1;
});
}
},
_addKeyBinding: function (eventString, handlerName) {
parseEventString(eventString).forEach(function (keyCombo) {
this._keyBindings[keyCombo.event] = this._keyBindings[keyCombo.event] || [];
this._keyBindings[keyCombo.event].push([
keyCombo,
handlerName
]);
}, this);
},
_resetKeyEventListeners: function () {
this._unlistenKeyEventListeners();
if (this.isAttached) {
this._listenKeyEventListeners();
}
},
_listenKeyEventListeners: function () {
if (!this.keyEventTarget) {
return;
}
Object.keys(this._keyBindings).forEach(function (eventName) {
var keyBindings = this._keyBindings[eventName];
var boundKeyHandler = this._onKeyBindingEvent.bind(this, keyBindings);
this._boundKeyHandlers.push([
this.keyEventTarget,
eventName,
boundKeyHandler
]);
this.keyEventTarget.addEventListener(eventName, boundKeyHandler);
}, this);
},
_unlistenKeyEventListeners: function () {
var keyHandlerTuple;
var keyEventTarget;
var eventName;
var boundKeyHandler;
while (this._boundKeyHandlers.length) {
keyHandlerTuple = this._boundKeyHandlers.pop();
keyEventTarget = keyHandlerTuple[0];
eventName = keyHandlerTuple[1];
boundKeyHandler = keyHandlerTuple[2];
keyEventTarget.removeEventListener(eventName, boundKeyHandler);
}
},
_onKeyBindingEvent: function (keyBindings, event) {
if (this.stopKeyboardEventPropagation) {
event.stopPropagation();
}
if (event.defaultPrevented) {
return;
}
for (var i = 0; i < keyBindings.length; i++) {
var keyCombo = keyBindings[i][0];
var handlerName = keyBindings[i][1];
if (keyComboMatchesEvent(keyCombo, event)) {
this._triggerKeyHandler(keyCombo, handlerName, event);
if (event.defaultPrevented) {
return;
}
}
}
},
_triggerKeyHandler: function (keyCombo, handlerName, keyboardEvent) {
var detail = Object.create(keyCombo);
detail.keyboardEvent = keyboardEvent;
var event = new CustomEvent(keyCombo.event, {
detail: detail,
cancelable: true
});
this[handlerName].call(this, event);
if (event.defaultPrevented) {
keyboardEvent.preventDefault();
}
}
};
}());
Polymer.IronButtonStateImpl = {
properties: {
pressed: {
type: Boolean,
readOnly: true,
value: false,
reflectToAttribute: true,
observer: '_pressedChanged'
},
toggles: {
type: Boolean,
value: false,
reflectToAttribute: true
},
active: {
type: Boolean,
value: false,
notify: true,
reflectToAttribute: true
},
pointerDown: {
type: Boolean,
readOnly: true,
value: false
},
receivedFocusFromKeyboard: {
type: Boolean,
readOnly: true
},
ariaActiveAttribute: {
type: String,
value: 'aria-pressed',
observer: '_ariaActiveAttributeChanged'
}
},
listeners: {
down: '_downHandler',
up: '_upHandler',
tap: '_tapHandler'
},
observers: [
'_detectKeyboardFocus(focused)',
'_activeChanged(active, ariaActiveAttribute)'
],
keyBindings: {
'enter:keydown': '_asyncClick',
'space:keydown': '_spaceKeyDownHandler',
'space:keyup': '_spaceKeyUpHandler'
},
_mouseEventRe: /^mouse/,
_tapHandler: function () {
if (this.toggles) {
this._userActivate(!this.active);
} else {
this.active = false;
}
},
_detectKeyboardFocus: function (focused) {
this._setReceivedFocusFromKeyboard(!this.pointerDown && focused);
},
_userActivate: function (active) {
if (this.active !== active) {
this.active = active;
this.fire('change');
}
},
_downHandler: function (event) {
this._setPointerDown(true);
this._setPressed(true);
this._setReceivedFocusFromKeyboard(false);
},
_upHandler: function () {
this._setPointerDown(false);
this._setPressed(false);
},
_spaceKeyDownHandler: function (event) {
var keyboardEvent = event.detail.keyboardEvent;
var target = Polymer.dom(keyboardEvent).localTarget;
if (this.isLightDescendant(target))
return;
keyboardEvent.preventDefault();
keyboardEvent.stopImmediatePropagation();
this._setPressed(true);
},
_spaceKeyUpHandler: function (event) {
var keyboardEvent = event.detail.keyboardEvent;
var target = Polymer.dom(keyboardEvent).localTarget;
if (this.isLightDescendant(target))
return;
if (this.pressed) {
this._asyncClick();
}
this._setPressed(false);
},
_asyncClick: function () {
this.async(function () {
this.click();
}, 1);
},
_pressedChanged: function (pressed) {
this._changedButtonState();
},
_ariaActiveAttributeChanged: function (value, oldValue) {
if (oldValue && oldValue != value && this.hasAttribute(oldValue)) {
this.removeAttribute(oldValue);
}
},
_activeChanged: function (active, ariaActiveAttribute) {
if (this.toggles) {
this.setAttribute(this.ariaActiveAttribute, active ? 'true' : 'false');
} else {
this.removeAttribute(this.ariaActiveAttribute);
}
this._changedButtonState();
},
_controlStateChanged: function () {
if (this.disabled) {
this._setPressed(false);
} else {
this._changedButtonState();
}
},
_changedButtonState: function () {
if (this._buttonStateChanged) {
this._buttonStateChanged();
}
}
};
Polymer.IronButtonState = [
Polymer.IronA11yKeysBehavior,
Polymer.IronButtonStateImpl
];
console.warn('This file is deprecated. Please use `iron-flex-layout/iron-flex-layout-classes.html`, and one of the specific dom-modules instead');
console.warn('This file is deprecated. Please use `iron-flex-layout/iron-flex-layout-classes.html`, and one of the specific dom-modules instead');
Polymer({
is: 'paper-item',
hostAttributes: {
role: 'option',
tabindex: '0'
},
behaviors: [
Polymer.IronControlState,
Polymer.IronButtonState
]
});
(function () {
var metaDatas = {};
var metaArrays = {};
var singleton = null;
Polymer.IronMeta = Polymer({
is: 'iron-meta',
properties: {
type: {
type: String,
value: 'default',
observer: '_typeChanged'
},
key: {
type: String,
observer: '_keyChanged'
},
value: {
type: Object,
notify: true,
observer: '_valueChanged'
},
self: {
type: Boolean,
observer: '_selfChanged'
},
list: {
type: Array,
notify: true
}
},
hostAttributes: { hidden: true },
factoryImpl: function (config) {
if (config) {
for (var n in config) {
switch (n) {
case 'type':
case 'key':
case 'value':
this[n] = config[n];
break;
}
}
}
},
created: function () {
this._metaDatas = metaDatas;
this._metaArrays = metaArrays;
},
_keyChanged: function (key, old) {
this._resetRegistration(old);
},
_valueChanged: function (value) {
this._resetRegistration(this.key);
},
_selfChanged: function (self) {
if (self) {
this.value = this;
}
},
_typeChanged: function (type) {
this._unregisterKey(this.key);
if (!metaDatas[type]) {
metaDatas[type] = {};
}
this._metaData = metaDatas[type];
if (!metaArrays[type]) {
metaArrays[type] = [];
}
this.list = metaArrays[type];
this._registerKeyValue(this.key, this.value);
},
byKey: function (key) {
return this._metaData && this._metaData[key];
},
_resetRegistration: function (oldKey) {
this._unregisterKey(oldKey);
this._registerKeyValue(this.key, this.value);
},
_unregisterKey: function (key) {
this._unregister(key, this._metaData, this.list);
},
_registerKeyValue: function (key, value) {
this._register(key, value, this._metaData, this.list);
},
_register: function (key, value, data, list) {
if (key && data && value !== undefined) {
data[key] = value;
list.push(value);
}
},
_unregister: function (key, data, list) {
if (key && data) {
if (key in data) {
var value = data[key];
delete data[key];
this.arrayDelete(list, value);
}
}
}
});
Polymer.IronMeta.getIronMeta = function getIronMeta() {
if (singleton === null) {
singleton = new Polymer.IronMeta();
}
return singleton;
};
Polymer.IronMetaQuery = Polymer({
is: 'iron-meta-query',
properties: {
type: {
type: String,
value: 'default',
observer: '_typeChanged'
},
key: {
type: String,
observer: '_keyChanged'
},
value: {
type: Object,
notify: true,
readOnly: true
},
list: {
type: Array,
notify: true
}
},
factoryImpl: function (config) {
if (config) {
for (var n in config) {
switch (n) {
case 'type':
case 'key':
this[n] = config[n];
break;
}
}
}
},
created: function () {
this._metaDatas = metaDatas;
this._metaArrays = metaArrays;
},
_keyChanged: function (key) {
this._setValue(this._metaData && this._metaData[key]);
},
_typeChanged: function (type) {
this._metaData = metaDatas[type];
this.list = metaArrays[type];
if (this.key) {
this._keyChanged(this.key);
}
},
byKey: function (key) {
return this._metaData && this._metaData[key];
}
});
}());
Polymer.NeonAnimatableBehavior = {
properties: {
animationConfig: { type: Object },
entryAnimation: {
observer: '_entryAnimationChanged',
type: String
},
exitAnimation: {
observer: '_exitAnimationChanged',
type: String
}
},
_entryAnimationChanged: function () {
this.animationConfig = this.animationConfig || {};
this.animationConfig['entry'] = [{
name: this.entryAnimation,
node: this
}];
},
_exitAnimationChanged: function () {
this.animationConfig = this.animationConfig || {};
this.animationConfig['exit'] = [{
name: this.exitAnimation,
node: this
}];
},
_copyProperties: function (config1, config2) {
for (var property in config2) {
config1[property] = config2[property];
}
},
_cloneConfig: function (config) {
var clone = { isClone: true };
this._copyProperties(clone, config);
return clone;
},
_getAnimationConfigRecursive: function (type, map, allConfigs) {
if (!this.animationConfig) {
return;
}
if (this.animationConfig.value && typeof this.animationConfig.value === 'function') {
this._warn(this._logf('playAnimation', 'Please put \'animationConfig\' inside of your components \'properties\' object instead of outside of it.'));
return;
}
var thisConfig;
if (type) {
thisConfig = this.animationConfig[type];
} else {
thisConfig = this.animationConfig;
}
if (!Array.isArray(thisConfig)) {
thisConfig = [thisConfig];
}
if (thisConfig) {
for (var config, index = 0; config = thisConfig[index]; index++) {
if (config.animatable) {
config.animatable._getAnimationConfigRecursive(config.type || type, map, allConfigs);
} else {
if (config.id) {
var cachedConfig = map[config.id];
if (cachedConfig) {
if (!cachedConfig.isClone) {
map[config.id] = this._cloneConfig(cachedConfig);
cachedConfig = map[config.id];
}
this._copyProperties(cachedConfig, config);
} else {
map[config.id] = config;
}
} else {
allConfigs.push(config);
}
}
}
}
},
getAnimationConfig: function (type) {
var map = {};
var allConfigs = [];
this._getAnimationConfigRecursive(type, map, allConfigs);
for (var key in map) {
allConfigs.push(map[key]);
}
return allConfigs;
}
};
Polymer.NeonAnimationRunnerBehaviorImpl = {
_configureAnimations: function (configs) {
var results = [];
if (configs.length > 0) {
for (var config, index = 0; config = configs[index]; index++) {
var neonAnimation = document.createElement(config.name);
if (neonAnimation.isNeonAnimation) {
var result = null;
try {
result = neonAnimation.configure(config);
if (typeof result.cancel != 'function') {
result = document.timeline.play(result);
}
} catch (e) {
result = null;
console.warn('Couldnt play', '(', config.name, ').', e);
}
if (result) {
results.push({
neonAnimation: neonAnimation,
config: config,
animation: result
});
}
} else {
console.warn(this.is + ':', config.name, 'not found!');
}
}
}
return results;
},
_shouldComplete: function (activeEntries) {
var finished = true;
for (var i = 0; i < activeEntries.length; i++) {
if (activeEntries[i].animation.playState != 'finished') {
finished = false;
break;
}
}
return finished;
},
_complete: function (activeEntries) {
for (var i = 0; i < activeEntries.length; i++) {
activeEntries[i].neonAnimation.complete(activeEntries[i].config);
}
for (var i = 0; i < activeEntries.length; i++) {
activeEntries[i].animation.cancel();
}
},
playAnimation: function (type, cookie) {
var configs = this.getAnimationConfig(type);
if (!configs) {
return;
}
this._active = this._active || {};
if (this._active[type]) {
this._complete(this._active[type]);
delete this._active[type];
}
var activeEntries = this._configureAnimations(configs);
if (activeEntries.length == 0) {
this.fire('neon-animation-finish', cookie, { bubbles: false });
return;
}
this._active[type] = activeEntries;
for (var i = 0; i < activeEntries.length; i++) {
activeEntries[i].animation.onfinish = function () {
if (this._shouldComplete(activeEntries)) {
this._complete(activeEntries);
delete this._active[type];
this.fire('neon-animation-finish', cookie, { bubbles: false });
}
}.bind(this);
}
},
cancelAnimation: function () {
for (var k in this._animations) {
this._animations[k].cancel();
}
this._animations = {};
}
};
Polymer.NeonAnimationRunnerBehavior = [
Polymer.NeonAnimatableBehavior,
Polymer.NeonAnimationRunnerBehaviorImpl
];
Polymer.IronFitBehavior = {
properties: {
sizingTarget: {
type: Object,
value: function () {
return this;
}
},
fitInto: {
type: Object,
value: window
},
noOverlap: { type: Boolean },
positionTarget: { type: Element },
horizontalAlign: { type: String },
verticalAlign: { type: String },
dynamicAlign: { type: Boolean },
horizontalOffset: {
type: Number,
value: 0,
notify: true
},
verticalOffset: {
type: Number,
value: 0,
notify: true
},
autoFitOnAttach: {
type: Boolean,
value: false
},
_fitInfo: { type: Object }
},
get _fitWidth() {
var fitWidth;
if (this.fitInto === window) {
fitWidth = this.fitInto.innerWidth;
} else {
fitWidth = this.fitInto.getBoundingClientRect().width;
}
return fitWidth;
},
get _fitHeight() {
var fitHeight;
if (this.fitInto === window) {
fitHeight = this.fitInto.innerHeight;
} else {
fitHeight = this.fitInto.getBoundingClientRect().height;
}
return fitHeight;
},
get _fitLeft() {
var fitLeft;
if (this.fitInto === window) {
fitLeft = 0;
} else {
fitLeft = this.fitInto.getBoundingClientRect().left;
}
return fitLeft;
},
get _fitTop() {
var fitTop;
if (this.fitInto === window) {
fitTop = 0;
} else {
fitTop = this.fitInto.getBoundingClientRect().top;
}
return fitTop;
},
get _defaultPositionTarget() {
var parent = Polymer.dom(this).parentNode;
if (parent && parent.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
parent = parent.host;
}
return parent;
},
get _localeHorizontalAlign() {
if (this._isRTL) {
if (this.horizontalAlign === 'right') {
return 'left';
}
if (this.horizontalAlign === 'left') {
return 'right';
}
}
return this.horizontalAlign;
},
attached: function () {
this._isRTL = window.getComputedStyle(this).direction == 'rtl';
this.positionTarget = this.positionTarget || this._defaultPositionTarget;
if (this.autoFitOnAttach) {
if (window.getComputedStyle(this).display === 'none') {
setTimeout(function () {
this.fit();
}.bind(this));
} else {
this.fit();
}
}
},
fit: function () {
this.position();
this.constrain();
this.center();
},
_discoverInfo: function () {
if (this._fitInfo) {
return;
}
var target = window.getComputedStyle(this);
var sizer = window.getComputedStyle(this.sizingTarget);
this._fitInfo = {
inlineStyle: {
top: this.style.top || '',
left: this.style.left || '',
position: this.style.position || ''
},
sizerInlineStyle: {
maxWidth: this.sizingTarget.style.maxWidth || '',
maxHeight: this.sizingTarget.style.maxHeight || '',
boxSizing: this.sizingTarget.style.boxSizing || ''
},
positionedBy: {
vertically: target.top !== 'auto' ? 'top' : target.bottom !== 'auto' ? 'bottom' : null,
horizontally: target.left !== 'auto' ? 'left' : target.right !== 'auto' ? 'right' : null
},
sizedBy: {
height: sizer.maxHeight !== 'none',
width: sizer.maxWidth !== 'none',
minWidth: parseInt(sizer.minWidth, 10) || 0,
minHeight: parseInt(sizer.minHeight, 10) || 0
},
margin: {
top: parseInt(target.marginTop, 10) || 0,
right: parseInt(target.marginRight, 10) || 0,
bottom: parseInt(target.marginBottom, 10) || 0,
left: parseInt(target.marginLeft, 10) || 0
}
};
if (this.verticalOffset) {
this._fitInfo.margin.top = this._fitInfo.margin.bottom = this.verticalOffset;
this._fitInfo.inlineStyle.marginTop = this.style.marginTop || '';
this._fitInfo.inlineStyle.marginBottom = this.style.marginBottom || '';
this.style.marginTop = this.style.marginBottom = this.verticalOffset + 'px';
}
if (this.horizontalOffset) {
this._fitInfo.margin.left = this._fitInfo.margin.right = this.horizontalOffset;
this._fitInfo.inlineStyle.marginLeft = this.style.marginLeft || '';
this._fitInfo.inlineStyle.marginRight = this.style.marginRight || '';
this.style.marginLeft = this.style.marginRight = this.horizontalOffset + 'px';
}
},
resetFit: function () {
var info = this._fitInfo || {};
for (var property in info.sizerInlineStyle) {
this.sizingTarget.style[property] = info.sizerInlineStyle[property];
}
for (var property in info.inlineStyle) {
this.style[property] = info.inlineStyle[property];
}
this._fitInfo = null;
},
refit: function () {
var scrollLeft = this.sizingTarget.scrollLeft;
var scrollTop = this.sizingTarget.scrollTop;
this.resetFit();
this.fit();
this.sizingTarget.scrollLeft = scrollLeft;
this.sizingTarget.scrollTop = scrollTop;
},
position: function () {
if (!this.horizontalAlign && !this.verticalAlign) {
return;
}
this._discoverInfo();
this.style.position = 'fixed';
this.sizingTarget.style.boxSizing = 'border-box';
this.style.left = '0px';
this.style.top = '0px';
var rect = this.getBoundingClientRect();
var positionRect = this.__getNormalizedRect(this.positionTarget);
var fitRect = this.__getNormalizedRect(this.fitInto);
var margin = this._fitInfo.margin;
var size = {
width: rect.width + margin.left + margin.right,
height: rect.height + margin.top + margin.bottom
};
var position = this.__getPosition(this._localeHorizontalAlign, this.verticalAlign, size, positionRect, fitRect);
var left = position.left + margin.left;
var top = position.top + margin.top;
var right = Math.min(fitRect.right - margin.right, left + rect.width);
var bottom = Math.min(fitRect.bottom - margin.bottom, top + rect.height);
var minWidth = this._fitInfo.sizedBy.minWidth;
var minHeight = this._fitInfo.sizedBy.minHeight;
if (left < margin.left) {
left = margin.left;
if (right - left < minWidth) {
left = right - minWidth;
}
}
if (top < margin.top) {
top = margin.top;
if (bottom - top < minHeight) {
top = bottom - minHeight;
}
}
this.sizingTarget.style.maxWidth = right - left + 'px';
this.sizingTarget.style.maxHeight = bottom - top + 'px';
this.style.left = left - rect.left + 'px';
this.style.top = top - rect.top + 'px';
},
constrain: function () {
if (this.horizontalAlign || this.verticalAlign) {
return;
}
this._discoverInfo();
var info = this._fitInfo;
if (!info.positionedBy.vertically) {
this.style.position = 'fixed';
this.style.top = '0px';
}
if (!info.positionedBy.horizontally) {
this.style.position = 'fixed';
this.style.left = '0px';
}
this.sizingTarget.style.boxSizing = 'border-box';
var rect = this.getBoundingClientRect();
if (!info.sizedBy.height) {
this.__sizeDimension(rect, info.positionedBy.vertically, 'top', 'bottom', 'Height');
}
if (!info.sizedBy.width) {
this.__sizeDimension(rect, info.positionedBy.horizontally, 'left', 'right', 'Width');
}
},
_sizeDimension: function (rect, positionedBy, start, end, extent) {
this.__sizeDimension(rect, positionedBy, start, end, extent);
},
__sizeDimension: function (rect, positionedBy, start, end, extent) {
var info = this._fitInfo;
var fitRect = this.__getNormalizedRect(this.fitInto);
var max = extent === 'Width' ? fitRect.width : fitRect.height;
var flip = positionedBy === end;
var offset = flip ? max - rect[end] : rect[start];
var margin = info.margin[flip ? start : end];
var offsetExtent = 'offset' + extent;
var sizingOffset = this[offsetExtent] - this.sizingTarget[offsetExtent];
this.sizingTarget.style['max' + extent] = max - margin - offset - sizingOffset + 'px';
},
center: function () {
if (this.horizontalAlign || this.verticalAlign) {
return;
}
this._discoverInfo();
var positionedBy = this._fitInfo.positionedBy;
if (positionedBy.vertically && positionedBy.horizontally) {
return;
}
this.style.position = 'fixed';
if (!positionedBy.vertically) {
this.style.top = '0px';
}
if (!positionedBy.horizontally) {
this.style.left = '0px';
}
var rect = this.getBoundingClientRect();
var fitRect = this.__getNormalizedRect(this.fitInto);
if (!positionedBy.vertically) {
var top = fitRect.top - rect.top + (fitRect.height - rect.height) / 2;
this.style.top = top + 'px';
}
if (!positionedBy.horizontally) {
var left = fitRect.left - rect.left + (fitRect.width - rect.width) / 2;
this.style.left = left + 'px';
}
},
__getNormalizedRect: function (target) {
if (target === document.documentElement || target === window) {
return {
top: 0,
left: 0,
width: window.innerWidth,
height: window.innerHeight,
right: window.innerWidth,
bottom: window.innerHeight
};
}
return target.getBoundingClientRect();
},
__getCroppedArea: function (position, size, fitRect) {
var verticalCrop = Math.min(0, position.top) + Math.min(0, fitRect.bottom - (position.top + size.height));
var horizontalCrop = Math.min(0, position.left) + Math.min(0, fitRect.right - (position.left + size.width));
return Math.abs(verticalCrop) * size.width + Math.abs(horizontalCrop) * size.height;
},
__getPosition: function (hAlign, vAlign, size, positionRect, fitRect) {
var positions = [
{
verticalAlign: 'top',
horizontalAlign: 'left',
top: positionRect.top,
left: positionRect.left
},
{
verticalAlign: 'top',
horizontalAlign: 'right',
top: positionRect.top,
left: positionRect.right - size.width
},
{
verticalAlign: 'bottom',
horizontalAlign: 'left',
top: positionRect.bottom - size.height,
left: positionRect.left
},
{
verticalAlign: 'bottom',
horizontalAlign: 'right',
top: positionRect.bottom - size.height,
left: positionRect.right - size.width
}
];
if (this.noOverlap) {
for (var i = 0, l = positions.length; i < l; i++) {
var copy = {};
for (var key in positions[i]) {
copy[key] = positions[i][key];
}
positions.push(copy);
}
positions[0].top = positions[1].top += positionRect.height;
positions[2].top = positions[3].top -= positionRect.height;
positions[4].left = positions[6].left += positionRect.width;
positions[5].left = positions[7].left -= positionRect.width;
}
vAlign = vAlign === 'auto' ? null : vAlign;
hAlign = hAlign === 'auto' ? null : hAlign;
var position;
for (var i = 0; i < positions.length; i++) {
var pos = positions[i];
if (!this.dynamicAlign && !this.noOverlap && pos.verticalAlign === vAlign && pos.horizontalAlign === hAlign) {
position = pos;
break;
}
var alignOk = (!vAlign || pos.verticalAlign === vAlign) && (!hAlign || pos.horizontalAlign === hAlign);
if (!this.dynamicAlign && !alignOk) {
continue;
}
position = position || pos;
pos.croppedArea = this.__getCroppedArea(pos, size, fitRect);
var diff = pos.croppedArea - position.croppedArea;
if (diff < 0 || diff === 0 && alignOk) {
position = pos;
}
if (position.croppedArea === 0 && alignOk) {
break;
}
}
return position;
}
};
Polymer.IronResizableBehavior = {
properties: {
_parentResizable: {
type: Object,
observer: '_parentResizableChanged'
},
_notifyingDescendant: {
type: Boolean,
value: false
}
},
listeners: { 'iron-request-resize-notifications': '_onIronRequestResizeNotifications' },
created: function () {
this._interestedResizables = [];
this._boundNotifyResize = this.notifyResize.bind(this);
},
attached: function () {
this.fire('iron-request-resize-notifications', null, {
node: this,
bubbles: true,
cancelable: true
});
if (!this._parentResizable) {
window.addEventListener('resize', this._boundNotifyResize);
this.notifyResize();
}
},
detached: function () {
if (this._parentResizable) {
this._parentResizable.stopResizeNotificationsFor(this);
} else {
window.removeEventListener('resize', this._boundNotifyResize);
}
this._parentResizable = null;
},
notifyResize: function () {
if (!this.isAttached) {
return;
}
this._interestedResizables.forEach(function (resizable) {
if (this.resizerShouldNotify(resizable)) {
this._notifyDescendant(resizable);
}
}, this);
this._fireResize();
},
assignParentResizable: function (parentResizable) {
this._parentResizable = parentResizable;
},
stopResizeNotificationsFor: function (target) {
var index = this._interestedResizables.indexOf(target);
if (index > -1) {
this._interestedResizables.splice(index, 1);
this.unlisten(target, 'iron-resize', '_onDescendantIronResize');
}
},
resizerShouldNotify: function (element) {
return true;
},
_onDescendantIronResize: function (event) {
if (this._notifyingDescendant) {
event.stopPropagation();
return;
}
if (!Polymer.Settings.useShadow) {
this._fireResize();
}
},
_fireResize: function () {
this.fire('iron-resize', null, {
node: this,
bubbles: false
});
},
_onIronRequestResizeNotifications: function (event) {
var target = event.path ? event.path[0] : event.target;
if (target === this) {
return;
}
if (this._interestedResizables.indexOf(target) === -1) {
this._interestedResizables.push(target);
this.listen(target, 'iron-resize', '_onDescendantIronResize');
}
target.assignParentResizable(this);
this._notifyDescendant(target);
event.stopPropagation();
},
_parentResizableChanged: function (parentResizable) {
if (parentResizable) {
window.removeEventListener('resize', this._boundNotifyResize);
}
},
_notifyDescendant: function (descendant) {
if (!this.isAttached) {
return;
}
this._notifyingDescendant = true;
descendant.notifyResize();
this._notifyingDescendant = false;
}
};
(function () {
'use strict';
Polymer({
is: 'iron-overlay-backdrop',
properties: {
opened: {
reflectToAttribute: true,
type: Boolean,
value: false,
observer: '_openedChanged'
}
},
listeners: { 'transitionend': '_onTransitionend' },
created: function () {
this.__openedRaf = null;
},
attached: function () {
this.opened && this._openedChanged(this.opened);
},
prepare: function () {
if (this.opened && !this.parentNode) {
Polymer.dom(document.body).appendChild(this);
}
},
open: function () {
this.opened = true;
},
close: function () {
this.opened = false;
},
complete: function () {
if (!this.opened && this.parentNode === document.body) {
Polymer.dom(this.parentNode).removeChild(this);
}
},
_onTransitionend: function (event) {
if (event && event.target === this) {
this.complete();
}
},
_openedChanged: function (opened) {
if (opened) {
this.prepare();
} else {
var cs = window.getComputedStyle(this);
if (cs.transitionDuration === '0s' || cs.opacity == 0) {
this.complete();
}
}
if (!this.isAttached) {
return;
}
if (this.__openedRaf) {
window.cancelAnimationFrame(this.__openedRaf);
this.__openedRaf = null;
}
this.scrollTop = this.scrollTop;
this.__openedRaf = window.requestAnimationFrame(function () {
this.__openedRaf = null;
this.toggleClass('opened', this.opened);
}.bind(this));
}
});
}());
Polymer.IronOverlayManagerClass = function () {
this._overlays = [];
this._minimumZ = 101;
this._backdropElement = null;
Polymer.Gestures.add(document, 'tap', this._onCaptureClick.bind(this));
document.addEventListener('focus', this._onCaptureFocus.bind(this), true);
document.addEventListener('keydown', this._onCaptureKeyDown.bind(this), true);
};
Polymer.IronOverlayManagerClass.prototype = {
constructor: Polymer.IronOverlayManagerClass,
get backdropElement() {
if (!this._backdropElement) {
this._backdropElement = document.createElement('iron-overlay-backdrop');
}
return this._backdropElement;
},
get deepActiveElement() {
var active = document.activeElement || document.body;
while (active.root && Polymer.dom(active.root).activeElement) {
active = Polymer.dom(active.root).activeElement;
}
return active;
},
_bringOverlayAtIndexToFront: function (i) {
var overlay = this._overlays[i];
if (!overlay) {
return;
}
var lastI = this._overlays.length - 1;
var currentOverlay = this._overlays[lastI];
if (currentOverlay && this._shouldBeBehindOverlay(overlay, currentOverlay)) {
lastI--;
}
if (i >= lastI) {
return;
}
var minimumZ = Math.max(this.currentOverlayZ(), this._minimumZ);
if (this._getZ(overlay) <= minimumZ) {
this._applyOverlayZ(overlay, minimumZ);
}
while (i < lastI) {
this._overlays[i] = this._overlays[i + 1];
i++;
}
this._overlays[lastI] = overlay;
},
addOrRemoveOverlay: function (overlay) {
if (overlay.opened) {
this.addOverlay(overlay);
} else {
this.removeOverlay(overlay);
}
},
addOverlay: function (overlay) {
var i = this._overlays.indexOf(overlay);
if (i >= 0) {
this._bringOverlayAtIndexToFront(i);
this.trackBackdrop();
return;
}
var insertionIndex = this._overlays.length;
var currentOverlay = this._overlays[insertionIndex - 1];
var minimumZ = Math.max(this._getZ(currentOverlay), this._minimumZ);
var newZ = this._getZ(overlay);
if (currentOverlay && this._shouldBeBehindOverlay(overlay, currentOverlay)) {
this._applyOverlayZ(currentOverlay, minimumZ);
insertionIndex--;
var previousOverlay = this._overlays[insertionIndex - 1];
minimumZ = Math.max(this._getZ(previousOverlay), this._minimumZ);
}
if (newZ <= minimumZ) {
this._applyOverlayZ(overlay, minimumZ);
}
this._overlays.splice(insertionIndex, 0, overlay);
this.trackBackdrop();
},
removeOverlay: function (overlay) {
var i = this._overlays.indexOf(overlay);
if (i === -1) {
return;
}
this._overlays.splice(i, 1);
this.trackBackdrop();
},
currentOverlay: function () {
var i = this._overlays.length - 1;
return this._overlays[i];
},
currentOverlayZ: function () {
return this._getZ(this.currentOverlay());
},
ensureMinimumZ: function (minimumZ) {
this._minimumZ = Math.max(this._minimumZ, minimumZ);
},
focusOverlay: function () {
var current = this.currentOverlay();
if (current) {
current._applyFocus();
}
},
trackBackdrop: function () {
var overlay = this._overlayWithBackdrop();
if (!overlay && !this._backdropElement) {
return;
}
this.backdropElement.style.zIndex = this._getZ(overlay) - 1;
this.backdropElement.opened = !!overlay;
},
getBackdrops: function () {
var backdrops = [];
for (var i = 0; i < this._overlays.length; i++) {
if (this._overlays[i].withBackdrop) {
backdrops.push(this._overlays[i]);
}
}
return backdrops;
},
backdropZ: function () {
return this._getZ(this._overlayWithBackdrop()) - 1;
},
_overlayWithBackdrop: function () {
for (var i = 0; i < this._overlays.length; i++) {
if (this._overlays[i].withBackdrop) {
return this._overlays[i];
}
}
},
_getZ: function (overlay) {
var z = this._minimumZ;
if (overlay) {
var z1 = Number(overlay.style.zIndex || window.getComputedStyle(overlay).zIndex);
if (z1 === z1) {
z = z1;
}
}
return z;
},
_setZ: function (element, z) {
element.style.zIndex = z;
},
_applyOverlayZ: function (overlay, aboveZ) {
this._setZ(overlay, aboveZ + 2);
},
_overlayInPath: function (path) {
path = path || [];
for (var i = 0; i < path.length; i++) {
if (path[i]._manager === this) {
return path[i];
}
}
},
_onCaptureClick: function (event) {
var overlay = this.currentOverlay();
if (overlay && this._overlayInPath(Polymer.dom(event).path) !== overlay) {
overlay._onCaptureClick(event);
}
},
_onCaptureFocus: function (event) {
var overlay = this.currentOverlay();
if (overlay) {
overlay._onCaptureFocus(event);
}
},
_onCaptureKeyDown: function (event) {
var overlay = this.currentOverlay();
if (overlay) {
if (Polymer.IronA11yKeysBehavior.keyboardEventMatchesKeys(event, 'esc')) {
overlay._onCaptureEsc(event);
} else if (Polymer.IronA11yKeysBehavior.keyboardEventMatchesKeys(event, 'tab')) {
overlay._onCaptureTab(event);
}
}
},
_shouldBeBehindOverlay: function (overlay1, overlay2) {
return !overlay1.alwaysOnTop && overlay2.alwaysOnTop;
}
};
Polymer.IronOverlayManager = new Polymer.IronOverlayManagerClass();
(function () {
'use strict';
Polymer.IronOverlayBehaviorImpl = {
properties: {
opened: {
observer: '_openedChanged',
type: Boolean,
value: false,
notify: true
},
canceled: {
observer: '_canceledChanged',
readOnly: true,
type: Boolean,
value: false
},
withBackdrop: {
observer: '_withBackdropChanged',
type: Boolean
},
noAutoFocus: {
type: Boolean,
value: false
},
noCancelOnEscKey: {
type: Boolean,
value: false
},
noCancelOnOutsideClick: {
type: Boolean,
value: false
},
closingReason: { type: Object },
restoreFocusOnClose: {
type: Boolean,
value: false
},
alwaysOnTop: { type: Boolean },
_manager: {
type: Object,
value: Polymer.IronOverlayManager
},
_focusedChild: { type: Object }
},
listeners: { 'iron-resize': '_onIronResize' },
get backdropElement() {
return this._manager.backdropElement;
},
get _focusNode() {
return this._focusedChild || Polymer.dom(this).querySelector('[autofocus]') || this;
},
get _focusableNodes() {
var FOCUSABLE_WITH_DISABLED = [
'a[href]',
'area[href]',
'iframe',
'[tabindex]',
'[contentEditable=true]'
];
var FOCUSABLE_WITHOUT_DISABLED = [
'input',
'select',
'textarea',
'button'
];
var selector = FOCUSABLE_WITH_DISABLED.join(':not([tabindex="-1"]),') + ':not([tabindex="-1"]),' + FOCUSABLE_WITHOUT_DISABLED.join(':not([disabled]):not([tabindex="-1"]),') + ':not([disabled]):not([tabindex="-1"])';
var focusables = Polymer.dom(this).querySelectorAll(selector);
if (this.tabIndex >= 0) {
focusables.splice(0, 0, this);
}
return focusables.sort(function (a, b) {
if (a.tabIndex === b.tabIndex) {
return 0;
}
if (a.tabIndex === 0 || a.tabIndex > b.tabIndex) {
return 1;
}
return -1;
});
},
ready: function () {
this.__isAnimating = false;
this.__shouldRemoveTabIndex = false;
this.__firstFocusableNode = this.__lastFocusableNode = null;
this.__raf = null;
this.__restoreFocusNode = null;
this._ensureSetup();
},
attached: function () {
if (this.opened) {
this._openedChanged(this.opened);
}
this._observer = Polymer.dom(this).observeNodes(this._onNodesChange);
},
detached: function () {
Polymer.dom(this).unobserveNodes(this._observer);
this._observer = null;
if (this.__raf) {
window.cancelAnimationFrame(this.__raf);
this.__raf = null;
}
this._manager.removeOverlay(this);
},
toggle: function () {
this._setCanceled(false);
this.opened = !this.opened;
},
open: function () {
this._setCanceled(false);
this.opened = true;
},
close: function () {
this._setCanceled(false);
this.opened = false;
},
cancel: function (event) {
var cancelEvent = this.fire('iron-overlay-canceled', event, { cancelable: true });
if (cancelEvent.defaultPrevented) {
return;
}
this._setCanceled(true);
this.opened = false;
},
_ensureSetup: function () {
if (this._overlaySetup) {
return;
}
this._overlaySetup = true;
this.style.outline = 'none';
this.style.display = 'none';
},
_openedChanged: function (opened) {
if (opened) {
this.removeAttribute('aria-hidden');
} else {
this.setAttribute('aria-hidden', 'true');
}
if (!this.isAttached) {
return;
}
this.__isAnimating = true;
this.__onNextAnimationFrame(this.__openedChanged);
},
_canceledChanged: function () {
this.closingReason = this.closingReason || {};
this.closingReason.canceled = this.canceled;
},
_withBackdropChanged: function () {
if (this.withBackdrop && !this.hasAttribute('tabindex')) {
this.setAttribute('tabindex', '-1');
this.__shouldRemoveTabIndex = true;
} else if (this.__shouldRemoveTabIndex) {
this.removeAttribute('tabindex');
this.__shouldRemoveTabIndex = false;
}
if (this.opened && this.isAttached) {
this._manager.trackBackdrop();
}
},
_prepareRenderOpened: function () {
this.__restoreFocusNode = this._manager.deepActiveElement;
this._preparePositioning();
this.refit();
this._finishPositioning();
if (this.noAutoFocus && document.activeElement === this._focusNode) {
this._focusNode.blur();
this.__restoreFocusNode.focus();
}
},
_renderOpened: function () {
this._finishRenderOpened();
},
_renderClosed: function () {
this._finishRenderClosed();
},
_finishRenderOpened: function () {
this.notifyResize();
this.__isAnimating = false;
var focusableNodes = this._focusableNodes;
this.__firstFocusableNode = focusableNodes[0];
this.__lastFocusableNode = focusableNodes[focusableNodes.length - 1];
this.fire('iron-overlay-opened');
},
_finishRenderClosed: function () {
this.style.display = 'none';
this.style.zIndex = '';
this.notifyResize();
this.__isAnimating = false;
this.fire('iron-overlay-closed', this.closingReason);
},
_preparePositioning: function () {
this.style.transition = this.style.webkitTransition = 'none';
this.style.transform = this.style.webkitTransform = 'none';
this.style.display = '';
},
_finishPositioning: function () {
this.style.display = 'none';
this.scrollTop = this.scrollTop;
this.style.transition = this.style.webkitTransition = '';
this.style.transform = this.style.webkitTransform = '';
this.style.display = '';
this.scrollTop = this.scrollTop;
},
_applyFocus: function () {
if (this.opened) {
if (!this.noAutoFocus) {
this._focusNode.focus();
}
} else {
this._focusNode.blur();
this._focusedChild = null;
if (this.restoreFocusOnClose && this.__restoreFocusNode) {
this.__restoreFocusNode.focus();
}
this.__restoreFocusNode = null;
var currentOverlay = this._manager.currentOverlay();
if (currentOverlay && this !== currentOverlay) {
currentOverlay._applyFocus();
}
}
},
_onCaptureClick: function (event) {
if (!this.noCancelOnOutsideClick) {
this.cancel(event);
}
},
_onCaptureFocus: function (event) {
if (!this.withBackdrop) {
return;
}
var path = Polymer.dom(event).path;
if (path.indexOf(this) === -1) {
event.stopPropagation();
this._applyFocus();
} else {
this._focusedChild = path[0];
}
},
_onCaptureEsc: function (event) {
if (!this.noCancelOnEscKey) {
this.cancel(event);
}
},
_onCaptureTab: function (event) {
if (!this.withBackdrop) {
return;
}
var shift = event.shiftKey;
var nodeToCheck = shift ? this.__firstFocusableNode : this.__lastFocusableNode;
var nodeToSet = shift ? this.__lastFocusableNode : this.__firstFocusableNode;
var shouldWrap = false;
if (nodeToCheck === nodeToSet) {
shouldWrap = true;
} else {
var focusedNode = this._manager.deepActiveElement;
shouldWrap = focusedNode === nodeToCheck || focusedNode === this;
}
if (shouldWrap) {
event.preventDefault();
this._focusedChild = nodeToSet;
this._applyFocus();
}
},
_onIronResize: function () {
if (this.opened && !this.__isAnimating) {
this.__onNextAnimationFrame(this.refit);
}
},
_onNodesChange: function () {
if (this.opened && !this.__isAnimating) {
this.notifyResize();
}
},
__openedChanged: function () {
if (this.opened) {
this._prepareRenderOpened();
this._manager.addOverlay(this);
this._applyFocus();
this._renderOpened();
} else {
this._manager.removeOverlay(this);
this._applyFocus();
this._renderClosed();
}
},
__onNextAnimationFrame: function (callback) {
if (this.__raf) {
window.cancelAnimationFrame(this.__raf);
}
var self = this;
this.__raf = window.requestAnimationFrame(function nextAnimationFrame() {
self.__raf = null;
callback.call(self);
});
}
};
Polymer.IronOverlayBehavior = [
Polymer.IronFitBehavior,
Polymer.IronResizableBehavior,
Polymer.IronOverlayBehaviorImpl
];
}());
Polymer.PaperDialogBehaviorImpl = {
hostAttributes: {
'role': 'dialog',
'tabindex': '-1'
},
properties: {
modal: {
type: Boolean,
value: false
}
},
observers: ['_modalChanged(modal, _readied)'],
listeners: { 'tap': '_onDialogClick' },
ready: function () {
this.__prevNoCancelOnOutsideClick = this.noCancelOnOutsideClick;
this.__prevNoCancelOnEscKey = this.noCancelOnEscKey;
this.__prevWithBackdrop = this.withBackdrop;
},
_modalChanged: function (modal, readied) {
if (!readied) {
return;
}
if (modal) {
this.__prevNoCancelOnOutsideClick = this.noCancelOnOutsideClick;
this.__prevNoCancelOnEscKey = this.noCancelOnEscKey;
this.__prevWithBackdrop = this.withBackdrop;
this.noCancelOnOutsideClick = true;
this.noCancelOnEscKey = true;
this.withBackdrop = true;
} else {
this.noCancelOnOutsideClick = this.noCancelOnOutsideClick && this.__prevNoCancelOnOutsideClick;
this.noCancelOnEscKey = this.noCancelOnEscKey && this.__prevNoCancelOnEscKey;
this.withBackdrop = this.withBackdrop && this.__prevWithBackdrop;
}
},
_updateClosingReasonConfirmed: function (confirmed) {
this.closingReason = this.closingReason || {};
this.closingReason.confirmed = confirmed;
},
_onDialogClick: function (event) {
var path = Polymer.dom(event).path;
for (var i = 0; i < path.indexOf(this); i++) {
var target = path[i];
if (target.hasAttribute && (target.hasAttribute('dialog-dismiss') || target.hasAttribute('dialog-confirm'))) {
this._updateClosingReasonConfirmed(target.hasAttribute('dialog-confirm'));
this.close();
event.stopPropagation();
break;
}
}
}
};
Polymer.PaperDialogBehavior = [
Polymer.IronOverlayBehavior,
Polymer.PaperDialogBehaviorImpl
];
(function () {
Polymer({
is: 'paper-dialog',
behaviors: [
Polymer.PaperDialogBehavior,
Polymer.NeonAnimationRunnerBehavior
],
listeners: { 'neon-animation-finish': '_onNeonAnimationFinish' },
_renderOpened: function () {
this.cancelAnimation();
this.playAnimation('entry');
},
_renderClosed: function () {
this.cancelAnimation();
this.playAnimation('exit');
},
_onNeonAnimationFinish: function () {
if (this.opened) {
this._finishRenderOpened();
} else {
this._finishRenderClosed();
}
}
});
}());
Polymer({
is: 'paper-material',
properties: {
elevation: {
type: Number,
reflectToAttribute: true,
value: 1
},
animated: {
type: Boolean,
reflectToAttribute: true,
value: false
}
}
});
Polymer.PaperSpinnerBehavior = {
listeners: {
'animationend': '__reset',
'webkitAnimationEnd': '__reset'
},
properties: {
active: {
type: Boolean,
value: false,
reflectToAttribute: true,
observer: '__activeChanged'
},
alt: {
type: String,
value: 'loading',
observer: '__altChanged'
},
__coolingDown: {
type: Boolean,
value: false
}
},
__computeContainerClasses: function (active, coolingDown) {
return [
active || coolingDown ? 'active' : '',
coolingDown ? 'cooldown' : ''
].join(' ');
},
__activeChanged: function (active, old) {
this.__setAriaHidden(!active);
this.__coolingDown = !active && old;
},
__altChanged: function (alt) {
if (alt === this.getPropertyInfo('alt').value) {
this.alt = this.getAttribute('aria-label') || alt;
} else {
this.__setAriaHidden(alt === '');
this.setAttribute('aria-label', alt);
}
},
__setAriaHidden: function (hidden) {
var attr = 'aria-hidden';
if (hidden) {
this.setAttribute(attr, 'true');
} else {
this.removeAttribute(attr);
}
},
__reset: function () {
this.active = false;
this.__coolingDown = false;
}
};
Polymer({
is: 'paper-spinner',
behaviors: [Polymer.PaperSpinnerBehavior]
});
(function () {
var Utility = {
distance: function (x1, y1, x2, y2) {
var xDelta = x1 - x2;
var yDelta = y1 - y2;
return Math.sqrt(xDelta * xDelta + yDelta * yDelta);
},
now: window.performance && window.performance.now ? window.performance.now.bind(window.performance) : Date.now
};
function ElementMetrics(element) {
this.element = element;
this.width = this.boundingRect.width;
this.height = this.boundingRect.height;
this.size = Math.max(this.width, this.height);
}
ElementMetrics.prototype = {
get boundingRect() {
return this.element.getBoundingClientRect();
},
furthestCornerDistanceFrom: function (x, y) {
var topLeft = Utility.distance(x, y, 0, 0);
var topRight = Utility.distance(x, y, this.width, 0);
var bottomLeft = Utility.distance(x, y, 0, this.height);
var bottomRight = Utility.distance(x, y, this.width, this.height);
return Math.max(topLeft, topRight, bottomLeft, bottomRight);
}
};
function Ripple(element) {
this.element = element;
this.color = window.getComputedStyle(element).color;
this.wave = document.createElement('div');
this.waveContainer = document.createElement('div');
this.wave.style.backgroundColor = this.color;
this.wave.classList.add('wave');
this.waveContainer.classList.add('wave-container');
Polymer.dom(this.waveContainer).appendChild(this.wave);
this.resetInteractionState();
}
Ripple.MAX_RADIUS = 300;
Ripple.prototype = {
get recenters() {
return this.element.recenters;
},
get center() {
return this.element.center;
},
get mouseDownElapsed() {
var elapsed;
if (!this.mouseDownStart) {
return 0;
}
elapsed = Utility.now() - this.mouseDownStart;
if (this.mouseUpStart) {
elapsed -= this.mouseUpElapsed;
}
return elapsed;
},
get mouseUpElapsed() {
return this.mouseUpStart ? Utility.now() - this.mouseUpStart : 0;
},
get mouseDownElapsedSeconds() {
return this.mouseDownElapsed / 1000;
},
get mouseUpElapsedSeconds() {
return this.mouseUpElapsed / 1000;
},
get mouseInteractionSeconds() {
return this.mouseDownElapsedSeconds + this.mouseUpElapsedSeconds;
},
get initialOpacity() {
return this.element.initialOpacity;
},
get opacityDecayVelocity() {
return this.element.opacityDecayVelocity;
},
get radius() {
var width2 = this.containerMetrics.width * this.containerMetrics.width;
var height2 = this.containerMetrics.height * this.containerMetrics.height;
var waveRadius = Math.min(Math.sqrt(width2 + height2), Ripple.MAX_RADIUS) * 1.1 + 5;
var duration = 1.1 - 0.2 * (waveRadius / Ripple.MAX_RADIUS);
var timeNow = this.mouseInteractionSeconds / duration;
var size = waveRadius * (1 - Math.pow(80, -timeNow));
return Math.abs(size);
},
get opacity() {
if (!this.mouseUpStart) {
return this.initialOpacity;
}
return Math.max(0, this.initialOpacity - this.mouseUpElapsedSeconds * this.opacityDecayVelocity);
},
get outerOpacity() {
var outerOpacity = this.mouseUpElapsedSeconds * 0.3;
var waveOpacity = this.opacity;
return Math.max(0, Math.min(outerOpacity, waveOpacity));
},
get isOpacityFullyDecayed() {
return this.opacity < 0.01 && this.radius >= Math.min(this.maxRadius, Ripple.MAX_RADIUS);
},
get isRestingAtMaxRadius() {
return this.opacity >= this.initialOpacity && this.radius >= Math.min(this.maxRadius, Ripple.MAX_RADIUS);
},
get isAnimationComplete() {
return this.mouseUpStart ? this.isOpacityFullyDecayed : this.isRestingAtMaxRadius;
},
get translationFraction() {
return Math.min(1, this.radius / this.containerMetrics.size * 2 / Math.sqrt(2));
},
get xNow() {
if (this.xEnd) {
return this.xStart + this.translationFraction * (this.xEnd - this.xStart);
}
return this.xStart;
},
get yNow() {
if (this.yEnd) {
return this.yStart + this.translationFraction * (this.yEnd - this.yStart);
}
return this.yStart;
},
get isMouseDown() {
return this.mouseDownStart && !this.mouseUpStart;
},
resetInteractionState: function () {
this.maxRadius = 0;
this.mouseDownStart = 0;
this.mouseUpStart = 0;
this.xStart = 0;
this.yStart = 0;
this.xEnd = 0;
this.yEnd = 0;
this.slideDistance = 0;
this.containerMetrics = new ElementMetrics(this.element);
},
draw: function () {
var scale;
var translateString;
var dx;
var dy;
this.wave.style.opacity = this.opacity;
scale = this.radius / (this.containerMetrics.size / 2);
dx = this.xNow - this.containerMetrics.width / 2;
dy = this.yNow - this.containerMetrics.height / 2;
this.waveContainer.style.webkitTransform = 'translate(' + dx + 'px, ' + dy + 'px)';
this.waveContainer.style.transform = 'translate3d(' + dx + 'px, ' + dy + 'px, 0)';
this.wave.style.webkitTransform = 'scale(' + scale + ',' + scale + ')';
this.wave.style.transform = 'scale3d(' + scale + ',' + scale + ',1)';
},
downAction: function (event) {
var xCenter = this.containerMetrics.width / 2;
var yCenter = this.containerMetrics.height / 2;
this.resetInteractionState();
this.mouseDownStart = Utility.now();
if (this.center) {
this.xStart = xCenter;
this.yStart = yCenter;
this.slideDistance = Utility.distance(this.xStart, this.yStart, this.xEnd, this.yEnd);
} else {
this.xStart = event ? event.detail.x - this.containerMetrics.boundingRect.left : this.containerMetrics.width / 2;
this.yStart = event ? event.detail.y - this.containerMetrics.boundingRect.top : this.containerMetrics.height / 2;
}
if (this.recenters) {
this.xEnd = xCenter;
this.yEnd = yCenter;
this.slideDistance = Utility.distance(this.xStart, this.yStart, this.xEnd, this.yEnd);
}
this.maxRadius = this.containerMetrics.furthestCornerDistanceFrom(this.xStart, this.yStart);
this.waveContainer.style.top = (this.containerMetrics.height - this.containerMetrics.size) / 2 + 'px';
this.waveContainer.style.left = (this.containerMetrics.width - this.containerMetrics.size) / 2 + 'px';
this.waveContainer.style.width = this.containerMetrics.size + 'px';
this.waveContainer.style.height = this.containerMetrics.size + 'px';
},
upAction: function (event) {
if (!this.isMouseDown) {
return;
}
this.mouseUpStart = Utility.now();
},
remove: function () {
Polymer.dom(this.waveContainer.parentNode).removeChild(this.waveContainer);
}
};
Polymer({
is: 'paper-ripple',
behaviors: [Polymer.IronA11yKeysBehavior],
properties: {
initialOpacity: {
type: Number,
value: 0.25
},
opacityDecayVelocity: {
type: Number,
value: 0.8
},
recenters: {
type: Boolean,
value: false
},
center: {
type: Boolean,
value: false
},
ripples: {
type: Array,
value: function () {
return [];
}
},
animating: {
type: Boolean,
readOnly: true,
reflectToAttribute: true,
value: false
},
holdDown: {
type: Boolean,
value: false,
observer: '_holdDownChanged'
},
noink: {
type: Boolean,
value: false
},
_animating: { type: Boolean },
_boundAnimate: {
type: Function,
value: function () {
return this.animate.bind(this);
}
}
},
get target() {
return this.keyEventTarget;
},
keyBindings: {
'enter:keydown': '_onEnterKeydown',
'space:keydown': '_onSpaceKeydown',
'space:keyup': '_onSpaceKeyup'
},
attached: function () {
if (this.parentNode.nodeType == 11) {
this.keyEventTarget = Polymer.dom(this).getOwnerRoot().host;
} else {
this.keyEventTarget = this.parentNode;
}
var keyEventTarget = this.keyEventTarget;
this.listen(keyEventTarget, 'up', 'uiUpAction');
this.listen(keyEventTarget, 'down', 'uiDownAction');
},
detached: function () {
this.unlisten(this.keyEventTarget, 'up', 'uiUpAction');
this.unlisten(this.keyEventTarget, 'down', 'uiDownAction');
this.keyEventTarget = null;
},
get shouldKeepAnimating() {
for (var index = 0; index < this.ripples.length; ++index) {
if (!this.ripples[index].isAnimationComplete) {
return true;
}
}
return false;
},
simulatedRipple: function () {
this.downAction(null);
this.async(function () {
this.upAction();
}, 1);
},
uiDownAction: function (event) {
if (!this.noink) {
this.downAction(event);
}
},
downAction: function (event) {
if (this.holdDown && this.ripples.length > 0) {
return;
}
var ripple = this.addRipple();
ripple.downAction(event);
if (!this._animating) {
this._animating = true;
this.animate();
}
},
uiUpAction: function (event) {
if (!this.noink) {
this.upAction(event);
}
},
upAction: function (event) {
if (this.holdDown) {
return;
}
this.ripples.forEach(function (ripple) {
ripple.upAction(event);
});
this._animating = true;
this.animate();
},
onAnimationComplete: function () {
this._animating = false;
this.$.background.style.backgroundColor = null;
this.fire('transitionend');
},
addRipple: function () {
var ripple = new Ripple(this);
Polymer.dom(this.$.waves).appendChild(ripple.waveContainer);
this.$.background.style.backgroundColor = ripple.color;
this.ripples.push(ripple);
this._setAnimating(true);
return ripple;
},
removeRipple: function (ripple) {
var rippleIndex = this.ripples.indexOf(ripple);
if (rippleIndex < 0) {
return;
}
this.ripples.splice(rippleIndex, 1);
ripple.remove();
if (!this.ripples.length) {
this._setAnimating(false);
}
},
animate: function () {
if (!this._animating) {
return;
}
var index;
var ripple;
for (index = 0; index < this.ripples.length; ++index) {
ripple = this.ripples[index];
ripple.draw();
this.$.background.style.opacity = ripple.outerOpacity;
if (ripple.isOpacityFullyDecayed && !ripple.isRestingAtMaxRadius) {
this.removeRipple(ripple);
}
}
if (!this.shouldKeepAnimating && this.ripples.length === 0) {
this.onAnimationComplete();
} else {
window.requestAnimationFrame(this._boundAnimate);
}
},
_onEnterKeydown: function () {
this.uiDownAction();
this.async(this.uiUpAction, 1);
},
_onSpaceKeydown: function () {
this.uiDownAction();
},
_onSpaceKeyup: function () {
this.uiUpAction();
},
_holdDownChanged: function (newVal, oldVal) {
if (oldVal === undefined) {
return;
}
if (newVal) {
this.downAction();
} else {
this.upAction();
}
}
});
}());
Polymer.PaperRippleBehavior = {
properties: {
noink: {
type: Boolean,
observer: '_noinkChanged'
},
_rippleContainer: { type: Object }
},
_buttonStateChanged: function () {
if (this.focused) {
this.ensureRipple();
}
},
_downHandler: function (event) {
Polymer.IronButtonStateImpl._downHandler.call(this, event);
if (this.pressed) {
this.ensureRipple(event);
}
},
ensureRipple: function (optTriggeringEvent) {
if (!this.hasRipple()) {
this._ripple = this._createRipple();
this._ripple.noink = this.noink;
var rippleContainer = this._rippleContainer || this.root;
if (rippleContainer) {
Polymer.dom(rippleContainer).appendChild(this._ripple);
}
if (optTriggeringEvent) {
var domContainer = Polymer.dom(this._rippleContainer || this);
var target = Polymer.dom(optTriggeringEvent).rootTarget;
if (domContainer.deepContains(target)) {
this._ripple.uiDownAction(optTriggeringEvent);
}
}
}
},
getRipple: function () {
this.ensureRipple();
return this._ripple;
},
hasRipple: function () {
return Boolean(this._ripple);
},
_createRipple: function () {
return document.createElement('paper-ripple');
},
_noinkChanged: function (noink) {
if (this.hasRipple()) {
this._ripple.noink = noink;
}
}
};
Polymer.PaperButtonBehaviorImpl = {
properties: {
elevation: {
type: Number,
reflectToAttribute: true,
readOnly: true
}
},
observers: [
'_calculateElevation(focused, disabled, active, pressed, receivedFocusFromKeyboard)',
'_computeKeyboardClass(receivedFocusFromKeyboard)'
],
hostAttributes: {
role: 'button',
tabindex: '0',
animated: true
},
_calculateElevation: function () {
var e = 1;
if (this.disabled) {
e = 0;
} else if (this.active || this.pressed) {
e = 4;
} else if (this.receivedFocusFromKeyboard) {
e = 3;
}
this._setElevation(e);
},
_computeKeyboardClass: function (receivedFocusFromKeyboard) {
this.toggleClass('keyboard-focus', receivedFocusFromKeyboard);
},
_spaceKeyDownHandler: function (event) {
Polymer.IronButtonStateImpl._spaceKeyDownHandler.call(this, event);
if (this.hasRipple() && this.getRipple().ripples.length < 1) {
this._ripple.uiDownAction();
}
},
_spaceKeyUpHandler: function (event) {
Polymer.IronButtonStateImpl._spaceKeyUpHandler.call(this, event);
if (this.hasRipple()) {
this._ripple.uiUpAction();
}
}
};
Polymer.PaperButtonBehavior = [
Polymer.IronButtonState,
Polymer.IronControlState,
Polymer.PaperRippleBehavior,
Polymer.PaperButtonBehaviorImpl
];
Polymer({
is: 'paper-button',
behaviors: [Polymer.PaperButtonBehavior],
properties: {
raised: {
type: Boolean,
reflectToAttribute: true,
value: false,
observer: '_calculateElevation'
}
},
_calculateElevation: function () {
if (!this.raised) {
this._setElevation(0);
} else {
Polymer.PaperButtonBehaviorImpl._calculateElevation.apply(this);
}
}
});
Polymer.IronFormElementBehavior = {
properties: {
name: { type: String },
value: {
notify: true,
type: String
},
required: {
type: Boolean,
value: false
},
_parentForm: { type: Object }
},
attached: function () {
this.fire('iron-form-element-register');
},
detached: function () {
if (this._parentForm) {
this._parentForm.fire('iron-form-element-unregister', { target: this });
}
}
};
(function () {
'use strict';
Polymer.IronA11yAnnouncer = Polymer({
is: 'iron-a11y-announcer',
properties: {
mode: {
type: String,
value: 'polite'
},
_text: {
type: String,
value: ''
}
},
created: function () {
if (!Polymer.IronA11yAnnouncer.instance) {
Polymer.IronA11yAnnouncer.instance = this;
}
document.body.addEventListener('iron-announce', this._onIronAnnounce.bind(this));
},
announce: function (text) {
this._text = '';
this.async(function () {
this._text = text;
}, 100);
},
_onIronAnnounce: function (event) {
if (event.detail && event.detail.text) {
this.announce(event.detail.text);
}
}
});
Polymer.IronA11yAnnouncer.instance = null;
Polymer.IronA11yAnnouncer.requestAvailability = function () {
if (!Polymer.IronA11yAnnouncer.instance) {
Polymer.IronA11yAnnouncer.instance = document.createElement('iron-a11y-announcer');
}
document.body.appendChild(Polymer.IronA11yAnnouncer.instance);
};
}());
Polymer.IronValidatableBehaviorMeta = null;
Polymer.IronValidatableBehavior = {
properties: {
validator: { type: String },
invalid: {
notify: true,
reflectToAttribute: true,
type: Boolean,
value: false
},
_validatorMeta: { type: Object },
validatorType: {
type: String,
value: 'validator'
},
_validator: {
type: Object,
computed: '__computeValidator(validator)'
}
},
observers: ['_invalidChanged(invalid)'],
registered: function () {
Polymer.IronValidatableBehaviorMeta = new Polymer.IronMeta({ type: 'validator' });
},
_invalidChanged: function () {
if (this.invalid) {
this.setAttribute('aria-invalid', 'true');
} else {
this.removeAttribute('aria-invalid');
}
},
hasValidator: function () {
return this._validator != null;
},
validate: function (value) {
this.invalid = !this._getValidity(value);
return !this.invalid;
},
_getValidity: function (value) {
if (this.hasValidator()) {
return this._validator.validate(value);
}
return true;
},
__computeValidator: function () {
return Polymer.IronValidatableBehaviorMeta && Polymer.IronValidatableBehaviorMeta.byKey(this.validator);
}
};
Polymer({
is: 'iron-input',
extends: 'input',
behaviors: [Polymer.IronValidatableBehavior],
properties: {
bindValue: {
observer: '_bindValueChanged',
type: String
},
preventInvalidInput: { type: Boolean },
allowedPattern: {
type: String,
observer: '_allowedPatternChanged'
},
_previousValidInput: {
type: String,
value: ''
},
_patternAlreadyChecked: {
type: Boolean,
value: false
}
},
listeners: {
'input': '_onInput',
'keypress': '_onKeypress'
},
registered: function () {
if (!this._canDispatchEventOnDisabled()) {
this._origDispatchEvent = this.dispatchEvent;
this.dispatchEvent = this._dispatchEventFirefoxIE;
}
},
created: function () {
Polymer.IronA11yAnnouncer.requestAvailability();
},
_canDispatchEventOnDisabled: function () {
var input = document.createElement('input');
var canDispatch = false;
input.disabled = true;
input.addEventListener('feature-check-dispatch-event', function () {
canDispatch = true;
});
try {
input.dispatchEvent(new Event('feature-check-dispatch-event'));
} catch (e) {
}
return canDispatch;
},
_dispatchEventFirefoxIE: function () {
var disabled = this.disabled;
this.disabled = false;
this._origDispatchEvent.apply(this, arguments);
this.disabled = disabled;
},
get _patternRegExp() {
var pattern;
if (this.allowedPattern) {
pattern = new RegExp(this.allowedPattern);
} else {
switch (this.type) {
case 'number':
pattern = /[0-9.,e-]/;
break;
}
}
return pattern;
},
ready: function () {
this.bindValue = this.value;
},
_bindValueChanged: function () {
if (this.value !== this.bindValue) {
this.value = !(this.bindValue || this.bindValue === 0 || this.bindValue === false) ? '' : this.bindValue;
}
this.fire('bind-value-changed', { value: this.bindValue });
},
_allowedPatternChanged: function () {
this.preventInvalidInput = this.allowedPattern ? true : false;
},
_onInput: function () {
if (this.preventInvalidInput && !this._patternAlreadyChecked) {
var valid = this._checkPatternValidity();
if (!valid) {
this._announceInvalidCharacter('Invalid string of characters not entered.');
this.value = this._previousValidInput;
}
}
this.bindValue = this.value;
this._previousValidInput = this.value;
this._patternAlreadyChecked = false;
},
_isPrintable: function (event) {
var anyNonPrintable = event.keyCode == 8 || event.keyCode == 9 || event.keyCode == 13 || event.keyCode == 27;
var mozNonPrintable = event.keyCode == 19 || event.keyCode == 20 || event.keyCode == 45 || event.keyCode == 46 || event.keyCode == 144 || event.keyCode == 145 || event.keyCode > 32 && event.keyCode < 41 || event.keyCode > 111 && event.keyCode < 124;
return !anyNonPrintable && !(event.charCode == 0 && mozNonPrintable);
},
_onKeypress: function (event) {
if (!this.preventInvalidInput && this.type !== 'number') {
return;
}
var regexp = this._patternRegExp;
if (!regexp) {
return;
}
if (event.metaKey || event.ctrlKey || event.altKey)
return;
this._patternAlreadyChecked = true;
var thisChar = String.fromCharCode(event.charCode);
if (this._isPrintable(event) && !regexp.test(thisChar)) {
event.preventDefault();
this._announceInvalidCharacter('Invalid character ' + thisChar + ' not entered.');
}
},
_checkPatternValidity: function () {
var regexp = this._patternRegExp;
if (!regexp) {
return true;
}
for (var i = 0; i < this.value.length; i++) {
if (!regexp.test(this.value[i])) {
return false;
}
}
return true;
},
validate: function () {
var valid = this.checkValidity();
if (valid) {
if (this.required && this.value === '') {
valid = false;
} else if (this.hasValidator()) {
valid = Polymer.IronValidatableBehavior.validate.call(this, this.value);
}
}
this.invalid = !valid;
this.fire('iron-input-validate');
return valid;
},
_announceInvalidCharacter: function (message) {
this.fire('iron-announce', { text: message });
}
});
Polymer.PaperInputHelper = {};
Polymer.PaperInputHelper.NextLabelID = 1;
Polymer.PaperInputHelper.NextAddonID = 1;
Polymer.PaperInputBehaviorImpl = {
properties: {
label: { type: String },
value: {
notify: true,
type: String
},
disabled: {
type: Boolean,
value: false
},
invalid: {
type: Boolean,
value: false,
notify: true
},
preventInvalidInput: { type: Boolean },
allowedPattern: { type: String },
type: { type: String },
list: { type: String },
pattern: { type: String },
required: {
type: Boolean,
value: false
},
errorMessage: { type: String },
charCounter: {
type: Boolean,
value: false
},
noLabelFloat: {
type: Boolean,
value: false
},
alwaysFloatLabel: {
type: Boolean,
value: false
},
autoValidate: {
type: Boolean,
value: false
},
validator: { type: String },
autocomplete: {
type: String,
value: 'off'
},
autofocus: {
type: Boolean,
observer: '_autofocusChanged'
},
inputmode: { type: String },
minlength: { type: Number },
maxlength: { type: Number },
min: { type: String },
max: { type: String },
step: { type: String },
name: { type: String },
placeholder: {
type: String,
value: ''
},
readonly: {
type: Boolean,
value: false
},
size: { type: Number },
autocapitalize: {
type: String,
value: 'none'
},
autocorrect: {
type: String,
value: 'off'
},
autosave: { type: String },
results: { type: Number },
accept: { type: String },
multiple: { type: Boolean },
_ariaDescribedBy: {
type: String,
value: ''
},
_ariaLabelledBy: {
type: String,
value: ''
}
},
listeners: { 'addon-attached': '_onAddonAttached' },
keyBindings: { 'shift+tab:keydown': '_onShiftTabDown' },
hostAttributes: { tabindex: 0 },
get inputElement() {
return this.$.input;
},
get _focusableElement() {
return this.inputElement;
},
registered: function () {
this._typesThatHaveText = [
'date',
'datetime',
'datetime-local',
'month',
'time',
'week',
'file'
];
},
attached: function () {
this._updateAriaLabelledBy();
if (this.inputElement && this._typesThatHaveText.indexOf(this.inputElement.type) !== -1) {
this.alwaysFloatLabel = true;
}
},
_appendStringWithSpace: function (str, more) {
if (str) {
str = str + ' ' + more;
} else {
str = more;
}
return str;
},
_onAddonAttached: function (event) {
var target = event.path ? event.path[0] : event.target;
if (target.id) {
this._ariaDescribedBy = this._appendStringWithSpace(this._ariaDescribedBy, target.id);
} else {
var id = 'paper-input-add-on-' + Polymer.PaperInputHelper.NextAddonID++;
target.id = id;
this._ariaDescribedBy = this._appendStringWithSpace(this._ariaDescribedBy, id);
}
},
validate: function () {
return this.inputElement.validate();
},
_focusBlurHandler: function (event) {
Polymer.IronControlState._focusBlurHandler.call(this, event);
if (this.focused && !this._shiftTabPressed)
this._focusableElement.focus();
},
_onShiftTabDown: function (event) {
var oldTabIndex = this.getAttribute('tabindex');
this._shiftTabPressed = true;
this.setAttribute('tabindex', '-1');
this.async(function () {
this.setAttribute('tabindex', oldTabIndex);
this._shiftTabPressed = false;
}, 1);
},
_handleAutoValidate: function () {
if (this.autoValidate)
this.validate();
},
updateValueAndPreserveCaret: function (newValue) {
try {
var start = this.inputElement.selectionStart;
this.value = newValue;
this.inputElement.selectionStart = start;
this.inputElement.selectionEnd = start;
} catch (e) {
this.value = newValue;
}
},
_computeAlwaysFloatLabel: function (alwaysFloatLabel, placeholder) {
return placeholder || alwaysFloatLabel;
},
_updateAriaLabelledBy: function () {
var label = Polymer.dom(this.root).querySelector('label');
if (!label) {
this._ariaLabelledBy = '';
return;
}
var labelledBy;
if (label.id) {
labelledBy = label.id;
} else {
labelledBy = 'paper-input-label-' + Polymer.PaperInputHelper.NextLabelID++;
label.id = labelledBy;
}
this._ariaLabelledBy = labelledBy;
},
_onChange: function (event) {
if (this.shadowRoot) {
this.fire(event.type, { sourceEvent: event }, {
node: this,
bubbles: event.bubbles,
cancelable: event.cancelable
});
}
},
_autofocusChanged: function () {
if (this.autofocus && this._focusableElement) {
var activeElement = document.activeElement;
var isActiveElementValid = activeElement instanceof HTMLElement;
var isSomeElementActive = isActiveElementValid && activeElement !== document.body && activeElement !== document.documentElement;
if (!isSomeElementActive) {
this._focusableElement.focus();
}
}
}
};
Polymer.PaperInputBehavior = [
Polymer.IronControlState,
Polymer.IronA11yKeysBehavior,
Polymer.PaperInputBehaviorImpl
];
Polymer.PaperInputAddonBehavior = {
hostAttributes: { 'add-on': '' },
attached: function () {
this.fire('addon-attached');
},
update: function (state) {
}
};
Polymer({
is: 'paper-input-char-counter',
behaviors: [Polymer.PaperInputAddonBehavior],
properties: {
_charCounterStr: {
type: String,
value: '0'
}
},
update: function (state) {
if (!state.inputElement) {
return;
}
state.value = state.value || '';
var counter = state.value.toString().length.toString();
if (state.inputElement.hasAttribute('maxlength')) {
counter += '/' + state.inputElement.getAttribute('maxlength');
}
this._charCounterStr = counter;
}
});
Polymer({
is: 'paper-input-container',
properties: {
noLabelFloat: {
type: Boolean,
value: false
},
alwaysFloatLabel: {
type: Boolean,
value: false
},
attrForValue: {
type: String,
value: 'bind-value'
},
autoValidate: {
type: Boolean,
value: false
},
invalid: {
observer: '_invalidChanged',
type: Boolean,
value: false
},
focused: {
readOnly: true,
type: Boolean,
value: false,
notify: true
},
_addons: { type: Array },
_inputHasContent: {
type: Boolean,
value: false
},
_inputSelector: {
type: String,
value: 'input,textarea,.paper-input-input'
},
_boundOnFocus: {
type: Function,
value: function () {
return this._onFocus.bind(this);
}
},
_boundOnBlur: {
type: Function,
value: function () {
return this._onBlur.bind(this);
}
},
_boundOnInput: {
type: Function,
value: function () {
return this._onInput.bind(this);
}
},
_boundValueChanged: {
type: Function,
value: function () {
return this._onValueChanged.bind(this);
}
}
},
listeners: {
'addon-attached': '_onAddonAttached',
'iron-input-validate': '_onIronInputValidate'
},
get _valueChangedEvent() {
return this.attrForValue + '-changed';
},
get _propertyForValue() {
return Polymer.CaseMap.dashToCamelCase(this.attrForValue);
},
get _inputElement() {
return Polymer.dom(this).querySelector(this._inputSelector);
},
get _inputElementValue() {
return this._inputElement[this._propertyForValue] || this._inputElement.value;
},
ready: function () {
if (!this._addons) {
this._addons = [];
}
this.addEventListener('focus', this._boundOnFocus, true);
this.addEventListener('blur', this._boundOnBlur, true);
},
attached: function () {
if (this.attrForValue) {
this._inputElement.addEventListener(this._valueChangedEvent, this._boundValueChanged);
} else {
this.addEventListener('input', this._onInput);
}
if (this._inputElementValue != '') {
this._handleValueAndAutoValidate(this._inputElement);
} else {
this._handleValue(this._inputElement);
}
},
_onAddonAttached: function (event) {
if (!this._addons) {
this._addons = [];
}
var target = event.target;
if (this._addons.indexOf(target) === -1) {
this._addons.push(target);
if (this.isAttached) {
this._handleValue(this._inputElement);
}
}
},
_onFocus: function () {
this._setFocused(true);
},
_onBlur: function () {
this._setFocused(false);
this._handleValueAndAutoValidate(this._inputElement);
},
_onInput: function (event) {
this._handleValueAndAutoValidate(event.target);
},
_onValueChanged: function (event) {
this._handleValueAndAutoValidate(event.target);
},
_handleValue: function (inputElement) {
var value = this._inputElementValue;
if (value || value === 0 || inputElement.type === 'number' && !inputElement.checkValidity()) {
this._inputHasContent = true;
} else {
this._inputHasContent = false;
}
this.updateAddons({
inputElement: inputElement,
value: value,
invalid: this.invalid
});
},
_handleValueAndAutoValidate: function (inputElement) {
if (this.autoValidate) {
var valid;
if (inputElement.validate) {
valid = inputElement.validate(this._inputElementValue);
} else {
valid = inputElement.checkValidity();
}
this.invalid = !valid;
}
this._handleValue(inputElement);
},
_onIronInputValidate: function (event) {
this.invalid = this._inputElement.invalid;
},
_invalidChanged: function () {
if (this._addons) {
this.updateAddons({ invalid: this.invalid });
}
},
updateAddons: function (state) {
for (var addon, index = 0; addon = this._addons[index]; index++) {
addon.update(state);
}
},
_computeInputContentClass: function (noLabelFloat, alwaysFloatLabel, focused, invalid, _inputHasContent) {
var cls = 'input-content';
if (!noLabelFloat) {
var label = this.querySelector('label');
if (alwaysFloatLabel || _inputHasContent) {
cls += ' label-is-floating';
this.$.labelAndInputContainer.style.position = 'static';
if (invalid) {
cls += ' is-invalid';
} else if (focused) {
cls += ' label-is-highlighted';
}
} else {
if (label) {
this.$.labelAndInputContainer.style.position = 'relative';
}
}
} else {
if (_inputHasContent) {
cls += ' label-is-hidden';
}
}
return cls;
},
_computeUnderlineClass: function (focused, invalid) {
var cls = 'underline';
if (invalid) {
cls += ' is-invalid';
} else if (focused) {
cls += ' is-highlighted';
}
return cls;
},
_computeAddOnContentClass: function (focused, invalid) {
var cls = 'add-on-content';
if (invalid) {
cls += ' is-invalid';
} else if (focused) {
cls += ' is-highlighted';
}
return cls;
}
});
Polymer({
is: 'paper-input-error',
behaviors: [Polymer.PaperInputAddonBehavior],
properties: {
invalid: {
readOnly: true,
reflectToAttribute: true,
type: Boolean
}
},
update: function (state) {
this._setInvalid(state.invalid);
}
});
Polymer({
is: 'paper-input',
behaviors: [
Polymer.IronFormElementBehavior,
Polymer.PaperInputBehavior
]
});
function VaadinGridImport() {
var ub = '', vb = 0, wb = 'gwt.codesvr=', xb = 'gwt.hosted=', yb = 'gwt.hybrid', zb = 'VaadinGridImport', Ab = 'meta', Bb = 'name', Cb = 'gwt:property', Db = 'content', Eb = '=', Fb = 1, Gb = 'gwt:onPropertyErrorFn', Hb = 'Bad handler "', Ib = '" for "gwt:onPropertyErrorFn"', Jb = 'gwt:onLoadErrorFn', Kb = '" for "gwt:onLoadErrorFn"', Lb = 'user.agent', Mb = 'webkit', Nb = 'safari', Ob = 'msie', Pb = 10, Qb = 11, Rb = 'ie10', Sb = 9, Tb = 'ie9', Ub = 8, Vb = 'ie8', Wb = 'gecko', Xb = 'gecko1_8', Yb = 2, Zb = 3, $b = 4, _b = 'Single-script hosted mode not yet implemented. See issue ', ac = 'http://code.google.com/p/google-web-toolkit/issues/detail?id=2079', bc = '0AAF7ABADE0C7E1E116BF435B434CC51', cc = ':1', dc = ':', ec = 'DOMContentLoaded', fc = 50;
var j = ub, k = vb, l = wb, m = xb, n = yb, o = zb, p = Ab, q = Bb, r = Cb, s = Db, t = Eb, u = Fb, v = Gb, w = Hb, A = Ib, B = Jb, C = Kb, D = Lb, F = Mb, G = Nb, H = Ob, I = Pb, J = Qb, K = Rb, L = Sb, M = Tb, N = Ub, O = Vb, P = Wb, Q = Xb, R = Yb, S = Zb, T = $b, U = _b, V = ac, W = bc, X = cc, Y = dc, Z = ec, $ = fc;
var _ = window, ab = document, bb, cb, db = j, eb = {}, fb = [], gb = [], hb = [], ib = k, jb, kb;
if (!_.__gwt_stylesLoaded) {
_.__gwt_stylesLoaded = {};
}
if (!_.__gwt_scriptsLoaded) {
_.__gwt_scriptsLoaded = {};
}
function lb() {
var b = false;
try {
var c = _.location.search;
return (c.indexOf(l) != -1 || (c.indexOf(m) != -1 || _.external && _.external.gwtOnLoad)) && c.indexOf(n) == -1;
} catch (a) {
}
lb = function () {
return b;
};
return b;
}
function mb() {
if (bb && cb) {
bb(jb, o, db, ib);
}
}
function nb() {
var b = document.getElementsByTagName(p);
for (var c = k, d = b.length; c < d; ++c) {
var e = b[c], f = e.getAttribute(q), g;
if (f) {
if (f == r) {
g = e.getAttribute(s);
if (g) {
var h, i = g.indexOf(t);
if (i >= k) {
f = g.substring(k, i);
h = g.substring(i + u);
} else {
f = g;
h = j;
}
eb[f] = h;
}
} else if (f == v) {
g = e.getAttribute(s);
if (g) {
try {
kb = eval(g);
} catch (a) {
alert(w + g + A);
}
}
} else if (f == B) {
g = e.getAttribute(s);
if (g) {
try {
jb = eval(g);
} catch (a) {
alert(w + g + C);
}
}
}
}
}
}
__gwt_isKnownPropertyValue = function (a, b) {
return b in fb[a];
};
__gwt_getMetaProperty = function (a) {
var b = eb[a];
return b == null ? null : b;
};
function ob(a, b) {
var c = hb;
for (var d = k, e = a.length - u; d < e; ++d) {
c = c[a[d]] || (c[a[d]] = []);
}
c[a[e]] = b;
}
function pb(a) {
var b = gb[a](), c = fb[a];
if (b in c) {
return b;
}
var d = [];
for (var e in c) {
d[c[e]] = e;
}
if (kb) {
kb(a, d, b);
}
throw null;
}
gb[D] = function () {
var a = navigator.userAgent.toLowerCase();
var b = ab.documentMode;
if (function () {
return a.indexOf(F) != -1;
}())
return G;
if (function () {
return a.indexOf(H) != -1 && (b >= I && b < J);
}())
return K;
if (function () {
return a.indexOf(H) != -1 && (b >= L && b < J);
}())
return M;
if (function () {
return a.indexOf(H) != -1 && (b >= N && b < J);
}())
return O;
if (function () {
return a.indexOf(P) != -1 || b >= J;
}())
return Q;
return j;
};
fb[D] = {
'gecko1_8': k,
'ie10': u,
'ie8': R,
'ie9': S,
'safari': T
};
VaadinGridImport.onScriptLoad = function (a) {
VaadinGridImport = null;
bb = a;
mb();
};
if (lb()) {
alert(U + V);
return;
}
nb();
try {
var qb;
ob([Q], W);
ob([G], W + X);
qb = hb[pb(D)];
var rb = qb.indexOf(Y);
if (rb != -1) {
ib = Number(qb.substring(rb + u));
}
} catch (a) {
return;
}
var sb;
function tb() {
if (!cb) {
cb = true;
mb();
if (ab.removeEventListener) {
ab.removeEventListener(Z, tb, false);
}
if (sb) {
clearInterval(sb);
}
}
}
if (ab.addEventListener) {
ab.addEventListener(Z, function () {
tb();
}, false);
}
var sb = setInterval(function () {
if (/loaded|complete/.test(ab.readyState)) {
tb();
}
}, $);
}
VaadinGridImport();
(function () {
var $gwt_version = '0.0.0';
var $wnd = window;
var $doc = $wnd.document;
var $moduleName, $moduleBase;
var $stats = $wnd.__gwtStatsEvent ? function (a) {
$wnd.__gwtStatsEvent(a);
} : null;
var $strongName = '0AAF7ABADE0C7E1E116BF435B434CC51';
var h = {
3: 1,
4: 1
}, aa = {
3: 1,
11: 1
}, ba = {
3: 1,
13: 1,
11: 1
}, ca = {
3: 1,
13: 1,
10: 1,
11: 1
}, da = {
3: 1,
13: 1,
28: 1,
10: 1,
11: 1
}, ea = { 3: 1 }, fa = {
6: 1,
87: 1,
98: 1
}, ga = { 105: 1 }, ha = {
46: 1,
12: 1,
3: 1,
6: 1,
5: 1
}, ia = {
14: 1,
12: 1,
3: 1,
6: 1,
5: 1
}, ja = {
12: 1,
56: 1,
3: 1,
6: 1,
5: 1
}, ka = {
12: 1,
57: 1,
3: 1,
6: 1,
5: 1
}, la = {
12: 1,
58: 1,
3: 1,
6: 1,
5: 1
}, ma = {
12: 1,
85: 1,
3: 1,
6: 1,
5: 1
}, na = {
32: 1,
3: 1,
6: 1,
5: 1
}, oa = {
12: 1,
86: 1,
3: 1,
6: 1,
5: 1
}, pa = {
82: 1,
3: 1,
13: 1,
10: 1,
11: 1
}, qa = { 16: 1 }, ra = { 25: 1 }, sa = { 67: 1 }, ta = {
89: 1,
80: 1
}, ua = { 185: 1 }, va = { 104: 1 }, wa = {
27: 1,
21: 1,
20: 1,
23: 1,
24: 1,
19: 1,
17: 1
}, xa = {
27: 1,
21: 1,
20: 1,
23: 1,
42: 1,
24: 1,
19: 1,
17: 1
}, ya = {
27: 1,
21: 1,
20: 1,
113: 1,
23: 1,
24: 1,
19: 1,
17: 1
}, Aa = {
90: 1,
15: 1
}, Ba = {
27: 1,
21: 1,
20: 1,
23: 1,
139: 1,
24: 1,
19: 1,
17: 1
}, Ca = {
27: 1,
21: 1,
20: 1,
112: 1,
23: 1,
42: 1,
24: 1,
19: 1,
17: 1
}, Da = {
15: 1,
91: 1
}, Ea = {
701: 1,
15: 1
}, Fa = {
27: 1,
21: 1,
20: 1,
23: 1,
42: 1,
24: 1,
159: 1,
19: 1,
17: 1
}, Ga = {
243: 1,
15: 1
}, Ha = {
133: 1,
134: 1
}, Ia = {
90: 1,
15: 1,
52: 1,
65: 1
}, Ja = {
15: 1,
184: 1
}, Ka = {
15: 1,
704: 1
}, La = {
27: 1,
21: 1,
20: 1,
113: 1,
23: 1,
42: 1,
139: 1,
24: 1,
19: 1,
17: 1,
652: 1
}, Ma = {
15: 1,
242: 1,
654: 1,
653: 1
}, Na = {
63: 1,
3: 1,
6: 1,
5: 1
}, Oa = {
243: 1,
27: 1,
15: 1,
21: 1,
20: 1,
112: 1,
23: 1,
42: 1,
24: 1,
19: 1,
17: 1
}, Pa = {
51: 1,
3: 1,
6: 1,
5: 1
}, Qa = {
75: 1,
3: 1,
6: 1,
5: 1
}, Ra = { 66: 1 }, Sa = { 55: 1 }, Ta = { 62: 1 }, Ua = {
73: 1,
54: 1
}, Va = {
3: 1,
62: 1,
246: 1
}, Wa = {
3: 1,
66: 1
}, Xa = {
3: 1,
55: 1
}, Ya = {
3: 1,
6: 1,
5: 1,
61: 1
}, _, Za, $a, ab = -1;
function bb() {
}
function db(a, b) {
var c = $wnd;
if ('' === a)
return c;
var d = a.split('.');
d[0] in c || !c.execScript || c.execScript('var ' + d[0]);
for (var e; d.length && (e = d.shift());)
c = c[e] = c[e] || !d.length && b || {};
return c;
}
function eb(a) {
function b() {
}
b.prototype = a || {};
return new b();
}
function fb(a, b) {
function c() {
return a.apply(c, arguments);
}
if (c.__proto__)
c.__proto__ = b;
else
for (var d in b)
c[d] = b[d];
return c;
}
function k() {
}
function q(a) {
var b = _, c;
for (c in a)
a[c].configurable = !0;
Object.defineProperties(b, a);
}
function r(a, b, c) {
var d = Za, e, f = d[a], g = f instanceof Array ? f[0] : null;
f && !g ? _ = f : (_ = (e = b && b.prototype, !e && (e = Za[b]), eb(e)), _.Wf = c, _.constructor = _, !b && (_.Xf = bb), d[a] = _);
for (d = 3; d < arguments.length; ++d)
arguments[d].prototype = _;
g && (_.Vf = g);
}
function gb() {
var a = Za[1], b = _, c;
for (c in a)
void 0 === b[c] && (b[c] = a[c]);
}
Za = {};
!Array.isArray && (Array.isArray = function (a) {
return '[object Array]' === Object.prototype.toString.call(a);
});
function hb(a) {
return ib(jb(a)) + '@' + (kb(a) >>> 0).toString(16);
}
function lb() {
}
function mb(a, b) {
return nb(a) ? a === b : ob(a) ? (t(a), a === b) : pb(a) ? (t(a), a === b) : qb(a) ? a.bb(b) : rb(a) ? a === b : sb(a) === sb(b);
}
function jb(a) {
return nb(a) ? tb : ob(a) ? ub : pb(a) ? vb : qb(a) ? a.Vf : rb(a) ? a.Vf : a.Vf || Array.isArray(a) && u(wb, 1) || wb;
}
function kb(a) {
return nb(a) ? xb(a) : ob(a) ? w((t(a), a)) : pb(a) ? yb((t(a), a)) ? 1231 : 1237 : qb(a) ? a.db() : (rb(a), zb(a));
}
function Ab(a) {
return nb(a) ? a : ob(a) ? Bb((t(a), a)) : pb(a) ? Bb(yb((t(a), a))) : qb(a) ? a.eb() : rb(a) ? hb(a) : Cb(a);
}
r(1, null, {}, lb);
_.bb = Db;
_.cb = function () {
return this.Vf;
};
_.db = Eb;
_.eb = function () {
return hb(this);
};
_.toString = function () {
return this.eb();
};
function Fb() {
Fb = k;
Gb = new lb();
}
function Hb(a) {
a.i = Ib(Jb, h, 709, 0, 0);
a.backingJsObject = Gb;
}
function Kb(a) {
a.k && (sb(a.backingJsObject) !== sb(Gb) && a.qb(), a.i = null);
}
function Lb(a, b, c) {
var d, e, f, g;
if (null == a.i) {
Mb();
d = Ib(Jb, h, 709, 0, 0);
for (e = Nb(d.length, 5) - 1; 0 <= e; e--)
if (null.Yf() || null.Yf()) {
d.length >= e + 1 && d.splice(0, e + 1);
break;
}
a.i = d;
}
e = a.i;
d = 0;
for (e = e.length; d < e; ++d);
e = (null == a.j && (a.j = Ib(Ob, h, 11, 0, 0)), a.j);
f = 0;
for (g = e.length; f < g; ++f)
d = e[f], Lb(d, b, '\t' + c);
(a = a.e) && Lb(a, b, c);
}
function Pb(a, b) {
var c;
c = ib(a.Vf);
return null == b ? c : c + ': ' + b;
}
r(11, 1, aa);
_.ob = function (a) {
return Error(a);
};
_.pb = Qb;
_.qb = function () {
var a, b;
b = null == this.f ? null : Rb(this.f).replace(new $wnd.RegExp('\n', 'g'), ' ');
b = (a = ib(this.Vf), null == b ? a : a + ': ' + b);
a = this.ob(b);
if (!('stack' in a))
try {
throw a;
} catch (c) {
}
this.backingJsObject = a;
null != a && Sb(a, this);
Mb();
};
_.eb = function () {
return Pb(this, this.pb());
};
_.g = !1;
_.k = !0;
var Gb;
r(13, 11, ba);
function Tb() {
Hb(this);
Kb(this);
this.qb();
}
function Ub(a) {
Fb();
Hb(this);
this.f = a;
Kb(this);
this.qb();
}
r(10, 13, ca, Ub);
r(481, 10, ca);
r(482, 481, ca);
function Vb() {
Vb = k;
Fb();
Wb = new lb();
}
function Xb(a) {
Vb();
Hb(this);
Kb(this);
this.backingJsObject = a;
null != a && Sb(a, this);
this.f = (y(), null == a ? 'null' : Ab(a));
this.a = '';
this.b = a;
this.a = '';
}
r(100, 482, {
100: 1,
3: 1,
13: 1,
10: 1,
11: 1
}, Xb);
_.pb = function () {
var a;
null == this.c && (a = sb(this.b) === sb(Wb) ? null : this.b, this.d = null == a ? 'null' : Yb(a) ? null == a ? null : a.name : nb(a) ? 'String' : ib(jb(a)), this.a = this.a + ': ' + (Yb(a) ? null == a ? null : a.message : a + ''), this.c = '(' + this.d + ') ' + this.a);
return this.c;
};
_.rb = function () {
return sb(this.b) === sb(Wb) ? null : this.b;
};
var Wb;
function Cb(a) {
return a.toString ? a.toString() : '[JavaScriptObject]';
}
function Mb() {
Mb = k;
0 < Error.stackTraceLimit && (Error.stackTraceLimit = 64);
}
r(681, 1, {});
r(483, 681, {}, function () {
});
function Zb(a) {
return u(a, 1);
}
function Ib(a, b, c, d, e) {
a: {
var f = Array(d), g;
switch (e) {
case 14:
case 15:
g = 0;
break;
case 16:
g = !1;
break;
default:
d = f;
break a;
}
for (var l = 0; l < d; ++l)
f[l] = g;
d = f;
}
10 != e && z(u(a, 1), b, c, e, d);
return d;
}
function rb(a) {
return Array.isArray(a) && a.Xf === bb;
}
function z(a, b, c, d, e) {
e.Vf = a;
e.Wf = b;
e.Xf = bb;
e.__elementTypeId$ = c;
e.__elementTypeCategory$ = d;
return e;
}
function $b(a, b) {
10 != (null == b.__elementTypeCategory$ ? 10 : b.__elementTypeCategory$) && z(jb(b), b.Wf, b.__elementTypeId$, null == b.__elementTypeCategory$ ? 10 : b.__elementTypeCategory$, a);
return a;
}
function ac(a) {
null == a || Array.isArray(a);
return a;
}
function qb(a) {
return !Array.isArray(a) && a.Xf === bb;
}
function A(a, b) {
return null != a && (nb(a) ? !!bc[b] : a.Wf ? !!a.Wf[b] : ob(a) ? !!cc[b] : pb(a) ? !!dc[b] : !1);
}
function pb(a) {
return 'boolean' === typeof a;
}
function ob(a) {
return 'number' === typeof a;
}
function Yb(a) {
return null != a && ('object' === typeof a || 'function' === typeof a) && a.Xf !== bb;
}
function nb(a) {
return 'string' === typeof a;
}
function sb(a) {
return null == a ? null : a;
}
function w(a) {
return Math.max(Math.min(a, 2147483647), -2147483648) | 0;
}
var dc, cc, bc;
function ec(a) {
var b;
if (A(a, 11))
return a;
b = a && a.__java$exception;
b || (b = new Xb(a), Mb());
return b;
}
r(194, 13, ba);
function fc(a) {
Fb();
Hb(this);
this.f = a;
Kb(this);
this.qb();
}
r(350, 194, ba, fc);
function B() {
B = k;
gc = !1;
hc = !0;
}
function Bb(a) {
return y(), '' + a;
}
function yb(a) {
B();
return a;
}
dc = {
3: 1,
380: 1,
6: 1
};
var gc, hc;
function ic(a) {
return jc(Rb((y(), $wnd.String.fromCharCode(a))).toLocaleUpperCase(), 0) == a && kc($wnd.String.fromCharCode(a), /[A-Z]/i);
}
function lc(a, b, c) {
if (!(0 <= a && 1114111 >= a))
throw new mc().backingJsObject;
if (65536 <= a)
return b[c++] = 55296 + (a - 65536 >> 10 & 1023) & 65535, b[c] = 56320 + (a - 65536 & 1023) & 65535, 2;
b[c] = a & 65535;
return 1;
}
function nc(a) {
if (null == a.k)
if (a.kf()) {
var b = a.c;
b.lf() ? a.k = '[' + b.j : b.kf() ? a.k = '[' + b.hf() : a.k = '[L' + b.hf() + ';';
a.b = b.gf() + '[]';
a.i = b.jf() + '[]';
} else {
var b = a.f, c = a.d, c = c.split('/');
a.k = oc('.', [
b,
oc('$', c)
]);
a.b = oc('.', [
b,
oc('.', c)
]);
a.i = c[c.length - 1];
}
}
function pc(a) {
nc(a);
return a.b;
}
function ib(a) {
nc(a);
return a.k;
}
function qc(a) {
nc(a);
return a.i;
}
function rc() {
this.g = sc++;
this.a = this.j = this.b = this.d = this.f = this.i = this.k = null;
}
function tc(a) {
var b;
b = new rc();
b.k = 'Class$' + (a ? 'S' + a : '' + b.g);
b.b = b.k;
b.i = b.k;
return b;
}
function C(a) {
var b;
b = tc(a);
uc(a, b);
return b;
}
function E(a, b) {
var c;
c = tc(a);
uc(a, c);
c.e = b ? 8 : 0;
return c;
}
function vc() {
var a;
a = tc(null);
a.e = 2;
return a;
}
function wc(a) {
var b;
b = tc(a);
b.j = a;
b.e = 1;
return b;
}
function u(a, b) {
var c = a.a = a.a || [];
return c[b] || (c[b] = a.ff(b));
}
function oc(a, b) {
for (var c = 0; !b[c] || '' == b[c];)
c++;
for (var d = b[c++]; c < b.length; c++)
b[c] && '' != b[c] && (d += a + b[c]);
return d;
}
function uc(a, b) {
if (a) {
b.j = a;
var c = b.lf() ? null : Za[b.j];
c ? c.Vf = b : Za[a] = [b];
}
}
r(195, 1, {}, rc);
_.ff = function (a) {
var b;
b = new rc();
b.e = 4;
1 < a ? b.c = u(this, a - 1) : b.c = this;
return b;
};
_.gf = function () {
return pc(this);
};
_.hf = function () {
return ib(this);
};
_.jf = function () {
return qc(this);
};
_.kf = function () {
return 0 != (this.e & 4);
};
_.lf = function () {
return 0 != (this.e & 1);
};
_.eb = function () {
return (0 != (this.e & 2) ? 'interface ' : 0 != (this.e & 1) ? '' : 'class ') + (nc(this), this.k);
};
_.e = 0;
_.g = 0;
var sc = 1;
function xc(a) {
null == yc && (yc = /^\s*[+-]?(NaN|Infinity|((\d+\.?\d*)|(\.\d+))([eE][+-]?\d+)?[dDfF]?)\s*$/);
if (!yc.test(a))
throw (Fb(), new zc('For input string: "' + a + '"')).backingJsObject;
return parseFloat(a);
}
function Ac(a) {
var b, c;
if (null == a)
throw (Fb(), new zc('null')).backingJsObject;
c = (y(), a).length;
for (b = 0 < c && (45 == a.charCodeAt(0) || 43 == a.charCodeAt(0)) ? 1 : 0; b < c; b++) {
var d = a.charCodeAt(b);
if (-1 == (48 <= d && 58 > d ? d - 48 : 97 <= d && 97 > d ? d - 97 + 10 : 65 <= d && 65 > d ? d - 65 + 10 : -1))
throw (Fb(), new zc('For input string: "' + a + '"')).backingJsObject;
}
c = parseInt(a, 10);
b = -2147483648 > c;
if (isNaN(c))
throw (Fb(), new zc('For input string: "' + a + '"')).backingJsObject;
if (b || 2147483647 < c)
throw (Fb(), new zc('For input string: "' + a + '"')).backingJsObject;
return c;
}
function Bc(a) {
return ob(a) ? (t(a), a) : a.mf();
}
r(83, 1, {
3: 1,
83: 1
});
var yc;
cc = {
3: 1,
6: 1,
348: 1,
83: 1
};
function mc() {
Fb();
Tb.call(this);
}
function F(a) {
Fb();
Ub.call(this, a);
}
r(8, 10, ca, mc, F);
function Cc() {
Fb();
Tb.call(this);
}
function Dc(a) {
Fb();
Ub.call(this, a);
}
r(28, 10, da, Cc, Dc);
function Ec(a) {
this.a = a;
}
function G(a) {
var b, c;
return -129 < a && 128 > a ? (b = a + 128, c = (Fc(), Gc)[b], !c && (c = Gc[b] = new Ec(a)), c) : new Ec(a);
}
r(97, 83, {
3: 1,
6: 1,
97: 1,
83: 1
}, Ec);
_.Ob = function (a) {
var b = this.a;
a = a.a;
return b < a ? -1 : b > a ? 1 : 0;
};
_.mf = Hc;
_.bb = function (a) {
return A(a, 97) && a.a == this.a;
};
_.db = Hc;
_.eb = function () {
return Bb(this.a);
};
_.a = 0;
function Ic() {
Fb();
Tb.call(this);
}
function Jc(a) {
Fb();
Ub.call(this, a);
}
r(70, 10, ca, Ic, Jc);
_.ob = function (a) {
return new TypeError(a);
};
function zc(a) {
Fb();
F.call(this, a);
}
r(69, 8, {
3: 1,
13: 1,
69: 1,
10: 1,
11: 1
}, zc);
function y() {
y = k;
}
function jc(a, b) {
return (y(), a).charCodeAt(b);
}
function Kc(a, b, c, d) {
y();
a = d.Uf(a, b, c);
return Lc(a, 0, a.length);
}
function Mc(a, b) {
return a === b;
}
function Nc(a, b) {
return (y(), a).indexOf(b);
}
function kc(a, b) {
return b.test(a);
}
function Oc(a, b, c) {
c = Pc(c);
return (y(), a).replace(new $wnd.RegExp(b, 'g'), c);
}
function Qc(a, b, c) {
c = Pc(c);
b = new $wnd.RegExp(b);
return (y(), a).replace(b, c);
}
function Rc(a, b) {
var c, d, e, f, g, l;
c = new $wnd.RegExp(b, 'g');
g = Ib(tb, h, 2, 0, 6);
d = 0;
l = a;
for (e = null;;)
if (f = c.exec(l), null == f || '' == l) {
g[d] = l;
break;
} else
g[d] = Sc(l, 0, f.index), l = Sc(l, f.index + f[0].length, (y(), l).length), c.lastIndex = 0, e == l && (g[d] = l.substr(0, 1), l = l.substr(1, l.length - 1)), e = l, ++d;
if (0 < (y(), a).length) {
for (c = g.length; 0 < c && '' == g[c - 1];)
--c;
c < g.length && (g.length = c);
}
return g;
}
function Tc(a, b) {
return (y(), a).substr(b, a.length - b);
}
function Sc(a, b, c) {
return (y(), a).substr(b, c - b);
}
function Uc(a) {
var b, c, d;
c = (y(), a).length;
for (d = 0; d < c && 32 >= a.charCodeAt(d);)
++d;
for (b = c; b > d && 32 >= a.charCodeAt(b - 1);)
--b;
return 0 < d || b < c ? a.substr(d, b - d) : a;
}
function Vc(a, b) {
y();
return a == b ? 0 : a < b ? -1 : 1;
}
function Wc(a, b) {
y();
return null == b ? !1 : a == b ? !0 : a.length == b.length && a.toLowerCase() == b.toLowerCase();
}
function Xc(a) {
y();
var b;
return 65536 <= a ? (b = 56320 + (a - 65536 & 1023) & 65535, $wnd.String.fromCharCode(55296 + (a - 65536 >> 10 & 1023) & 65535) + ('' + $wnd.String.fromCharCode(b))) : $wnd.String.fromCharCode(a & 65535);
}
function Yc(a) {
try {
return Zc(a);
} catch (b) {
b = ec(b);
if (A(b, 151))
throw new fc(a).backingJsObject;
throw b.backingJsObject;
}
}
function Rb(a) {
y();
return a;
}
function Pc(a) {
var b;
for (b = 0; 0 <= (b = (y(), a).indexOf('\\', b));)
36 == a.charCodeAt(b + 1) ? a = a.substr(0, b) + '$' + Tc(a, ++b) : a = a.substr(0, b) + ('' + Tc(a, ++b));
return a;
}
function Lc(a, b, c) {
var d, e;
c = b + c;
e = a.length;
if (0 > b)
throw new $c('fromIndex: ' + b + ' < 0').backingJsObject;
if (c > e)
throw new $c('toIndex: ' + c + ' > size ' + e).backingJsObject;
if (c < b)
throw new $c('fromIndex: ' + b + ' > toIndex: ' + c).backingJsObject;
e = '';
for (d = b; d < c;)
b = d + 10000 < c ? d + 10000 : c, e += $wnd.String.fromCharCode.apply(null, a.slice(d, b)), d = b;
return e;
}
bc = {
3: 1,
655: 1,
6: 1,
2: 1
};
r(349, 1, {}, function () {
});
_.bf = function (a, b) {
return Vc((y(), a).toLowerCase(), b.toLowerCase());
};
_.bb = Db;
function $c(a) {
Fb();
Dc.call(this, a);
}
r(158, 28, da, $c);
function Zc(a) {
ad(null != a, 'Null charset name');
a = (y(), a).toLocaleUpperCase();
if (Mc((bd(), cd).a, a))
return cd;
if (dd.a === a)
return dd;
if (ed.a === a)
return ed;
if (/^[A-Za-z0-9][\w-:\.\+]*$/.test(a))
throw new fd(a).backingJsObject;
throw new gd(a).backingJsObject;
}
r(87, 1, {
6: 1,
87: 1
});
_.Ob = function (a) {
var b = this.a;
a = a.a;
return Vc((y(), b).toLowerCase(), a.toLowerCase());
};
_.bb = function (a) {
return a === this ? !0 : A(a, 87) ? this.a === a.a : !1;
};
_.db = hd;
_.eb = Hc;
function gd(a) {
Fb();
F.call(this, (y(), null == a ? 'null' : a));
}
r(490, 8, ca, gd);
function fd(a) {
Fb();
F.call(this, (y(), null == a ? 'null' : a));
}
r(151, 8, {
3: 1,
13: 1,
10: 1,
11: 1,
151: 1
}, fd);
function id(a, b, c, d, e) {
var f = 0, g, l;
sb(a) === sb(b) && (a = a.slice(f, f + d), f = 0);
g = f;
for (l = f + d; g < l;)
f = g + 10000 < l ? g + 10000 : l, d = f - g, g = a.slice(g, f), Array.prototype.splice.apply(b, [
c,
e ? d : 0
].concat(g)), g = f, c += d;
}
function bd() {
bd = k;
ed = new jd();
dd = new kd('ISO-LATIN-1');
cd = new kd('ISO-8859-1');
}
r(98, 87, fa);
var cd, dd, ed;
function kd(a) {
this.a = a;
}
r(207, 98, fa, kd);
_.Uf = function (a, b, c) {
var d, e;
d = Ib(ld, ea, 183, c, 15);
for (e = 0; e < c; ++e)
d[e] = a[b + e] & 255;
return d;
};
function jd() {
this.a = 'UTF-8';
}
r(431, 98, fa, jd);
_.Uf = function (a, b, c) {
var d, e, f, g, l, m;
for (f = d = 0; f < c;) {
++d;
e = a[b + f];
if (128 == (e & 192))
throw new F('Invalid UTF8 sequence').backingJsObject;
if (0 == (e & 128))
++f;
else if (192 == (e & 224))
f += 2;
else if (224 == (e & 240))
f += 3;
else if (240 == (e & 248))
f += 4;
else
throw new F('Invalid UTF8 sequence').backingJsObject;
if (f > c)
throw new Dc('Invalid UTF8 sequence').backingJsObject;
}
f = Ib(ld, ea, 183, d, 15);
for (l = g = m = 0; l < c;) {
e = a[b + l++];
0 == (e & 128) ? (g = 1, e &= 127) : 192 == (e & 224) ? (g = 2, e &= 31) : 224 == (e & 240) ? (g = 3, e &= 15) : 240 == (e & 248) ? (g = 4, e &= 7) : 248 == (e & 252) && (g = 5, e &= 3);
for (; 0 < --g;) {
d = a[b + l++];
if (128 != (d & 192))
throw new F('Invalid UTF8 sequence at ' + (b + l - 1) + ', byte=' + (d >>> 0).toString(16)).backingJsObject;
e = e << 6 | d & 63;
}
m += lc(e, f, m);
}
return f;
};
function zb(a) {
return a.$H || (a.$H = ++md);
}
var md = 0;
function ad(a, b) {
if (!a)
throw new F((y(), b)).backingJsObject;
}
function nd(a) {
if (!a)
throw new od().backingJsObject;
}
function pd(a, b) {
if (0 > a || a >= b)
throw new Dc('Index: ' + a + ', Size: ' + b).backingJsObject;
}
function t(a) {
if (null == a)
throw new Ic().backingJsObject;
}
function qd(a, b) {
if (null == a)
throw new Jc((y(), b)).backingJsObject;
}
function rd(a, b) {
if (0 > a || a > b)
throw new Dc('Index: ' + a + ', Size: ' + b).backingJsObject;
}
function sd(a, b, c) {
if (0 > a)
throw new Dc('fromIndex: ' + a + ' < 0').backingJsObject;
if (b > c)
throw new Dc('toIndex: ' + b + ' > size ' + c).backingJsObject;
if (a > b)
throw new F('fromIndex: ' + a + ' > toIndex: ' + b).backingJsObject;
}
function td(a) {
if (!a)
throw new ud().backingJsObject;
}
function H(a) {
t(a);
return a;
}
function vd(a, b) {
var c, d, e, f;
a = (y(), null == a ? 'null' : a);
c = new wd();
for (d = f = 0; d < b.length;) {
e = a.indexOf('%s', f);
if (-1 == e)
break;
xd(c, a.substr(f, e - f));
xd(c, b[d++]);
f = e + 2;
}
xd(c, a.substr(f, a.length - f));
if (d < b.length) {
c.a += ' [';
for (xd(c, b[d++]); d < b.length;)
c.a += ', ', xd(c, b[d++]);
c.a += ']';
}
return c.a;
}
function Sb(a, b) {
try {
a.__java$exception = b;
} catch (c) {
}
}
function yd() {
yd = k;
zd = {};
Ad = {};
}
function xb(a) {
yd();
var b, c;
b = ':' + a;
c = Ad[b];
if (void 0 !== c)
return c;
c = zd[b];
if (void 0 === c) {
var d, e, f;
c = 0;
e = (y(), a).length;
f = e - 4;
for (d = 0; d < f;)
c = a.charCodeAt(d + 3) + 31 * (a.charCodeAt(d + 2) + 31 * (a.charCodeAt(d + 1) + 31 * (a.charCodeAt(d) + 31 * c))), c |= 0, d += 4;
for (; d < e;)
c = 31 * c + jc(a, d++);
a = c | 0;
} else
a = c;
256 == Bd && (zd = Ad, Ad = {}, Bd = 0);
++Bd;
return Ad[b] = a;
}
var zd, Bd = 0, Ad, I = C(1), Ob = C(11);
C(13);
C(10);
C(481);
C(482);
C(100);
var wb = C(0);
C(681);
C(483);
C(194);
C(350);
var vb = C(380);
C(195);
C(83);
var ub = C(348);
C(8);
C(28);
var Cd = C(97);
C(70);
C(69);
var tb = C(2);
C(349);
C(158);
C(87);
C(490);
C(151);
C(98);
C(207);
C(431);
function Dd(a) {
a.o && (a.u = a.p, a.n = null, a.o = !1, a.p = !1, a.q && (a.q.lb(), a.q = null), a.u && a.gb());
}
function Ed(a, b) {
var c = Fd();
Dd(a);
a.o = !0;
a.p = !1;
a.k = b;
a.t = c;
a.n = null;
++a.r;
Gd(a.j, Fd());
}
function Hd(a, b) {
var c, d;
c = a.r;
d = b >= a.t + a.k;
return a.p && !d ? (d = (b - a.t) / a.k, a.ib(a.fb(d)), a.o && a.r == c) : !a.p && b >= a.t && (a.p = !0, a.hb(), !a.o || a.r != c) ? !1 : d ? (a.o = !1, a.p = !1, a.gb(), !1) : !0;
}
function Id() {
var a = (!Jd && (Jd = Kd() ? new Ld() : new Md()), Jd);
this.j = new Nd(this);
this.s = a;
}
r(115, 1, {});
_.fb = function (a) {
return (1 + $wnd.Math.cos(3.141592653589793 + 3.141592653589793 * a)) / 2;
};
_.gb = function () {
this.ib(this.fb(1));
};
_.hb = function () {
this.ib(this.fb(0));
};
_.k = -1;
_.o = !1;
_.p = !1;
_.r = -1;
_.t = -1;
_.u = !1;
C(115);
function Gd(a, b) {
Hd(a.a, b) ? a.a.q = a.a.s.kb(a.a.j, a.a.n) : a.a.q = null;
}
function Nd(a) {
this.a = a;
}
r(329, 1, {}, Nd);
_.jb = function (a) {
Gd(this, a);
};
C(329);
r(698, 1, {});
var Jd;
C(698);
r(179, 1, { 179: 1 });
C(179);
function Kd() {
return !!$wnd.requestAnimationFrame && !!$wnd.cancelAnimationFrame;
}
function Ld() {
}
function Od(a, b) {
var c = Pd(function () {
var b = Fd();
a.jb(b);
});
return { id: $wnd.requestAnimationFrame(c, b) };
}
r(110, 698, {}, Ld);
_.kb = function (a, b) {
var c;
c = Od(a, b);
return new Qd(c);
};
C(110);
function Qd(a) {
this.a = a;
}
r(646, 179, { 179: 1 }, Qd);
_.lb = function () {
$wnd.cancelAnimationFrame(this.a.id);
};
C(646);
function Md() {
this.a = new Rd();
this.b = new Sd(this);
}
r(111, 698, {}, Md);
_.kb = function (a) {
a = new Td(this, a);
Ud(this.a, a);
1 == this.a.a.length && Vd(this.b, 16);
return a;
};
C(111);
function Wd(a) {
a.f && (++a.d, a.e ? $wnd.clearInterval(a.f.a) : $wnd.clearTimeout(a.f.a), a.f = null);
}
function Vd(a, b) {
if (0 > b)
throw new F('must be non-negative').backingJsObject;
a.f && Wd(a);
a.e = !1;
var c;
c = Xd(a, a.d);
c = $wnd.setTimeout(c, b);
a.f = G(c);
}
function Xd(a, b) {
return Pd(function () {
a.mb(b);
});
}
r(50, 1, {});
_.mb = function (a) {
a == this.d && (this.e || (this.f = null), this.nb());
};
_.d = 0;
_.e = !1;
_.f = null;
C(50);
function Sd(a) {
this.a = a;
}
r(647, 50, {}, Sd);
_.nb = function () {
var a = this.a, b, c, d, e, f;
b = Ib(Yd, {
730: 1,
3: 1,
4: 1
}, 180, a.a.a.length, 0);
b = Zd(a.a, b);
c = new $d();
e = 0;
for (f = b.length; e < f; ++e)
d = b[e], ae(a.a, d), d.a.jb(c.a);
0 < a.a.a.length && Vd(a.b, be(5, 16 - (Fd() - c.a)));
};
C(647);
function Td(a, b) {
this.b = a;
this.a = b;
}
r(180, 179, {
179: 1,
180: 1
}, Td);
_.lb = function () {
var a = this.b;
ae(a.a, this);
0 == a.a.a.length && Wd(a.b);
};
var Yd = C(180);
r(7, 1, {});
C(7);
function ce() {
this.a = 'alert';
}
r(566, 7, {}, ce);
C(566);
function de() {
this.a = 'alertdialog';
}
r(565, 7, {}, de);
C(565);
function ee() {
this.a = 'application';
}
r(567, 7, {}, ee);
C(567);
r(238, 1, {});
C(238);
function fe(a) {
this.a = a;
}
r(48, 238, {}, fe);
C(48);
function ge() {
this.a = 'article';
}
r(568, 7, {}, ge);
C(568);
function he() {
this.a = 'banner';
}
r(569, 7, {}, he);
C(569);
function ie() {
this.a = 'button';
}
r(570, 7, {}, ie);
C(570);
function je() {
this.a = 'checkbox';
}
r(571, 7, {}, je);
C(571);
function ke() {
this.a = 'columnheader';
}
r(572, 7, {}, ke);
C(572);
function le() {
this.a = 'combobox';
}
r(573, 7, {}, le);
C(573);
function me() {
this.a = 'complementary';
}
r(574, 7, {}, me);
C(574);
function ne() {
this.a = 'contentinfo';
}
r(575, 7, {}, ne);
C(575);
function oe() {
this.a = 'definition';
}
r(576, 7, {}, oe);
C(576);
function pe() {
this.a = 'dialog';
}
r(577, 7, {}, pe);
C(577);
function qe() {
this.a = 'directory';
}
r(578, 7, {}, qe);
C(578);
function re() {
this.a = 'document';
}
r(579, 7, {}, re);
C(579);
function se() {
this.a = 'form';
}
r(580, 7, {}, se);
C(580);
function te() {
this.a = 'grid';
}
r(582, 7, {}, te);
C(582);
function ue() {
this.a = 'gridcell';
}
r(581, 7, {}, ue);
C(581);
function ve() {
this.a = 'group';
}
r(583, 7, {}, ve);
C(583);
function we() {
this.a = 'heading';
}
r(584, 7, {}, we);
C(584);
function xe(a) {
this.a = a.id;
}
r(174, 1, {
726: 1,
174: 1
}, xe);
var ye = C(174);
function ze() {
this.a = 'img';
}
r(585, 7, {}, ze);
C(585);
function Ae() {
this.a = 'link';
}
r(586, 7, {}, Ae);
C(586);
function Be() {
this.a = 'list';
}
r(589, 7, {}, Be);
C(589);
function Ce() {
this.a = 'listbox';
}
r(587, 7, {}, Ce);
C(587);
function De() {
this.a = 'listitem';
}
r(588, 7, {}, De);
C(588);
function Ee() {
this.a = 'log';
}
r(590, 7, {}, Ee);
C(590);
function Fe() {
this.a = 'main';
}
r(591, 7, {}, Fe);
C(591);
function Ge() {
this.a = 'marquee';
}
r(592, 7, {}, Ge);
C(592);
function He() {
this.a = 'math';
}
r(593, 7, {}, He);
C(593);
function Ie() {
this.a = 'menu';
}
r(598, 7, {}, Ie);
C(598);
function Je() {
this.a = 'menubar';
}
r(594, 7, {}, Je);
C(594);
function Ke() {
this.a = 'menuitem';
}
r(597, 7, {}, Ke);
C(597);
function Le() {
this.a = 'menuitemcheckbox';
}
r(595, 7, {}, Le);
C(595);
function Me() {
this.a = 'menuitemradio';
}
r(596, 7, {}, Me);
C(596);
function Ne() {
this.a = 'navigation';
}
r(599, 7, {}, Ne);
C(599);
function Oe() {
this.a = 'note';
}
r(600, 7, {}, Oe);
C(600);
function Pe() {
this.a = 'option';
}
r(601, 7, {}, Pe);
C(601);
function Qe() {
this.a = 'presentation';
}
r(602, 7, {}, Qe);
C(602);
r(44, 238, {}, function (a) {
this.a = a;
});
C(44);
function Re() {
this.a = 'progressbar';
}
r(603, 7, {}, Re);
C(603);
function Se() {
Se = k;
Te = new fe('aria-activedescendant');
}
var Te;
function Ue() {
this.a = 'radio';
}
r(605, 7, {}, Ue);
C(605);
function Ve() {
this.a = 'radiogroup';
}
r(604, 7, {}, Ve);
C(604);
function We() {
this.a = 'region';
}
r(606, 7, {}, We);
C(606);
function Xe() {
Xe = k;
Ye = new de();
Ze = new ce();
$e = new ee();
af = new ge();
bf = new he();
cf = new ie();
df = new je();
ef = new ke();
ff = new le();
gf = new me();
hf = new ne();
jf = new oe();
kf = new pe();
lf = new qe();
mf = new re();
nf = new se();
of = new ue();
pf = new te();
qf = new ve();
rf = new we();
sf = new ze();
tf = new Ae();
uf = new Ce();
vf = new De();
wf = new Be();
xf = new Ee();
yf = new Fe();
zf = new Ge();
Af = new He();
Bf = new Je();
Cf = new Le();
Df = new Me();
Ef = new Ke();
Ff = new Ie();
Gf = new Ne();
Hf = new Oe();
If = new Pe();
Jf = new Qe();
Kf = new Re();
Lf = new Ve();
Mf = new Ue();
Nf = new We();
Of = new Pf();
Qf = new Rf();
Sf = new Tf();
Uf = new Vf();
Wf = new Xf();
Yf = new Zf();
$f = new ag();
bg = new cg();
dg = new eg();
fg = new gg();
hg = new ig();
jg = new kg();
lg = new mg();
ng = new og();
pg = new qg();
rg = new sg();
tg = new ug();
vg = new wg();
xg = new yg();
J = new zg();
K(J, 'region', Nf);
K(J, 'alert', Ze);
K(J, 'dialog', kf);
K(J, 'alertdialog', Ye);
K(J, 'application', $e);
K(J, 'document', mf);
K(J, 'article', af);
K(J, 'banner', bf);
K(J, 'button', cf);
K(J, 'checkbox', df);
K(J, 'gridcell', of);
K(J, 'columnheader', ef);
K(J, 'group', qf);
K(J, 'combobox', ff);
K(J, 'complementary', gf);
K(J, 'contentinfo', hf);
K(J, 'definition', jf);
K(J, 'list', wf);
K(J, 'directory', lf);
K(J, 'form', nf);
K(J, 'grid', pf);
K(J, 'heading', rf);
K(J, 'img', sf);
K(J, 'link', tf);
K(J, 'listbox', uf);
K(J, 'listitem', vf);
K(J, 'log', xf);
K(J, 'main', yf);
K(J, 'marquee', zf);
K(J, 'math', Af);
K(J, 'menu', Ff);
K(J, 'menubar', Bf);
K(J, 'menuitem', Ef);
K(J, 'menuitemcheckbox', Cf);
K(J, 'option', If);
K(J, 'radio', Mf);
K(J, 'menuitemradio', Df);
K(J, 'navigation', Gf);
K(J, 'note', Hf);
K(J, 'presentation', Jf);
K(J, 'progressbar', Kf);
K(J, 'radiogroup', Lf);
K(J, 'row', Sf);
K(J, 'rowgroup', Of);
K(J, 'rowheader', Qf);
K(J, 'search', Wf);
K(J, 'separator', Yf);
K(J, 'scrollbar', Uf);
K(J, 'slider', $f);
K(J, 'spinbutton', bg);
K(J, 'status', dg);
K(J, 'tab', jg);
K(J, 'tablist', fg);
K(J, 'tabpanel', hg);
K(J, 'textbox', lg);
K(J, 'timer', ng);
K(J, 'toolbar', pg);
K(J, 'tooltip', rg);
K(J, 'tree', xg);
K(J, 'treegrid', tg);
K(J, 'treeitem', vg);
}
var Ze, Ye, $e, af, bf, cf, df, ef, ff, gf, hf, jf, kf, lf, mf, nf, pf, of, qf, rf, sf, tf, wf, uf, vf, xf, yf, zf, Af, Ff, Bf, Ef, Cf, Df, Gf, Hf, If, Jf, Kf, Mf, Lf, Nf, J, Sf, Of, Qf, Uf, Wf, Yf, $f, bg, dg, jg, fg, hg, lg, ng, pg, rg, xg, tg, vg;
function Tf() {
this.a = 'row';
}
r(609, 7, {}, Tf);
C(609);
function Pf() {
this.a = 'rowgroup';
}
r(607, 7, {}, Pf);
C(607);
function Rf() {
this.a = 'rowheader';
}
r(608, 7, {}, Rf);
C(608);
function Vf() {
this.a = 'scrollbar';
}
r(610, 7, {}, Vf);
C(610);
function Xf() {
this.a = 'search';
}
r(611, 7, {}, Xf);
C(611);
function Zf() {
this.a = 'separator';
}
r(612, 7, {}, Zf);
C(612);
function ag() {
this.a = 'slider';
}
r(613, 7, {}, ag);
C(613);
function cg() {
this.a = 'spinbutton';
}
r(614, 7, {}, cg);
C(614);
function eg() {
this.a = 'status';
}
r(615, 7, {}, eg);
C(615);
function kg() {
this.a = 'tab';
}
r(618, 7, {}, kg);
C(618);
function gg() {
this.a = 'tablist';
}
r(616, 7, {}, gg);
C(616);
function ig() {
this.a = 'tabpanel';
}
r(617, 7, {}, ig);
C(617);
function mg() {
this.a = 'textbox';
}
r(619, 7, {}, mg);
C(619);
function og() {
this.a = 'timer';
}
r(620, 7, {}, og);
C(620);
function qg() {
this.a = 'toolbar';
}
r(621, 7, {}, qg);
C(621);
function sg() {
this.a = 'tooltip';
}
r(622, 7, {}, sg);
C(622);
function yg() {
this.a = 'tree';
}
r(625, 7, {}, yg);
C(625);
function ug() {
this.a = 'treegrid';
}
r(623, 7, {}, ug);
C(623);
function wg() {
this.a = 'treeitem';
}
r(624, 7, {}, wg);
C(624);
function $d() {
this.a = Fd();
}
r(228, 1, {}, $d);
_.a = 0;
C(228);
function Fd() {
return Date.now ? Date.now() : new Date().getTime();
}
r(657, 1, {});
C(657);
function Ag() {
Ag = k;
Bg = $wnd;
}
var Bg;
function Cg() {
Cg = k;
Mb();
}
function Dg(a) {
Cg();
$wnd.setTimeout(function () {
throw a;
}, 0);
}
function Eg() {
0 != Fg && (Fg = 0);
Gg = -1;
}
var Fg = 0, Hg = 0, Gg = -1;
function Ig() {
Ig = k;
Jg = new Kg();
}
function Lg(a, b) {
a.a = Mg(a.a, [
b,
!1
]);
a.i || (a.i = !0, !a.e && (a.e = new Ng(a)), Og(a.e, 1), !a.g && (a.g = new Pg(a)), Og(a.g, 50));
}
function Qg(a, b) {
a.c = Mg(a.c, [
b,
!1
]);
}
function Kg() {
}
function Rg(a) {
return a.sb();
}
function Mg(a, b) {
!a && (a = []);
a[a.length] = b;
return a;
}
function Sg(a, b) {
var c, d, e;
d = 0;
for (e = a.length; d < e; d++) {
c = a[d];
try {
c[1] ? c[0].sb() && (b = Mg(b, c)) : c[0].tb();
} catch (f) {
if (f = ec(f), A(f, 11))
c = f, Cg(), Dg(A(c, 100) ? c.rb() : c);
else
throw f.backingJsObject;
}
}
return b;
}
function Og(a, b) {
function c() {
Pd(Rg)(a) && $wnd.setTimeout(c, b);
}
Ig();
$wnd.setTimeout(c, b);
}
function Tg(a) {
Ig();
var b = $wnd.setInterval(function () {
!Pd(Rg)(a) && $wnd.clearInterval(b);
}, 30);
}
r(495, 657, {}, Kg);
_.d = !1;
_.i = !1;
var Jg;
C(495);
function Ng(a) {
this.a = a;
}
r(496, 1, {}, Ng);
_.sb = function () {
this.a.d = !0;
var a = this.a, b;
a.a && (b = a.a, a.a = null, !a.f && (a.f = []), Sg(b, a.f));
if (a.f) {
b = a.f;
var c, d, e, f, g, l;
g = b.length;
if (0 == g)
b = null;
else {
c = !1;
for (d = new $d(); 16 > Fd() - d.a;) {
e = !1;
for (f = 0; f < g; f++)
if (l = b[f])
e = !0, l[0].sb() || (b[f] = null, c = !0);
if (!e)
break;
}
if (c) {
c = [];
for (f = 0; f < g; f++)
b[f] && (c[c.length] = b[f]);
b = 0 == c.length ? null : c;
}
}
a.f = b;
}
this.a.d = !1;
a = this.a;
return this.a.i = !!a.a || !!a.f;
};
C(496);
function Pg(a) {
this.a = a;
}
r(497, 1, {}, Pg);
_.sb = function () {
this.a.d && Og(this.a.e, 1);
return this.a.i;
};
C(497);
function Ug(a) {
return Vg((M(), a));
}
function Wg(a, b) {
return (M(), N).Kb(a, b);
}
function Xg(a) {
for (; a.lastChild;)
a.removeChild(a.lastChild);
}
function Yg(a) {
var b;
(b = Vg((M(), a))) && b.removeChild(a);
}
function Zg(a, b) {
var c;
b = $g(b);
c = a.className || '';
-1 == ah(c, b) && (0 < (y(), c).length ? a.className = c + ' ' + b || '' : a.className = b || '');
}
function bh(a) {
return (M(), N).Db(a) + ((a.offsetHeight || 0) | 0);
}
function ch(a) {
return (M(), N).Cb(a);
}
function dh(a) {
return (M(), N).Db(a);
}
function eh(a) {
return fh((M(), a));
}
function gh(a, b) {
return parseInt(a[b]) | 0;
}
function hh(a, b) {
return null == a[b] ? null : String(a[b]);
}
function ih(a) {
return (M(), N).Hb(a);
}
function jh(a) {
return (M(), N).Jb(a);
}
function kh(a, b) {
b = $g(b);
return -1 != ah(a.className || '', b);
}
function lh(a, b) {
var c, d, e, f;
b = $g(b);
f = a.className || '';
d = ah(f, b);
-1 != d && (c = Uc((y(), f).substr(0, d)), d = Uc(Tc(f, d + b.length)), 0 == c.length ? e = d : 0 == d.length ? e = c : e = c + ' ' + d, a.className = e || '');
}
function mh(a, b) {
a.className = b || '';
}
function nh(a, b) {
(M(), N).Lb(a, b);
}
function ah(a, b) {
var c, d, e;
for (c = (y(), a).indexOf(b); -1 != c;) {
if (0 == c || 32 == a.charCodeAt(c - 1))
if (d = c + b.length, e = a.length, d == e || d < e && 32 == a.charCodeAt(d))
break;
c = a.indexOf(b, c + 1);
}
return c;
}
function oh(a) {
var b;
try {
b = !!a && !!a.nodeType;
} catch (c) {
b = !1;
}
return b ? !!a && 1 == a.nodeType : !1;
}
function $g(a) {
return a = Uc(a);
}
function M() {
M = k;
N = 0 == ab ? new ph() : new qh();
}
function fh(a) {
for (a = a.firstChild; a && 1 != a.nodeType;)
a = a.nextSibling;
return a;
}
function rh(a) {
for (a = a.nextSibling; a && 1 != a.nodeType;)
a = a.nextSibling;
return a;
}
function Vg(a) {
(a = a.parentNode) && 1 == a.nodeType || (a = null);
return a;
}
function sh(a) {
for (a = a.previousSibling; a && 1 != a.nodeType;)
a = a.previousSibling;
return a;
}
function th(a) {
M();
return a | 0;
}
r(105, 1, ga);
_.ub = function (a, b) {
var c = a.createElement('BUTTON');
c.type = b;
return c;
};
_.xb = function (a) {
return a.button | 0;
};
_.yb = function (a) {
return a.currentTarget;
};
_.Cb = function (a) {
for (var b = 0, c = a; c.offsetParent;)
b -= c.scrollLeft, c = c.parentNode;
for (; a;)
b += a.offsetLeft, a = a.offsetParent;
return th(b);
};
_.Db = function (a) {
for (var b = 0, c = a; c.offsetParent;)
b -= c.scrollTop, c = c.parentNode;
for (; a;)
b += a.offsetTop, a = a.offsetParent;
return th(b);
};
_.Eb = function () {
return 0;
};
_.Fb = function () {
return 0;
};
_.Gb = function (a) {
return ih('CSS1Compat' === a.compatMode ? a.documentElement : a.body);
};
_.Hb = function (a) {
return th(a.scrollLeft || 0);
};
_.Ib = function (a) {
return (('CSS1Compat' === a.compatMode ? a.documentElement : a.body).scrollTop || 0) | 0;
};
_.Jb = function (a) {
return a.tabIndex;
};
_.Lb = function (a, b) {
for (; a.firstChild;)
a.removeChild(a.firstChild);
null != b && a.appendChild(a.ownerDocument.createTextNode(b));
};
_.Mb = function (a, b) {
a.scrollLeft = b;
};
_.Nb = function (a) {
return a.outerHTML;
};
var N;
C(105);
r(686, 105, ga);
_.vb = function (a, b) {
var c = a.createEvent('HTMLEvents');
c.initEvent(b, !1, !0);
return c;
};
_.wb = function (a, b) {
a.dispatchEvent(b);
};
_.xb = function (a) {
a = a.button;
return 1 == a ? 4 : 2 == a ? 2 : 1;
};
_.zb = function (a) {
return a.relatedTarget;
};
_.Ab = function (a) {
return a.target;
};
_.Bb = function (a) {
a.preventDefault();
};
_.Kb = function (a, b) {
return a.contains(b);
};
_.Lb = function (a, b) {
a.textContent = b || '';
};
C(686);
function ph() {
M();
}
function uh() {
var a = /rv:([0-9]+)\.([0-9]+)(\.([0-9]+))?.*?/.exec(navigator.userAgent.toLowerCase());
return a && 3 <= a.length ? 1000000 * parseInt(a[1]) + 1000 * parseInt(a[2]) + parseInt(5 <= a.length && !isNaN(a[4]) ? a[4] : 0) : -1;
}
r(539, 686, ga, ph);
_.zb = function (a) {
return (a = a.relatedTarget) ? a : null;
};
_.Cb = function (a) {
var b = vh(a.ownerDocument);
Element.prototype.getBoundingClientRect ? a = a.getBoundingClientRect().left + b.scrollLeft | 0 : (b = a.ownerDocument, a = b.getBoxObjectFor(a).screenX - b.getBoxObjectFor(b.documentElement).screenX);
return a;
};
_.Db = function (a) {
var b = vh(a.ownerDocument);
Element.prototype.getBoundingClientRect ? a = a.getBoundingClientRect().top + b.scrollTop | 0 : (b = a.ownerDocument, a = b.getBoxObjectFor(a).screenY - b.getBoxObjectFor(b.documentElement).screenY);
return a;
};
_.Eb = function (a) {
a = $wnd.getComputedStyle(a.documentElement, null);
return null == a ? 0 : parseInt(a.marginLeft, 10) + parseInt(a.borderLeftWidth, 10);
};
_.Fb = function (a) {
a = $wnd.getComputedStyle(a.documentElement, null);
return null == a ? 0 : parseInt(a.marginTop, 10) + parseInt(a.borderTopWidth, 10);
};
_.Hb = function (a) {
var b;
b = uh();
return -1 != b && 1009000 <= b || 'rtl' != a.ownerDocument.defaultView.getComputedStyle(a, null).direction ? th(a.scrollLeft || 0) : th(a.scrollLeft || 0) - (((a.scrollWidth || 0) | 0) - (a.clientWidth | 0));
};
_.Kb = function (a, b) {
return a === b || !!(a.compareDocumentPosition(b) & 16);
};
_.Mb = function (a, b) {
var c;
c = uh();
-1 != c && 1009000 <= c || 'rtl' != a.ownerDocument.defaultView.getComputedStyle(a, null).direction || (b += ((a.scrollWidth || 0) | 0) - (a.clientWidth | 0));
a.scrollLeft = b;
};
_.Nb = function (a) {
var b = a.ownerDocument;
a = a.cloneNode(!0);
b = b.createElement('DIV');
b.appendChild(a);
outer = b.innerHTML;
a.innerHTML = '';
return outer;
};
C(539);
r(687, 686, ga);
_.ub = function (a, b) {
var c = a.createElement('BUTTON');
c.setAttribute('type', b);
return c;
};
_.yb = function (a) {
return a.currentTarget || $wnd;
};
_.Cb = function (a) {
var b;
if (b = a.getBoundingClientRect && a.getBoundingClientRect())
a = b.left + ih(a.ownerDocument.body);
else if (null == a.offsetLeft)
a = 0;
else {
b = 0;
var c = a.ownerDocument, d = a.parentNode;
if (d)
for (; d.offsetParent;)
b -= d.scrollLeft, 'rtl' == c.defaultView.getComputedStyle(d, '').getPropertyValue('direction') && (b += d.scrollWidth - d.clientWidth), d = d.parentNode;
for (; a;) {
b += a.offsetLeft;
if ('fixed' == c.defaultView.getComputedStyle(a, '').position) {
b += c.body.scrollLeft;
break;
}
(d = a.offsetParent) && $wnd.devicePixelRatio && (b += parseInt(c.defaultView.getComputedStyle(d, '').getPropertyValue('border-left-width')));
if (d && 'BODY' == d.tagName && 'absolute' == a.style.position)
break;
a = d;
}
a = b;
}
return M(), a | 0;
};
_.Db = function (a) {
var b;
if (b = a.getBoundingClientRect && a.getBoundingClientRect())
a = b.top + ((a.ownerDocument.body.scrollTop || 0) | 0);
else if (null == a.offsetTop)
a = 0;
else {
b = 0;
var c = a.ownerDocument, d = a.parentNode;
if (d)
for (; d.offsetParent;)
b -= d.scrollTop, d = d.parentNode;
for (; a;) {
b += a.offsetTop;
if ('fixed' == c.defaultView.getComputedStyle(a, '').position) {
b += c.body.scrollTop;
break;
}
(d = a.offsetParent) && $wnd.devicePixelRatio && (b += parseInt(c.defaultView.getComputedStyle(d, '').getPropertyValue('border-top-width')));
if (d && 'BODY' == d.tagName && 'absolute' == a.style.position)
break;
a = d;
}
a = b;
}
return M(), a | 0;
};
_.Gb = function (a) {
return a.documentElement.scrollLeft || a.body.scrollLeft;
};
_.Hb = function (a) {
return Wc('body', (M(), a).tagName) || 'rtl' != a.ownerDocument.defaultView.getComputedStyle(a, '').direction ? th(a.scrollLeft || 0) : th(a.scrollLeft || 0) - (((a.scrollWidth || 0) | 0) - (a.clientWidth | 0));
};
_.Ib = function (a) {
return a.documentElement.scrollTop || a.body.scrollTop;
};
_.Jb = function (a) {
return 'undefined' != typeof a.tabIndex ? a.tabIndex : -1;
};
_.Mb = function (a, b) {
!Wc('body', (M(), a).tagName) && 'rtl' == a.ownerDocument.defaultView.getComputedStyle(a, '').direction && (b += ((a.scrollWidth || 0) | 0) - (a.clientWidth | 0));
a.scrollLeft = b;
};
C(687);
function qh() {
M();
}
r(538, 687, ga, qh);
_.Ab = function (a) {
(a = a.target) && 3 == a.nodeType && (a = a.parentNode);
return a;
};
C(538);
function wh() {
var a = $doc;
return (M(), a).createElement('div');
}
function xh(a) {
var b = $doc;
return (M(), b).createElement(a);
}
function yh() {
var a = $doc;
return (M(), a).createElement('iframe');
}
function zh() {
var a = $doc;
return (M(), a).createElement('span');
}
function Ah() {
var a = $doc;
return (M(), a).createElement('tbody');
}
function Bh() {
var a = $doc;
return (M(), a).createElement('td');
}
function Ch() {
var a = $doc;
return (M(), a).createElement('thead');
}
function Dh() {
var a = $doc;
return (M(), a).createElement('tr');
}
function Eh() {
var a = $doc;
return (M(), a).createElement('table');
}
function Fh() {
var a = $doc;
!a.gwt_uid && (a.gwt_uid = 1);
return 'gwt-uid-' + a.gwt_uid++;
}
function Gh() {
var a = $doc;
return (M(), N).Eb(a);
}
function Hh() {
var a = $doc;
return (M(), N).Fb(a);
}
function Ih() {
var a = $doc;
return ('CSS1Compat' === a.compatMode ? a.documentElement : a.body).clientHeight | 0;
}
function Jh() {
var a = $doc;
return ('CSS1Compat' === a.compatMode ? a.documentElement : a.body).clientWidth | 0;
}
function Kh() {
var a = $doc;
return (M(), N).Gb(a);
}
function Lh() {
var a = $doc;
return (M(), N).Ib(a);
}
function vh(a) {
return 'CSS1Compat' === a.compatMode ? a.documentElement : a.body;
}
function Mh(a) {
return (M(), N).Ab(a);
}
function Nh(a) {
return (M(), a).keyCode | 0;
}
function Oh(a) {
return (M(), a).touches;
}
function Ph(a) {
return (M(), a).type;
}
function Qh(a) {
(M(), N).Bb(a);
}
function Rh(a) {
return (M(), a).height;
}
function Sh(a, b) {
return (M(), a)[b];
}
function Th(a) {
return (M(), a).width;
}
function Uh(a) {
return null != a.f ? a.f : '' + a.g;
}
function O(a, b) {
this.f = a;
this.g = b;
}
function Vh(a, b) {
var c;
t(b);
c = a[':' + b];
var d = z(u(I, 1), h, 1, 5, [b]);
if (!c)
throw new F(vd('Enum constant undefined: %s', d)).backingJsObject;
return c;
}
r(5, 1, {
3: 1,
6: 1,
5: 1
});
_.Ob = function (a) {
return this.g - a.g;
};
_.bb = Db;
_.db = Eb;
_.eb = function () {
return null != this.f ? this.f : '' + this.g;
};
_.g = 0;
C(5);
function Wh() {
Wh = k;
Xh = new Zh();
$h = new ai();
bi = new ci();
di = new ei();
fi = new gi();
}
r(46, 5, ha);
var bi, $h, di, Xh, fi, hi = E(46, function () {
Wh();
return z(u(hi, 1), h, 46, 0, [
Xh,
$h,
bi,
di,
fi
]);
});
function Zh() {
O.call(this, 'NONE', 0);
}
r(391, 46, ha, Zh);
E(391, null);
function ai() {
O.call(this, 'DOTTED', 1);
}
r(392, 46, ha, ai);
E(392, null);
function ci() {
O.call(this, 'DASHED', 2);
}
r(393, 46, ha, ci);
E(393, null);
function ei() {
O.call(this, 'HIDDEN', 3);
}
r(394, 46, ha, ei);
E(394, null);
function gi() {
O.call(this, 'SOLID', 4);
}
r(395, 46, ha, gi);
E(395, null);
function ii() {
ii = k;
ji = new ki();
li = new mi();
ni = new oi();
pi = new qi();
ri = new si();
ti = new ui();
vi = new wi();
xi = new yi();
zi = new Ai();
Bi = new Ci();
Di = new Ei();
Fi = new Gi();
Hi = new Ii();
Ji = new Ki();
Li = new Mi();
Ni = new Oi();
Pi = new Qi();
Ri = new Si();
Ti = new Ui();
}
r(14, 5, ia);
var li, Ri, Pi, ni, pi, Ti, ri, ti, ji, vi, xi, zi, Ji, Li, Bi, Fi, Di, Ni, Hi, Vi = E(14, function () {
ii();
return z(u(Vi, 1), h, 14, 0, [
ji,
li,
ni,
pi,
ri,
ti,
vi,
xi,
zi,
Bi,
Di,
Fi,
Hi,
Ji,
Li,
Ni,
Pi,
Ri,
Ti
]);
});
function ki() {
O.call(this, 'NONE', 0);
}
r(396, 14, ia, ki);
E(396, null);
function Ci() {
O.call(this, 'TABLE_COLUMN_GROUP', 9);
}
r(405, 14, ia, Ci);
E(405, null);
function Ei() {
O.call(this, 'TABLE_HEADER_GROUP', 10);
}
r(406, 14, ia, Ei);
E(406, null);
function Gi() {
O.call(this, 'TABLE_FOOTER_GROUP', 11);
}
r(407, 14, ia, Gi);
E(407, null);
function Ii() {
O.call(this, 'TABLE_ROW_GROUP', 12);
}
r(408, 14, ia, Ii);
E(408, null);
function Ki() {
O.call(this, 'TABLE_CELL', 13);
}
r(409, 14, ia, Ki);
E(409, null);
function Mi() {
O.call(this, 'TABLE_COLUMN', 14);
}
r(410, 14, ia, Mi);
E(410, null);
function Oi() {
O.call(this, 'TABLE_ROW', 15);
}
r(411, 14, ia, Oi);
E(411, null);
function Qi() {
O.call(this, 'INITIAL', 16);
}
r(412, 14, ia, Qi);
E(412, null);
function Si() {
O.call(this, 'FLEX', 17);
}
r(413, 14, ia, Si);
E(413, null);
function Ui() {
O.call(this, 'INLINE_FLEX', 18);
}
r(414, 14, ia, Ui);
E(414, null);
function mi() {
O.call(this, 'BLOCK', 1);
}
r(397, 14, ia, mi);
E(397, null);
function oi() {
O.call(this, 'INLINE', 2);
}
r(398, 14, ia, oi);
E(398, null);
function qi() {
O.call(this, 'INLINE_BLOCK', 3);
}
r(399, 14, ia, qi);
E(399, null);
function si() {
O.call(this, 'INLINE_TABLE', 4);
}
r(400, 14, ia, si);
E(400, null);
function ui() {
O.call(this, 'LIST_ITEM', 5);
}
r(401, 14, ia, ui);
E(401, null);
function wi() {
O.call(this, 'RUN_IN', 6);
}
r(402, 14, ia, wi);
E(402, null);
function yi() {
O.call(this, 'TABLE', 7);
}
r(403, 14, ia, yi);
E(403, null);
function Ai() {
O.call(this, 'TABLE_CAPTION', 8);
}
r(404, 14, ia, Ai);
E(404, null);
function Wi() {
Wi = k;
Xi = new Yi();
Zi = new $i();
aj = new bj();
cj = new dj();
}
r(56, 5, ja);
var cj, Zi, aj, Xi, ej = E(56, function () {
Wi();
return z(u(ej, 1), h, 56, 0, [
Xi,
Zi,
aj,
cj
]);
});
function Yi() {
O.call(this, 'VISIBLE', 0);
}
r(415, 56, ja, Yi);
E(415, null);
function $i() {
O.call(this, 'HIDDEN', 1);
}
r(416, 56, ja, $i);
E(416, null);
function bj() {
O.call(this, 'SCROLL', 2);
}
r(417, 56, ja, bj);
E(417, null);
function dj() {
O.call(this, 'AUTO', 3);
}
r(418, 56, ja, dj);
E(418, null);
function fj() {
fj = k;
gj = new hj();
ij = new jj();
kj = new lj();
mj = new nj();
}
r(57, 5, ka);
var kj, mj, ij, gj, oj = E(57, function () {
fj();
return z(u(oj, 1), h, 57, 0, [
gj,
ij,
kj,
mj
]);
});
function hj() {
O.call(this, 'STATIC', 0);
}
r(419, 57, ka, hj);
E(419, null);
function jj() {
O.call(this, 'RELATIVE', 1);
}
r(420, 57, ka, jj);
E(420, null);
function lj() {
O.call(this, 'ABSOLUTE', 2);
}
r(421, 57, ka, lj);
E(421, null);
function nj() {
O.call(this, 'FIXED', 3);
}
r(422, 57, ka, nj);
E(422, null);
function pj() {
pj = k;
qj = new rj();
sj = new tj();
uj = new vj();
wj = new xj();
}
r(58, 5, la);
var qj, sj, uj, wj, yj = E(58, function () {
pj();
return z(u(yj, 1), h, 58, 0, [
qj,
sj,
uj,
wj
]);
});
function rj() {
O.call(this, 'CENTER', 0);
}
r(423, 58, la, rj);
E(423, null);
function tj() {
O.call(this, 'JUSTIFY', 1);
}
r(424, 58, la, tj);
E(424, null);
function vj() {
O.call(this, 'LEFT', 2);
}
r(425, 58, la, vj);
E(425, null);
function xj() {
O.call(this, 'RIGHT', 3);
}
r(426, 58, la, xj);
E(426, null);
function zj() {
zj = k;
Aj = new Bj();
Cj = new Dj();
}
r(85, 5, ma);
var Aj, Cj, Ej = E(85, function () {
zj();
return z(u(Ej, 1), h, 85, 0, [
Aj,
Cj
]);
});
function Bj() {
O.call(this, 'CLIP', 0);
}
r(427, 85, ma, Bj);
E(427, null);
function Dj() {
O.call(this, 'ELLIPSIS', 1);
}
r(428, 85, ma, Dj);
E(428, null);
function Fj() {
Fj = k;
Gj = new Hj();
Ij = new Jj();
Kj = new Lj();
Mj = new Nj();
Oj = new Pj();
Qj = new Rj();
Sj = new Tj();
Uj = new Vj();
Wj = new Xj();
}
r(32, 5, na);
var Uj, Kj, Mj, Sj, Wj, Qj, Ij, Oj, Gj, Yj = E(32, function () {
Fj();
return z(u(Yj, 1), h, 32, 0, [
Gj,
Ij,
Kj,
Mj,
Oj,
Qj,
Sj,
Uj,
Wj
]);
});
function Hj() {
O.call(this, 'PX', 0);
}
r(382, 32, na, Hj);
E(382, null);
function Jj() {
O.call(this, 'PCT', 1);
}
r(383, 32, na, Jj);
E(383, null);
function Lj() {
O.call(this, 'EM', 2);
}
r(384, 32, na, Lj);
E(384, null);
function Nj() {
O.call(this, 'EX', 3);
}
r(385, 32, na, Nj);
E(385, null);
function Pj() {
O.call(this, 'PT', 4);
}
r(386, 32, na, Pj);
E(386, null);
function Rj() {
O.call(this, 'PC', 5);
}
r(387, 32, na, Rj);
E(387, null);
function Tj() {
O.call(this, 'IN', 6);
}
r(388, 32, na, Tj);
E(388, null);
function Vj() {
O.call(this, 'CM', 7);
}
r(389, 32, na, Vj);
E(389, null);
function Xj() {
O.call(this, 'MM', 8);
}
r(390, 32, na, Xj);
E(390, null);
function Zj() {
Zj = k;
ak = new bk();
ck = new dk();
}
r(86, 5, oa);
var ck, ak, ek = E(86, function () {
Zj();
return z(u(ek, 1), h, 86, 0, [
ak,
ck
]);
});
function bk() {
O.call(this, 'VISIBLE', 0);
}
r(429, 86, oa, bk);
E(429, null);
function dk() {
O.call(this, 'HIDDEN', 1);
}
r(430, 86, oa, dk);
E(430, null);
function fk(a) {
return th((M(), a).clientX || 0);
}
function gk(a) {
return th((M(), a).clientY || 0);
}
function hk(a) {
return th((M(), a).pageX || 0);
}
function ik(a) {
return th((M(), a).pageY || 0);
}
r(671, 1, {});
_.eb = function () {
return 'An event type';
};
C(671);
r(672, 671, {});
_.Rb = jk;
_.Sb = function () {
this.f = !1;
this.g = null;
};
_.f = !1;
C(672);
r(688, 672, {});
_.Qb = function () {
return this.Tb();
};
var kk;
C(688);
function lk() {
lk = k;
mk = new nk('blur', new ok());
}
function ok() {
}
r(641, 688, {}, ok);
_.Pb = function (a) {
pk(a.a, null);
};
_.Tb = function () {
return mk;
};
var mk;
C(641);
r(690, 688, {});
C(690);
r(691, 690, {});
C(691);
function qk() {
qk = k;
rk = new nk('click', new sk());
}
function sk() {
}
r(561, 691, {}, sk);
_.Pb = function (a) {
a.Ub(this);
};
_.Tb = function () {
return rk;
};
var rk;
C(561);
r(316, 1, {});
_.db = tk;
_.eb = function () {
return 'Event type';
};
var uk = _.c = 0;
C(316);
function vk() {
this.c = ++uk;
}
r(34, 316, {}, vk);
C(34);
function nk(a, b) {
var c;
this.c = ++uk;
this.a = b;
!kk && (kk = new wk());
c = kk.a[a];
c || (c = new Rd(), kk.a[a] = c);
c.Cf(this);
this.b = a;
}
r(64, 34, { 64: 1 }, nk);
C(64);
r(689, 688, {});
C(689);
r(695, 689, {});
C(695);
function xk() {
xk = k;
yk = new nk('keydown', new zk());
}
function zk() {
}
r(555, 695, {}, zk);
_.Pb = function (a) {
27 == Nh(this.d) && Ak(a.a.f, !1);
};
_.Tb = function () {
return yk;
};
var yk;
C(555);
function Bk() {
Bk = k;
Ck = new nk('mousedown', new Dk());
}
function Dk() {
}
r(649, 691, {}, Dk);
_.Pb = function (a) {
var b = this.d;
1 == (M(), N).xb(b) && Ek(a.b, this.d, Q(a.a));
};
_.Tb = function () {
return Ck;
};
var Ck;
C(649);
function wk() {
this.a = {};
}
r(627, 1, {}, wk);
C(627);
r(699, 690, {});
C(699);
function Fk() {
Fk = k;
Gk = new nk('touchstart', new Hk());
}
function Hk() {
}
r(650, 699, {}, Hk);
_.Pb = function (a) {
Ek(a.b, this.d, Q(a.a));
};
_.Tb = function () {
return Gk;
};
var Gk;
C(650);
function Ik() {
}
function Jk(a) {
var b;
Kk && (b = new Ik(), a.Xb(b));
}
r(626, 672, {}, Ik);
_.Pb = function (a) {
a.Vb(this);
};
_.Qb = function () {
return Kk;
};
var Kk;
C(626);
function Lk() {
}
r(645, 672, {}, Lk);
_.Pb = function () {
Mk();
};
_.Qb = function () {
return Nk;
};
var Nk;
C(645);
function Ok(a) {
this.a = a;
}
function Pk(a, b) {
var c;
Qk && (c = new Ok(b), a.Xb(c));
}
r(518, 672, {}, Ok);
_.Pb = function (a) {
a.Wb(this);
};
_.Qb = function () {
return Qk;
};
var Qk;
C(518);
function Rk(a, b, c) {
a = a.a;
var d;
if (!b)
throw new Jc('Cannot add a handler with a null type').backingJsObject;
if (!c)
throw new Jc('Cannot add a null handler').backingJsObject;
0 < a.b ? (d = new Sk(a, b, c), !a.a && (a.a = new Rd()), Ud(a.a, d)) : (d = Tk(a, b, null), d.Cf(c));
return new Uk(new Vk(a, b, c));
}
function Wk(a, b) {
var c, d;
!b.f || b.Sb();
d = b.Rb();
b.g = a.b;
try {
var e = a.a, f, g, l, m, n, p;
if (!b)
throw new Jc('Cannot fire null event').backingJsObject;
try {
++e.b;
n = (g = Xk(e, b.Qb(), null), g);
f = null;
for (p = e.c ? n.Gf(n.od()) : n.Ff(); e.c ? p.Lf() : p.Xc();) {
m = e.c ? p.Mf() : p.Yc();
try {
b.Pb(m);
} catch (D) {
if (D = ec(D), A(D, 11))
l = D, !f && (f = new Yk()), f.a.wf(l, f);
else
throw D.backingJsObject;
}
}
if (f)
throw new Zk(f).backingJsObject;
} finally {
if (--e.b, 0 == e.b) {
var v, x;
if (e.a)
try {
for (x = new $k(e.a); x.a < x.c.a.length;)
v = al(x), v.tb();
} finally {
e.a = null;
}
}
}
} catch (D) {
D = ec(D);
if (A(D, 82))
throw c = D, new bl(c.a).backingJsObject;
throw D.backingJsObject;
} finally {
null == d ? (b.f = !0, b.g = null) : b.g = d;
}
}
function cl(a) {
dl.call(this, a, !1);
}
function dl(a, b) {
this.a = new el(b);
this.b = a;
}
r(59, 1, { 21: 1 }, cl, dl);
_.Xb = function (a) {
Wk(this, a);
};
C(59);
r(682, 1, {});
C(682);
function fl(a, b, c, d) {
var e, f;
e = Xk(a, b, c);
e.If(d) && e.of() && (f = R(a.d, b), f.xf(c), f.of() && gl(a.d, b));
}
function Tk(a, b, c) {
var d;
d = R(a.d, b);
d || (d = new zg(), hl(a.d, b, d));
a = d.vf(c);
a || (a = new Rd(), d.wf(c, a));
return a;
}
function Xk(a, b, c) {
a = R(a.d, b);
return a ? (c = a.vf(c)) ? c : (il(), il(), jl) : (il(), il(), jl);
}
r(484, 682, {});
_.b = 0;
_.c = !1;
C(484);
function el(a) {
this.d = new zg();
this.c = a;
}
r(485, 484, {}, el);
C(485);
function Uk(a) {
this.a = a;
}
r(532, 1, {}, Uk);
C(532);
function Zk(a) {
Fb();
var b, c;
var d, e;
c = a.od();
if (0 == c)
b = null;
else {
c = new kl(1 == c ? 'Exception caught: ' : c + ' exceptions caught: ');
b = !0;
for (e = a.Mc(); e.Xc();)
d = e.Yc(), b ? b = !1 : c.a += '; ', xd(c, d.pb());
b = c.a;
}
c = a.of() ? null : a.Mc().Yc();
Hb(this);
this.e = c;
this.f = b;
Kb(this);
this.qb();
this.a = a;
c = 0;
for (a = a.Mc(); a.Xc();)
b = a.Yc(), 0 != c++ && (qd(b, 'Cannot suppress a null exception.'), ad(b != this, 'Exception can not suppress itself.'), this.g || (null == this.j ? this.j = z(Zb(Ob), h, 11, 0, [b]) : this.j[this.j.length] = b));
}
r(82, 10, pa, Zk);
C(82);
function bl(a) {
Fb();
Zk.call(this, a);
}
r(192, 82, pa, bl);
C(192);
function ll(a) {
a = hh(a, 'dir');
return Wc('rtl', a) ? (ml(), nl) : Wc('ltr', a) ? (ml(), ol) : (ml(), pl);
}
function ml() {
ml = k;
nl = new ql('RTL', 0);
ol = new ql('LTR', 1);
pl = new ql('DEFAULT', 2);
}
function ql(a, b) {
O.call(this, a, b);
}
r(106, 5, {
106: 1,
3: 1,
6: 1,
5: 1
}, ql);
var pl, ol, nl, rl = E(106, function () {
ml();
return z(u(rl, 1), h, 106, 0, [
nl,
ol,
pl
]);
});
function sl(a) {
var b, c, d, e, f, g;
if (isNaN(a))
return tl(), ul;
if (-9223372036854776000 > a)
return tl(), vl;
if (9223372036854776000 <= a)
return tl(), wl;
d = !1;
0 > a && (d = !0, a = -a);
c = 0;
17592186044416 <= a && (c = w(a / 17592186044416), a -= 17592186044416 * c);
b = 0;
4194304 <= a && (b = w(a / 4194304), a -= 4194304 * b);
a = {
l: w(a),
m: b,
h: c
};
d && (e = ~a.l + 1 & 4194303, f = ~a.m + (0 == e ? 1 : 0) & 4194303, g = ~a.h + (0 == e && 0 == f ? 1 : 0) & 1048575, a.l = e, a.m = f, a.h = g);
return a;
}
function tl() {
tl = k;
wl = {
l: 4194303,
m: 4194303,
h: 524287
};
vl = {
l: 0,
m: 0,
h: 524288
};
ul = {
l: 0,
m: 0,
h: 0
};
}
var wl, vl, ul;
function xl(a) {
if (-17592186044416 < a && 17592186044416 > a)
a = 0 > a ? $wnd.Math.ceil(a) : $wnd.Math.floor(a);
else {
a = sl(a);
var b;
b = a.h;
a = 0 == b ? a.l + 4194304 * a.m : 1048575 == b ? a.l + 4194304 * a.m - 17592186044416 : a;
}
return a;
}
function yl(a) {
return 'number' === typeof a ? a | 0 : a.l | a.m << 22;
}
function zl() {
zl = k;
}
r(249, 1, {}, function () {
});
C(249);
function Al() {
this.a = this.Yb();
this.b = this.Zb();
this.c = this.$b();
this.d = this._b();
this.e = this.ac();
this.f = this.bc();
this.cc();
this.g = this.cc();
}
r(103, 1, { 103: 1 });
_.a = !1;
_.b = !1;
_.c = !1;
_.d = !1;
_.e = !1;
_.f = !1;
_.g = !1;
C(103);
function Bl() {
Al.call(this);
}
r(508, 103, { 103: 1 }, Bl);
_.Yb = Cl;
_.Zb = Cl;
_.$b = Cl;
_._b = Dl;
_.ac = Cl;
_.bc = Cl;
_.cc = Cl;
_.eb = El;
C(508);
function Fl() {
Al.call(this);
}
r(509, 103, { 103: 1 }, Fl);
_.Yb = Cl;
_.Zb = Cl;
_.$b = Cl;
_._b = Cl;
_.ac = Cl;
_.bc = Cl;
_.cc = Dl;
_.eb = El;
C(509);
function Gl(a, b) {
a.e = b;
a.dc();
return B(), B(), hc;
}
function Hl(a) {
a = a.e;
a = null != a ? 0 != (jb(a).e & 4) ? a : z(Zb(I), h, 1, 5, [a]) : Ib(I, h, 1, 0, 5);
a = 0 < a.length ? a[0] : null;
return null != a ? a : null;
}
function Il() {
this.e = Ib(I, h, 1, 0, 5);
}
r(16, 1, qa);
_.dc = function () {
throw new Ub('You have to override the adequate method to handle this action, or you have to override \'public void f()\' to avoid this error').backingJsObject;
};
_.ec = function (a) {
return Gl(this, a);
};
var Jl = C(16), Kl;
function Ll() {
Ll = k;
Ml = 1 == ab ? new Fl() : new Bl();
Nl = new Ol();
Pl = $doc;
Ql();
Rl();
Sl = /<([\w:-]+)/;
Tl();
Ul = (Ag(), Bg);
}
function Vl(a) {
a.c = Ib(wb, h, 0, 0, 2);
a.d = [];
}
function Wl(a) {
var b;
Ll();
var c, d;
if (null != a) {
if (nb(a))
return Xl(a, Pl);
if (A(a, 25))
return a;
if (A(a, 16))
return new Yl(null.Yf());
if (Zl(a))
return new Yl(a);
if (A(a, 80))
return new Yl(qb(a) ? a.fc() : a);
if (A(a, 24)) {
a = new $l(z(u(I, 1), h, 1, 5, [a]));
b = [];
for (c = new am(a); c.b < c.d.od();)
a = (nd(c.b < c.d.od()), c.d.Df(c.c = c.b++)), Yb(a) ? bm(b, a) : A(a, 24) && bm(b, Q(a.Bc()));
return new cm(b);
}
if (Yb(a)) {
if (dm(a))
return b = new em(a), Gl(b, b.e), new cm([]);
if (!fm(a, 'alert') && !Zl(a) && gm(a)) {
b = a;
a = [];
for (c = 0; c < b.length; c++)
(d = null != b[c] ? Object(b[c]) : null) && bm(a, d);
return new cm(a);
}
if (b = Object.prototype.toString.call(a), '[object HTMLCollection]' == b || '[object NodeList]' == b || 'object' == typeof a && a.length && a[0] && a[0].tagName ? !0 : !1)
return new hm(a);
fm(a, 'currentTarget') && (a = (M(), N).yb(a));
return new Yl(a);
}
throw new Ub('Error: GQuery.$(Object o) could not wrap the type : ' + ib(jb(a)) + ' ' + a).backingJsObject;
}
return new cm([]);
}
function Xl(a, b) {
Ll();
var c;
c = null;
var d;
if (null == a || 0 == Rb(c = Uc(a)).length)
d = new cm([]);
else if (Mc((y(), c).substr(0, 1), '<')) {
c = b && Zl(b) ? 9 == b.nodeType ? b : b.ownerDocument : null;
var e, f, g, l;
if (e = Sl.exec(a)) {
e = e[1];
im || (f = new jm(1, '<table>', '</table>'), g = new jm(1, '<select multiple="multiple">', '</select>'), l = new jm(3, '<table><tbody><tr>', '</tr></tbody></table>'), im = {}, km(im, 'option', g), km(im, 'optgroup', g), g = new jm(1, '<fieldset>', '</fieldset>'), km(im, 'legend', g), km(im, 'thead', f), km(im, 'tbody', f), km(im, 'tfoot', f), km(im, 'colgroup', f), km(im, 'caption', f), f = new jm(2, '<table><tbody>', '</tbody></table>'), km(im, 'tr', f), km(im, 'td', l), km(im, 'th', l), l = new jm(2, '<table><tbody></tbody><colgroup>', '</colgroup></table>'), km(im, 'col', l), l = new jm(1, '<map>', '</map>'), km(im, 'area', l));
e = (y(), e).toLowerCase();
e = lm(im, e);
!e && (e = (mm(), nm));
c = (M(), c).createElement('div');
l = e.b + ('' + Uc(a)) + e.a;
c.innerHTML = l || '';
for (e = e.c; 0 != e--;)
c = c.lastChild;
c = Wl(c.childNodes);
var m;
l = c.c;
f = 0;
for (g = l.length; f < g; ++f)
e = l[f], (m = om(e)) ? pm(m) : (d = Vg((M(), e)), d && d.removeChild(e));
d = c;
} else
d = Wl(c.createTextNode(a));
} else
d = new qm(), c = rm((!sm && (sm = new tm()), sm), a, b ? b : Pl), d.b = a, d.a = b ? b : Pl, d = um(d, c);
return d;
}
function vm(a) {
var b = z(u(tb, 1), h, 2, 6, [
'vaadin-grid',
'style-scope'
]), c, d, e, f, g, l;
f = a.c;
g = 0;
for (l = f.length; g < l; ++g)
if ((e = f[g]) && 1 == e.nodeType)
for (c = 0, d = b.length; c < d; ++c)
a = b[c], Zg(e, a);
}
function wm(a) {
var b, c, d, e;
e = [];
a = a.c;
c = 0;
for (d = a.length; c < d; ++c) {
b = a[c];
b = fh((M(), b));
for (var f = e; b;)
b && xm(f, z(Zb(wb), h, 0, 2, [b])), b = rh((M(), b));
}
return new cm(ym(e));
}
function zm(a, b) {
return Am(wm(a), b);
}
function Bm(a, b, c) {
var d, e, f, g;
e = a.c;
f = 0;
for (g = e.length; f < g; ++f)
d = e[f], Cm((!Dm && (Dm = (!sm && (sm = new tm()), Em(), Fm)), d), b, c);
return a;
}
function Gm(a, b, c) {
var d = z(u(wb, 1), h, 0, 2, []), e, f, g, l, m, n;
m = [];
0 == d.length && (d = a.c);
e = 0;
for (g = d.length; e < g; e++)
for (a = d[e], 9 == a.nodeType && (a = a.body), f = 0, n = b.c.length; f < n; f++) {
l = Hm(b, f);
0 < e && (l = l.cloneNode(!0));
switch (c) {
case 3:
bm(m, a.insertBefore(l, a.firstChild));
break;
case 1:
bm(m, a.appendChild(l));
break;
case 0:
bm(m, a.parentNode.insertBefore(l, a.nextSibling));
break;
case 2:
bm(m, a.parentNode.insertBefore(l, a));
}
Im();
}
Jm(m) >= b.c.length && um(b, m);
}
function Am(a, b) {
var c, d;
d = '';
for (c = 0; c < b.length; c++)
d += 0 < c ? ', ' + b[c] : b[c];
c = d;
d = (!sm && (sm = new tm()), sm);
var e = a.d, f = d.a, g, l, m, n, p, v, x, D, L, P;
P = [];
if (0 != (y(), c).length) {
p = null;
L = new Yk();
m = new Yk();
v = 0;
for (x = e.length; v < x; v++)
g = e[v], g == (Ll(), Ul) || g == Pl || null == g.nodeName || Wc('html', g.nodeName) || (m.a.wf(g, m), f ? (D = Vg((M(), g))) ? L.a.sf(D) || L.a.wf(D, L) : (p || (p = wh(), L.a.wf(p, L)), D = p, D.appendChild(g)) : 0 == L.a.od() && Km(L, Pl));
for (e = (l = new Lm(L.a).a.uf().Mc(), new Mm(l)); e.a.Xc();)
for (g = (n = e.a.Yc(), n.Nf()), v = rm(d, c, g), g = 0, f = v.length; g < f; g++)
l = v[g], null != m.a.xf(l) && xm(P, z(u(wb, 1), h, 0, 2, [l]));
p && (p.innerHTML = '');
}
return Nm(a, P, c);
}
function Om(a, b) {
var c, d, e, f, g, l, m, n, p, v, x;
c = [];
v = 0;
for (x = b.length; v < x; ++v)
for (p = b[v], l = a.c, m = 0, n = l.length; m < n; ++m)
for (d = l[m], e = Xl(p, d).c, f = 0, g = e.length; f < g; ++f)
d = e[f], xm(c, z(u(wb, 1), h, 0, 2, [d]));
return Nm(a, ym(c), b[0]);
}
function Hm(a, b) {
var c;
c = a.c.length;
return 0 <= b && b < c ? a.c[b] : 0 > b && 0 <= c + b ? a.c[c + b] : null;
}
function Pm(a) {
0 == a.c.length ? a = '' : (a = Hm(a, 0), a = (M(), a).innerHTML);
return a;
}
function Qm(a) {
var b, c, d, e;
e = [];
a = a.c;
c = 0;
for (d = a.length; c < d; ++c)
b = a[c], (b = Vg((M(), b))) && xm(e, z(u(wb, 1), h, 0, 2, [b]));
return new cm(ym(e));
}
function Rm(a) {
var b, c, d, e, f;
f = [];
a = a.c;
c = 0;
for (d = a.length; c < d; ++c)
for (b = a[c], e = 0, b = b.parentNode; b && b != Pl;)
xm(f, z(u(wb, 1), h, 0, 2, [b])), b = b.parentNode, ++e;
return new cm(ym(f));
}
function Sm(a, b, c) {
var d, e, f;
d = a.c;
e = 0;
for (f = d.length; e < f; ++e)
(a = d[e]) && km(a, b, c);
}
function Nm(a, b, c) {
b = new cm(b);
b.b = c;
b.a = a.a;
return b;
}
function um(a, b) {
var c, d;
if (b) {
c = a.d;
var e, f, g;
e = [];
for (d in c)
c.hasOwnProperty(d) && '__gwt_ObjectId' != d && '$H' != d && e.push(String(d));
d = Ib(tb, h, 2, e.length, 6);
for (f = 0; f < e.length; f++)
d[f] = e[f];
f = 0;
for (g = d.length; f < g; ++f)
e = d[f], delete c[e];
d = b.length;
a.c = Ib(wb, h, 0, d, 2);
for (c = 0; c < d; c++)
a.c[c] = b[c], xm(a.d, z(u(wb, 1), h, 0, 2, [b[c]]));
}
return a;
}
function Tm(a, b, c) {
var d, e;
e = [];
d = a.c.length;
for ((-1 == c || c > d) && (c = d); b < c; b++)
bm(e, Hm(a, b));
return new cm(e);
}
function Um(a) {
var b, c, d, e, f;
f = '';
b = a.c;
c = 0;
for (d = b.length; c < d; ++c)
if (a = b[c], Ul != a) {
try {
e = a && 'HTML' !== (a && Zl(a) ? 9 == a.nodeType ? a : a.ownerDocument : null).documentElement.nodeName ? new XMLSerializer().serializeToString(a) : (M(), N).Nb(a);
} catch (g) {
if (g = ec(g), A(g, 13))
e = g, e = '< ' + (a ? a.nodeName : 'null') + '(gquery, error getting the element string representation: ' + e.pb() + ')/>';
else
throw g.backingJsObject;
}
f += '' + e;
}
return f;
}
function qm() {
Vl(this);
}
function Yl(a) {
hm.call(this, a ? [a] : []);
}
function hm(a) {
Vl(this);
um(this, a);
}
function Vm(a) {
Ll();
Vl(this);
this.c = a.c;
this.d = a.d;
this.b = a.b;
this.a = a.a;
}
function cm(a) {
hm.call(this, a);
}
function om(a) {
var b;
try {
b = (S(), Wm(a));
if (!b)
return null;
if (A(b, 17))
return b;
} catch (c) {
if (c = ec(c), A(c, 13))
a = c, Lb(a, (Xm(), Ym), '');
else
throw c.backingJsObject;
}
return null;
}
function Zm(a, b) {
Ll();
!$m && ($m = {});
an($m, a, b);
return a;
}
r(25, 1, ra, qm, Yl, hm, cm);
_.eb = function () {
return Um(this);
};
var bn, Ml, Nl, Pl, sm, $m, Dm, Sl, Ul, im, cn = C(25);
function mm() {
mm = k;
nm = new jm(0, '', '');
}
function jm(a, b, c) {
mm();
this.c = a;
this.a = c;
this.b = b;
}
r(60, 1, { 60: 1 }, jm);
_.c = 0;
var nm;
C(60);
r(67, 1, sa);
_.gc = dn;
C(67);
var en = vc();
function fn(a, b, c) {
var d;
for (d = 0; d < b.length; d++) {
var e = d, f;
f = lm(a, G(d));
var g = c;
f = (!Kl && (Kl = new gn()), hn(jn(g), f));
b[e] = f;
}
return b;
}
function hn(a, b) {
if (null != b && nb(b)) {
var c = hn, d;
try {
try {
d = JSON.parse(b);
} catch (e) {
throw new F('Error parsing JSON: ' + e + '\n' + b).backingJsObject;
}
} catch (e) {
if (e = ec(e), A(e, 13))
d = {};
else
throw e.backingJsObject;
}
return c(a, d);
}
null != b && (a.a = b);
return a;
}
r(79, 1, ta);
_.fc = Hc;
_.eb = function () {
return $wnd.JSON.stringify(this.a);
};
C(79);
function kn() {
this.a = {};
}
r(629, 79, ta, kn);
C(629);
function jn(a) {
if (a == en)
return new kn();
if (a == ln)
return new mn();
if (a == nn)
return new on();
if (a == pn)
return new qn();
if (a == rn)
return new sn();
if (a == tn)
return new un();
if (a == vn)
return new wn();
var b = (Ll(), Nl);
a = 'GQ.create: not registered class :' + a;
b.a.jc(xn(z(u(I, 1), h, 1, 5, [a])));
return null;
}
function gn() {
}
r(173, 1, {}, gn);
C(173);
function yn() {
yn = k;
zn = /^(?:autofocus|autoplay|async|checked|controls|defer|disabled|hidden|loop|multiple|open|readonly|required|scoped|selected)$/i;
}
function An() {
yn();
}
r(225, 1, {}, An);
var zn;
C(225);
function Bn() {
}
r(526, 1, {}, Bn);
_.hc = function (a) {
return null == a;
};
_.ic = function (a, b, c) {
c = (y(), null == c ? 'null' : Ab(c));
a.setAttribute(b, c);
};
var Cn;
C(526);
function Dn() {
}
r(527, 526, {}, Dn);
_.hc = function (a) {
var b;
(b = null == a) || (b = (B(), gc), b = (t(b), b === a));
return b;
};
_.ic = function (a, b) {
fm(a, b) && (a[b] = !0);
var c = (y(), b).toLowerCase(), c = (y(), null == c ? 'null' : Ab(c));
a.setAttribute(b, c);
};
var En;
C(527);
function Fn() {
Fn = k;
Gn = /^(?:button|input)$/i;
}
function Hn() {
Fn();
}
r(528, 526, {}, Hn);
_.ic = function (a, b, c) {
var d;
d = a.nodeName;
var e;
if (e = Gn.test(d)) {
e = Wl(a);
var f = z(Zb(tb), h, 2, 6, ['body']);
e = 0 < Am(Rm(e), f).c.length;
}
if (e)
throw new Ub('You cannot change type of button or input element if the element is already attached to the dom').backingJsObject;
Mc('input', (y(), d).toLowerCase()) && 'radio' === c ? (b = a.value, c = null == c ? 'null' : Ab(c), a.setAttribute('type', c), a.value = b) : (c = null == c ? 'null' : Ab(c), a.setAttribute(b, c));
};
var In, Gn;
C(528);
function xn(a) {
var b, c, d, e;
e = [];
c = 0;
for (d = a.length; c < d; ++c)
b = a[c], xm(e, z(u(I, 1), h, 1, 5, [b]));
return e;
}
function Ol() {
this.a = (Ll(), Ml).b ? new Jn() : Ml.c ? new Kn() : new Ln();
}
r(510, 1, {}, Ol);
C(510);
function Ln() {
}
r(511, 1, {}, Ln);
_.jc = function (a) {
$wnd.console.error.apply($wnd.console, a);
};
C(511);
function Kn() {
this.kc();
}
r(224, 511, {}, Kn);
_.jc = function (a) {
this.a && $wnd.console.error.apply($wnd.console, a);
};
_.kc = function () {
try {
'log info warn error dir clear profile profileEnd'.split(' ').forEach(function (a) {
$wnd.console[a] = this.call($wnd.console[a], $wnd.console);
}, Function.prototype.bind), this.a = !0;
} catch (a) {
}
};
_.a = !1;
C(224);
function Jn() {
this.kc();
}
r(512, 224, {}, Jn);
_.kc = function () {
try {
Function.prototype.call.call($wnd.console.log, $wnd.console, Array.prototype.slice.call(arguments)), this.a = !0;
} catch (a) {
}
};
C(512);
function Mn() {
Mn = k;
Nn = /^(fillOpacity|fontWeight|lineHeight|opacity|orphans|widows|zIndex|zoom)$/i;
On = /^(client|offset|)(width|height)$/i;
}
function Pn(a, b, c, d) {
var e, f;
if (!b)
return '';
c = Qn(c);
f = Sh(b.style, c);
if (d) {
d = null;
if (Wc('html', b.nodeName) ? 0 : !Wg((b && Zl(b) ? 9 == b.nodeType ? b : b.ownerDocument : null).body, b))
d = Rm(Wl(b)), d = Wl(Hm(d, d.c.length - 1)), d = Hm(d, 0), !d && (d = b), $doc.body.appendChild(d);
if (On.test(c)) {
var g = c, l;
Rn((Em(), Sn), xb('visible')).gc(b, 0) ? a = Tn(a, b, g) : (f = Pn(a, b, 'display', !1), l = Pn(a, b, 'position', !1), c = Pn(a, b, 'visibility', !1), Cm(b, 'display', 'block'), Cm(b, 'position', 'absolute'), Cm(b, 'visibility', 'hidden'), a = Tn(a, b, g), Cm(b, 'display', f), Cm(b, 'position', l), Cm(b, 'visibility', c));
f = a + 'px';
} else if (Wc('opacity', c))
y(), b = b.style, b = (M(), b).opacity, f = '' + (b ? Un(b) : 1);
else {
a = c.replace(/([A-Z])/g, '-$1').toLowerCase();
try {
f = (l = $doc.defaultView.getComputedStyle(b, null)) && l.getPropertyValue ? l.getPropertyValue(a) : null;
} catch (m) {
f = null;
}
}
d && (e = Vg((M(), d)), e && e.removeChild(d));
}
return null == f ? '' : f;
}
function Vn(a, b) {
0 == (b.clientHeight | 0) && 0 == (b.clientWidth | 0) && Mc('inline', Pn(a, b, 'display', !0)) && (Cm(b, 'display', 'inline-block'), Cm(b, 'width', 'auto'), Cm(b, 'height', 'auto'));
}
function Qn(a) {
return Wc('float', a) ? 'cssFloat' : Wc('for', a) ? 'htmlFor' : Wn(a);
}
function Tn(a, b, c) {
var d;
d = 0;
'width' === c ? d = (Vn(a, b), w((b.clientWidth | 0) - Un(Pn(a, b, 'paddingLeft', !0)) - Un(Pn(a, b, 'paddingRight', !0)))) : 'height' === c ? d = (Vn(a, b), w((b.clientHeight | 0) - Un(Pn(a, b, 'paddingTop', !0)) - Un(Pn(a, b, 'paddingBottom', !0)))) : 'clientWidth' === c ? d = b.clientWidth | 0 : 'clientHeight' === c ? d = b.clientHeight | 0 : 'offsetWidth' === c ? d = (b.offsetWidth || 0) | 0 : 'offsetHeight' === c && (d = (b.offsetHeight || 0) | 0);
return d;
}
function Un(a) {
return (a = Oc(Uc(a), '[^\\d\\.\\-]+.*$', '')) ? xc(a) : 0;
}
function Cm(a, b, c) {
a && null != b && (b = Qn(b), kc(b, new $wnd.RegExp('^(^[A-Z]+$)$')) && (b = (y(), b).toLowerCase()), b = Wn(b), null == c || 0 == Rb(Uc(c)).length ? a.style[b] = '' : (kc(c, new $wnd.RegExp('^(-?[\\d\\.]+)$')) && !Nn.test(b) && (c += 'px'), a.style[b] = c));
}
function Xn() {
Mn();
}
r(520, 1, {}, Xn);
var Nn, On, Yn = C(520);
function Em() {
Em = k;
$doc.location.href.indexOf('_force_no_native');
Sn = {};
an(Sn, 'visible', new Zn());
an(Sn, 'hidden', new $n());
an(Sn, 'selected', new ao());
an(Sn, 'input', new bo());
an(Sn, 'header', new co());
}
function eo(a, b) {
var c, d, e, f, g;
g = [];
d = 0;
f = a.length;
for (e = 0; d < f; d++)
if (c = a[d], b.gc(c, d)) {
var l = e++;
km(g, G(l), c);
}
return g;
}
function rm(a, b, c) {
var d, e, f, g, l, m, n;
if (a.c.test(b))
for (; g = a.c.exec(b);)
b = g[1] + ':' + g[3], g[3] === g[2] || (b += ':' + g[2]), b += '' + g[4];
if (a.b.test(b)) {
l = [];
b = Rc(Uc(b), '\\s*,\\s*');
g = 0;
for (n = b.length; g < n; ++g) {
m = b[g];
(d = a.b.exec(m)) ? (m = 0 == (y(), d[1]).length ? '*' : d[1], f = d[2], (d = Rn(Sn, xb(f.toLowerCase()))) ? e = eo(rm(a, m, c), d) : a.c.test(f) ? e = rm(a, m, c) : e = rm(a, m + '[type=' + f + ']', c)) : e = rm(a, m, c);
var p = l;
m = e;
var v = void 0, x = void 0, D = d = x = void 0, L = void 0;
f = void 0;
f = p ? p : [];
d = {};
for (x = 0; p && x < p.length; x++)
v = p[x], km(d, G(zb(v)), G(1));
x = 0;
L = m.length;
for (D = f.length; x < L; x++)
v = m[x], d[G(zb(v))] || (p = m[x], v = D++, km(f, G(v), p));
}
return l;
}
a = b;
try {
l = (Em(), c.querySelectorAll(a));
} catch (P) {
if (P = ec(P), A(P, 13))
e = P, c = (Ll(), Nl), a = 'GwtQuery: Selector \'' + a + '\' is unsupported in this SelectorEngineNativeMin engine. Do not use this syntax or configure your module to use a JS fallback. ' + e.pb(), c.a.jc(xn(z(u(I, 1), h, 1, 5, [a]))), l = null;
else
throw P.backingJsObject;
}
return l;
}
function tm() {
Em();
this.b = /(.*):((visible|hidden|selected|input|header)|((button|checkbox|file|hidden|image|password|radio|reset|submit|text)\s*(,|$)))(.*)/i;
this.c = /(.*):([\w]+):(disabled|checked|enabled|empty|focus)\s*([:,].*|$)/i;
nc(fo);
Fm = new Xn();
nc(Yn);
}
r(129, 1, {}, tm);
_.a = !0;
var Sn, Fm;
C(129);
function Zn() {
}
r(521, 67, sa, Zn);
_.gc = function (a) {
return 0 < ((a.offsetWidth || 0) | 0) + ((a.offsetHeight || 0) | 0) && !Wc('none', Pn((Em(), Fm), a, 'display', !0));
};
C(521);
function $n() {
}
r(522, 67, sa, $n);
_.gc = function (a, b) {
return !Rn((Em(), Sn), xb('visible')).gc(a, b);
};
C(522);
function ao() {
}
r(523, 67, sa, ao);
_.gc = function (a) {
return !!a.selected;
};
C(523);
function bo() {
}
r(524, 67, sa, bo);
_.gc = function (a) {
return kc(Rb(a.nodeName).toLowerCase(), new $wnd.RegExp('^(input|select|textarea|button)$'));
};
C(524);
function co() {
}
r(525, 67, sa, co);
_.gc = function (a) {
return kc(Rb(a.nodeName).toLowerCase(), new $wnd.RegExp('^(h\\d)$'));
};
C(525);
var fo = C(null);
function lm(a, b) {
return go([a && a[b]]);
}
function ho(a) {
var b = (y(), 'changes');
a = a[b];
return '[object Array]' == Object.prototype.toString.call(a) ? a : null;
}
function Jm(a) {
if ('number' == typeof a.length)
return a.length;
var b, c = 0;
for (b in a)
'__gwt_ObjectId' != b && c++;
return c;
}
function km(a, b, c) {
pb(c) ? c = yb((t(c), c)) : A(c, 83) && (c = Bc(c));
a[b] = c;
}
function go(a) {
if ('object' == typeof a && 1 == a.length) {
a = a[0];
var b = typeof a;
if ('boolean' == b)
return B(), a ? hc : gc;
if ('number' == b)
return a;
}
return a || null;
}
function Rn(a, b) {
return lm(a, G(b));
}
function an(a, b, c) {
km(a, G(kb(b)), c);
}
function bm(a, b) {
xm(a, z(u(wb, 1), h, 0, 2, [b]));
}
function xm(a, b) {
var c, d, e;
d = 0;
for (e = b.length; d < e; ++d)
if (c = b[d], A(c, 83)) {
var f = G(Jm(a));
c = Bc(c);
a[f] = c;
} else
pb(c) ? (f = G(Jm(a)), c = yb((t(c), c)), a[f] = c) : km(a, G(Jm(a)), c);
return a;
}
function Wn(a) {
return a.replace(/\-(\w)/g, function (a, c) {
return c.toUpperCase();
});
}
function fm(a, b) {
var c = b.split('.'), d;
for (d in c) {
if (!(a && c[d] in a))
return !1;
a = a[c[d]];
}
return !0;
}
function gm(a) {
return '[object Array]' == Object.prototype.toString.call(a) || 'number' == typeof a.length;
}
function Zl(a) {
return !!a && 'nodeType' in a && 'nodeName' in a;
}
function dm(a) {
return '[object Function]' == Object.prototype.toString.call(a);
}
function T(a, b) {
return a ? lm(a, b) : null;
}
function io(a, b, c) {
return jo(a, b, xm([], c));
}
function jo(a, b, c) {
var d = a || $wnd;
b = b.split('.');
for (var e in b)
if (a = d, d = d[b[e]], !d)
return null;
return dm(d) && go([d.apply(a, c)]);
}
function em(a) {
Il.call(this);
dm(a) && (this.a = a);
}
r(122, 16, {
16: 1,
244: 1
}, em);
_.bb = function (a) {
return sb(this.a) === sb(a);
};
_.tb = ko;
_.dc = ko;
_.db = function () {
return zb(this.a);
};
_.a = null;
C(122);
function ym(a) {
var b, c, d, e, f;
f = [];
b = {};
for (d = 0; d < a.length; d++)
c = a[d], e = zb(c), b[G(e)] || (e = G(e), b[e] = 1, f[f.length] = c);
return f;
}
function lo() {
lo = k;
Ll();
Zm(mo, new no());
nc(mo);
nc(mo);
}
function oo(a) {
lo();
Vm.call(this, a);
}
r(161, 25, ra, oo);
var mo = C(161);
function Ql() {
Ql = k;
lo();
Zm(po, new qo());
}
function ro(a) {
Ql();
oo.call(this, a);
}
r(513, 161, ra, ro);
var po = C(513);
function qo() {
}
r(514, 1, ua, qo);
_.lc = function (a) {
return new ro(a);
};
C(514);
function Rl() {
Rl = k;
Ll();
Zm(so, new to());
}
function uo(a) {
Rl();
Vm.call(this, a);
}
r(199, 25, ra, uo);
var so = C(199);
function to() {
}
r(369, 1, ua, to);
_.lc = function (a) {
return new uo(a);
};
C(369);
function no() {
}
r(515, 1, ua, no);
_.lc = function (a) {
return new oo(a);
};
C(515);
function Tl() {
Tl = k;
lo();
Zm(vo, new wo());
}
function xo(a) {
Tl();
oo.call(this, a);
}
r(516, 161, ra, xo);
var vo = C(516);
function wo() {
}
r(517, 1, ua, wo);
_.lc = function (a) {
return new xo(a);
};
C(517);
var ln = vc();
function mn() {
this.a = {};
}
r(630, 79, ta, mn);
C(630);
function yo(a, b) {
var c, d, e;
d = 0;
for (e = b.length; d < e; ++d)
c = b[d], a.a || !a.f || !c || a.d && -1 != zo(a.f, c) || Ud(a.f, c), a.b && a.e && Ao(c, Bo(a.e));
}
function Co(a) {
a.f = null;
a.a = !0;
}
function Do(a, b) {
var c, d;
if (!a.a && (a.a = a.c, a.b && (a.e = new Eo(new $l(b))), a.f))
for (d = new $k(a.f); d.a < d.c.a.length && (c = al(d), Ao(c, b) || !a.g););
}
function Ao(a, b) {
var c;
null != b && 1 == b.length && null != b[0] && 0 != (jb(b[0]).e & 4) && (b = ac(b[0]));
return A(a, 16) ? (c = a.ec(b), !pb(c) || yb((t(c), c))) : !0;
}
function Fo(a) {
this.f = new Rd();
this.c = -1 != (y(), a).indexOf('once');
this.b = -1 != a.indexOf('memory');
this.d = -1 != a.indexOf('unique');
this.g = -1 != a.indexOf('stopOnFalse');
}
r(168, 1, {}, Fo);
_.a = !1;
_.b = !1;
_.c = !1;
_.d = !1;
_.e = null;
_.g = !1;
C(168);
function Go() {
this.a = new Fo('memory');
this.c = new Fo('once memory');
this.d = new Fo('once memory');
yo(this.d, z(u(Jl, 1), h, 16, 0, [new Ho(this)]));
yo(this.c, z(u(Jl, 1), h, 16, 0, [new Io(this)]));
}
r(201, 1, {}, Go);
_.eb = function () {
var a = 'Deferred this=' + zb(this) + ' promise=' + (!this.b && (this.b = new Jo(this)), zb(this.b)) + ' state=' + this.b.a.e + ' restatus=', b;
b = this.d;
b = 'stack=' + (b.f ? G(b.f.a.length) : 'null') + ' ' + b.a;
return a + b;
};
_.b = null;
_.e = 'pending';
C(201);
function Ho(a) {
this.a = a;
Il.call(this);
}
r(374, 16, qa, Ho);
_.dc = function () {
this.a.e = 'resolved';
Co(this.a.d);
var a = this.a.a;
a.b || Co(a);
a.f = null;
};
C(374);
function Io(a) {
this.a = a;
Il.call(this);
}
r(375, 16, qa, Io);
_.dc = function () {
this.a.e = 'rejected';
Co(this.a.c);
var a = this.a.a;
a.b || Co(a);
a.f = null;
};
C(375);
function Jo(a) {
new Ko(this);
new Lo(this);
this.a = a;
}
r(96, 1, {
722: 1,
96: 1
}, Jo);
_.eb = function () {
return 'Promise this=' + zb(this) + ' ' + this.a;
};
C(96);
function Ko(a) {
this.a = a;
Il.call(this);
}
r(372, 16, qa, Ko);
_.dc = function () {
var a = this.a.a;
'pending' == a.e && Do(a.d, this.e);
};
C(372);
function Lo(a) {
this.a = a;
Il.call(this);
}
r(373, 16, qa, Lo);
_.dc = function () {
var a = this.a.a;
'pending' == a.e && Do(a.c, this.e);
};
C(373);
function Mo(a, b, c) {
if (0 == b) {
var d = a.b;
'pending' == d.e && Do(d.d, c);
}
1 == b && (d = a.b, 'pending' == d.e && Do(d.c, c));
2 == b && (a = a.b, 'pending' == a.e && Do(a.a, c));
}
function No(a, b, c) {
Il.call(this);
this.d = c;
this.c = b.length > this.d ? b[this.d] : null;
this.b = a;
this.a = !1;
}
r(150, 16, qa, No);
_.dc = function () {
var a, b;
b = this.e;
if (this.c)
if (a = this.c, a.e = b, a = a.ec(b), A(a, 96))
b = a, 2 == this.d ? (a = z(u(Jl, 1), h, 16, 0, [new Oo(this)]), yo(b.a.a, a)) : (a = z(u(Jl, 1), h, 16, 0, [new Po(this, b)]), yo(b.a.d, a), yo(b.a.c, a));
else {
var c = (B(), hc), d = a;
a = (t(c), c === d) ? b : null != a && 0 != (jb(a).e & 4) ? ac(a) : a;
Mo(this, this.d, z(u(I, 1), h, 1, 5, [a]));
}
else
Mo(this, this.d, b);
};
_.a = !1;
_.d = 0;
C(150);
function Oo(a) {
this.a = a;
Il.call(this);
}
r(370, 16, qa, Oo);
_.dc = function () {
Mo(this.a, 2, this.e);
};
C(370);
function Po(a, b) {
this.a = a;
this.b = b;
Il.call(this);
}
r(371, 16, qa, Po);
_.dc = function () {
Mo(this.a, (0 == this.a.d || 1 == this.a.d && this.a.a) && 'resolved' === this.b.a.e ? 0 : 1, this.e);
};
C(371);
function Im() {
Im = k;
Qo = new zg();
K(Qo, Ro, new So());
K(Qo, To, new So());
}
var Ro = 'mouseenter', To = 'mouseleave', Qo;
r(562, 1, {});
C(562);
function So() {
new Uo();
new Vo();
}
r(236, 562, {}, So);
C(236);
function Vo() {
Il.call(this);
}
r(563, 16, qa, Vo);
C(563);
function Uo() {
Il.call(this);
}
r(564, 16, qa, Uo);
C(564);
function Wo() {
Wo = k;
Rl();
Xo = new zg();
Yo = new zg();
Zo = Zm($o, new ap());
}
function bp(a) {
Wo();
uo.call(this, a);
}
function cp(a, b) {
function c(b) {
var c, f, g, l, m = nn, n = {};
km(n, (y(), 'changes'), b);
b = (!Kl && (Kl = new gn()), jn(m));
hn(b, n);
A(a, 16) ? a.ec(z(Zb(I), h, 1, 5, [(c = ho(b.a), f = c ? c.length : 0, new $l(fn(c, Ib(pn, {
727: 1,
3: 1,
4: 1
}, 705, f, 0), pn)))])) : A(a, 149) && (c = (g = ho(b.a), l = g ? g.length : 0, fn(g, Ib(rn, {
728: 1,
3: 1,
4: 1
}, 706, l, 0), rn), a), dp(c), c.j.d.q.cf());
}
return b ? new $wnd.MutationObserver(c) : c;
}
r(200, 199, {
25: 1,
200: 1
}, bp);
var Zo, Xo, Yo, $o = C(200);
function ap() {
}
r(368, 1, ua, ap);
_.lc = function (a) {
return new bp(a);
};
C(368);
var nn = vc(), pn = vc(), rn = vc(), tn = vc(), vn = vc();
function qn() {
this.a = {};
}
r(632, 79, {
89: 1,
80: 1,
705: 1
}, qn);
C(632);
function on() {
this.a = {};
}
r(631, 79, {
89: 1,
80: 1,
720: 1
}, on);
C(631);
function sn() {
this.a = {};
}
r(633, 79, {
89: 1,
80: 1,
706: 1
}, sn);
C(633);
function un() {
this.a = {};
}
r(634, 79, {
89: 1,
80: 1,
719: 1
}, un);
C(634);
function wn() {
this.a = {};
}
r(635, 79, ta, wn);
C(635);
function ep(a, b) {
if (a && !a._)
if (b)
if (A(b, 112))
b.Tc(a);
else if (A(b, 42))
try {
b.Lc(a);
} catch (n) {
if (n = ec(n), A(n, 30))
a.Jc(b);
else
throw n.backingJsObject;
}
else
a.Jc(b);
else {
a: {
var c, d, e;
d = Ug((S(), a.ab));
for (c = $doc.body; d && c != d;) {
if (Wm(d)) {
b: {
e = 0;
for (var f = void 0, g = void 0, l = void 0, m = void 0, f = void 0, g = Wl(d).c, l = 0, m = g.length; l < m; ++l)
if (f = g[l], f = om(f)) {
if (0 == e) {
e = f;
break b;
}
--e;
}
e = null;
}
if (e) {
b = e;
break a;
}
}
d = Vg((M(), d));
}
b = null;
}
b ? ep(a, b) : (fp(), Km(gp, a), a.Fc());
}
}
r(137, 1, {
729: 1,
137: 1
}, function (a) {
this.a = a;
});
_.bb = function (a) {
return A(a, 137) ? this.a === a.a : !1;
};
_.db = hd;
_.eb = function () {
return 'safe: "' + this.a + '"';
};
C(137);
function hp() {
hp = k;
}
function ip(a, b) {
this.a = a;
this.b = b;
}
r(181, 1, { 181: 1 }, ip);
_.bb = function (a) {
return A(a, 181) ? this.a == a.a && this.b == a.b : !1;
};
_.db = function () {
return w(this.a) ^ w(this.b);
};
_.eb = function () {
return 'Point(' + this.a + ',' + this.b + ')';
};
_.a = 0;
_.b = 0;
C(181);
function S() {
S = k;
jp = 1 == ab ? new kp() : new lp();
}
function mp(a) {
S();
return xh(a);
}
function np(a, b, c) {
S();
b == op && 8192 == pp((M(), a).type) && (op = null);
c.nc(a);
}
function qp(a) {
S();
return jp.oc(a, 0);
}
function rp(a) {
S();
return fh((M(), a));
}
function sp(a) {
S();
return Vg((M(), a));
}
function tp(a) {
S();
var b;
var c = up, d, e, f;
vp && c && wp(c.a.d, vp) ? (b = xp.a, d = xp.b, e = xp.c, f = xp.d, yp(xp), xp.d = a, Wk(c, xp), c = !(xp.a && !xp.b), xp.a = b, xp.b = d, xp.c = e, xp.d = f, b = c) : b = !0;
!b && a && ((M(), a).stopPropagation(), N.Bb(a));
return b;
}
function zp(a) {
S();
return a.__gwt_resolve ? a.__gwt_resolve() : a;
}
function Ap(a, b) {
S();
jp.uc(a, b);
}
function Bp(a, b) {
S();
jp.vc(a, b);
}
var jp, op;
function Cp(a) {
return S(), pp((M(), a).type);
}
function Dp(a) {
S();
Ep(jp);
!vp && (vp = new vk());
up || (up = new dl(null, !0), xp = new Fp());
return Rk(up, vp, a);
}
var up;
function yp(a) {
a.f = !1;
a.g = null;
a.a = !1;
a.b = !1;
a.c = !0;
a.d = null;
}
function Fp() {
}
r(330, 672, {}, Fp);
_.Pb = function (a) {
a.mc(this);
xp.c = !1;
};
_.Qb = function () {
return vp;
};
_.Sb = function () {
yp(this);
};
_.a = !1;
_.b = !1;
_.c = !1;
var vp, xp;
C(330);
function Gp() {
Gp = k;
new Hp();
Ip = new Jp();
Kp = Lp();
}
function Lp() {
var a;
a = (Mp(), Np).wc();
return null == a || 0 == (y(), a).length ? '' : $wnd.decodeURI((y(), a).substr(1, a.length - 1).replace('%23', '#'));
}
function Op() {
Gp();
var a;
a = Lp();
a !== Kp && (Kp = a, Pk(Ip, a));
}
var Ip, Kp;
function Jp() {
this.a = new cl(null);
}
r(643, 1, { 21: 1 }, Jp);
_.Xb = function (a) {
Wk(this.a, a);
};
C(643);
function Hp() {
var a;
a = Pd(Op);
$wnd.addEventListener('hashchange', a, !1);
}
r(644, 1, {}, Hp);
C(644);
function Mp() {
Mp = k;
Np = 0 == ab ? new Pp() : new Qp();
}
function Rp(a, b) {
return Rk((!Sp && (Sp = new Tp()), Sp), a, b);
}
function Up() {
Mp();
var a;
Vp && (a = new Wp(), Sp && Wk(Sp, a));
return null;
}
var Vp = !1, Sp, Np, Xp = 0, Yp = 0, Zp = !1;
function $p() {
$p = k;
aq = new vk();
}
function Wp() {
$p();
}
r(489, 672, {}, Wp);
_.Pb = bq;
_.Qb = function () {
return aq;
};
var aq;
C(489);
function Tp() {
dl.call(this, null, !1);
}
r(157, 59, { 21: 1 }, Tp);
C(157);
function pp(a) {
switch (a) {
case 'blur':
return 4096;
case 'change':
return 1024;
case 'click':
return 1;
case 'dblclick':
return 2;
case 'focus':
return 2048;
case 'keydown':
return 128;
case 'keypress':
return 256;
case 'keyup':
return 512;
case 'load':
return 32768;
case 'losecapture':
return 8192;
case 'mousedown':
return 4;
case 'mousemove':
return 64;
case 'mouseout':
return 32;
case 'mouseover':
return 16;
case 'mouseup':
return 8;
case 'scroll':
return 16384;
case 'error':
return 65536;
case 'DOMMouseScroll':
case 'mousewheel':
return 131072;
case 'contextmenu':
return 262144;
case 'paste':
return 524288;
case 'touchstart':
return 1048576;
case 'touchmove':
return 2097152;
case 'touchend':
return 4194304;
case 'touchcancel':
return 8388608;
case 'gesturestart':
return 16777216;
case 'gesturechange':
return 33554432;
case 'gestureend':
return 67108864;
default:
return -1;
}
}
function Ep(a) {
cq || (a.qc(), cq = !0);
}
function Wm(a) {
a = a.__listener;
return !Yb(a) && A(a, 20) ? a : null;
}
r(104, 1, va);
var cq = !1;
C(104);
function dq() {
dq = k;
eq = {
_default_: fq,
dragenter: gq,
dragover: gq
};
hq = {
click: iq,
dblclick: iq,
mousedown: iq,
mouseup: iq,
mousemove: iq,
mouseover: iq,
mouseout: iq,
mousewheel: iq,
keydown: jq,
keyup: jq,
keypress: jq,
touchstart: iq,
touchend: iq,
touchmove: iq,
touchcancel: iq,
gesturestart: iq,
gestureend: iq,
gesturechange: iq
};
}
function kq() {
lq = Pd(fq);
mq = Pd(nq);
var a = eq;
oq(a, function (b, d) {
a[b] = Pd(d);
});
var b = hq;
oq(b, function (a, d) {
b[a] = Pd(d);
});
oq(b, function (a, b) {
$wnd.addEventListener(a, b, !0);
});
}
function pq(a, b) {
var c = (a.__eventBits || 0) ^ b;
a.__eventBits = b;
c && (c & 1 && (a.onclick = b & 1 ? lq : null), c & 2 && (a.ondblclick = b & 2 ? lq : null), c & 4 && (a.onmousedown = b & 4 ? lq : null), c & 8 && (a.onmouseup = b & 8 ? lq : null), c & 16 && (a.onmouseover = b & 16 ? lq : null), c & 32 && (a.onmouseout = b & 32 ? lq : null), c & 64 && (a.onmousemove = b & 64 ? lq : null), c & 128 && (a.onkeydown = b & 128 ? lq : null), c & 256 && (a.onkeypress = b & 256 ? lq : null), c & 512 && (a.onkeyup = b & 512 ? lq : null), c & 1024 && (a.onchange = b & 1024 ? lq : null), c & 2048 && (a.onfocus = b & 2048 ? lq : null), c & 4096 && (a.onblur = b & 4096 ? lq : null), c & 8192 && (a.onlosecapture = b & 8192 ? lq : null), c & 16384 && (a.onscroll = b & 16384 ? lq : null), c & 32768 && (a.onload = b & 32768 ? mq : null), c & 65536 && (a.onerror = b & 65536 ? lq : null), c & 131072 && (a.onmousewheel = b & 131072 ? lq : null), c & 262144 && (a.oncontextmenu = b & 262144 ? lq : null), c & 524288 && (a.onpaste = b & 524288 ? lq : null), c & 1048576 && (a.ontouchstart = b & 1048576 ? lq : null), c & 2097152 && (a.ontouchmove = b & 2097152 ? lq : null), c & 4194304 && (a.ontouchend = b & 4194304 ? lq : null), c & 8388608 && (a.ontouchcancel = b & 8388608 ? lq : null), c & 16777216 && (a.ongesturestart = b & 16777216 ? lq : null), c & 33554432 && (a.ongesturechange = b & 33554432 ? lq : null), c & 67108864 && (a.ongestureend = b & 67108864 ? lq : null));
}
function jq(a) {
tp(a);
}
function iq(a) {
dq();
if (tp(a) && qq) {
var b;
b = qq;
S();
var c;
(c = Wm(b)) ? (np(a, b, c), b = !0) : b = !1;
b && (M(), a).stopPropagation();
}
}
function gq(a) {
(M(), N).Bb(a);
fq(a);
}
function fq(a) {
var b;
for (b = (M(), N).yb(a); b && !Wm(b);)
b = b.parentNode;
b && np(a, 1 != b.nodeType ? null : b, Wm(b));
}
function nq(a) {
(M(), N).yb(a).__gwtLastUnhandledEvent = a.type;
fq(a);
}
r(684, 104, va);
_.oc = function (a, b) {
for (var c = 0, d = a.firstChild; d;) {
if (1 == d.nodeType) {
if (b == c)
return d;
++c;
}
d = d.nextSibling;
}
return null;
};
_.pc = function (a) {
var b = 0;
for (a = a.firstChild; a;)
1 == a.nodeType && ++b, a = a.nextSibling;
return b;
};
_.qc = function () {
kq();
};
_.rc = function (a, b, c) {
for (var d = 0, e = a.firstChild, f = null; e;) {
if (1 == e.nodeType) {
if (d == c) {
f = e;
break;
}
++d;
}
e = e.nextSibling;
}
a.insertBefore(b, f);
};
_.sc = function (a) {
Ep(this);
qq == a && (qq = null);
};
_.tc = function (a) {
Ep(this);
qq = a;
};
_.uc = function (a, b) {
var c;
Ep(this);
c = eq;
a.addEventListener(b, c[b] || c._default_, !1);
};
_.vc = function (a, b) {
Ep(this);
pq(a, b);
};
var eq, qq, hq, lq, mq;
C(684);
function rq() {
rq = k;
dq();
hq.DOMMouseScroll = iq;
}
function sq() {
$wnd.addEventListener('mouseout', Pd(function (a) {
var b = (dq(), qq);
if (b && !a.relatedTarget && 'html' == a.target.tagName.toLowerCase()) {
var c = $doc.createEvent('MouseEvents');
c.initMouseEvent('mouseup', !0, !0, $wnd, 0, a.screenX, a.screenY, a.clientX, a.clientY, a.ctrlKey, a.altKey, a.shiftKey, a.metaKey, a.button, null);
b.dispatchEvent(c);
}
}), !0);
}
function lp() {
rq();
}
r(533, 684, va, lp);
_.qc = function () {
kq();
sq();
};
_.vc = function (a, b) {
Ep(this);
pq(a, b);
b & 131072 && a.addEventListener('DOMMouseScroll', (dq(), lq), !1);
};
C(533);
r(685, 684, va);
C(685);
function kp() {
dq();
}
r(534, 685, va, kp);
C(534);
function oq(a, b) {
for (var c in a)
a.hasOwnProperty(c) && b(c, a[c]);
}
function tq() {
var a = $wnd.onbeforeunload, b = $wnd.onunload;
$wnd.onbeforeunload = function (b) {
var d;
try {
d = Pd(Up)();
} finally {
b = a && a(b);
}
if (null != d)
return d;
if (null != b)
return b;
};
$wnd.onunload = Pd(function (a) {
try {
Mp(), Vp && Jk((!Sp && (Sp = new Tp()), Sp));
} finally {
b && b(a), $wnd.onresize = null, $wnd.onscroll = null, $wnd.onbeforeunload = null, $wnd.onunload = null;
}
});
}
function uq() {
var a = $wnd.onresize;
$wnd.onresize = Pd(function (b) {
try {
Mp();
var c, d;
if (Zp && (d = Jh(), c = Ih(), Yp != d || Xp != c)) {
Yp = d;
Xp = c;
var e = (!Sp && (Sp = new Tp()), Sp), f;
Nk && (f = new Lk(), Wk(e, f));
}
} finally {
a && a(b);
}
});
}
function Qp() {
}
r(176, 1, { 176: 1 }, Qp);
_.wc = function () {
return $wnd.location.hash;
};
C(176);
function Pp() {
}
r(628, 176, { 176: 1 }, Pp);
_.wc = function () {
var a = $wnd.location.href, b = a.indexOf('#');
return 0 < b ? a.substring(b) : '';
};
C(628);
function vq() {
vq = k;
}
function wq(a, b) {
xq(a.xc(), b, !0);
}
function Q(a) {
return S(), a.ab;
}
function yq(a, b) {
zq(a, Aq((Bq(), Cq).dd(rp((S(), a.ab)))) + '-' + b, !1);
}
function Dq(a, b) {
xq(a.xc(), b, !1);
}
function Eq(a, b) {
(S(), a.ab).style.height = b;
}
function zq(a, b, c) {
xq(a.xc(), b, c);
}
function Aq(a) {
vq();
var b;
a = a.className || '';
b = Nc(a, Xc(32));
return 0 <= b ? (y(), a).substr(0, b) : a;
}
function xq(a, b, c) {
vq();
if (!a)
throw new Ub('Null widget handle. If you are creating a composite, ensure that initWidget() has been called.').backingJsObject;
b = Uc(b);
if (0 == (y(), b).length)
throw new F('Style names cannot be empty').backingJsObject;
c ? Zg(a, b) : lh(a, b);
}
function Fq(a, b) {
vq();
if (!a)
throw new Ub('Null widget handle. If you are creating a composite, ensure that initWidget() has been called.').backingJsObject;
b = Uc(b);
if (0 == (y(), b).length)
throw new F('Style names cannot be empty').backingJsObject;
var c = b, d = (a.className || '').split(/\s+/);
if (d) {
var e = d[0], f = e.length;
d[0] = c;
for (var g = 1, l = d.length; g < l; g++) {
var m = d[g];
m.length > f && '-' == m.charAt(f) && 0 == m.indexOf(e) && (d[g] = c + m.substring(f));
}
a.className = d.join(' ');
}
}
r(19, 1, {
23: 1,
19: 1
});
_.xc = function () {
return Q(this);
};
_.yc = Gq;
_.zc = function (a) {
Eq(this, a);
};
_.Ac = function (a) {
(S(), this.ab).style.width = a;
};
_.eb = function () {
var a;
this.ab ? (a = (S(), this.ab), a = (M(), N).Nb(a)) : a = '(null handle)';
return a;
};
C(19);
function Hq(a, b, c) {
var d;
d = c.b;
d = pp((S(), d));
-1 == d ? (d = c.b, Ap((S(), a.ab), d)) : a.Kc(d);
Rk(a.$ ? a.$ : a.$ = new cl(a), c, b);
}
function Iq(a, b, c) {
return Rk(a.$ ? a.$ : a.$ = new cl(a), c, b);
}
function Jq(a, b) {
a.$ && Wk(a.$, b);
}
function Kq(a) {
var b;
if (a.Ec())
throw new Lq('Should only call onAttach when the widget is detached from the browser\'s document').backingJsObject;
a.Y = !0;
S();
a.ab.__listener = a;
b = a.Z;
a.Z = -1;
0 < b && a.Kc(b);
a.Cc();
a.Hc();
}
function Mq(a, b) {
var c;
switch (S(), pp((M(), b).type)) {
case 16:
case 32:
if ((c = N.zb(b)) && Wg(a.ab, c))
return;
}
c = a.ab;
var d, e, f, g;
if (kk && (d = (M(), b).type, d = kk.a[d]))
for (g = d.Mc(); g.Xc();)
f = g.Yc(), d = f.a.d, e = f.a.e, f.a.d = b, f.a.e = c, Jq(a, f.a), f.a.d = d, f.a.e = e;
}
function Nq(a) {
if (!a.Ec())
throw new Lq('Should only call onDetach when the widget is attached to the browser\'s document').backingJsObject;
try {
a.Ic();
} finally {
try {
a.Dc();
} finally {
S(), a.ab.__listener = null, a.Y = !1;
}
}
}
function pm(a) {
if (!a._) {
if (fp(), Oq(gp, a)) {
fp();
try {
a.Gc();
} finally {
gp.a.xf(a);
}
}
} else if (A(a._, 42))
a._.Nc(a);
else if (a._)
throw new Lq('This widget\'s parent does not implement HasWidgets').backingJsObject;
}
function Pq(a, b) {
var c;
c = a._;
if (b) {
if (c)
throw new Lq('Cannot set a new parent without first clearing the old parent').backingJsObject;
a._ = b;
b.Ec() && a.Fc();
} else
try {
c && c.Ec() && a.Gc();
} finally {
a._ = null;
}
}
r(17, 19, wa);
_.Bc = function () {
return this;
};
_.Cc = Qq;
_.Dc = Qq;
_.Xb = function (a) {
Jq(this, a);
};
_.Ec = function () {
return this.Y;
};
_.Fc = function () {
Kq(this);
};
_.nc = function (a) {
Mq(this, a);
};
_.Gc = Rq;
_.Hc = Qq;
_.Ic = Qq;
_.Jc = function (a) {
Pq(this, a);
};
_.Kc = Sq;
_.Y = !1;
_.Z = 0;
var Tq = C(17);
r(668, 17, xa);
_.Lc = function () {
throw new Uq('This panel does not support no-arg add()').backingJsObject;
};
_.Cc = function () {
Vq(this, (Wq(), Xq));
};
_.Dc = function () {
Vq(this, (Wq(), Yq));
};
C(668);
function Zq(a, b) {
var c;
if (b._ != a)
return !1;
try {
Pq(b, null);
} finally {
c = (S(), b.ab);
Vg((M(), c)).removeChild(c);
c = a.b;
var d;
d = $q(c, b);
if (-1 == d)
throw new od().backingJsObject;
if (0 > d || d >= c.c)
throw new Cc().backingJsObject;
for (--c.c; d < c.c; ++d)
c.a[d] = c.a[d + 1];
c.a[c.c] = null;
}
return !0;
}
r(190, 668, xa);
_.Mc = function () {
return new ar(this.b);
};
_.Nc = function (a) {
return Zq(this, a);
};
C(190);
function br(a, b) {
var c = (S(), a.ab);
pm(b);
var d = a.b;
cr(d, b, d.c);
S();
d = zp(b.ab);
c.appendChild(d);
Pq(b, a);
}
function dr(a, b) {
var c;
if (c = Zq(a, b)) {
var d = (S(), b.ab);
d.style.left = '';
d.style.top = '';
d.style.position = '';
}
return c;
}
r(491, 190, xa);
_.Lc = function (a) {
br(this, a);
};
_.Nc = function (a) {
return dr(this, a);
};
C(491);
function Wq() {
Wq = k;
Fb();
Xq = new er();
Yq = new fr();
}
function gr(a) {
bl.call(this, a);
}
function Vq(a, b) {
Wq();
var c, d, e;
c = null;
for (e = a.Mc(); e.Xc();) {
d = e.Yc();
try {
b.Oc(d);
} catch (f) {
if (f = ec(f), A(f, 11))
d = f, !c && (c = new Yk()), c.a.wf(d, c);
else
throw f.backingJsObject;
}
}
if (c)
throw new gr(c).backingJsObject;
}
r(319, 192, pa, gr);
var Xq, Yq;
C(319);
function er() {
}
r(320, 1, {}, er);
_.Oc = function (a) {
a.Fc();
};
C(320);
function fr() {
}
r(321, 1, {}, fr);
_.Oc = function (a) {
a.Gc();
};
C(321);
function hr() {
hr = k;
vq();
ir = (jr(), jr(), kr);
}
r(377, 17, ya);
_.Pc = function () {
return jh((S(), this.ab));
};
_.Fc = function () {
Kq(this);
-1 == this.Pc() && this.Rc(0);
};
_.Qc = function (a) {
a ? ir.ad((S(), this.ab)) : ir.$c((S(), this.ab));
};
_.Rc = function (a) {
(S(), this.ab).tabIndex = a;
};
var ir;
C(377);
r(202, 377, ya);
C(202);
function lr() {
hr();
var a;
a = $doc;
a = (M(), N).ub(a, 'button');
this.ab = (S(), a);
(S(), this.ab).className = 'gwt-Button';
}
r(164, 202, ya, lr);
C(164);
function mr(a) {
return a.Y ? (B(), a.a.checked ? hc : gc) : (B(), a.a.defaultChecked ? hc : gc);
}
function nr(a, b, c) {
var d;
null == b && (b = (B(), gc));
d = a.Y ? (B(), a.a.checked ? hc : gc) : (B(), a.a.defaultChecked ? hc : gc);
var e = yb((t(b), b));
a.a.checked = e;
e = yb((t(b), b));
a.a.defaultChecked = e;
t(b);
b != d && c && Pk(a, b);
}
function or() {
hr();
S();
var a = $doc, b, a = (b = (M(), a).createElement('INPUT'), b.type = 'checkbox', b.value = 'on', b);
b = (S(), zh());
this.ab = (S(), b);
this.a = a;
b = $doc;
this.b = (M(), b).createElement('label');
this.ab.appendChild(this.a);
this.ab.appendChild(this.b);
b = Fh();
this.a.id = b;
this.b.htmlFor = b;
new pr(this.b);
this.a && (this.a.tabIndex = 0);
this.ab.className = 'gwt-CheckBox';
}
r(119, 202, {
27: 1,
21: 1,
20: 1,
119: 1,
113: 1,
23: 1,
24: 1,
19: 1,
17: 1
}, or);
_.Pc = function () {
return jh(this.a);
};
_.Hc = function () {
S();
this.a.__listener = this;
};
_.Ic = function () {
S();
this.a.__listener = null;
nr(this, this.Y ? (B(), this.a.checked ? hc : gc) : (B(), this.a.defaultChecked ? hc : gc), !1);
};
_.Qc = function (a) {
a ? this.a.focus() : this.a.blur();
};
_.Rc = function (a) {
this.a && (this.a.tabIndex = a);
};
_.Kc = function (a) {
if (-1 == this.Z) {
var b = this.a, c;
c = this.a;
c = (S(), c.__eventBits || 0);
Bp(b, a | c);
} else
-1 == this.Z ? Bp((S(), this.ab), a | (this.ab.__eventBits || 0)) : this.Z |= a;
};
_.c = !1;
C(119);
function qr(a) {
this.a = a;
}
r(378, 1, Aa, qr);
_.Ub = function () {
Pk(this.a, mr(this.a));
};
C(378);
function rr(a, b) {
var c;
if (a.X)
throw new Lq('Composite.initWidget() may only be called once.').backingJsObject;
if (!b)
throw new Jc('widget cannot be null').backingJsObject;
pm(b);
c = (S(), b.ab);
a.ab = c;
sr();
var d;
S();
try {
d = !!c && !!c.__gwt_resolve;
} catch (e) {
d = !1;
}
d && (sr(), c.__gwt_resolve = tr(a));
a.X = b;
Pq(b, a);
}
function ur(a) {
return a.X ? a.X.Ec() : !1;
}
function vr(a) {
if (!a.X)
throw new Lq('initWidget() is not called yet').backingJsObject;
-1 != a.Z && (a.X.Kc(a.Z), a.Z = -1);
a.X.Fc();
S();
a.ab.__listener = a;
a.Cc();
}
function wr(a) {
try {
a.Dc();
} finally {
a.X.Gc();
}
}
r(669, 17, Ba);
_.Ec = function () {
return ur(this);
};
_.Fc = function () {
vr(this);
};
_.nc = function (a) {
Mq(this, a);
this.X.nc(a);
};
_.Gc = function () {
wr(this);
};
_.yc = function () {
var a = this.X.yc();
this.ab = (S(), a);
return S(), this.ab;
};
C(669);
function pr(a) {
this.a = a;
this.c = this.b = ll(a);
}
r(237, 1, {}, pr);
C(237);
function xr() {
this.b = new yr(this);
var a = xh('div');
this.ab = (S(), a);
}
r(145, 190, xa, xr);
_.Lc = function (a) {
br(this, a);
};
C(145);
function zr(a, b) {
if (a.B)
throw new Lq('SimplePanel can only contain one child widget').backingJsObject;
a.Tc(b);
}
function Ar(a, b) {
if (a.B != b)
return !1;
try {
Pq(b, null);
} finally {
var c = a.Sc(), d = (S(), b.ab);
c.removeChild(d);
a.B = null;
}
return !0;
}
function Br(a, b) {
if (b != a.B && (b && pm(b), a.B && Ar(a, a.B), a.B = b)) {
S();
var c = a.Sc(), d = zp(Q(a.B));
c.appendChild(d);
Pq(b, a);
}
}
r(114, 668, Ca);
_.Lc = function (a) {
zr(this, a);
};
_.Sc = function () {
return S(), this.ab;
};
_.Mc = function () {
return new Cr(this);
};
_.Nc = function (a) {
return Ar(this, a);
};
_.Tc = function (a) {
Br(this, a);
};
C(114);
function Dr() {
Dr = k;
vq();
Er = (jr(), jr(), Fr);
}
var Er;
r(239, 17, wa);
C(239);
r(648, 239, wa);
C(648);
function Gr(a) {
vq();
var b = wh(), b = (Wc('span', (M(), b).tagName), b);
this.ab = (S(), b);
this.a = new pr(this.ab);
(S(), this.ab).className = 'gwt-HTML';
b = this.a;
b.a.innerHTML = a || '';
if (b.c != b.b)
switch (b.c = b.b, a = b.a, b.b.g) {
case 0:
a.dir = 'rtl';
break;
case 1:
a.dir = 'ltr';
break;
case 2:
ll(a) != (ml(), pl) && (a.dir = '');
}
}
r(240, 648, wa, Gr);
C(240);
function Hr(a, b, c) {
b.b && (pk(a, b), c && b.a && (pk(a, null), (Dr(), Er).$c((S(), a.ab)), a = b.a, Qg((Ig(), Jg), new Ir(a))));
}
function Jr(a, b, c) {
if (!b || b.b)
pk(a, b), c && a.e && (Dr(), Er).ad((S(), a.ab)), b && a.c && Hr(a, b, !1);
}
function Kr(a, b) {
var c;
a: {
c = (S(), (M(), N).Ab(b));
var d, e;
for (e = new $k(a.f); e.a < e.c.a.length;)
if (d = al(e), Wg((S(), d.ab), c)) {
c = d;
break a;
}
c = null;
}
switch (pp(b.type)) {
case 1:
(Dr(), Er).ad(a.ab);
c && Hr(a, c, !0);
break;
case 16:
c && Jr(a, c, !0);
break;
case 32:
c && Jr(a, null, !1);
break;
case 2048:
Lr(a);
break;
case 128:
switch (c = b.keyCode | 0, c) {
case 37:
Lr(a) || a.i || Mr(a);
b.stopPropagation();
N.Bb(b);
break;
case 39:
Lr(a) || !a.i && Nr(a);
b.stopPropagation();
N.Bb(b);
break;
case 38:
Lr(a) || a.i && Mr(a);
b.stopPropagation();
N.Bb(b);
break;
case 40:
Lr(a) || a.i && Nr(a);
b.stopPropagation();
N.Bb(b);
break;
case 27:
pk(a, null);
b.stopPropagation();
N.Bb(b);
break;
case 9:
pk(a, null);
break;
case 13:
Lr(a) || (Hr(a, a.g, !0), b.stopPropagation(), N.Bb(b));
}
}
Mq(a, b);
}
function Lr(a) {
var b, c;
if (!a.g) {
for (c = new $k(a.f); c.a < c.c.a.length;)
if (b = al(c), b.b) {
pk(a, b);
break;
}
return !0;
}
return !1;
}
function pk(a, b) {
var c;
if (b != a.g) {
a.g && (c = a.g, zq(c, Aq((S(), c.ab)) + '-selected', !1), a.i && (c = sp(Q(a.g)), S(), 2 == jp.pc(c) && (c = jp.oc(c, 1), xq(c, 'subMenuIcon-selected', !1))));
if (b) {
zq(b, Aq((S(), b.ab)) + '-selected', !0);
a.i && (c = sp(b.ab), 2 == jp.pc(c) && (c = jp.oc(c, 1), xq(c, 'subMenuIcon-selected', !0)));
Xe();
c = a.ab;
var d = new xe(b.ab), e = (Se(), Te), d = z(Zb(ye), h, 174, 0, [d]), f, g, l, m;
f = new Or();
l = 0;
for (m = d.length; l < m; ++l)
g = d[l], xd(xd(f, g.a), ' ');
d = Uc(f.a);
c.setAttribute(e.a, d);
}
a.g = b;
}
}
function Nr(a) {
var b, c, d;
if (a.g) {
for (b = c = zo(a.f, a.g);;)
if (c += 1, c == a.f.a.length && (c = 0), c == b) {
d = Pr(a.f, b);
break;
} else if (d = Pr(a.f, c), d.b)
break;
pk(a, d);
}
}
function Mr(a) {
var b, c, d;
if (a.g) {
for (b = c = zo(a.f, a.g);;)
if (--c, 0 > c && (c = a.f.a.length - 1), c == b) {
d = Pr(a.f, b);
break;
} else if (d = Pr(a.f, c), d.b)
break;
pk(a, d);
}
}
r(191, 17, wa);
_.nc = function (a) {
Kr(this, a);
};
_.Gc = Rq;
_.c = !1;
_.e = !0;
_.i = !1;
C(191);
function Ir(a) {
this.a = a;
}
r(322, 1, {}, Ir);
_.tb = function () {
Qr(this.a);
};
C(322);
function Rr(a) {
this.a = a;
}
r(323, 1, {
716: 1,
15: 1
}, Rr);
C(323);
function Sr() {
Sr = k;
hp();
}
function Tr(a, b) {
vq();
this.ab = (S(), Bh());
zq(this, Aq(this.ab) + '-selected', !1);
this.ab.innerHTML = a || '';
this.ab.className = 'gwt-MenuItem';
var c = Fh();
this.ab.setAttribute('id', c);
Xe();
this.ab.setAttribute('role', Ef.a);
this.a = b;
}
r(130, 19, {
23: 1,
130: 1,
19: 1
}, Tr);
_.b = !0;
C(130);
function Bq() {
Bq = k;
vq();
Cq = 1 == ab ? new Ur() : new Vr();
}
function Wr(a) {
a.w && (Xr(a.v, !1, !1), Jk(a));
}
function Yr(a) {
var b;
if (b = a.B)
null != a.i && b.zc(a.i), null != a.j && b.Ac(a.j);
}
function Zr(a, b) {
a.i = b;
Yr(a);
0 == (y(), b).length && (a.i = null);
}
function $r(a, b, c) {
a.r = b;
a.A = c;
b -= Gh();
c -= Hh();
a = (S(), a.ab);
a.style.left = b + (Fj(), 'px');
a.style.top = c + 'px';
}
function as(a, b) {
a.j = b;
Yr(a);
0 == (y(), b).length && (a.j = null);
}
r(266, 114, Ca);
_.Sc = function () {
return Cq.cd(rp((S(), this.ab)));
};
_.xc = function () {
return Cq.dd(rp((S(), this.ab)));
};
_.Uc = function () {
this.Vc(!1);
};
_.Vc = function () {
Wr(this);
};
_.Ic = function () {
this.w && Xr(this.v, !1, !0);
};
_.zc = function (a) {
Zr(this, a);
};
_.Wc = function (a, b) {
$r(this, a, b);
};
_.Tc = function (a) {
Br(this, a);
Yr(this);
};
_.Ac = function (a) {
as(this, a);
};
_.f = !1;
_.g = !1;
_.p = !1;
_.q = !1;
_.r = 0;
_.s = !1;
_.u = !1;
_.w = !1;
_.A = 0;
var Cq;
C(266);
function Mk() {
var a, b, c, d;
null.Yf();
d = (Mp(), Jh());
c = Ih();
null.Yf((ii(), 'none'));
null.Yf((Fj(), '0.0px'));
null.Yf('0.0px');
b = $doc;
b = (('CSS1Compat' === b.compatMode ? b.documentElement : b.body).scrollWidth || 0) | 0;
a = $doc;
a = (('CSS1Compat' === a.compatMode ? a.documentElement : a.body).scrollHeight || 0) | 0;
null.Yf((b > d ? b : d) + 'px');
null.Yf((a > c ? a : c) + 'px');
null.Yf('block');
}
function bs() {
}
r(326, 1, {
715: 1,
15: 1
}, bs);
C(326);
function cs(a) {
this.a = a;
}
r(327, 1, Da, cs);
_.mc = function (a) {
var b = this.a, c, d, e;
if (a.a || !b.u && a.b)
b.s && (a.a = !0);
else if (!a.a)
switch (d = a.d, c = (M(), N).Ab(d), (c = oh(c) ? Wg((S(), b.ab), c) : !1) && (a.b = !0), b.s && (a.a = !0), e = (S(), pp((M(), d).type)), e) {
case 4:
case 1048576:
if (op) {
a.b = !0;
break;
}
!c && b.f && b.Vc(!0);
break;
case 8:
case 64:
case 1:
case 2:
case 4194304:
op && (a.b = !0);
break;
case 2048:
d = N.Ab(d), b.s && !c && d && (d.blur && d != $doc.body && d.blur(), a.a = !0);
}
};
C(327);
function ds(a) {
this.a = a;
}
r(328, 1, Ea, ds);
_.Wb = function () {
this.a.g && this.a.Uc();
};
C(328);
function es(a) {
if (a.i) {
if (a.a.q) {
$doc.body.appendChild(a.a.k);
var b;
b = a.a.n;
Mp();
Vp || (tq(), Vp = !0);
Zp || (uq(), Zp = !0);
b = Rp((!Nk && (Nk = new vk()), Nk), b);
a.f = b;
Mk();
a.b = !0;
}
} else
a.b && ($doc.body.removeChild(a.a.k), fs(a.f.a), a.f = null, a.b = !1);
}
function gs(a) {
a.i || (es(a), a.c || dr((fp(), hs()), a.a));
(Bq(), Cq).ed(Q(a.a), 'rect(auto, auto, auto, auto)');
Q(a.a).style.overflow = 'visible';
}
function is(a, b) {
var c, d, e, f;
a.i || (b = 1 - b);
c = w(b * a.d);
e = w(b * a.e);
f = a.d - c >> 1;
d = a.e - e >> 1;
e = d + e;
c = f + c;
(Bq(), Cq).ed(Q(a.a), 'rect(' + f + 'px, ' + e + 'px, ' + c + 'px, ' + d + 'px)');
}
function Xr(a, b, c) {
a.c = c;
Dd(a);
a.g && (Wd(a.g), a.g = null, gs(a));
a.a.w = b;
var d = a.a;
d.t && (fs(d.t.a), d.t = null);
d.o && (fs(d.o.a), d.o = null);
if (d.w) {
d.t = Dp(new cs(d));
var e;
e = new ds(d);
Gp();
e = Rk(Ip.a, (!Qk && (Qk = new vk()), Qk), e);
d.o = e;
}
c = !c && a.a.p;
a.i = b;
c ? b ? (es(a), Q(a.a).style.position = 'absolute', -1 != a.a.A && a.a.Wc(a.a.r, a.a.A), (Bq(), Cq).ed(Q(a.a), 'rect(0px, 0px, 0px, 0px)'), br((fp(), hs()), a.a), a.g = new js(a), Vd(a.g, 1)) : Ed(a, 200) : (es(a), a.i ? (Q(a.a).style.position = 'absolute', -1 != a.a.A && a.a.Wc(a.a.r, a.a.A), br((fp(), hs()), a.a)) : a.c || dr((fp(), hs()), a.a), Q(a.a).style.overflow = 'visible');
}
function ks(a) {
Id.call(this);
this.a = a;
}
r(324, 115, {}, ks);
_.gb = function () {
gs(this);
};
_.hb = function () {
var a = this.a;
this.d = gh((S(), a.ab), 'offsetHeight');
a = this.a;
this.e = gh((S(), a.ab), 'offsetWidth');
Q(this.a).style.overflow = 'hidden';
is(this, (1 + $wnd.Math.cos(3.141592653589793)) / 2);
};
_.ib = function (a) {
is(this, a);
};
_.a = null;
_.b = !1;
_.c = !1;
_.d = 0;
_.e = -1;
_.i = !1;
C(324);
function js(a) {
this.a = a;
}
r(325, 50, {}, js);
_.nb = function () {
this.a.g = null;
Ed(this.a, 200);
};
C(325);
function sr() {
sr = k;
ls();
}
function tr(a) {
return function () {
this.__gwt_resolve = ms;
return a.yc();
};
}
function ms() {
throw 'A PotentialElement cannot be resolved twice.';
}
function ls() {
function a() {
}
a.prototype = {
className: '',
clientHeight: 0,
clientWidth: 0,
dir: '',
getAttribute: function (a) {
return this[a];
},
href: '',
id: '',
lang: '',
nodeType: 1,
removeAttribute: function (a) {
this[a] = void 0;
},
setAttribute: function (a, c) {
this[a] = c;
},
src: '',
style: {},
title: ''
};
$wnd.GwtPotentialElementShim = a;
}
r(670, 669, Ba);
C(670);
function fp() {
fp = k;
vq();
ns = new os();
ps = new zg();
gp = new Yk();
}
function hs() {
fp();
var a;
if (a = R(ps, null))
return a;
0 == qs(ps) && (a = new rs(), Mp(), Vp || (tq(), Vp = !0), Rp(Kk ? Kk : Kk = new vk(), a));
a = new ss();
hl(ps, null, a);
Km(gp, a);
return a;
}
r(159, 491, Fa);
var ns, ps, gp;
C(159);
function os() {
}
r(493, 1, {}, os);
_.Oc = function (a) {
a.Ec() && a.Gc();
};
C(493);
function rs() {
}
r(494, 1, Ga, rs);
_.Vb = function () {
fp();
try {
Vq(gp, ns);
} finally {
gp.a.yf(), ts(ps);
}
};
C(494);
function ss() {
var a = (fp(), $doc.body);
vq();
this.b = new yr(this);
this.ab = (S(), a);
Kq(this);
}
r(492, 159, Fa, ss);
C(492);
function Cr(a) {
this.c = a;
this.a = !!this.c.B;
}
r(261, 1, {}, Cr);
_.Yc = function () {
if (!this.a || !this.c.B)
throw new od().backingJsObject;
this.a = !1;
return this.b = this.c.B;
};
_.Xc = Hc;
_.Zc = function () {
this.b && Ar(this.c, this.b);
};
_.a = !1;
_.b = null;
C(261);
r(262, 1, {}, function () {
});
C(262);
function $q(a, b) {
var c;
for (c = 0; c < a.c; ++c)
if (a.a[c] == b)
return c;
return -1;
}
function cr(a, b, c) {
var d, e;
if (0 > c || c > a.c)
throw new Cc().backingJsObject;
if (a.c == a.a.length) {
e = Ib(Tq, h, 17, 2 * a.a.length, 0);
for (d = 0; d < a.a.length; ++d)
e[d] = a.a[d];
a.a = e;
}
++a.c;
for (d = a.c - 1; d > c; --d)
a.a[d] = a.a[d - 1];
a.a[c] = b;
}
function yr(a) {
this.b = a;
this.a = Ib(Tq, h, 17, 4, 0);
}
r(547, 1, {}, yr);
_.Mc = function () {
return new ar(this);
};
_.c = 0;
C(547);
function ar(a) {
this.c = a;
}
r(231, 1, {}, ar);
_.Yc = function () {
if (this.b >= this.c.c)
throw new od().backingJsObject;
this.a = this.c.a[this.b];
++this.b;
return this.a;
};
_.Xc = function () {
return this.b < this.c.c;
};
_.Zc = function () {
if (!this.a)
throw new ud().backingJsObject;
this.c.b.Nc(this.a);
--this.b;
this.a = null;
};
_.b = 0;
C(231);
function us() {
us = k;
hp();
Cg();
}
function vs() {
vs = k;
us();
}
function jr() {
jr = k;
Fr = 1 == ab ? new ws() : new xs();
kr = A(Fr, 134) ? new ys() : Fr;
}
function ys() {
}
r(133, 1, { 133: 1 }, ys);
_.$c = function (a) {
a.blur();
};
_._c = function () {
var a;
a = wh();
a.tabIndex = 0;
return a;
};
_.ad = function (a) {
a.focus();
};
var Fr, kr;
C(133);
function zs() {
return function () {
var a = this.parentNode;
a.onfocus && $wnd.setTimeout(function () {
a.focus();
}, 0);
};
}
function xs() {
jr();
}
r(134, 133, Ha, xs);
_._c = function () {
var a = As ? As : As = zs(), b = $doc.createElement('div');
b.tabIndex = 0;
var c = $doc.createElement('input');
c.type = 'text';
c.tabIndex = -1;
c.setAttribute('role', 'presentation');
var d = c.style;
d.opacity = 0;
d.height = '1px';
d.width = '1px';
d.zIndex = -1;
d.overflow = 'hidden';
d.position = 'absolute';
c.addEventListener('focus', a, !1);
b.appendChild(c);
return b;
};
var As;
C(134);
function ws() {
jr();
}
r(636, 134, Ha, ws);
_.$c = function (a) {
$wnd.setTimeout(function () {
a.blur();
}, 0);
};
_.ad = function (a) {
$wnd.setTimeout(function () {
a.focus();
}, 0);
};
C(636);
function Ur() {
}
r(178, 1, { 178: 1 }, Ur);
_.bd = function () {
return wh();
};
_.cd = Bs;
_.dd = function (a) {
return Vg((M(), a));
};
_.ed = function (a, b) {
a.style.clip = b;
};
C(178);
function Cs() {
Cs = k;
a: {
var a = navigator.userAgent;
if (-1 != a.indexOf('Macintosh') && (a = /rv:([0-9]+)\.([0-9]+)/.exec(a)) && 3 == a.length && 1008 >= 1000 * parseInt(a[1]) + parseInt(a[2])) {
Ds = !0;
break a;
}
Ds = !1;
}
}
function Vr() {
Cs();
}
r(637, 178, { 178: 1 }, Vr);
_.bd = function () {
var a;
a = (S(), wh());
Ds && (a.innerHTML = '<div></div>', Lg((Ig(), Jg), new Es(a)));
return a;
};
_.cd = function (a) {
return Ds ? fh((M(), a)) : a;
};
_.dd = function (a) {
return Ds ? a : Vg((M(), a));
};
_.ed = function (a, b) {
a.style.clip = b;
a.style.display = (ii(), 'none');
a.style.display = '';
};
var Ds = !1;
C(637);
function Es(a) {
this.a = a;
}
r(638, 1, {}, Es);
_.tb = function () {
this.a.style.overflow = (Wi(), 'auto');
};
C(638);
function Fs() {
var a, b;
b = 0 == ab ? new Gs() : new Hs();
a = b.fd();
b = b.gd();
if (a !== b)
throw new Is(a, b).backingJsObject;
}
r(140, 11, aa);
C(140);
r(41, 140, aa);
C(41);
function Is(a, b) {
Fb();
var c = (y(), Ab('Possible problem with your *.gwt.xml module file.\nThe compile time user.agent value (' + a + ') does not match the runtime user.agent value (' + b + ').\nExpect more errors.')), d = A('Possible problem with your *.gwt.xml module file.\nThe compile time user.agent value (' + a + ') does not match the runtime user.agent value (' + b + ').\nExpect more errors.', 11) ? 'Possible problem with your *.gwt.xml module file.\nThe compile time user.agent value (' + a + ') does not match the runtime user.agent value (' + b + ').\nExpect more errors.' : null;
Hb(this);
this.e = d;
this.f = c;
Kb(this);
this.qb();
}
r(248, 41, aa, Is);
C(248);
function Gs() {
}
r(551, 1, { 708: 1 }, Gs);
_.fd = function () {
return 'gecko1_8';
};
_.gd = function () {
var a = navigator.userAgent.toLowerCase(), b = $doc.documentMode;
return -1 != a.indexOf('webkit') ? 'safari' : -1 != a.indexOf('msie') && 10 <= b && 11 > b ? 'ie10' : -1 != a.indexOf('msie') && 9 <= b && 11 > b ? 'ie9' : -1 != a.indexOf('msie') && 8 <= b && 11 > b ? 'ie8' : -1 != a.indexOf('gecko') || 11 <= b ? 'gecko1_8' : 'unknown';
};
C(551);
function Hs() {
}
r(550, 1, { 708: 1 }, Hs);
_.fd = function () {
return 'safari';
};
_.gd = function () {
var a = navigator.userAgent.toLowerCase(), b = $doc.documentMode;
return -1 != a.indexOf('webkit') ? 'safari' : -1 != a.indexOf('msie') && 10 <= b && 11 > b ? 'ie10' : -1 != a.indexOf('msie') && 9 <= b && 11 > b ? 'ie9' : -1 != a.indexOf('msie') && 8 <= b && 11 > b ? 'ie8' : -1 != a.indexOf('gecko') || 11 <= b ? 'gecko1_8' : 'unknown';
};
C(550);
function fs(a) {
var b = a.a, c = a.d, d = a.c;
a = a.b;
0 < b.b ? (c = new Js(b, c, d, a), !b.a && (b.a = new Rd()), Ud(b.a, c)) : fl(b, c, d, a);
}
function Vk(a, b, c) {
this.a = a;
this.d = b;
this.c = null;
this.b = c;
}
r(486, 1, {}, Vk);
C(486);
function Sk(a, b, c) {
this.a = a;
this.d = b;
this.c = null;
this.b = c;
}
r(487, 1, { 707: 1 }, Sk);
_.tb = function () {
var a = this.b;
Tk(this.a, this.d, this.c).Cf(a);
};
C(487);
function Js(a, b, c, d) {
this.a = a;
this.d = b;
this.c = c;
this.b = d;
}
r(488, 1, { 707: 1 }, Js);
_.tb = function () {
fl(this.a, this.d, this.c, this.b);
};
C(488);
function Ks() {
Ks = k;
a: {
var a = document.createElement('fakeelement'), b = {
animationName: 'animationend',
OAnimationName: 'oAnimationEnd',
MozAnimation: 'animationend',
WebkitAnimation: 'webkitAnimationEnd'
}, c;
for (c in b)
if (void 0 !== a.style[c]) {
Ls = b[c];
break a;
}
Ls = void 0;
}
a:
for (a = document.createElement('fakeelement'), b = [
'animation',
'oAnimation',
'mozAnimation',
'webkitAnimation'
], c = 0; c < b.length; c++)
if (void 0 !== a.style[b[c]])
break a;
}
function Ms(a, b) {
Ks();
var c = Pd(function (a) {
b.hd(a);
});
a.addEventListener(Ls, c, !1);
!a._vaadin_animationend_callbacks && (a._vaadin_animationend_callbacks = []);
a._vaadin_animationend_callbacks.push(c);
return c;
}
function Ns(a) {
Ks();
return a.webkitAnimationName ? a.webkitAnimationName : a.animationName ? a.animationName : a.mozAnimationName ? a.mozAnimationName : a.oAnimationName ? a.oAnimationName : '';
}
function Os(a) {
Ks();
a = a.a;
return a.getPropertyValue ? a.getPropertyValue('-webkit-animation-name') ? a.getPropertyValue('-webkit-animation-name') : a.getPropertyValue('animation-name') ? a.getPropertyValue('animation-name') : a.getPropertyValue('-moz-animation-name') ? a.getPropertyValue('-moz-animation-name') : a.getPropertyValue('-o-animation-name') ? a.getPropertyValue('-o-animation-name') : '' : '';
}
var Ls;
function Ps() {
Ps = k;
var a;
a = Qs((!U && (U = new Rs()), U));
fp();
wq(hs(), a);
}
function Qs(a) {
var b, c, d, e;
null == Ss && (b = e = d = c = '', a.a.e ? (c = 'ff', d = 'ff' + a.a.a, e = d + a.a.b, b = 'gecko') : a.a.c ? (c = 'sa', d = 'ch', b = 'webkit') : a.a.o ? (c = 'sa', d = 'sa' + a.a.a, e = d + a.a.b, b = 'webkit') : a.a.g ? (c = 'ie', d = 'ie' + a.a.a, e = d + a.a.b, b = 'trident') : a.a.d ? (c = 'edge', d = 'edge' + a.a.a, e = d + a.a.b, b = '') : a.a.k && (c = 'op', d = 'op' + a.a.a, e = d + a.a.b, b = 'presto'), Ss = 'v-' + c, '' === d || (Ss = Ss + ' v-' + d), '' === e || (Ss = Ss + ' v-' + e), '' === b || (Ss = Ss + ' v-' + b), b = 5 == a.a.r ? 'v-android' : 4 == a.a.r ? 'v-ios v-ios' + a.a.s : 1 == a.a.r ? 'v-win' : 3 == a.a.r ? 'v-lin' : 2 == a.a.r ? 'v-mac' : null, null != b && (Ss = Ss + ' ' + b), a.b && (Ss += ' v-touch'));
return Ss;
}
function Ts(a) {
return 8 == a.a.a ? 0 <= a.a.b : 8 < a.a.a;
}
function Us(a) {
return a.a.g && 8 == a.a.a;
}
function Vs(a) {
return a.a.g && 9 == a.a.a;
}
function Rs() {
Ps();
var a;
this.a = new Ws(Xs());
if (this.a.g && (a = (a = $wnd.document.documentMode) ? a : -1, -1 != a)) {
var b = this.a;
b.a = a;
b.b = 0;
}
if (this.a.c)
this.b = 'ontouchstart' in window;
else if (this.a.g)
this.b = !!navigator.msMaxTouchPoints;
else {
if (a = !this.a.n)
try {
document.createEvent('TouchEvent'), a = !0;
} catch (c) {
a = !1;
}
this.b = a;
}
}
function Xs() {
Ps();
return $wnd.navigator.userAgent;
}
r(29, 1, {}, Rs);
_.b = !1;
var Ss = null, U;
C(29);
function Ys(a) {
var b;
a: {
b = 'height';
var c = a.a;
a = a.b;
if (-1 < b.indexOf('border') && -1 < b.indexOf('Width')) {
var d = b.substring(0, b.length - 5) + 'Style';
if ('none' == (c.getPropertyValue ? c.getPropertyValue(d) : c[d])) {
b = '0px';
break a;
}
}
if (c.getPropertyValue)
b = b.replace(/([A-Z])/g, '-$1').toLowerCase(), d = c.getPropertyValue(b);
else {
var d = c[b], e = a.style;
if (!/^\d+(px)?$/i.test(d) && /^\d/.test(d)) {
var f = e.left, g = a.runtimeStyle.left;
a.runtimeStyle.left = c.left;
e.left = d || 0;
d = e.pixelLeft + 'px';
e.left = f;
a.runtimeStyle.left = g;
}
}
-1 < b.indexOf('margin') && 'auto' == d ? b = '0px' : ('width' == b && 'auto' == d ? d = a.clientWidth + 'px' : 'height' == b && 'auto' == d && (d = a.clientHeight + 'px'), b = d);
}
return parseFloat(b);
}
function Zs(a) {
var b;
b = 1 != a.nodeType ? {} : $wnd.document.defaultView && $wnd.document.defaultView.getComputedStyle ? $wnd.document.defaultView.getComputedStyle(a, null) : a.currentStyle ? a.currentStyle : void 0;
this.a = b;
this.b = a;
}
r(177, 1, {}, Zs);
C(177);
function $s() {
$s = k;
S();
wh();
}
function at(a) {
$s();
var b;
if (a) {
for (b = null; !b && a;)
b = (S(), Wm(a)), !b && (a = Vg((M(), a)));
if (A(b, 17))
for (a = b; a;)
return a;
}
return null;
}
function bt(a, b) {
$s();
if ('function' === typeof $wnd.getComputedStyle) {
var c = $wnd.getComputedStyle(a), d = 0;
for (i = 0; i < b.length; i++)
d += parseFloat(c[b[i]]);
return d;
}
c = a.offsetParent;
d = a.cloneNode(!1);
d.style.boxSizing = 'content-box';
c.appendChild(d);
d.style.height = '10px';
var e = d.offsetHeight;
for (i = 0; i < b.length; i++)
d.style[b[i]] = '0';
var f = d.offsetHeight;
c.removeChild(d);
return e - f;
}
function ct() {
$s();
return $wnd.document.activeElement ? $wnd.document.activeElement : null;
}
function dt() {
$s();
var a;
0 > et && (a = (S(), wh()), a.style.width = '50px', a.style.height = '50px', a.style.overflow = 'scroll', a.style.position = 'absolute', a.style.marginLeft = '-5000px', (fp(), $doc.body).appendChild(a), et = ((a.offsetWidth || 0) | 0) - (parseInt(a.clientWidth) | 0), $doc.body.removeChild(a));
return et;
}
function ft(a) {
$s();
null != a.getBoundingClientRect ? (a = a.getBoundingClientRect(), a = a.bottom - a.top) : a = a.offsetHeight;
return a;
}
function gt(a) {
$s();
return a.getBoundingClientRect ? (a = a.getBoundingClientRect(), a.right - a.left) : a.offsetWidth;
}
function ht(a) {
$s();
return -1 != Nc((M(), a).type, 'touch') ? fk(a.changedTouches[0]) : th(a.clientX || 0);
}
function it(a) {
$s();
return -1 != Nc((M(), a).type, 'touch') ? gk(a.changedTouches[0]) : th(a.clientY || 0);
}
function jt(a, b) {
$s();
return 0.49 >= (0 >= a - b ? 0 - (a - b) : a - b);
}
function kt(a, b) {
var c, d, e, f;
$s();
var g;
if (Us((Ps(), !U && (U = new Rs()), Ps(), U)))
return b ? $wnd.Math.ceil(a) : w(a);
var l, m, n;
if (-1 == lt) {
g = wh();
$doc.body.appendChild(g);
g.style.height = (Fj(), '0.999999px');
m = new Zs(g);
l = Ys(m);
if (0.999999 > l)
lt = yl(xl($wnd.Math.round(1 / (1 - l))));
else {
for (n = 1; 0 != Ys(m);)
l = Ys(m), n /= 2, g.style.height = n + 'px';
lt = yl(xl($wnd.Math.round(1 / l)));
}
(l = Vg((M(), g))) && l.removeChild(g);
}
g = lt;
return 0 > g || 0 > a ? a : b ? (c = w(a), d = (a - c) * g, c + $wnd.Math.ceil(d) / g) : (e = w(a), f = (a - e) * g, e + w(f) / g);
}
function mt(a, b) {
$s();
b ? (a.ondrag = null, a.onselectstart = null, a.style.webkitUserSelect = 'text') : (a.ondrag = function () {
return !1;
}, a.onselectstart = function () {
return !1;
}, a.style.webkitUserSelect = 'none');
}
var et = -1, lt = -1;
function nt(a) {
var b;
if (!a.i) {
b = ot(a);
var c = a.q, d;
d = (c.a - c.b) * a.d.b;
b = pt(new qt(c.b - d, c.a + d), b);
!rt(b, a.e) || st(a.e) ? (tt(a, a.e), a.e = new qt(0, 0), ut(a, vt(a))) : (wt(a), xt(b, a.e) ? a.j && yt(a.j, a.e.b, zt(a.e)) : (b = At(vt(a), a.e), ut(a, b[0]), ut(a, b[2])));
}
}
function wt(a) {
var b;
b = At(a.e, vt(a));
tt(a, b[0]);
a.e = b[1];
tt(a, b[2]);
}
function tt(a, b) {
var c, d;
for (c = b.b; c < b.a; c++)
d = gl(a.k, G(c)), null != d && gl(a.n, a.ld(d));
}
function Bt(a) {
a.f || (a.f = !0, Lg((Ig(), Jg), a.g));
}
function ot(a) {
var b;
b = a.od();
-1 == b && (b = zt(a.q));
return V(0, b);
}
function Ct(a, b) {
if (null == b)
throw new Jc('key may not be null (row: ' + b + ')').backingJsObject;
if (wp(a.p, b))
return R(a.p, b);
if (wp(a.n, b))
return new Dt(a, b, b);
throw new Lq('The cache of this DataSource does not currently contain the row ' + b).backingJsObject;
}
function vt(a) {
var b;
b = ot(a);
return a.d.qd(a.q, a.e, b);
}
function Et(a, b) {
return R(a.k, G(b));
}
function ut(a, b) {
b.b >= b.a || (a.i = new Ft(a, b), a.md(b.b, b.a - b.b, a.i));
}
function Gt(a, b) {
return wp(a.n, b) ? R(a.n, b).a : -1;
}
function Ht(a, b, c) {
var d;
b = gl(a.k, G(b));
wp(a.k, G(c)) && (d = gl(a.k, G(c)), null != d && gl(a.n, d));
hl(a.k, G(c), b);
null != b && hl(a.n, b, G(c));
}
function It(a, b) {
var c, d;
d = b.a;
c = R(a.o, d);
c || (c = G(0), hl(a.p, d, b));
hl(a.o, d, G(c.a + 1));
}
function Jt(a, b) {
a.r = b;
tt(a, a.e);
a.e = V(0, 0);
if (a.j) {
var c = a.j, d, e, f, g, l;
d = c.a.v.a;
l = d.p;
g = new Kt(c.a.W);
for (g = (f = new Lm(g.a).a.uf().Mc(), new Mm(f)); g.a.Xc();)
f = (e = g.a.Yc(), e.Nf()).a, Lt(c.a, f, !1);
b > l ? (Mt(d, l, b - l), Nt(c.a.c, V(l, b - l))) : b < l && (Ot(d, b, l - b), Pt(c.a.c, V(b, l - b)));
0 < b ? (c.a.p = !0, d = Qt(c.a.v), c.b.kd(d.b, d.a - d.b)) : (c.a.o = V(0, 0), Jq(c.a, new Rt(c.a.o)));
}
}
function St(a, b) {
(a.j = b) && !st(a.e) && (Tt(b.a.v.a, a.e.b, zt(a.e)), yt(b, a.e.b, zt(a.e)));
}
function Ut(a, b, c) {
var d, e, f, g;
d = V(b, c.od());
a.i && (Fd(), a.i = null);
e = vt(a);
e = At(d, e);
f = e[1];
if (f.b < f.a) {
for (d = f.b; d < f.a; d++)
g = c.Df(d - b), hl(a.k, G(d), g), hl(a.n, a.ld(g), G(d));
a.j && Tt(a.j.a.v.a, f.b, f.a - f.b);
st(a.e) ? a.e = f : (wt(a), st(a.e) ? a.e = f : a.e = Vt(a.e, f));
a.j && yt(a.j, a.e.b, zt(a.e));
for (d = c.Mc(); d.Xc();)
b = d.Yc(), f = a.ld(b), (f = R(a.p, f)) && (f.b = b);
}
if (!st(e[0]) || !st(e[2])) {
for (b = 0; b < zt(e[0]); ++b)
c.Df(b);
for (d = 0; d < zt(e[2]); ++d)
c.Df(d);
}
Bt(a);
}
function Wt(a, b) {
var c, d;
d = b.a;
if (c = R(a.o, d)) {
var e = G(1);
A(e, 97) && e.a == c.a ? (gl(a.p, d), gl(a.o, d)) : hl(a.o, d, G(c.a - 1));
} else
throw new Lq('Row ' + b.b + ' with key ' + d + ' was not pinned to begin with').backingJsObject;
}
r(432, 1, {});
_.kd = function (a, b) {
this.q = V(a, b);
Bt(this);
};
_.nd = function (a) {
Jt(this, a);
};
_.od = function () {
return this.r;
};
_.f = !1;
_.r = -1;
C(432);
function Xt(a) {
this.a = a;
}
r(363, 1, {}, Xt);
_.tb = function () {
this.a.f = !1;
nt(this.a);
};
C(363);
function Ft(a, b) {
this.d = a;
this.c = b;
this.b = Fd();
}
r(147, 1, {}, Ft);
_.pd = function (a, b) {
this.d.r != b && this.d.nd(b);
Ut(this.d, this.c.b, a);
};
_.b = 0;
C(147);
r(197, 1, { 197: 1 });
_.bb = function (a) {
return Yt(this, a);
};
_.db = function () {
return kb(this.a);
};
C(197);
function Yt(a, b) {
return A(b, 148) ? mb(a.a, b.a) : !1;
}
function Dt(a, b, c) {
this.c = a;
this.b = b;
this.a = c;
}
r(148, 197, {
148: 1,
197: 1
}, Dt);
C(148);
r(678, 1, {});
_.qd = function (a, b, c) {
b = this.rd(a.a - a.b);
return pt(new qt(a.b - b, a.a + b), c);
};
C(678);
function Zt() {
this.b = 3;
this.a = 4;
}
r(155, 678, {}, Zt);
_.rd = function (a) {
return a * this.a;
};
_.a = 0;
_.b = 0;
C(155);
function $t(a, b) {
var c, d, e;
c = a.a.c;
for (e = 0; e < c.childNodes.length; e++)
(d = c.childNodes[e]) && 1 == d.nodeType && (b ? d.style.visibility = '' : d.style.visibility = (Zj(), 'hidden'));
}
r(52, 1, { 52: 1 });
_.sd = Qq;
_.td = function () {
return il(), il(), jl;
};
_.vd = dn;
C(52);
r(65, 52, {
52: 1,
65: 1
});
_.ud = au;
_.wd = function (a, b) {
var c;
c = a.a.c;
var d;
c = (d = at(fh((M(), c))), d);
this.yd(a, b, c);
};
C(65);
r(680, 65, Ia);
_.Ub = au;
C(680);
function bu(a) {
a.a.zd();
a.a.Ad();
a.f.f || Vd(a.f, 100);
}
function cu(a) {
a.e && (fs(a.e.a), a.e = null);
}
function du() {
this.f = new eu(this);
this.c = new fu(this);
}
r(193, 1, {}, du);
_.d = !1;
C(193);
function eu(a) {
this.a = a;
}
r(334, 50, {}, eu);
_.nb = function () {
var a = (fp(), $doc.body);
S();
op && a == op && (op = null);
jp.sc(a);
this.a.a && (this.a.a.Ad(), this.a.a = null);
this.a.b && (fs(this.a.b.a), this.a.b = null);
this.a.d = !1;
};
C(334);
function fu(a) {
this.a = a;
}
r(335, 1, Da, fu);
_.mc = function (a) {
var b;
if (this.a.d)
switch (b = Cp(a.d), b) {
case 64:
case 2097152:
this.a.a.Cd(a.d);
break;
case 128:
b = Nh(a.d);
27 == b && bu(this.a);
break;
case 8388608:
bu(this.a);
break;
case 4194304:
case 8:
this.a.a.Cd(a.d), this.a.a.Dd(), b = this.a, b.f.f || Vd(b.f, 100);
}
else
b = this.a, b.f.f || Vd(b.f, 100);
b = a.d;
(M(), b).stopPropagation();
Qh(a.d);
a.a = !0;
};
C(335);
function gu(a, b, c) {
this.c = a;
this.e = b;
this.d = c;
this.a = ($s(), ht(this.e));
this.b = it(this.e);
}
r(336, 1, Da, gu);
_.mc = function (a) {
var b, c;
b = Cp(a.d);
if (-1 != b || -1 == Nc(Rb(Ph(a.d)).toLowerCase(), 'pointer'))
switch (b) {
case 16:
case 32:
break;
case 128:
case 256:
case 512:
case 4096:
case 2048:
break;
case 64:
case 2097152:
b = ($s(), ht(a.d));
c = it(a.d);
if (3 < hu(this.a - b) || 3 < hu(this.b - c))
if (cu(this.c), b = this.c, c = this.d, c.Bd(this.e)) {
b.a = c;
b.d = !0;
var d = (fp(), $doc.body);
S();
op = d;
jp.tc(d);
b.b = Dp(b.c);
c.Cd(a.d);
}
b = a.d;
(M(), b).stopPropagation();
Qh(a.d);
a.a = !0;
break;
default:
cu(this.c);
}
};
_.a = 0;
_.b = 0;
C(336);
function iu(a, b) {
this.e = null;
this.d = (S(), xh('div'));
this.a = a;
this.f = b;
Zg(this.d, this.a);
this.b = new ju(this);
this.c = new du();
Bp(this.d, 1048580);
this.d.__listener = new ku(this);
}
r(331, 1, {}, iu);
C(331);
function ju(a) {
this.c = a;
}
r(332, 1, {}, ju);
_.zd = function () {
lh(this.c.d, this.c.a + '-dragged');
var a = this.c.f;
a.a.Xe(a.b);
mt(Q(a.d.c), !0);
};
_.Ad = Qq;
_.Bd = function (a) {
Zg(this.c.d, this.c.a + '-dragged');
this.a = ($s(), $s(), -1 != Nc((M(), a).type, 'touch') ? fk(a.changedTouches[0]) : th(a.clientX || 0));
this.b = -1 != Nc(a.type, 'touch') ? gk(a.changedTouches[0]) : th(a.clientY || 0);
a = this.c.f;
var b, c;
a.b = lu(a.a);
b = mu(nu(new Eo(a.d.c.n)), a.a);
b = ou(a.d.c.v.c, b);
a.c = b;
for (c = new pu(nu(new Eo(a.d.c.n)).b.Mc()); c.b.Xc();)
b = c.b.Yc(), a.d.c.R != b && 0 > b.t && (b.Xe(lu(b)), Jq(a.d.c, new qu()));
mt(Q(a.d.c), !1);
return !0;
};
_.Cd = function (a) {
var b;
b = ($s(), $s(), (-1 != Nc((M(), a).type, 'touch') ? fk(a.changedTouches[0]) : th(a.clientX || 0)) - this.a);
-1 != Nc(a.type, 'touch') ? gk(a.changedTouches[0]) : th(a.clientY || 0);
a = this.c.f;
a.a.Xe($wnd.Math.max(a.c, a.b + b));
};
_.Dd = function () {
lh(this.c.d, this.c.a + '-dragged');
var a = this.c.f;
Jq(a.d.c, new qu());
mt(Q(a.d.c), !0);
};
_.a = 0;
_.b = 0;
C(332);
function ku(a) {
this.a = a;
}
r(333, 1, { 20: 1 }, ku);
_.nc = function (a) {
var b = this.a.c;
b.e = Dp(new gu(b, a, this.a.b));
(M(), a).stopPropagation();
};
C(333);
function ru(a, b, c) {
this.c = a;
this.a = b;
this.b = c;
}
r(109, 1, {}, ru);
_.a = 0;
_.c = 0;
C(109);
function su() {
su = k;
tu = new uu();
}
var tu;
function uu() {
}
r(318, 1, {}, uu);
_.Ed = vu;
_.Fd = vu;
_.Gd = vu;
_.Hd = vu;
_.Id = vu;
C(318);
function wu(a, b) {
var c;
a.b = b;
b.b && (c = a.d.c.cells[a.a], c.colSpan = 1, 0 <= a.d.b[a.a] && (c.style.width = a.d.b[a.a] + (Fj(), 'px')), c.style.display = '', a.c = c);
}
function xu(a, b) {
this.d = a;
this.a = b;
}
r(95, 1, { 95: 1 }, xu);
_.a = 0;
_.b = null;
_.c = null;
var yu = C(95);
function zu(a) {
return new Au(a, 0, a.a.a.length);
}
function Bu(a, b, c, d) {
a.c = b;
a.d = c;
a.b = d;
}
function Cu(a, b) {
var c;
for (c = b; c < a.a.a.length; c++)
Du(a.a, c, new xu(a, c));
}
function Eu() {
this.a = new Rd();
}
r(560, 1, {}, Eu);
_.b = null;
_.d = 0;
C(560);
function Au(a, b, c) {
this.a = a;
this.c = b;
this.b = c;
}
r(175, 1, {}, Au);
_.Mc = function () {
return new Fu(new Gu(this.a.a, this.c, this.c + this.b), !0);
};
_.b = 0;
_.c = 0;
C(175);
function Hu(a, b, c) {
this.a = a;
this.c = b;
this.b = c;
}
r(235, 1, {}, Hu);
_.Mc = function () {
return new Fu(new Gu(this.a.a, this.c, this.c + this.b), !1);
};
_.b = 0;
_.c = 0;
C(235);
function Iu(a) {
var b;
for (b = 0; b < a.d; b++)
Ju(a.a, a.c);
a.d = 0;
b = Pr(a.a, a.c++);
wu(b, a);
return b;
}
function Ku(a, b) {
var c, d, e;
e = new Gu(a.a, Nb(a.c, a.a.a.length), Nb(a.c + b, a.a.a.length));
for (d = new am(e); d.b < d.d.od();)
c = (nd(d.b < d.d.od()), d.d.Df(d.c = d.b++)), wu(c, a);
return e;
}
function Fu(a, b) {
this.a = new Eo(a);
this.b = b;
}
r(107, 1, {}, Fu);
_.Yc = function () {
return Iu(this);
};
_.Xc = function () {
return this.c + this.d < this.a.a.length;
};
_.Zc = function () {
throw new Uq('Cannot remove cells via iterator').backingJsObject;
};
_.b = !1;
_.c = 0;
_.d = 0;
C(107);
function Lu() {
}
r(131, 1, { 131: 1 }, Lu);
_.Jd = function (a) {
a.style.left = '';
a.style.top = '';
};
_.Kd = function (a, b, c) {
a.style.left = b + (Fj(), 'px');
a.style.top = c + 'px';
};
C(131);
function Mu() {
}
r(552, 1, {}, Mu);
_.Jd = Nu;
_.Kd = function (a, b, c) {
a.style.transform = 'translate3d(' + b + 'px, ' + c + 'px, 0)';
};
C(552);
function Ou() {
}
r(553, 1, {}, Ou);
_.Jd = Nu;
_.Kd = function (a, b, c) {
a.style.transform = 'translate(' + b + 'px,' + c + 'px)';
};
C(553);
function Pu() {
}
r(554, 1, {}, Pu);
_.Jd = function (a) {
a.style.webkitTransform = '';
};
_.Kd = function (a, b, c) {
a.style.webkitTransform = 'translate3d(' + b + 'px,' + c + 'px,0)';
};
C(554);
function Qu() {
Qu = k;
Ru = new vk();
}
function Su(a, b) {
Qu();
this.a = V(a, b);
}
r(230, 672, {}, Su);
_.Pb = function (a) {
var b;
a.a.q && (b = T(a.a.q.c.c, 'size'), 0 != X((Y(), Z), b, G(0), G(0)).a) && (a.a.p = !0, a.a.q.kd(this.a.b, zt(this.a)));
};
_.Qb = function () {
return Ru;
};
var Ru;
C(230);
function Tu(a, b) {
return Rk((!a.a && (a.a = new cl(a)), a.a), (Uu(), Vu), b);
}
function Wu(a) {
var b;
b = a.j;
a.j = 0.49 < Xu(a.Td()) - Xu(a.Rd());
b != a.j && (b = new Yu(), Wk((!a.a && (a.a = new cl(a)), a.a), b));
}
function Zu(a, b) {
b ? a.g.style.display = '' : a.g.style.display = (ii(), 'none');
a.Qd(b);
}
function $u(a) {
return a.c ? 0 : Xu(a.Ud());
}
function av(a) {
return !!a.o || !!a.f;
}
function bv(a) {
var b, c;
c = Xu(a.Td());
b = Xu(a.Rd());
a.e = $wnd.Math.max(0, c - b);
cv(a, a.k);
}
function dv(a, b) {
var c;
c = b > Xu(a.Td());
0.49 < Xu(a.Td()) - Xu(a.Rd()) && c && 0 != a.k ? (a.f = Tu(a, new ev(a, b)), cv(a, 0)) : fv(a, b);
}
function fv(a, b) {
a.Vd($wnd.Math.max(0, b));
bv(a);
Zu(a, 0.49 < Xu(a.Td()) - Xu(a.Rd()));
Wu(a);
a.f && (fs(a.f.a), a.f = null);
}
function cv(a, b) {
var c;
a.d || (c = a.k, a.k = $wnd.Math.max(0, $wnd.Math.min(a.e, 0 < b ? $wnd.Math.floor(b) : $wnd.Math.ceil(b))), jt(c, a.k) || (a.c && gv(a.b), a.Wd(Math.round(a.k) | 0)));
}
function hv(a, b) {
0 != b && cv(a, a.k + b);
}
function iv(a, b) {
var c;
c = b <= Xu(a.Rd());
0.49 < Xu(a.Td()) - Xu(a.Rd()) && c && 0 != a.k ? (a.o = Tu(a, new jv(a, b)), cv(a, 0)) : kv(a, b);
}
function kv(a, b) {
a.Xd($wnd.Math.max(0, b));
bv(a);
Zu(a, 0.49 < Xu(a.Td()) - Xu(a.Rd()));
Wu(a);
a.o && (fs(a.o.a), a.o = null);
}
function lv(a, b) {
a.c = 0 == b;
a.c ? (Bp(a.g, 16384), S(), a.g.__listener = new mv(a), a.g.style.visibility = (Zj(), 'hidden')) : (Bp(a.g, 0), S(), a.g.__listener = null, a.g.style.visibility = '');
a.Yd($wnd.Math.max(1, b));
}
function nv(a) {
return 0.49 < Xu(a.Td()) - Xu(a.Rd());
}
function ov(a) {
var b;
b = a.Sd();
a.d ? a.k != b && a.Wd(Math.round(a.k) | 0) : (a.k = b, a = a.i, a.b || (Lg((Ig(), Jg), a.a), a.b = !0));
}
function pv() {
this.g = (S(), wh());
this.n = wh();
this.b = new qv(this);
this.i = new rv(this);
this.g.appendChild(this.n);
this.g.style.display = (ii(), 'none');
this.g.tabIndex = -1;
}
function Xu(a) {
return 0 == (y(), a).length ? 0 : xc(Sc(a, 0, a.length - 2));
}
r(215, 1, {});
_.Pd = jk;
_.Zd = function () {
ov(this);
};
_.c = !1;
_.d = !1;
_.e = 0;
_.j = !1;
_.k = 0;
C(215);
function ev(a, b) {
this.a = a;
this.b = b;
}
r(461, 1, Ja, ev);
_.$d = function () {
fv(this.a, this.b);
};
_.b = 0;
C(461);
function jv(a, b) {
this.a = a;
this.b = b;
}
r(462, 1, Ja, jv);
_.$d = function () {
kv(this.a, this.b);
};
_.b = 0;
C(462);
function mv(a) {
this.a = a;
}
r(463, 1, { 20: 1 }, mv);
_.nc = function () {
gv(this.a.b);
};
C(463);
function sv() {
sv = k;
tv = new uv('VERTICAL', 0);
vv = new uv('HORIZONTAL', 1);
}
function uv(a, b) {
O.call(this, a, b);
}
r(120, 5, {
120: 1,
3: 1,
6: 1,
5: 1
}, uv);
var vv, tv, wv = E(120, function () {
sv();
return z(u(wv, 1), h, 120, 0, [
tv,
vv
]);
});
function xv() {
pv.call(this);
}
r(457, 215, {}, xv);
_.Qd = function (a) {
a ? this.g.style.overflowX = (Wi(), 'scroll') : this.g.style.overflowX = '';
};
_.Rd = function () {
return Th(this.g.style);
};
_.Sd = function () {
return ih(this.g);
};
_.Td = yv;
_.Ud = zv;
_.Vd = function (a) {
this.g.style.width = a + (Fj(), 'px');
};
_.Wd = function (a) {
var b = this.g;
(M(), N).Mb(b, a);
};
_.Xd = function (a) {
this.n.style.width = a + (Fj(), 'px');
};
_.Yd = function (a) {
this.g.style.paddingBottom = a + (Fj(), 'px');
this.g.style.height = '0.0px';
this.n.style.height = a + 'px';
};
C(457);
function rv(a) {
this.c = a;
this.a = new Av(this);
}
r(453, 1, {}, rv);
_.b = !1;
C(453);
function Av(a) {
this.a = a;
}
r(458, 1, {}, Av);
_.tb = function () {
ov(this.a.c);
var a = this.a.c;
!a.a && (a.a = new cl(a));
Wk(a.a, new Bv());
this.a.b = !1;
};
C(458);
function gv(a) {
a.a.Yd(13);
a.a.g.style.visibility = (Zj(), 'visible');
Vd(a.b, 1000);
}
function qv(a) {
this.a = a;
this.b = new Cv(this);
}
r(454, 1, {}, qv);
C(454);
function Cv(a) {
this.a = a;
}
r(459, 50, {}, Cv);
_.nb = function () {
this.a.a.Yd(1);
this.a.a.g.style.visibility = (Zj(), 'hidden');
};
C(459);
function Dv() {
pv.call(this);
}
r(456, 215, {}, Dv);
_.Qd = function (a) {
a ? this.g.style.overflowY = (Wi(), 'scroll') : this.g.style.overflowY = '';
};
_.Rd = function () {
return Rh(this.g.style);
};
_.Sd = function () {
return (this.g.scrollTop || 0) | 0;
};
_.Td = zv;
_.Ud = yv;
_.Vd = function (a) {
this.g.style.height = a + (Fj(), 'px');
};
_.Wd = function (a) {
this.g.scrollTop = a;
};
_.Xd = function (a) {
this.n.style.height = a + (Fj(), 'px');
};
_.Yd = function (a) {
this.g.style.paddingRight = a + (Fj(), 'px');
this.g.style.width = '0.0px';
this.n.style.width = a + 'px';
};
C(456);
function Ev() {
Ev = k;
Fv = new Gv();
}
function Yu() {
Ev();
}
r(455, 672, {}, Yu);
_.Pb = function (a) {
a.a || (a.a = !0, Qg((Ig(), Jg), new Hv(a)));
};
_.Qb = function () {
return Fv;
};
var Fv;
C(455);
function Gv() {
this.c = ++uk;
}
r(460, 34, {}, Gv);
_.eb = function () {
return 'VisibilityChangeEvent';
};
C(460);
function Iv() {
Iv = k;
Jv = new Kv();
}
var Jv;
function Kv() {
}
r(317, 1, {}, Kv);
_._d = au;
_.ae = au;
C(317);
function Lv(a) {
var b, c;
for (b = c = 0; b < (0 > a.e.B ? 0 : a.e.S.je() ? a.e.B + 1 : a.e.B); b++)
c += lu(Mv(a.e, b));
return c;
}
function Nv(a) {
return (a = Q(a.e).childNodes[2]) ? fh((M(), a)) : null;
}
function Ov(a) {
a.g && (fs(a.g.a), a.g = null);
}
function Pv(a) {
a.f && (fs(a.f.a), a.f = null);
if (a.a) {
var b = a.a;
b.i = !1;
b.e && (b.e.lb(), b.e = null);
a.a = null;
}
Ov(a);
}
function Qv(a) {
this.k = new Rv(this);
this.e = a;
}
r(337, 1, {}, Qv);
_.c = -1;
_.d = 0;
_.i = 100;
_.n = -1;
C(337);
function Rv(a) {
this.a = a;
}
r(340, 1, Da, Rv);
_.mc = function (a) {
var b, c;
if (this.a.a)
switch (b = a.d, Cp(a.d)) {
case 64:
case 2097152:
a = ($s(), it(b));
c = ht(b);
b = this.a.a;
var d;
b.p.j == (Sv(), Tv) ? d = a : d = c;
a = d;
var e;
-1 == b.o ? (b.o = Nb(b.c, a), b.a = be(b.b, a)) : (c = b.o, b.o < b.c && (b.o = be(b.o, Nb(b.c, a))), e = b.a, b.a > b.b && (b.a = Nb(b.a, be(b.b, a))), c = c == b.o, e = e == b.a, a = a != b.n, b.j = c && e && a);
Uv(b, d);
b.n = d;
break;
case 8:
case 4194304:
case 8388608:
Pv(this.a);
}
else
Pv(this.a);
};
C(340);
function Uv(a, b) {
var c;
b < a.o ? (c = b - a.o, c = $wnd.Math.max(-1, c / a.d)) : b > a.a ? (c = b - a.a, c = $wnd.Math.min(1, c / a.d)) : c = 0;
a.k = 500 * c;
}
function Vv(a, b, c, d) {
this.p = a;
this.c = b;
this.b = c;
this.d = d;
}
r(339, 1, {}, Vv);
_.jb = function (a) {
var b, c, d;
b = a - this.g;
this.g = a;
this.j && (a = w($wnd.Math.ceil(0.001 * b)), this.o < this.c ? (this.o += a, this.o = Nb(this.o, this.c), Uv(this, this.n)) : this.a > this.b && (this.a -= a, this.a = be(this.a, this.b), Uv(this, this.n)));
this.f += b / 1000 * this.k;
b = w(this.f);
this.f -= b;
if (0 != b) {
if (this.p.j == (Sv(), Tv)) {
d = this.p.e.v.C.k;
a = this.p;
var e;
a = Xu(Rh(a.e.v.C.n.style)) - (((e = Nv(a), e ? e.tFoot : null).offsetHeight || 0) | 0) - (((c = Nv(a), c ? c.tHead : null).offsetHeight || 0) | 0);
} else
d = this.p.e.v.p.k, c = this.p, a = Xu(Th(c.e.v.p.n.style)) - (((Ug(Nv(c)).offsetWidth || 0) | 0) - Lv(c));
if (0 < b && d < a || 0 > b && 0 < d)
c = d + b, this.p.j == Tv ? cv(this.p.e.v.C, c) : cv(this.p.e.v.p, c), e = this.p.b, e.a.a = b, Wv(e.a, null), 0 >= c ? (b = this.p.b, b.a.a = 0, Xv(b.a, b.a.c)) : c >= a && (b = this.p.b, b.a.a = 0, Xv(b.a, b.a.c));
}
this.i && 10 <= this.d && (this.e = (!Jd && (Jd = Kd() ? new Ld() : new Md()), Jd).kb(this, Q(this.p.e)));
};
_.a = -1;
_.b = 0;
_.c = 0;
_.d = 0;
_.f = 0;
_.g = 0;
_.i = !1;
_.j = !1;
_.k = 0;
_.n = 0;
_.o = -1;
C(339);
function Sv() {
Sv = k;
Tv = new Yv('VERTICAL', 0);
Zv = new Yv('HORIZONTAL', 1);
}
function Yv(a, b) {
O.call(this, a, b);
}
r(116, 5, {
116: 1,
3: 1,
6: 1,
5: 1
}, Yv);
var Zv, Tv, $v = E(116, function () {
Sv();
return z(u($v, 1), h, 116, 0, [
Tv,
Zv
]);
});
function aw(a) {
this.a = a;
}
r(338, 1, Da, aw);
_.mc = function (a) {
switch (Cp(a.d)) {
case 1048576:
1 == Oh(a.d).length && Pv(this.a);
break;
case 2097152:
a.a = !0;
break;
case 4194304:
case 8388608:
Pv(this.a);
}
};
C(338);
function bw(a, b, c, d) {
a.d = b;
a.c = c;
a.b = d;
}
function cw(a) {
this.e = a;
}
r(146, 1, {}, cw);
_.be = function () {
return this.e.a.cells[this.d];
};
_.c = 0;
_.d = 0;
C(146);
function dw() {
dw = k;
ew = new vk();
}
function Rt(a) {
dw();
this.a = a;
}
r(126, 672, {}, Rt);
_.Pb = function (a) {
a.ce(this);
};
_.Qb = function () {
return ew;
};
var ew;
C(126);
function fw() {
fw = k;
gw = new hw();
}
var gw;
function hw() {
}
r(263, 1, {}, hw);
_.de = iw;
C(263);
function jw(a, b, c) {
var d, e, f, g, l, m;
e = a.e.b;
f = b.a;
d = null;
0 <= f && f < kw(e).b.od() && (d = kw(e).a.Df(f));
g = b.c;
c == (lw(), mw) && 0 <= g && g < (m = T(e.q.c.c, 'size'), X((Y(), Z), m, G(0), G(0)).a) ? l = Et(e.q, g) : l = null;
c = a.e;
c.d = g;
c.c = l;
c.a = null;
e = mu(nu(new Eo(e.n)), d);
bw(a, f, e, d);
a.a = b.b;
}
function nw(a) {
this.e = new ow(a);
}
r(541, 146, {}, nw);
_.be = Hc;
C(541);
function pw(a) {
this.e = a;
}
r(359, 146, {}, pw);
_.be = qw;
C(359);
function ow(a) {
this.b = a;
}
r(203, 1, {}, ow);
_.d = 0;
C(203);
function rw() {
rw = k;
sw = new vk();
}
function tw() {
rw();
}
r(500, 672, {}, tw);
_.Pb = bq;
_.Qb = function () {
return sw;
};
var sw;
C(500);
function uw() {
uw = k;
vw = new vk();
}
function qu() {
uw();
}
r(182, 672, {}, qu);
_.Pb = bq;
_.Qb = function () {
return vw;
};
var vw;
C(182);
function ww() {
ww = k;
xw = new vk();
}
function yw() {
ww();
}
r(535, 672, {}, yw);
_.Pb = bq;
_.Qb = function () {
return xw;
};
var xw;
C(535);
r(229, 691, {});
_.Pb = function (a) {
var b, c;
b = Mh(this.d);
oh(b) && !zw(this.b, b) && (b = Aw(this.b.v, b)) && (c = (lw(), Bw), b == this.b.v.j ? c = Cw : b == this.b.v.a && (c = mw), this.ge(a, c));
};
_.Tb = Hc;
C(229);
function Dw(a, b) {
this.a = new nk(this.he(), this);
this.b = a;
this.c = b;
}
r(545, 229, {}, Dw);
_.ge = function (a, b) {
(b == (lw(), mw) && A(a, 163) || b == Cw && A(a, 144)) && a.fe(this);
};
_.he = function () {
return 'click';
};
C(545);
function Ew(a, b) {
this.a = new nk(this.he(), this);
this.b = a;
this.c = b;
}
r(546, 229, {}, Ew);
_.ge = Fw;
_.he = function () {
return 'dblclick';
};
C(546);
function Gw(a, b) {
this.a = new nk(this.he(), this);
this.b = a;
this.c = b;
}
r(165, 689, {});
_.Pb = function (a) {
var b, c;
b = Mh(this.d);
oh(b) && !zw(this.b, b) && (c = (lw(), Bw), b = this.b.c.c, b == this.b.v.j ? c = Cw : b == this.b.v.a && (c = mw), this.ie(a, c));
};
_.Tb = Hc;
C(165);
function Hw(a, b) {
Gw.call(this, a, b);
}
r(542, 165, {}, Hw);
_.ie = function (a, b) {
if (b == (lw(), mw) && a) {
var c;
if (32 == Nh(this.d) && !a.b.c) {
Qh(this.d);
a.b.c = !0;
c = this.c.e.d;
a.a && (fs(a.a.a), a.a = null);
a.a = Iw(a.b.b, new Jw(a, c));
var d = (Kw(), Lw);
Mw(a.b.b, c, d, (Kw(), 0));
}
}
};
_.he = function () {
return 'keydown';
};
C(542);
function Nw(a, b) {
Gw.call(this, a, b);
}
r(544, 165, {}, Nw);
_.ie = Fw;
_.he = function () {
return 'keypress';
};
C(544);
function Ow(a, b) {
Gw.call(this, a, b);
}
r(543, 165, {}, Ow);
_.ie = function (a, b) {
(b == (lw(), mw) && A(a, 162) || b == Cw && A(a, 653)) && a.ee(this);
};
_.he = function () {
return 'keyup';
};
C(543);
function Uu() {
Uu = k;
Vu = new vk();
}
function Bv() {
Uu();
}
r(166, 672, {}, Bv);
_.Pb = function (a) {
a.$d(this);
};
_.Qb = function () {
return Vu;
};
var Vu;
C(166);
function Pw() {
Pw = k;
Qw = new vk();
}
function Rw() {
Pw();
}
r(376, 672, {}, Rw);
_.Pb = function (a) {
yb(H(mr(Sw(a)))) ? a.d.S.selectAll() : a.d.S.clear();
};
_.Qb = function () {
return Qw;
};
var Qw;
C(376);
r(674, 1, {});
C(674);
function Tw(a) {
this.c = a;
this.a = Iq(a, new Uw(this), a.i.a);
}
r(531, 1, {}, Tw);
_.b = !0;
C(531);
function Uw(a) {
this.a = a;
}
r(163, 1, {
15: 1,
702: 1,
703: 1,
163: 1
}, Uw);
_.fe = function (a) {
a = a.c.e.c;
this.a.c.S.ke(a) ? this.a.b && Vw(this.a.c, a) : Ww(this.a.c, a);
};
C(163);
function Xw(a) {
var b;
b = new or();
var c = Aq(Q(a.c)) + '-selection-checkbox';
Fq(b.xc(), c);
a = new Yw(a, b);
Ap((S(), b.ab), 'mousedown');
Ap(b.ab, 'touchstart');
Ap(b.ab, 'click');
Hq(b, a, (Bk(), Bk(), Ck));
Hq(b, a, (Fk(), Fk(), Gk));
Hq(b, a, (qk(), qk(), rk));
return b;
}
function Zw(a, b) {
var c, d;
if (!b)
return -1;
d = (c = $w(a), c ? c.tBodies[0] : null);
for (c = fh((M(), d)); c;) {
if (N.Kb(c, b))
return c = fh(c), c = fh(c), parseInt(c.vEscalatorLogicalRow) | 0;
c = rh(c);
}
return -1;
}
function $w(a) {
return (a = Q(a.c).childNodes[2]) ? fh((M(), a)) : null;
}
function ax(a) {
a.d && (fs(a.d.a), a.d = null);
}
function Ek(a, b, c) {
ax(a);
a.d = Dp(new bx(a));
c = Zw(a, c);
a = a.b;
var d;
d = a.f.c.S;
A(d, 245) && d.ue();
var e, f;
d = a.f;
d = dh(Q(d.c)) + (((f = $w(d), f ? f.tHead : null).offsetHeight || 0) | 0) + 1;
f = dh((e = $w(a.f), e ? e.tFoot : null)) - 1;
a.g = d + 100;
a.b = f - 100;
a.c = 100;
50 > a.b - a.g && (e = 50 - (a.b - a.g), a.g -= e / 2 | 0, a.b += e / 2 | 0, a.c -= e / 2 | 0);
a.d = Dp(a.e);
e = a.f;
f = a.g;
d = a.b;
var g = a.c, l;
l = a.f;
var m = Et(l.c.q, c);
l = l.c.S.ke(m);
a.a = new cx(e, f, d, g, !l);
a = a.a;
a.p = !0;
a.t.oe(c, a.s);
a.j = c;
a.p && 10 <= a.f && (a.g = (!Jd && (Jd = Kd() ? new Ld() : new Md()), Jd).kb(a, Q(a.t.c)));
(M(), N).Bb(b);
b.stopPropagation();
}
function dx(a) {
this.b = new ex(this);
this.c = a;
}
r(217, 680, Ia, dx);
_.xd = function () {
return this.ne();
};
_.yd = function (a, b, c) {
nr(c, b, !1);
c.a.disabled = !1;
zq(c, Aq((S(), c.ab)) + '-disabled', !1);
c.ab.vEscalatorLogicalRow = a.e.d;
};
_.ne = function () {
return Xw(this);
};
_.sd = function () {
this.d && ax(this);
};
_.td = function () {
var a;
a = new Yk();
a.a.wf('mousedown', a);
a.a.wf('touchstart', a);
return a;
};
_.vd = function (a, b) {
if (Mc('touchstart', (M(), b).type) || 'mousedown' === b.type && 1 == N.xb(b))
return Ek(this, b, N.Ab(b)), !0;
throw new Lq('received unexpected event: ' + b.type).backingJsObject;
};
_.oe = function (a, b) {
var c;
c = Et(this.c.q, a);
b ? Ww(this.c, c) : Vw(this.c, c);
};
C(217);
function fx(a) {
var b;
a.d && (fs(a.d.a), a.d = null);
a.a && (b = a.a, b.p = !1, b.g && (b.g.lb(), b.g = null), a.a = null);
b = a.f.c.S;
A(b, 245) && b.te();
ax(a.f);
}
function ex(a) {
this.f = a;
this.e = new gx(this);
}
r(479, 1, {}, ex);
_.b = -1;
_.c = 0;
_.g = -1;
C(479);
function gx(a) {
this.a = a;
}
r(480, 1, Da, gx);
_.mc = function (a) {
var b;
if (this.a.a)
switch (b = a.d, Cp(a.d)) {
case 64:
case 2097152:
a = ($s(), it(b));
b = ht(b);
var c = this.a.a, d, e, f;
-1 == c.u ? (c.u = Nb(c.e, a), c.c = be(c.d, a)) : (e = c.u, c.u < c.e && (c.u = be(c.u, Nb(c.e, a))), d = c.c, c.c > c.d && (c.c = Nb(c.c, be(c.d, a))), e = e == c.u, d = d == c.c, f = a != c.k, c.q = e && d && f);
hx(c, a);
c.k = a;
-1 == c.i && (c.i = b);
break;
case 8:
case 4194304:
case 8388608:
fx(this.a);
}
else
fx(this.a);
};
C(480);
function hx(a, b) {
var c;
b < a.u ? (c = b - a.u, c = $wnd.Math.max(-1, c / a.f)) : b > a.c ? (c = b - a.c, c = $wnd.Math.min(1, c / a.f)) : c = 0;
a.r = 500 * c;
}
function cx(a, b, c, d, e) {
var f, g;
this.t = a;
this.e = b;
this.d = c;
this.f = d;
this.s = e;
this.b = dh(Q(a.c)) + (((g = $w(a), g ? g.tHead : null).offsetHeight || 0) | 0) + 1;
this.a = dh((f = $w(a), f ? f.tFoot : null)) - 1;
}
r(478, 1, {}, cx);
_.jb = function (a) {
var b;
b = a - this.o;
this.o = a;
this.q && (a = w($wnd.Math.ceil(0.001 * b)), this.u < this.e ? (this.u += a, this.u = Nb(this.u, this.e), hx(this, this.k)) : this.c > this.d && (this.c -= a, this.c = be(this.c, this.d), hx(this, this.k)));
this.n += b / 1000 * this.r;
b = w(this.n);
this.n -= b;
0 != b && cv(this.t.c.v.C, this.t.c.v.C.k + b);
b = this.t;
a = this.i;
var c = be(this.b, Nb(this.a, this.k));
$s();
var d = $wnd.document.elementFromPoint(a, c), d = $wnd.document.elementFromPoint(a, c);
null != d && 3 == d.nodeType && (d = d.parentNode);
a = Zw(b, d);
for (b = a > this.j ? 1 : -1; -1 != a && this.j != a;)
this.j += b, this.t.oe(this.j, this.s);
this.p && 10 <= this.f && (this.g = (!Jd && (Jd = Kd() ? new Ld() : new Md()), Jd).kb(this, Q(this.t.c)));
};
_.a = 0;
_.b = 0;
_.c = -1;
_.d = 0;
_.e = 0;
_.f = 0;
_.i = -1;
_.j = -1;
_.k = 0;
_.n = 0;
_.o = 0;
_.p = !1;
_.q = !1;
_.r = 0;
_.s = !1;
_.u = -1;
C(478);
function Yw(a, b) {
this.b = a;
this.a = b;
}
r(476, 1, {
90: 1,
724: 1,
725: 1,
15: 1
}, Yw);
_.Ub = function (a) {
Qh(a.d);
a = a.d;
(M(), a).stopPropagation();
};
C(476);
function bx(a) {
this.a = a;
}
r(477, 1, Da, bx);
_.mc = function (a) {
var b;
switch (Cp(a.d)) {
case 1048576:
1 == Oh(a.d).length && fx(this.a.b);
break;
case 2097152:
a.a = !0;
break;
case 4194304:
case 8388608:
b = Mh(a.d);
var c;
var d;
if (b)
if ((c = (d = $w(this.a), d ? d.tBodies[0] : null)) && (M(), N).Kb(c, b)) {
for (; Vg((M(), b)) && Ug(Vg(b)) != c;)
b = Vg(b);
c = fh(Vg(b)) == b;
} else
c = !1;
else
c = !1;
c && (ax(this.a), a.a = !0);
}
};
C(477);
function ix() {
ix = k;
jx = new vk();
}
function kx(a, b, c) {
ix();
this.a = a;
null != b ? il() : (il(), il());
null != c ? il() : (il(), il());
}
function lx(a, b, c) {
ix();
this.a = a;
b ? new Eo(b) : (il(), il());
c ? new Eo(c) : (il(), il());
}
r(36, 672, {}, kx, lx);
_.Pb = function (a) {
a.pe(this);
};
_.Rb = Hc;
_.Qb = function () {
return jx;
};
var jx;
C(36);
function mx(a) {
var b, c, d;
d = new nx(a.a.od());
for (a = (c = new Lm(a.a).a.uf().Mc(), new Mm(c)); a.a.Xc();)
c = (b = a.a.Yc(), b.Nf()), Ud(d, c.b);
return d;
}
function ox(a, b) {
if (a.j && b)
throw new Lq('Selection model is already attached to a grid. Remove the selection model first from the grid and then add it.').backingJsObject;
a.j = b;
if (a.j)
a.p = new px(b), a.k = new dx(b);
else {
var c = a.p;
fs(c.d.a);
fs(c.e.a);
a.p = null;
a.k = null;
}
}
r(127, 674, {
138: 1,
245: 1,
127: 1
});
_.te = function () {
var a, b, c, d, e;
if (this.g) {
this.g = !1;
a = mx(this.o);
this.o.a.yf();
e = mx(this.i);
for (d = (c = new Lm(this.i.a).a.uf().Mc(), new Mm(c)); d.a.Xc();)
c = (b = d.a.Yc(), b.Nf()), Wt(c.c, c);
this.i.a.yf();
Jq(this.j, new lx(this.j, a, e));
}
};
_.qe = function (a) {
var b, c, d;
b = new qx();
for (d = new pu(a.b.Mc()); d.b.Xc();)
c = d.b.Yc(), a = Ct(this.j.q, c), this.xe(a) && b.a.wf(c, b);
0 < b.a.od() && Jq(this.j, new lx(this.j, null, b));
};
_.re = function () {
var a, b;
if (0 < this.n.a.od()) {
b = new rx(this.n);
a = this.j;
var c, d, e, f;
f = new qx();
for (e = (d = new Lm(this.n.a).a.uf().Mc(), new Mm(d)); e.a.Xc();)
d = (c = e.a.Yc(), c.Nf()), Km(f, d.b);
c = (il(), new sx(f));
a = new lx(a, null, c);
this.n.a.yf();
this.g && (this.o.a.yf(), this.i.a.yf(), tx(this.i, b));
Jq(this.j, a);
return !0;
}
return !1;
};
_.xe = function (a) {
return null != this.n.a.xf(a) ? (this.g ? (this.o.a.xf(a), Km(this.i, a)) : Wt(a.c, a), !0) : !1;
};
_.je = ux;
_.ke = function (a) {
a = Ct(this.j.q, a);
return Oq(this.n, a);
};
_.le = function () {
this.re();
};
_.se = function (a) {
var b, c, d;
b = new qx();
for (d = new pu(a.b.Mc()); d.b.Xc();)
c = d.b.Yc(), a = Ct(this.j.q, c), this.ye(a) && b.a.wf(c, b);
0 < b.a.od() && Jq(this.j, new lx(this.j, b, null));
};
_.ye = function (a) {
return Km(this.n, a) ? (It(a.c, a), this.g && (this.i.a.xf(a), Km(this.o, a)), !0) : !1;
};
_.me = function (a) {
ox(this, a);
};
_.ue = function () {
this.g = !0;
};
_.g = !1;
C(127);
r(697, 674, {});
_.je = vx;
_.ke = wx;
_.le = Qq;
_.me = au;
C(697);
function xx(a, b) {
if (b && Yt(b, a.g)) {
var c = a.g;
Wt(c.c, c);
a.g = null;
}
}
function yx(a, b) {
if (a.f && b)
throw new Lq('Selection model is already attached to a grid. Remove the selection model first from the grid and then add it.').backingJsObject;
a.f = b;
if (a.f)
a.i = new px(b), a.d = new Tw(b), a.i && (a.i.a = a.e), a.d && (a.d.b = a.e);
else {
var c = a.i;
fs(c.d.a);
fs(c.e.a);
fs(a.d.a.a);
a.i = null;
a.d = null;
}
}
function zx() {
}
r(205, 674, { 241: 1 }, zx);
_.ve = function (a) {
if (null == a)
throw new F('Row cannot be null').backingJsObject;
return this.ke(a) ? (xx(this, this.g), Jq(this.f, new kx(this.f, null, a)), !0) : !1;
};
_.je = vx;
_.ke = function (a) {
return !!this.g && Yt(this.g, Ct(this.f.q, a));
};
_.le = function () {
this.g && this.ve(this.g ? this.g.b : null);
};
_.we = function (a) {
var b;
if (null == a)
throw new F('Row cannot be null').backingJsObject;
b = this.g ? this.g.b : null;
var c;
(c = Ct(this.f.q, a)) && !Yt(c, this.g) ? (xx(this, this.g), c = this.g = c, It(c.c, c), c = !0) : c = !1;
return c ? (Jq(this.f, new kx(this.f, a, b)), !0) : !1;
};
_.me = function (a) {
yx(this, a);
};
_.e = !0;
C(205);
function px(a) {
this.b = a;
this.d = Iq(a, new Ax(this), a.G.a);
this.e = Bx(a, new Cx(this));
}
r(226, 1, {}, px);
_.a = !0;
_.c = !1;
C(226);
function Cx(a) {
this.a = a;
}
r(162, 1, {
15: 1,
242: 1,
654: 1,
162: 1
}, Cx);
_.ee = function (a) {
32 == Nh(a.d) && (this.a.c = !1);
};
C(162);
function Ax(a) {
this.b = a;
}
r(529, 1, {
15: 1,
242: 1,
714: 1
}, Ax);
_.a = null;
C(529);
function Jw(a, b) {
this.a = a;
this.b = b;
}
r(530, 1, Ka, Jw);
_.ce = function (a) {
if (Dx(a.a, this.b)) {
a = this.a;
var b = this.a.b.b, c;
c = Et(b.q, this.b);
b.S.ke(c) ? a.b.a && Vw(b, c) : Ww(b, c);
fs(this.a.a.a);
this.a.a = null;
}
};
_.b = 0;
C(530);
function Ex() {
Ex = k;
Fx = new vk();
}
function Gx(a, b, c) {
Ex();
this.a = a;
this.b = b;
this.c = c;
}
r(198, 672, {}, Gx);
_.Pb = function (a) {
Hx(a, this);
};
_.Rb = Hc;
_.Qb = function () {
return Fx;
};
_.c = !1;
var Fx;
C(198);
function Ix(a) {
Jx.call(this, a, (Kx(), Lx));
}
function Jx(a, b) {
if (!a)
throw new F('Grid column reference can not be null!').backingJsObject;
if (!b)
throw new F('Direction value can not be null!').backingJsObject;
this.a = a;
this.b = b;
}
r(76, 1, { 76: 1 }, Ix, Jx);
C(76);
function Mx() {
Mx = k;
vq();
$wnd.Math.sqrt(3);
$wnd.Math.tan(0.6981317007977318);
}
function Aw(a, b) {
return a.j.o != b && Wg(a.j.o, b) ? a.j : a.a.o != b && Wg(a.a.o, b) ? a.a : a.f.o != b && Wg(a.f.o, b) ? a.f : null;
}
function Nx(a) {
var b, c;
0 == a.a.e.b ? Jq(a, new Su(0, 0)) : (c = Ox(a.a, Px(a.a.e)), b = Ox(a.a, Qx(a.a.e)) + 1, Jq(a, new Su(c, b - c)));
}
function Qt(a) {
return 0 == a.a.e.b ? V(0, 0) : V(a.a.d, a.a.e.b);
}
function Rx(a) {
return (0 < a.j.p || 0 < a.a.p || 0 < a.f.p) && 0 < a.c.a.a.length;
}
function Sx(a) {
return a.i.hasChildNodes() || a.b.hasChildNodes() || a.e.hasChildNodes();
}
function Tx(a) {
if (a.Y) {
a.D = $wnd.Math.max(0, gt((S(), a.ab)));
a.o = $wnd.Math.max(0, ft(a.ab));
Ux(a.j);
Ux(a.f);
Vx(a.u);
Wx(a.a);
var b = a.a.b, c, d;
a = gt(b.f.B) - b.b;
for (b = (d = new Xx(b.a).a.uf().Mc(), new Yx(d)); b.a.Xc();)
d = (c = b.a.Yc(), c.Of()), d.e.style.width = a + (Fj(), 'px');
}
}
function Zx(a) {
var b;
$x(a.j);
$x(a.a);
$x(a.f);
for (b = 0; b < a.c.a.a.length; b++) {
var c = ay(a.c, b);
by(a.c, cy(G(b), c));
}
}
function dy(a, b) {
null != b && y();
ey(a, b);
}
function ey(a, b) {
var c;
c = a.a.e.b;
null != b && 0 != (y(), b).length ? (S(), a.ab).style.height = b : (S(), a.ab).style.height = '400.0px';
Tx(a);
c != a.a.e.b && Nx(a);
}
function fy(a, b, c) {
switch (b.g) {
case 1:
a.p.d = c;
break;
case 0:
a.C.d = c;
break;
default:
throw new Uq('Unexpected value: ' + b).backingJsObject;
}
}
function gy(a, b) {
Fq((S(), a.ab), b);
var c = a.C;
mh(c.g, b + '-scroller');
Zg(c.g, b + '-scroller-vertical');
c = a.p;
mh(c.g, b + '-scroller');
Zg(c.g, b + '-scroller-horizontal');
Fq(a.B, b + '-tablewrapper');
Fq(a.k, b + '-header-deco');
Fq(a.g, b + '-footer-deco');
Fq(a.q, b + '-horizontal-scrollbar-deco');
Fq(a.v, b + '-spacer-deco-container');
c = a.j;
hy(c, b);
Fq(c.o, b + '-header');
c = a.a;
hy(c, b);
Fq(c.o, b + '-body');
for (var d, e, c = (e = new Xx(c.b.a).a.uf().Mc(), new Yx(e)); c.a.Xc();)
e = (d = c.a.Yc(), d.Of()), Fq(e.e, b + '-spacer'), Fq(e.a, b + '-spacer-deco');
d = a.f;
hy(d, b);
Fq(d.o, b + '-footer');
}
function iy(a, b) {
null != b && 0 != (y(), b).length ? (S(), a.ab).style.width = b : (S(), a.ab).style.width = '500.0px';
Tx(a);
}
function jy() {
Mx();
var a, b;
this.d = new Eu();
this.i = (S(), Ch());
this.b = Ah();
b = $doc;
this.e = (M(), b).createElement('tfoot');
this.C = new Dv();
this.p = new xv();
this.j = new ky(this, this.i);
this.a = new ly(this, this.b);
this.f = new my(this, this.e);
this.u = new ny(this);
this.c = new oy(this);
this.q = wh();
this.k = wh();
this.g = wh();
this.v = wh();
this.t = new py(this);
-1 != Nc($wnd.navigator.userAgent, 'Firefox') ? this.s = new Lu() : (b = $doc.body.style, void 0 !== b.transform ? void 0 !== b.transformStyle ? this.s = new Mu() : this.s = new Ou() : void 0 !== b.webkitTransform ? this.s = new Pu() : this.s = new Lu());
nc(qy);
qc(jb(this.s));
this.ab = b = wh();
var c, d;
a = new ry(this);
c = dt();
(Ps(), !U && (U = new Rs()), Ps(), U).a.g && (Vs((!U && (U = new Rs()), U)) ? c += 2 : c += 1);
b.appendChild(this.C.g);
Tu(this.C, a);
lv(this.C, c);
Us((!U && (U = new Rs()), U)) && (d = this.C.g.style, d.right = $u(this.C) - 1 + (Fj(), 'px'));
b.appendChild(this.p.g);
Tu(this.p, a);
lv(this.p, c);
a = this.p;
c = new sy();
Rk((!a.a && (a.a = new cl(a)), a.a), (Ev(), Fv), c);
0 == dt() && (this.C.g.style.zIndex = '90', this.p.g.style.zIndex = '90');
this.B = wh();
b.appendChild(this.B);
a = Eh();
this.B.appendChild(a);
a.appendChild(this.i);
a.appendChild(this.b);
a.appendChild(this.e);
a = this.k.style;
a.width = $u(this.C) + (Fj(), 'px');
a.display = (ii(), 'none');
b.appendChild(this.k);
a = this.g.style;
a.width = $u(this.C) + 'px';
a.display = 'none';
b.appendChild(this.g);
a = this.q.style;
a.display = 'none';
a.height = $u(this.p) + 'px';
b.appendChild(this.q);
gy(this, 'v-escalator');
this.v.setAttribute('aria-hidden', 'true');
ey(this, null);
this.ab.style.width = '500.0px';
Tx(this);
}
function ty(a, b, c, d, e, f) {
Mx();
var g;
g = e - d;
switch (a.g) {
case 0:
return a = b - f, a < d ? a : c + f > e ? c + f - g : d;
case 3:
return c + f - g;
case 2:
return b + (c - b) / 2 - g / 2;
case 1:
return b - f;
default:
throw new F('Internal: ScrollDestination has been modified, but Escalator.getScrollPos has not been updated to match new values.').backingJsObject;
}
}
function uy(a, b) {
Mx();
if (!a)
throw new F('Destination cannot be null').backingJsObject;
if (a == (Kw(), vy) && 0 != b)
throw new F('You cannot have a padding with a MIDDLE destination').backingJsObject;
}
r(433, 17, wa, jy);
_.ze = function () {
Mx();
nc(qy);
};
_.Hc = function () {
var a, b, c;
wy(this.j);
wy(this.a);
wy(this.f);
xy(this.j, 0, this.j.p);
xy(this.f, 0, this.f.p);
Lg((Ig(), Jg), new yy(this));
c = !1;
for (b = new $k(this.c.a); b.a < b.c.a.length;)
a = al(b), a.c ? (a.c = !1, zy(a, a.b), a = !0) : a = !1, a && (c = !0);
c && (Ay(this.j), Ay(this.a), Ay(this.f));
b = this.C;
b.Wd(Math.round(b.k) | 0);
b = this.p;
b.Wd(Math.round(b.k) | 0);
By(this.u, this.C.g);
By(this.u, this.p.g);
b = this.u;
c = (S(), this.ab);
c.addEventListener ? c.addEventListener('onmousewheel' in c ? 'mousewheel' : 'wheel', b.c) : c.attachEvent('onmousewheel', b.c);
b = this.u;
c = this.ab;
c.addEventListener && (c.addEventListener('touchstart', b.i), c.addEventListener('touchmove', b.g), c.addEventListener('touchend', b.e), c.addEventListener('touchcancel', b.e));
};
_.Ic = function () {
var a, b, c, d;
Cy(this.u, this.C.g);
Cy(this.u, this.p.g);
a = this.u;
c = (S(), this.ab);
c.addEventListener ? c.removeEventListener(void 0 === c.onwheel ? 'mousewheel' : 'wheel', a.c) : c.detachEvent('onmousewheel', a.c);
a = this.u;
c = this.ab;
c.removeEventListener && (c.removeEventListener('touchstart', a.i), c.removeEventListener('touchmove', a.g), c.removeEventListener('touchend', a.e), c.removeEventListener('touchcancel', a.e));
Dy(this.j, 0, this.j.p);
Dy(this.f, 0, this.f.p);
c = Ey(this.a);
for (a = 0; a < c; a++)
b = c - a - 1, d = this.b.rows[b], Fy(this.a, d, b), b = this.t, gl(b.b, d), gl(b.a, d);
Gy(this.a.e);
a = this.a;
zl();
a.d = 0;
};
_.zc = function (a) {
dy(this, a);
};
_.Ac = function (a) {
iy(this, a);
};
_.n = 10;
_.o = 0;
_.r = !1;
_.w = 0;
_.A = 0;
_.D = 0;
var qy = C(433);
r(447, 1, {}, function (a) {
this.a = a;
});
_.tb = function () {
Tx(this.a);
this.a.r = !1;
};
C(447);
function ry(a) {
this.a = a;
}
r(448, 1, Ja, ry);
_.$d = function () {
Hy(this.a.u);
Jq(this.a, new Bv());
};
C(448);
function sy() {
}
r(449, 1, {
15: 1,
723: 1
}, sy);
_.a = !1;
C(449);
function Hv(a) {
this.a = a;
}
r(450, 1, {}, Hv);
_.tb = function () {
this.a.a = !1;
};
C(450);
function yy(a) {
this.a = a;
}
r(451, 1, { 244: 1 }, yy);
_.tb = function () {
Tx(this.a);
};
C(451);
function Iy(a, b, c, d) {
this.a = a;
this.b = b;
this.c = c;
this.d = d;
}
r(452, 1, {}, Iy);
_.tb = function () {
var a, b, c, d;
uy(this.b, this.c);
if (-1 != this.d && (a = this.d, 0 > a || a >= this.a.a.p))
throw new Dc('The given row index ' + a + ' does not exist.').backingJsObject;
-1 != this.d ? (b = w($wnd.Math.floor(Jy(this.a.a, this.d))), a = w($wnd.Math.ceil(this.a.a.i)), a = V(b, a)) : a = V(0, 0);
c = Ky(this.a.a.b.a, G(this.d));
if (-1 == this.d && !c)
throw new F('Cannot scroll to row index -1, as there is no spacer open at that index.').backingJsObject;
c ? (b = w($wnd.Math.floor(Ly(c.i.f.t, c.e))), c = w($wnd.Math.ceil(c.d)), b = V(b, c), b = Vt(a, b)) : b = a;
a = b.b;
b = b.a;
d = this.a.C.k;
c = d + My(this.a.a);
a = ty(this.b, a, b, d, c, this.c);
cv(this.a.C, a);
};
_.c = 0;
_.d = 0;
C(452);
function Ny(a, b, c) {
if (1 > c)
throw new F('Number of rows must be 1 or greater (was ' + c + ')').backingJsObject;
if (0 > b || b + c > a.p)
throw new Dc('The given row range (' + b + '..' + (b + c) + ') was outside of the current number of rows (' + a.p + ')').backingJsObject;
}
function wy(a) {
a.f || (a.f = !0, Qg((Ig(), Jg), new Oy(a)));
}
function $x(a) {
var b;
if (a.j || a.q.Y)
a.k || (a.k = (S(), Dh()), mh(a.k, a.n + '-row'), a.g = mp(a.Ae()), mh(a.g, a.n + '-cell'), nh(a.g, 'Ij'), a.k.appendChild(a.g)), a.o.appendChild(a.k), b = ft(a.g), a.o.removeChild(a.k), 1 <= b && a.i != b && (a.i = b, a.j = !1, a.o.hasChildNodes() && a.He());
}
function Py(a, b) {
var c;
c = mp(a.Ae());
c.style.height = a.i + (Fj(), 'px');
0 <= b && (c.style.width = b + 'px');
Zg(c, a.n + '-cell');
return c;
}
function Qy(a, b) {
var c, d, e, f;
if (!b)
throw new F('Element cannot be null').backingJsObject;
if (a.o == b || Vg((M(), b)) == a.o || !Wg(a.o, b))
return null;
for (c = b; Ug(Vg((M(), c))) != a.o;)
c = Vg(c);
d = -1;
for (e = c; e; e = sh(e))
++d;
e = -1;
for (f = Vg(c); f; f = sh(f))
++e;
return new ru(e, d, c);
}
function Ry(a, b) {
return Ly(a.q.t, b);
}
function Sy(a, b, c) {
var d;
c ? (d = c ? c.nextSibling : null, d ? a.insertBefore(b, d) : a.appendChild(b)) : a.insertBefore(b, a.firstChild);
return b;
}
function Mt(a, b, c) {
var d, e;
if (0 > b || b > a.p)
throw new Dc('The given index (' + b + ') was outside of the current number of rows (0..' + a.p + ')').backingJsObject;
if (1 > c)
throw new F('Number of rows must be 1 or greater (was ' + c + ')').backingJsObject;
a.p += c;
if (a.q.Y && (a.Fe(b, c), a.p == c)) {
c = new zg();
for (d = 0; d < a.q.c.a.a.length; d++)
e = ay(a.q.c, d), b = G(d), Ty(c.d, b, e);
by(a.q.c, c);
}
}
function Uy(a, b, c) {
var d, e, f, g, l, m, n;
e = -1;
f = a.o.rows;
for (a = 0; a < f.length; a++) {
if (g = d = f[a].cells[b]) {
g = 1 < d.colSpan;
var p = (ii(), 'none'), v;
v = d.style;
v = (M(), v).display;
g = (l = p === v, !g && !l);
}
g && (g = d.cloneNode(c), g.style.height = '', g.style.width = '', Vg((M(), d)).insertBefore(g, d), d = (m = gt(g), (Ps(), !U && (U = new Rs()), Ps(), U).a.g && (m += 0.01), n = Vg(g), !!n && n.removeChild(g), m), e = $wnd.Math.max(e, d));
}
return e;
}
function Vy(a, b, c, d) {
var e, f, g;
for (f = 0; f < a.Ce(); f++) {
g = a.Ee(f);
e = a.De(g);
var l = a, m = b, n = c, p = void 0, v = void 0, x = v = void 0, D = void 0, L = x = void 0;
Bu(l.q.d, g, e, Wy(l.q.c));
D = new Hu(l.q.d, m, n);
for (v = new Fu(new Gu(D.a.a, D.c, D.c + D.b), !1); v.c + v.d < v.a.a.length;)
p = Iu(v), x = Xy(Pr(l.q.c.a, p.a)), x = Py(l, x), p.c = x;
l.r.Gd(l.q.d, D);
0 != m ? L = g.childNodes[m - 1] : L = null;
for (v = new Fu(new Gu(D.a.a, D.c, D.c + D.b), !1); v.c + v.d < v.a.a.length;)
p = Iu(v), L = Sy(g, p.c, L);
l.r.Ed(l.q.d, D);
l.r.Id(l.q.d, D);
}
Yy(a);
if (d)
for (d = b; d < b + c; d++)
Zy(a, d, !0, 'frozen'), $y(a, d, a.q.u.a);
}
function xy(a, b, c) {
var d, e, f, g, l, m;
d = new Rd();
if (1 > c)
return d;
0 != a.o.childNodes.length && 0 != b ? g = a.o.childNodes[b - 1] : g = null;
for (l = b; l < b + c; l++) {
m = (S(), Dh());
d.a[d.a.length] = m;
Zg(m, a.n + '-row');
for (f = 0; f < a.q.c.a.a.length; f++)
e = Xy(Pr(a.q.c.a, f)), e = Py(a, e), m.appendChild(e), f < a.q.c.b && (Zg(e, 'frozen'), a.q.s.Kd(e, a.q.u.a, 0)), 0 < a.q.c.b && f == a.q.c.b - 1 && Zg(e, 'last-frozen');
f = a;
Bu(f.q.d, m, l, Wy(f.q.c));
f.r.Gd(f.q.d, zu(f.q.d));
g = Sy(f.o, m, g);
f.r.Ed(f.q.d, zu(f.q.d));
f.r.Id(f.q.d, zu(f.q.d));
}
Yy(a);
a.Ie();
return d;
}
function az(a, b, c) {
var d, e, f;
for (f = 0; f < a.Ce(); f++) {
e = a.Ee(f);
Bu(a.q.d, e, f, Wy(a.q.c));
d = new Au(a.q.d, b, c);
a.r.Hd(a.q.d, d);
for (d = 0; d < c; d++)
Yg(e.cells[b]);
e = new Hu(a.q.d, b, c);
a.r.Fd(a.q.d, e);
}
}
function Fy(a, b, c) {
Bu(a.q.d, b, c, Wy(a.q.c));
a.r.Hd(a.q.d, zu(a.q.d));
(c = Vg((M(), b))) && c.removeChild(b);
a.r.Fd(a.q.d, zu(a.q.d));
}
function Ay(a) {
var b, c, d, e, f, g;
for (d = eh(a.o); d;) {
a: {
b = d;
for (var l = e = c = void 0, m = void 0, m = (e = new Xx(a.q.a.b.a).a.uf().Mc(), new Yx(e)); m.a.Xc();)
if (l = (c = m.a.Yc(), c.Of()), l.e == b) {
b = !0;
break a;
}
b = !1;
}
if (!b)
for (b = fh((M(), d)), c = 0; b;)
e = (f = parseInt(b.colSpan) | 0, g = V(c, f), g.a > a.q.c.a.a.length && (g = new qt(c, a.q.c.a.a.length)), bz(a.q.c, g)), b.style.width = e + (Fj(), 'px'), b = rh(b), ++c;
d = rh((M(), d));
}
Yy(a);
}
function cz(a, b) {
var c;
for (c = fh((M(), a)); c;)
c.style.height = b + (Fj(), 'px'), c = rh(c);
}
function Yy(a) {
var b;
b = dz(a.q.c);
if (!(0 > b))
for (a = eh(a.o); a;)
a.style.width = ($s(), kt(b, !0) + (Fj(), 'px')), a = rh((M(), a));
}
function ez(a, b, c, d) {
Bu(a.q.d, b, c, Wy(a.q.c));
a.r.Id(a.q.d, new Au(a.q.d, d.b, d.a - d.b));
}
function Tt(a, b, c) {
c = V(b, c);
b = V(0, a.q.c.a.a.length);
a.Je(c, b);
}
function Ot(a, b, c) {
Ny(a, b, c);
a.p -= c;
a.q.Y && Sx(a.q) && a.Ge(b, c);
}
function fz(a, b, c) {
Zy(a, b, c, 'frozen');
c && $y(a, b, a.q.u.a);
}
function gz(a, b) {
if (1 > b)
throw new F('Height must be positive. ' + b + ' was given.').backingJsObject;
a.j = !1;
a.i = b;
a.He();
}
function hz(a, b) {
a.r = b;
Rx(a.q) && 0 < a.p && Tt(a, 0, a.p);
}
function hy(a, b) {
var c, d;
c = a.n;
if (null == c ? null != b : c !== b)
for (a.n = b, d = a.o.rows[0]; d;) {
Fq(d, b + '-row');
for (c = d.cells[0]; c;)
Fq(c, b + '-cell'), c = rh((M(), c));
d = rh((M(), d));
}
}
function Zy(a, b, c, d) {
var e, f, g;
f = a.o.rows;
for (g = 0; g < f.length; g++)
e = f[g], a.Ke(e) && (e = e.cells[b], c ? Zg(e, d) : (lh(e, d), a.q.s.Jd(e)));
}
function $y(a, b, c) {
var d, e, f;
e = a.o.rows;
for (f = 0; f < e.length; f++)
d = e[f], a.Ke(d) && (d = d.cells[b], a.q.s.Kd(d, c, 0));
}
function iz(a, b) {
this.q = a;
this.r = (su(), tu);
this.o = b;
}
r(211, 1, {});
_.Ld = function (a) {
return Qy(this, a);
};
_.Be = jz;
_.De = function (a) {
return a.sectionRowIndex;
};
_.Md = kz;
_.Nd = function (a) {
return this.Ee(a);
};
_.Od = function (a) {
Tt(this, a, 1);
};
_.f = !1;
_.i = 20;
_.j = !0;
_.n = null;
_.p = 0;
C(211);
function Oy(a) {
this.a = a;
}
r(445, 1, {}, Oy);
_.tb = function () {
this.a.q.Y && (this.a.f = !1, $x(this.a));
};
C(445);
function lz(a, b) {
if (0 <= b && b < a.o.childNodes.length)
return a.o.rows[b];
throw new Dc('No such visual index: ' + b).backingJsObject;
}
function Dy(a, b, c) {
var d, e;
for (d = b; d < b + c; d++)
e = a.o.rows[b], Fy(a, e, b);
Ux(a);
}
function Ux(a) {
var b;
b = a.i * a.p;
b != a.b && (a.b = b, a.Le(), dv(a.c.C, a.c.o - $wnd.Math.max(0, a.c.j.b) - $wnd.Math.max(0, a.c.f.b)), Wx(a.c.a), mz(a.c.a.b));
}
r(212, 211, {});
_.Ce = function () {
return this.o.childNodes.length;
};
_.Ee = function (a) {
return lz(this, a);
};
_.Fe = function (a, b) {
xy(this, a, b);
};
_.Ge = function (a, b) {
Dy(this, a, b);
};
_.He = function () {
var a;
if (0 != this.o.childNodes.length) {
for (a = this.o.rows[0]; a;)
cz(a, this.i), a = rh((M(), a));
Ux(this);
}
};
_.Ie = function () {
Ux(this);
};
_.Je = function (a, b) {
var c, d;
Ny(this, a.b, a.a - a.b);
if (this.c.Y && Rx(this.c))
for (c = a.b; c < a.a; c++)
d = lz(this, c), ez(this, d, c, b);
};
_.Ke = function () {
return !0;
};
_.b = 0;
C(212);
function nz(a, b) {
var c, d;
if (b.b >= b.a)
return b;
if (0 == a.e.b)
return V(0, 0);
d = (c = w($wnd.Math.ceil(My(a) / a.i)) + 1, 0 > c ? 0 : c);
c = Ox(a, Px(a.e));
d = At(b, V(c, d))[1];
return 0 == -c ? d : new qt(d.b + -c, d.a + -c);
}
function oz(a, b, c) {
var d, e, f;
d = (e = w($wnd.Math.ceil(My(a) / a.i)) + 1, (0 > e ? 0 : e) - (a.o.childNodes.length - (il(), new pz(new Xx(a.b.a)).b.od())));
c = c < d ? c : d;
if (0 < c) {
c = xy(a, b, c);
qz(a.e, b, c);
e = b * a.i + rz(a.b, b);
for (d = b; d < a.e.b; d++)
d - b < c.a.length ? f = (pd(d - b, c.a.length), c.a[d - b]) : f = sz(a.e, d), tz(a.q.t, f, 0, e), e += a.i, e += uz(a.b, d);
return c;
}
return jl;
}
function Ey(a) {
return a.o.childNodes.length - (il(), new pz(new Xx(a.b.a)).b.od());
}
function My(a) {
var b, c;
c = (a.c.B.offsetHeight || 0) | 0;
b = $wnd.Math.max(0, a.c.f.b);
a = $wnd.Math.max(0, a.c.j.b);
return $wnd.Math.max(0, c - b - a);
}
function Ox(a, b) {
var c;
c = vz(a.e, b);
return a.d + c;
}
function wz(a, b) {
var c;
if (0 > b || b >= a.p)
throw new Dc('No such logical index: ' + b).backingJsObject;
c = b - Ox(a, Px(a.e));
if (0 <= c && c < a.e.b)
return xz(a, c);
throw new Lq('Row with logical index ' + b + ' is currently not available in the DOM').backingJsObject;
}
function yz(a, b, c) {
var d;
d = c - b;
a = zz(a.b, b, (Az(), Bz), c);
return d - a;
}
function Jy(a, b) {
return rz(a.b, b) + b * a.i;
}
function xz(a, b) {
if (0 <= b && b < a.e.b)
return sz(a.e, b);
throw new Dc('No such visual index: ' + b).backingJsObject;
}
function Cz(a, b, c, d) {
var e, f, g, l, m;
if (!(b.b >= b.a)) {
b.b < c ? e = c - (b.a - b.b) : e = c;
if (b.b != e) {
g = new nx(b.a - b.b);
for (f = 0; f < b.a - b.b; f++)
c = Dz(a.e, b.b), g.a[g.a.length] = c;
qz(a.e, e, g);
}
g = Ez(a.e, e);
for (f = d; f < d + (b.a - b.b); f++)
c = Fz(g), ez(a, c, f, V(0, a.q.c.a.a.length));
l = (m = rz(a.b, d), m + d * a.i);
g = Ez(a.e, e);
for (f = 0; f < b.a - b.b; f++)
c = Fz(g), tz(a.q.t, c, 0, l), l += a.i, l += uz(a.b, d + f);
}
}
function Gz(a, b) {
var c, d, e, f, g;
if (0 != b) {
d = a.c.A + b;
cv(a.c.C, d);
c = a.i;
e = b - b % c;
c = w(b / c);
$s();
if (0.49 < (0 >= e ? 0 - e : e)) {
a: {
var l = a.b;
f = a.c.A;
g = (Az(), Bz);
var m, n, p;
n = new Eo(new Xx(l.a));
for (l = 0; l < n.a.length; l++) {
m = (pd(l, n.a.length), n.a[l]);
p = Ly(m.i.f.t, m.e);
m = p + m.d;
if (p > f) {
f = new Gu(n, l, n.a.length);
break a;
}
if (m > f) {
f = g == (Az(), Hz) ? new Gu(n, l + 1, n.a.length) : new Gu(n, l, n.a.length);
break a;
}
}
f = (il(), il(), Iz);
}
for (g = f.Mc(); g.Xc();)
f = g.Yc(), Jz(f, Kz(f.i.f.t, f.e), Ly(f.i.f.t, f.e) + e), Lz(f, f.f + c);
for (f = Ez(a.e, 0); f.b != f.d.c;)
c = Fz(f), g = Ly(a.q.t, c) + e, tz(a.q.t, c, 0, g);
}
Mz(a, a.c.w, d);
}
}
function Mz(a, b, c) {
a.c.w = b;
a.c.A = c;
a.c.s.Kd(a.c.b, -a.c.w, -a.c.A);
a.c.s.Kd(a.c.v, 0, -a.c.A);
}
function Nz(a) {
var b, c, d, e, f, g, l;
c = null;
if ((f = ct()) && Wg(a.o, f))
for (; f && f != a.o;)
f && Wc('tr', (M(), f).tagName) && (c = f), f = Vg((M(), f));
f = new Eo(a.e);
l = new Oz(a.c.a.b.a);
for (e = -1; e < a.e.b; e++)
if (g = gl(l, G(a.d + e)))
Pz(f, e + 1, g.e), g.e.style.display = '', g.a.style.display = '';
for (e = (d = new Xx(l).a.uf().Mc(), new Yx(d)); e.a.Xc();)
d = (b = e.a.Yc(), b.Of()), d.e.style.display = (ii(), 'none'), d.a.style.display = 'none';
b = !c;
for (d = new Qz(f, f.a.length); 0 < d.b;)
e = (nd(0 < d.b), d.a.Df(d.c = --d.b)), e == c ? b = !0 : b ? (f = a.o, f.insertBefore(e, f.firstChild)) : (f = a.o, g = void 0, (g = c ? c.nextSibling : null) ? f.insertBefore(e, g) : f.appendChild(e));
}
function Wx(a) {
var b, c, d, e, f;
if (a.c.Y) {
d = (e = w($wnd.Math.ceil(My(a) / a.i)) + 1, 0 > e ? 0 : e);
e = Nb(d, a.c.a.p);
e -= a.e.b;
if (0 < e)
d = a.e.b, 0 == a.e.b ? c = 0 : c = Ox(a, Qx(a.e)) + 1, (b = c < a.p - e) ? (b = oz(a, d, e), Cz(a, V(d, b.od()), d, c)) : (c = a.c.C.k, cv(a.c.C, 0), Hy(a.c.u), oz(a, d, e), cv(a.c.C, c), Hy(a.c.u));
else if (0 > e) {
d = Ez(a.e, a.e.b);
for (c = 0; c < -e; c++)
b = Rz(d), (f = Vg((M(), b))) && f.removeChild(b), Sz(d);
0 != a.e.b && (d = Ry(a, Px(a.e)), c = a.c.A - a.i, d < c && (c = Ox(a, Qx(a.e)) + 1, Cz(a, new qt(0, 1), a.e.b, c)));
}
0 != e && Nx(a.c);
}
}
function ly(a, b) {
this.c = a;
iz.call(this, a, b);
this.e = new Tz();
this.a = new Uz(this);
this.b = new Vz(this.c);
}
r(439, 211, {}, ly);
_.Ld = function (a) {
var b, c;
a = Qy(this, a);
if (!a)
return null;
c = Ug(a.b);
return new ru((b = vz(this.e, c), this.d + b), a.a, a.b);
};
_.Ae = Wz;
_.Ce = function () {
return Ey(this);
};
_.De = function (a) {
return Ox(this, a);
};
_.Nd = function (a) {
return wz(this, a);
};
_.Ee = function (a) {
return xz(this, a);
};
_.Fe = function (a, b) {
var c, d, e, f, g, l, m, n;
if (0 != b)
if (Xz(this.b, a, b), c = oz(this, a, b), Vx(this.c.u), d = a * this.i < this.c.C.k, e = a * this.i > this.c.C.k + My(this), d)
f = b * this.i, Gz(this, f), f = this.d + b, zl(), this.d = f;
else if (!e) {
d = a + c.od();
e = Ox(this, Px(this.e));
c = b - c.od();
if (0 < c) {
l = nz(this, V(d, c));
c = this.o.childNodes.length - (il(), new pz(new Xx(this.b.a)).b.od());
l = c - (l.a - l.b);
n = d - e;
Cz(this, new qt(l, c), n, d);
e = (d + (c - l)) * this.i;
try {
for (f = Ez(this.e, n + (c - l)), g = d; f.b != f.d.c;)
e += uz(this.b, g++), m = Fz(f), tz(this.q.t, m, 0, e), e += this.i;
} catch (p) {
if (p = ec(p), A(p, 13))
f = p, nc(qy), Pb(f, f.pb());
else
throw p.backingJsObject;
}
}
Nx(this.c);
Nz(this);
}
};
_.Ge = function (a, b) {
var c, d, e, f, g, l, m, n, p;
if (0 != b) {
n = Qt(this.c);
p = V(a, b);
e = this.b;
Yz(e, p);
Xz(e, p.b, -(p.a - p.b));
n = At(p, n);
p = n[0];
n = n[1];
e = nz(this, n);
f = e.b < e.a && 0 == e.b;
if (p.b < p.a || f)
g = (p.a - p.b) * this.i, l = this.i, l = this.c.C.k - g < l, !(e.b >= e.a) || l && f ? l && Gz(this, -this.c.C.k) : Gz(this, -g);
if (e.b < e.a) {
f = Ey(this.c.a);
g = this.p;
if (g < f) {
g = f - g;
for (m = 0; m < g; m++)
c = Dz(this.e, e.b), Fy(this, c, a), l = this.q.t, gl(l.b, c), gl(l.a, c);
f -= g;
Mz(this.c.a, this.c.w, 0);
e = n.b;
for (n = (d = rz(this.b, e), d + e * this.i); e < f; e++)
c = sz(this.e, e), tz(this.q.t, c, 0, n), n += this.i, n += uz(this.b, e);
n = b - g;
for (m = 0 > f - n ? 0 : f - n; m < f; m++)
c = sz(this.e, m), ez(this, c, m, V(0, this.q.c.a.a.length));
} else if (d = this.p * this.i, g = this.c.A + My(this), g <= d)
for (c = this.e.b, f = Ox(this, Qx(this.e)) - (e.a - e.b - 1), Cz(this, e, c, f), d = Ez(this.e, e.b), g = Jy(this, n.b), f = e.b; f < c - (e.a - e.b); f++)
l = Fz(d), tz(this.q.t, l, 0, g), g += this.i, g += (m = Ky(this.b.a, G(f + n.b)), m ? m.d : 0);
else if (0 >= e.b && 0 < e.a && b >= this.e.b)
e = this.c.p.k, d -= this.e.b * this.i, Mz(this, e, d), c = V(0, this.e.b), e = this.p - (c.a - c.b), Cz(this, c, 0, e), n = this.d + -(n.a - n.b), zl(), this.d = n;
else if (d + b * this.i - g < this.i) {
f = Ox(this, Px(this.e)) - (e.a - e.b);
Cz(this, e, 0, f);
e = e.a;
d = Ez(this.e, e);
m = Jy(this, n.b);
for (f = 0; d.b != d.d.c;)
g = Fz(d), tz(this.q.t, g, 0, m), m += this.i, g = e + f++, g = Ky(this.b.a, G(g)), m += (c = g, c ? c.d : 0);
n = this.d + -(n.a - n.b);
zl();
this.d = n;
} else {
l = Ry(this, sz(this.e, e.b));
for (m = 0; m < e.a - e.b; m++) {
c = Dz(this.e, e.b);
var v = this.e;
Zz(v, c, v.c.b, v.c);
}
for (m = e.b; m < f; m++)
c = sz(this.e, m), tz(this.q.t, c, 0, w(l)), l += this.i, l += uz(this.b, m + n.b);
n = d - My(this);
cv(this.c.C, n);
Hy(this.c.u);
Cz(this, new qt(f - 1, f - 1 + 1), 0, Ox(this, Px(this.e)) - 1);
n = this.d + -1;
zl();
this.d = n;
n = w($wnd.Math.ceil((g - d) / this.i));
n = f - (e.a - e.b - n);
c = new qt(n, f);
e = Ox(this, Px(this.e)) + n;
Cz(this, c, n, e);
}
Nx(this.c);
Nz(this);
}
p = this.d + -(p.a - p.b);
zl();
this.d = p;
Vx(this.c.u);
}
};
_.He = function () {
var a, b, c;
if (0 != this.e.b) {
for (a = 0; a < this.e.b; a++)
c = sz(this.e, a), cz(c, this.i), b = this.d + a, tz(this.q.t, c, 0, b * this.i);
a = this.c.C.k / Xu(Rh(this.c.C.n.style));
Vx(this.c.u);
cv(this.c.C, w(this.i * this.p * a));
Mz(this, this.c.p.k, this.c.C.k);
Hy(this.c.u);
Wx(this);
a = w(Ry(this, Px(this.e)) / this.i);
zl();
this.d = a;
}
};
_.Ie = Qq;
_.Je = function (a, b) {
var c, d, e;
e = nz(this, a);
if (e.b < e.a)
for (c = Ox(this, Px(this.e)), d = e.b; d < e.a; d++)
ez(this, sz(this.e, d), c + d, b);
};
_.Ke = function (a) {
return $z(this.e, a, !1);
};
_.d = 0;
C(439);
function Uz(a) {
this.a = a;
}
r(440, 50, {}, Uz);
_.tb = function () {
Nz(this.a);
lh(this.a.c.b, 'scrolling');
};
_.nb = function () {
Qg((Ig(), Jg), this);
};
C(440);
function dz(a) {
return bz(a, new qt(0, a.a.a.length));
}
function aA(a, b) {
if (!Dx(V(0, a.a.a.length), b))
throw new F('The given column index (' + b + ') does not exist').backingJsObject;
}
function Wy(a) {
var b;
if (null == a.d || a.d.length != a.a.a.length)
for (a.d = Ib(bA, ea, 183, a.a.a.length, 15), b = 0; b < a.a.a.length; b++)
a.d[b] = Xy(Pr(a.a, b));
return a.d;
}
function bz(a, b) {
var c, d, e;
e = 0;
for (d = b.b; d < b.a; d++)
c = Xy(Pr(a.a, d)), e += c;
return e;
}
function ay(a, b) {
aA(a, b);
return Pr(a.a, b).b;
}
function ou(a, b) {
var c, d, e;
e = Uy(a.c.j, b, !1);
c = Uy(a.c.a, b, !1);
d = Uy(a.c.f, b, !1);
return $wnd.Math.max(e, $wnd.Math.max(c, d));
}
function cA(a, b, c) {
var d, e, f;
if (0 > b || b > a.a.a.length)
throw new Dc('The given index(' + b + ') was outside of the current number of columns (0..' + a.a.a.length + ')').backingJsObject;
if (1 > c)
throw new F('Number of columns must be 1 or greater (was ' + c).backingJsObject;
d = a.c.d;
for (f = 0; f < c; f++)
e = b + f, Pz(d.a, e, new xu(d, e));
Cu(d, b + c);
for (d = 0; d < c; d++)
Pz(a.a, b, new dA(a));
(d = b < a.b) && (a.b += c);
f = Xu(Th(a.c.p.g.style)) < Xu(Th(a.c.p.n.style));
Vx(a.c.u);
e = Xu(Th(a.c.p.g.style)) < Xu(Th(a.c.p.n.style));
!f && e && Wx(a.c.a);
Vy(a.c.j, b, c, d);
Vy(a.c.a, b, c, d);
Vy(a.c.f, b, c, d);
if (0 < a.c.j.p || 0 < a.c.a.p || 0 < a.c.f.p) {
e = new zg();
for (f = b; f < b + c; f++)
d = G(f), Ty(e.d, d, 100);
by(a.c.c, e);
}
d = bz(a.c.c, V(0, b));
a.c.u.a > d && (b = bz(a.c.c, V(b, c)), cv(a.c.p, a.c.u.a + b));
}
function eA(a, b, c) {
if (1 > c)
throw new F('Number of columns can\'t be less than 1 (was ' + c + ')').backingJsObject;
if (0 > b || b + c > a.a.a.length)
throw new Dc('The given column range (' + b + '..' + (b + c) + ') was outside of the current number of columns (' + a.a.a.length + ')').backingJsObject;
var d, e, f;
Xu(Th(a.c.p.g.style)) >= Xu(Th(a.c.p.n.style)) || (d = bz(a, new qt(0, b)), f = bz(a, V(b, c)), e = a.c.p.k, e <= d || (d = $wnd.Math.max(d, e - f), cv(a.c.p, d)));
az(a.c.j, b, c);
az(a.c.a, b, c);
az(a.c.f, b, c);
d = a.c.d;
fA(new Gu(d.a, b, b + c));
Cu(d, b);
fA(new Gu(a.a, b, b + c));
b < a.b && (b + c < a.b ? a.b -= c : a.b = b);
Vx(a.c.u);
Wx(a.c.a);
0 < a.c.c.a.a.length && (b = a.c.j, 0 < b.p && Yy(b), b = a.c.a, 0 < b.p && Yy(b), a = a.c.f, 0 < a.p && Yy(a));
}
function by(a, b) {
var c, d, e;
if (!b.of()) {
for (d = b.uf().Mc(); d.Xc();)
c = d.Yc(), e = c.Nf().a, c = H(c.Of()), aA(a, e), c = ($s(), kt(c, !1)), zy(Pr(a.a, e), c);
a.d = null;
Ay(a.c.j);
Ay(a.c.a);
Ay(a.c.f);
Tx(a.c);
}
}
function gA(a, b) {
var c, d, e, f;
if (0 > b || b > a.a.a.length)
throw new F('count must be between 0 and the current number of columns (' + a.a.a.length + ')').backingJsObject;
f = a.b;
if (b != f) {
a.b = b;
if (Sx(a.c))
for ((e = b > f) ? (c = f, d = b) : (c = b, d = f), 0 < f && (Zy(a.c.j, f - 1, !1, 'last-frozen'), Zy(a.c.a, f - 1, !1, 'last-frozen'), Zy(a.c.f, f - 1, !1, 'last-frozen')), 0 < b && (Zy(a.c.j, b - 1, !0, 'last-frozen'), Zy(a.c.a, b - 1, !0, 'last-frozen'), Zy(a.c.f, b - 1, !0, 'last-frozen')); c < d; c++)
fz(a.c.j, c, e), fz(a.c.a, c, e), fz(a.c.f, c, e);
Vx(a.c.u);
}
}
function oy(a) {
this.c = a;
this.a = new Rd();
}
r(441, 1, {}, oy);
_.b = 0;
_.d = null;
C(441);
function Xy(a) {
return a.c ? -1 : a.a;
}
function zy(a, b) {
a.b = b;
if (0 > b)
if (a.d.c.Y) {
var c, d = a.d, e = zo(a.d.a, a), f;
f = Uy(d.c.j, e, !0);
c = Uy(d.c.a, e, !0);
d = Uy(d.c.f, e, !0);
c = $wnd.Math.max(f, $wnd.Math.max(c, d));
a.a = c;
} else
a.c = !0;
else
a.a = b;
}
function dA(a) {
this.d = a;
}
r(213, 1, { 213: 1 }, dA);
_.a = 100;
_.b = -1;
_.c = !1;
C(213);
function Kz(a, b) {
var c;
c = R(a.a, b);
if (null == c)
throw new F('Element ' + b + ' was not found in the position bookkeeping').backingJsObject;
return t(c), c;
}
function Ly(a, b) {
var c;
c = R(a.b, b);
if (null == c)
throw new F('Element ' + b + ' was not found in the position bookkeeping').backingJsObject;
return t(c), c;
}
function tz(a, b, c, d) {
a.c.s.Kd(b, c, d);
hl(a.b, b, d);
hl(a.a, b, c);
}
function py(a) {
this.c = a;
this.b = new zg();
this.a = new zg();
}
r(443, 1, {}, py);
C(443);
function my(a, b) {
this.c = this.a = a;
iz.call(this, a, b);
}
r(438, 212, {}, my);
_.Ae = Wz;
_.Le = function () {
var a, b;
b = $wnd.Math.max(0, this.a.j.b);
a = $wnd.Math.max(0, this.a.f.b);
a = w($wnd.Math.floor(this.a.o - b - a));
dz(this.a.c) > this.a.D && (a = w(a - $u(this.a.p)));
this.a.g.style.height = $wnd.Math.max(0, this.a.f.b) + (Fj(), 'px');
dv(this.a.C, a);
};
C(438);
function ky(a, b) {
this.c = this.a = a;
iz.call(this, a, b);
}
r(437, 212, {}, ky);
_.Ae = function () {
return 'th';
};
_.Le = function () {
var a;
a = $wnd.Math.max(0, this.b);
this.a.b.style.marginTop = a + (Fj(), 'px');
this.a.v.style.marginTop = a + 'px';
this.a.C.g.style.top = a + 'px';
this.a.k.style.height = a + 'px';
};
C(437);
function hA() {
hA = k;
iA = (Mp(), Ih());
}
function jA(a) {
return Pd(function (b) {
a.Me(b);
});
}
function kA(a) {
return Pd(function (b) {
a.Ne(b);
});
}
function lA(a) {
return Pd(function (b) {
a.Oe(b);
});
}
function mA(a) {
hA();
this.b = new nA(this);
this.c = a;
}
r(434, 1, {}, mA);
_.Me = function (a) {
var b;
this.d && (oA(this.e, a), oA(this.f, a), pA(this.e, this.f), pA(this.f, this.e), a = !this.e.f || this.f.f && qA(this.f.b) > qA(this.e.b), b = qA((a ? this.f : this.e).b), a = this.b, b = w(3 * iA * (1 - $wnd.Math.pow(2, -b / 1000))), a.a.e.f || a.a.f.f ? Ed(a, b) : (a.a.d = !1, Vd(a.a.c.a.a, 20)));
};
_.Ne = function (a) {
this.d && a.cancelable && (rA(this.e, a), rA(this.f, a), pA(this.e, this.f), pA(this.f, this.e), this.e.f && hv(this.e.g, this.e.a), this.f.f && hv(this.f.g, this.f.a), (this.e.f || this.f.f) && (M(), N).Bb(a));
};
_.Oe = function (a) {
var b = this.c, c;
((c = (M(), N).Ab(a)) && Wc('table', c.tagName) || Wg(b.b, c)) && 1 == (M(), a).touches.length ? (this.f || (this.f = new sA(this, !0), this.e = new sA(this, !1), Zg(this.c.b, 'touch')), this.b.o ? (this.a = w(this.a + 0.7), (M(), N).Bb(a), Dd(this.b)) : this.a = 1, tA(this.e, a), tA(this.f, a), this.d = !0) : (this.d = !1, Dd(this.b), this.a = 1);
};
_.a = 1;
_.d = !1;
var iA = 0;
C(434);
function nA(a) {
this.a = a;
Id.call(this);
}
r(444, 115, {}, nA);
_.fb = function (a) {
return $wnd.Math.sqrt(1 - (a - 1) * (a - 1));
};
_.gb = function () {
this.a.d = !1;
Vd(this.a.c.a.a, 20);
};
_.ib = function (a) {
uA(this.a.e, a);
uA(this.a.f, a);
this.a.e.f || this.a.f.f || Dd(this);
};
C(444);
function oA(a, b) {
var c, d;
a.n = 0;
for (d = new $k(a.j); d.a < d.c.a.length;)
c = H(al(d)), a.n += c / a.j.a.length;
a.c = a.g.k;
c = 1500 * a.n * a.k.a;
d = a.n;
d = 0.5 - 0.5 * $wnd.Math.cos(3.141592653589793 * (0 < d ? 1 : 0 > d ? -1 : 0) * $wnd.Math.min(0 >= d ? 0 - d : d, 4) / 4);
a.b = c * d;
a.f = vA(a.n);
a.f && (M(), N).Bb(b);
}
function rA(a, b) {
var c, d, e;
e = (c = (M(), b).touches, a.o ? ik(c[0]) : hk(c[0]));
a.f = !1;
1 < a.i && (a.a = a.d - e, d = Fd(), c = d - a.e, a.n = a.a / c, 0 < a.j.a.length && !vA(H(Pr(a.j, 0))) && (a.j.a = Ib(I, h, 1, 0, 5)), Pz(a.j, 0, a.n), a.e = d, a.d = e, a.c = a.g.k);
}
function tA(a, b) {
var c;
a.j.a = Ib(I, h, 1, 0, 5);
a.d = (c = (M(), b).touches, a.o ? ik(c[0]) : hk(c[0]));
a.e = Fd();
a.i = Xu(a.g.Td()) - Xu(a.g.Rd());
a.a = 0;
}
function uA(a, b) {
var c;
a.f && (c = a.c + a.b * b, cv(a.g, c), a.f = 0 < c && c < a.i);
}
function vA(a) {
return 0.6 < (0 >= a ? 0 - a : a);
}
function pA(a, b) {
var c;
if (c = 0 != a.a)
c = a.c + a.a, c = 0 < c && c < a.i;
a.f = c && 1 > qA(b.a / a.a);
a.f || (a.a = 0);
}
function sA(a, b) {
this.k = a;
this.j = new Rd();
this.g = (this.o = b) ? a.c.C : a.c.p;
}
r(210, 1, {}, sA);
_.a = 0;
_.b = 0;
_.c = 0;
_.d = 0;
_.e = 0;
_.f = !1;
_.i = 0;
_.n = 0;
_.o = !1;
C(210);
r(435, 1, {});
C(435);
function By(a, b) {
b.addEventListener ? b.addEventListener('scroll', a.d) : b.attachEvent('onscroll', a.d);
}
function wA(a) {
return Pd(function (b) {
var c = b.deltaX ? b.deltaX : -0.5 * b.wheelDeltaX, d = b.deltaY ? b.deltaY : -0.5 * b.wheelDeltaY;
1 === b.deltaMode && (d *= a.a.Be());
void 0 !== b.deltaMode && (2 <= b.deltaMode || 0 > b.deltaMode) && a.ze();
isNaN(d) && (d = -0.5 * b.wheelDelta);
var e, f;
if ((e = (M(), N).Ab(b)) && Wc('table', e.tagName) || Wg(a.b, e))
if (e = !isNaN(c), f = !isNaN(d), e || f)
Zg(a.b, 'scrolling'), e && hv(a.p, c), f && hv(a.C, d), Vd(a.a.a, 20), d = 0 != d && nv(a.C), c = 0 != c && nv(a.p), (d || c) && N.Bb(b);
});
}
function xA(a) {
var b = a.C, c = b.Pd(), d = a.p, e = d.Pd();
return Pd(function (a) {
a = a.target || a.srcElement;
a === c ? b.Zd() : a === e ? d.Zd() : $wnd.console.error('unexpected scroll target: ' + a);
});
}
function Cy(a, b) {
b.addEventListener ? b.removeEventListener('scroll', a.d) : b.detachEvent('onscroll', a.d);
}
function Hy(a) {
var b, c, d;
d = a.b.C.k;
c = a.b.p.k;
if (a.a != c) {
for (b = 0; b < a.b.c.b; b++)
$y(a.b.j, b, c), $y(a.b.a, b, c), $y(a.b.f, b, c);
a.b.s.Kd(a.b.i, -c, 0);
A(a.b.s, 131) ? a.b.e.style.left = -c + (Fj(), 'px') : a.b.s.Kd(a.b.e, -c, 0);
a.a = c;
}
Mz(a.b.a, c, d);
b = a.b.a;
var e, f, g, l, m;
0 != b.e.b && (d = !1, (c = Ky(b.b.a, G(b.d - 1))) ? (l = Ly(c.i.f.t, c.e), g = c.d + b.i) : (l = Ry(b, Px(b.e)), g = b.i), c = b.c.A, m = l - c, 0 < m ? (d = yz(b, c, l), d = w($wnd.Math.ceil(d / b.i)), l = Nb(d, b.e.b), d = b.e.b, l = d - l, f = (e = c - yA(b.b, c), w(e / b.i)), Cz(b, new qt(l, d), 0, f), zl(), b.d = f, d = !0) : 0 >= m + g && (d = yz(b, l, c), d = w(d / b.i), l = Nb(d, b.e.b), l < b.e.b ? f = Ox(b, Qx(b.e)) + 1 : f = (e = c - yA(b.b, c), w(e / b.i)), c = b.e.b, e = !1, f + l > b.p && (--l, e = !0), l = be(0, Nb(l, b.p - f)), Cz(b, new qt(0, l), c, f), e && (f = new qt(0, 1), e = b.p - b.e.b, Cz(b, f, 0, e)), e = b.d + d, f = b.p - b.e.b, zl(), b.d = e < f ? e : f, d = !0), d && (Nx(b.c), Vd(b.a, 20)));
mz(a.b.a.b);
}
function Vx(a) {
var b, c, d, e, f, g;
b = a.b.a;
f = b.i * b.p + zA(new Xx(a.b.a.b.a));
d = dz(a.b.c);
g = a.b.o;
b = a.b.D;
e = f > g + 0.49 - $wnd.Math.max(0, a.b.j.b) - $wnd.Math.max(0, a.b.f.b);
c = d > b + 0.49;
e != c && (!e && c ? e = f > g + 0.49 - $wnd.Math.max(0, a.b.j.b) - $wnd.Math.max(0, a.b.f.b) - $u(a.b.p) : c = d > b + 0.49 - $u(a.b.C));
e && (b -= $u(a.b.C), b = $wnd.Math.max(0, b));
c && (g -= $u(a.b.p), g = $wnd.Math.max(0, g));
a.b.B.style.height = g + (Fj(), 'px');
a.b.B.style.width = b + 'px';
c = $wnd.Math.max(0, a.b.f.b);
e = $wnd.Math.max(0, a.b.j.b);
g = $wnd.Math.max(0, g - c - e);
dv(a.b.C, g);
iv(a.b.C, f);
f = a.b.p.k;
g = bz(a.b.c, new qt(a.b.c.b, a.b.c.a.a.length));
d -= g;
dv(a.b.p, b - d);
iv(a.b.p, g);
a.b.p.g.style.left = d + 'px';
cv(a.b.p, f);
nv(a.b.p) ? a.b.q.style.display = '' : a.b.q.style.display = (ii(), 'none');
d = a.b.k.style;
b = a.b.g.style;
nv(a.b.C) ? (d.display = '', b.display = '', nv(a.b.p) ? (a = $u(a.b.p), b.bottom = a + 'px') : b.bottom = '') : (d.display = (ii(), 'none'), b.display = 'none');
}
function ny(a) {
this.b = a;
this.d = xA(a);
this.c = wA(a);
this.f = new mA(a);
this.i = lA(this.f);
this.g = kA(this.f);
this.e = jA(this.f);
}
r(436, 435, {}, ny);
_.a = 0;
C(436);
function zA(a) {
var b, c, d;
c = 0;
for (a = (d = a.a.uf().Mc(), new Yx(d)); a.a.Xc();)
d = (b = a.a.Yc(), b.Of()), c += d.d;
return c;
}
function uz(a, b) {
var c;
return (c = Ky(a.a, G(b))) ? c.d : 0;
}
function zz(a, b, c, d) {
var e = Bz, f, g, l, m, n, p, v, x, D, L, P;
v = 0;
for (a = (x = new Xx(a.a).a.uf().Mc(), new Yx(x)); a.a.Xc();)
if (f = (n = a.a.Yc(), n.Of()), x = Ly(f.i.f.t, f.e), p = f.d, f = x + p, D = x < b, P = b <= x && x <= d, L = d < x, g = f < b, m = b <= f && f <= d, l = d < f, !g)
if (L)
break;
else if (D && m)
switch (c.g) {
case 1:
v += f - b;
break;
case 0:
v += p;
}
else if (D && l)
switch (c.g) {
case 2:
return 0;
case 0:
return p;
case 1:
return d - b;
default:
throw new F('Unexpected inclusion state :' + c).backingJsObject;
}
else if (P && m)
v += p;
else if (P && l) {
switch (e.g) {
case 1:
v += d - x;
break;
case 0:
v += p;
}
break;
}
return v;
}
function rz(a, b) {
var c;
c = G(b);
c = new AA(a.a, (BA(), CA), null, !1, c);
return zA(new Xx(c));
}
function yA(a, b) {
return zz(a, 0, (Az(), Bz), b);
}
function Yz(a, b) {
var c, d, e, f;
f = G(b.b);
var g = G(b.a);
f = new AA(a.a, (BA(), DA), f, !0, g);
f.f.Sf() ? f.a ? d = EA(f.c, f.b, !0) : d = EA(f.c, f.b, !1) : d = FA(f.c);
if (d && GA(f, d.d) && d) {
for (d = (e = new Xx(f).a.uf().Mc(), new Yx(e)); d.a.Xc();)
e = (c = d.a.Yc(), c.Of()), a.e._d(e), HA(e, 0), Yg(e.e), Yg(e.a);
for (c = new IA(f, f).b.Qf(); JA(c.a);)
c.b = KA(c.a), LA(c);
0 == a.a.c && (fs(a.d.a), a.d = null);
}
}
function MA(a, b, c) {
if (-1 > b || b >= a.f.a.p)
throw new F('invalid row index: ' + b + ', while the body only has ' + a.f.a.p + ' rows.').backingJsObject;
if (0 <= c) {
var d = G(b);
a.a.Rf(d) ? HA(Ky(a.a, G(b)), c) : (!a.d && (a.d = Iq(a.f, a.c, (Uu(), Vu))), d = new NA(a, b), OA(a.a, G(b), d), tz(a.f.t, d.e, a.f.p.k, Jy(a.f.a, b) + a.f.a.i), b = d.e, b.style.width = dz(a.f.c) + (Fj(), 'px'), a.f.a.o.appendChild(b), d.e.style.width = gt(d.i.f.B) + 'px', HA(d, c), d.g.colSpan = d.i.f.c.a.a.length, b = Aq(Q(d.i.f)), Fq(d.e, b + '-spacer'), Fq(d.a, b + '-spacer-deco'), tz(a.f.t, d.a, 0, Ly(d.i.f.t, d.e) - d.i.f.a.i), a.f.v.appendChild(d.a), Ug(a.f.v) || (Q(a.f).appendChild(a.f.v), a.b = gt(d.a)), a.e.ae(d), PA(d) ? (d.e.style.display = '', d.a.style.display = '') : (d.e.style.display = (ii(), 'none'), d.a.style.display = 'none'), Nz(a.f.a));
} else
c = G(b), a.a.Rf(c) && Yz(a, new qt(b, b + 1));
mz(a);
}
function QA(a, b) {
var c, d, e;
for (e = (d = new Xx(a.a).a.uf().Mc(), new Yx(d)); e.a.Xc();)
d = (c = e.a.Yc(), c.Of()), a.e._d(d);
a.e = b;
var f, g;
for (c = (g = new Xx(a.a).a.uf().Mc(), new Yx(g)); c.a.Xc();)
g = (f = c.a.Yc(), f.Of()), a.e.ae(g), PA(g) ? (g.e.style.display = '', g.a.style.display = '') : (g.e.style.display = (ii(), 'none'), g.a.style.display = 'none');
}
function Xz(a, b, c) {
var d;
d = c * a.f.a.i;
for (b = new $k(new Eo(new Xx(RA(a.a, G(b), !0)))); b.a < b.c.a.length;)
a = al(b), Jz(a, Kz(a.i.f.t, a.e), Ly(a.i.f.t, a.e) + d), Lz(a, a.f + c);
}
function mz(a) {
var b, c, d, e, f;
f = Qt(a.f);
b = G(f.b - 1);
f = G(f.a + 1);
b = new AA(a.a, (BA(), DA), b, !0, f);
e = new Xx(b);
if (0 != e.a.od())
for (f = dh(a.f.B) + $wnd.Math.max(0, a.f.j.b), b = bh(a.f.B) - $wnd.Math.max(0, a.f.f.b), e = (d = e.a.uf().Mc(), new Yx(d)); e.a.Xc();) {
d = (c = e.a.Yc(), c.Of());
var g = f, l = b, m = a.b, n = void 0, p = n = n = void 0, v = void 0, v = void 0, v = dh(d.a), n = bh(d.a), p = n - v;
v < g || n > l ? (v = $wnd.Math.max(0, g - v), n = p - $wnd.Math.max(0, n - l), n = xd(SA(xd(SA(xd(SA(new kl('rect('), v), 'px,'), m), 'px,'), n), 'px,0)').a, d.a.style.clip = n) : d.a.style.clip = 'auto';
}
}
function Vz(a) {
this.f = a;
this.a = new TA();
this.e = (Iv(), Jv);
this.c = new UA(this);
}
r(442, 1, {}, Vz);
_.b = 0;
C(442);
function UA(a) {
this.b = a;
}
r(446, 1, Ja, UA);
_.$d = function () {
var a, b, c;
if (!jt(this.b.f.p.k, this.a))
for (this.a = this.b.f.p.k, c = (b = new Xx(this.b.a).a.uf().Mc(), new Yx(b)); c.a.Xc();)
b = (a = c.a.Yc(), a.Of()), Jz(b, this.a, Ly(b.i.f.t, b.e));
};
_.a = 0;
C(446);
function PA(a) {
var b, c;
c = w($wnd.Math.ceil(Ly(a.i.f.t, a.e)));
b = w($wnd.Math.floor(a.d));
b = V(c, b);
c = a.i.f;
a = w($wnd.Math.floor(c.C.k));
c = w(My(c.a));
a = V(a, c);
return rt(a, b);
}
function HA(a, b) {
var c, d, e, f, g, l;
c = b - $wnd.Math.max(0, a.d);
f = a.d;
a.d = b;
0 > a.c && (a.c = ($s(), bt(eh(wz(a.i.f.a, Qt(a.i.f).b)), z(u(tb, 1), h, 2, 6, ['borderBottomWidth']))));
a.e.style.height = b + a.c + (Fj(), 'px');
for (d = (g = new Xx(RA(a.i.a, G(a.f), !1)).a.uf().Mc(), new Yx(g)); d.a.Xc();)
g = (l = d.a.Yc(), l.Of()), Jz(g, Kz(g.i.f.t, g.e), Ly(g.i.f.t, g.e) + c);
(l = 0 < c) && iv(a.i.f.C, Xu(Rh(a.i.f.C.n.style)) + c);
d = l && -1 == a.f && 0 == a.i.f.a.d;
if (a.f < a.i.f.a.d && !d) {
for (g = Ez(a.i.f.a.e, 0); g.b != g.d.c;) {
d = Fz(g);
var m = Ry(a.i.f.a, d) + c;
tz(a.i.f.a.q.t, d, 0, m);
}
g = Ly(a.i.f.t, a.e);
d = a.i.f.C.k;
g < d && d < g + f && !l ? e = $wnd.Math.max(c, g - d) : e = c;
Mz(a.i.f.a, a.i.f.w, a.i.f.A + e);
hv(a.i.f.C, e);
} else
for (e = a.i.f.a, f = a.f, m = Qt(e.c), d = f < m.b, g = f >= m.a - 1, d ? f = nu(e.e) : g ? f = (il(), il(), jl) : (f = new Gu(e.e, f - m.b + 1, m.a - m.b), f = (il(), new VA(f))), d = f.Mc(); d.Xc();)
f = d.Yc(), g = Ly(e.q.t, f) + c, tz(e.q.t, f, 0, g);
l || iv(a.i.f.C, Xu(Rh(a.i.f.C.n.style)) + c);
c = a.a.style;
a.b = b + a.i.f.a.i;
c.height = a.b + 'px';
}
function Jz(a, b, c) {
tz(a.i.f.t, a.e, b, c);
tz(a.i.f.t, a.a, 0, c - a.i.f.a.i);
}
function Lz(a, b) {
WA(a.i.a, G(a.f));
a.f = b;
a.e.vLogicalRow = b;
OA(a.i.a, G(a.f), a);
}
function NA(a, b) {
this.i = a;
this.f = b;
this.e = (S(), Dh());
this.g = Bh();
this.e.appendChild(this.g);
this.e.vLogicalRow = b;
this.a = wh();
}
r(214, 1, { 214: 1 }, NA);
_.b = 0;
_.c = -1;
_.d = -1;
_.f = 0;
C(214);
function Az() {
Az = k;
XA = new YA('COMPLETE', 0);
Bz = new YA('PARTIAL', 1);
Hz = new YA('NONE', 2);
}
function YA(a, b) {
O.call(this, a, b);
}
r(99, 5, {
99: 1,
3: 1,
6: 1,
5: 1
}, YA);
var XA, Hz, Bz, ZA = E(99, function () {
Az();
return z(u(ZA, 1), h, 99, 0, [
XA,
Bz,
Hz
]);
});
function Bx(a, b) {
return Iq(a, b, a.H.a);
}
function $A(a, b, c) {
var d, e;
Pz(a.n, c, b);
d = a.D;
aB(d, b);
d.a && b.We(bB(d.a, b));
aB(a.A, b);
cB(b, a);
if (!b.n) {
d = c;
for (e = 0; e < c; e++)
Mv(a, e).n && --d;
cA(a.v.c, d, 1);
}
b.i && dB(b.i.a);
c = new Yk();
e = b.e;
d = new Yk();
A(e, 52) && (e = e.td()) && tx(d, e);
tx(c, d);
b.k && eB(a.j, b);
fB(a, c);
}
function Iw(a, b) {
Qg((Ig(), Jg), new gB(a, b));
return Iq(a, b, (dw(), ew));
}
function Vw(a, b) {
if (A(a.S, 241))
a.S.ve(b);
else if (A(a.S, 138))
a.S.qe(hB(b));
else
throw new Lq('Unsupported selection model').backingJsObject;
}
function iB(a) {
jB(a, null);
Yg((S(), a.ab));
}
function Mv(a, b) {
if (0 > b || b >= a.n.a.length)
throw new Lq('Column not found.').backingJsObject;
return Pr(a.n, b);
}
function kB(a) {
var b, c, d;
c = Qt(a.v).b;
d = bh(a.v.j.o);
for (b = wz(a.v.a, c); (M(), N).Db(b) + ((b.offsetHeight || 0) | 0) < d;)
b = wz(a.v.a, ++c);
return c;
}
function lB(a) {
var b, c, d;
d = Qt(a.v).a;
b = dh(a.v.f.o);
do
c = wz(a.v.a, --d);
while ((M(), N).Db(c) > b);
return d;
}
function mB(a, b) {
var c;
c = kw(a);
if (0 > b || b >= c.b.od())
throw new Lq('Column not found.').backingJsObject;
return c.a.Df(b);
}
function kw(a) {
var b, c;
c = new Rd();
for (b = new $k(a.n); b.a < b.c.a.length;)
a = al(b), a.n || (c.a[c.a.length] = a);
return il(), new nB(c);
}
function oB(a) {
var b, c;
c = a.B;
for (b = 0; b < a.B; b++)
Mv(a, b).n && --c;
-1 == c ? c = 0 : a.R && ++c;
return c;
}
function pB(a, b, c) {
if (c != a.v.j || !qB(a.D, a.w.e.d).a || !a.w.b.s)
return !1;
Mc('mousedown', (M(), b).type) && b.shiftKey && N.Bb(b);
if ('touchstart' === b.type) {
if (1 < b.touches.length)
return !1;
N.Bb(b);
c = b.changedTouches[0];
a.J = new ip(th(c.clientX || 0), th(c.clientY || 0));
a = a.V;
a.a = a.c.w.b;
a.b = !0;
Vd(a.d, 500);
return !0;
}
if ('touchmove' === b.type) {
if (1 < b.touches.length)
return !1;
N.Bb(b);
c = b.changedTouches[0];
b = qA(th(c.clientX || 0) - a.J.a);
c = qA(th(c.clientY || 0) - a.J.b);
(3 < b || 3 < c) && Wd(a.V.d);
return !0;
}
if ('touchend' === b.type) {
if (1 < b.touches.length)
return !1;
a.V.d.f && (Wd(a.V.d), rB(a.V, a.w.b, !1));
return !0;
}
if ('touchcancel' === b.type) {
if (1 < b.touches.length)
return !1;
Wd(a.V.d);
return !0;
}
'click' === b.type && rB(a.V, a.w.b, !!b.shiftKey);
return !1;
}
function zw(a, b) {
var c;
c = at(b);
if (c == a)
return !1;
for (; c && c != a;)
c = c._;
return !!c;
}
function sB(a, b) {
var c, d, e, f, g;
if (a.u)
if (f = (M(), b).type, 'focus' === f || 'blur' === f)
Mq(a, b), a.X.nc(b);
else {
g = N.Ab(b);
if (e = oh(g)) {
a: {
for (e = g; e && e != (S(), a.ab);) {
if (c = !!e && 1 == e.nodeType)
if (c = e.className || '', -1 != Nc(c, Aq((S(), a.ab)) + '-spacer')) {
e = !0;
break a;
}
e = e.parentNode;
}
e = !1;
}
e = !e;
}
if (e) {
if (e = Aw(a.v, g))
c = e.Ld(g), 'mousedown' === f ? a.e = c : !c && 'click' === f && (c = a.e);
else if ('keydown' === f || 'keyup' === f || 'keypress' === f)
c = tB(a.c), e = a.c.c;
else if (a.t.f && Wg(a.t.f, g)) {
e = a.v.a;
f = a.t.o;
a: {
c = a.t;
var l;
d = c.i.childNodes.length;
if (Wg(c.i, g))
for (l = 0; l < d; ++l)
if (Wg(c.i.childNodes[l], g)) {
d = l;
break a;
}
if (Wg(c.d, g))
for (l = 0; l < c.d.childNodes.length; ++l)
if (Wg(c.d.childNodes[l], g)) {
d = l + d;
break a;
}
d = -1;
}
if (0 > d)
return;
c = e.Nd(f).cells[d];
c = new ru(f, d, c);
} else {
Wg(Q(a.v), g) && (jw(a.w, new ru(-1, -1, null), (lw(), mw)), Mq(a, b), a.X.nc(b));
return;
}
f = a.w;
d = e;
d = d == a.v.a ? (lw(), mw) : d == a.v.f ? (lw(), Bw) : d == a.v.j ? (lw(), Cw) : null;
jw(f, c, d);
Mq(a, b);
a.X.nc(b);
(g = zw(a, g)) || (!a.k || e != a.v.j || a.w.c < a.v.c.b ? g = !1 : (S(), 4 == pp((M(), b).type) && 1 == N.xb(b) || 1048576 == pp(b.type) ? (g = a.s, g.e = Dp(new gu(g, b, a.F)), N.Bb(b), b.stopPropagation(), g = !0) : g = !1));
if (!g && !(g = pB(a, b, e)))
a: {
if (e == a.v.a && (g = a.w.b, M(), A(g.e, 52) && (g = g.e, g.td().nf(b.type) && g.vd(a.w, b)))) {
g = !0;
break a;
}
g = !1;
}
if (!g && (g = new $l(z(u(tb, 1), h, 2, 6, [
'keydown',
'click'
])), -1 != vz(g, b.type)))
a: {
g = a.c;
e = a.w;
var m;
if (Mc((M(), b).type, 'click'))
uB(g, e.e.d, e.d, Aw(g.j.v, e.a)), Q(g.j).focus();
else if ('keydown' === b.type) {
m = g.g;
l = g.c;
d = g.a.b;
switch (b.keyCode | 0) {
case 40:
++m;
break;
case 38:
--m;
break;
case 39:
if (g.a.a >= kw(g.j).b.od())
break a;
d = g.a.a;
break;
case 37:
if (0 == d)
break a;
--d;
break;
case 9:
b.shiftKey ? l = vB(g, g.c) : l = wB(g, g.c);
if (l == g.c)
break a;
break;
case 36:
0 < l.Md() && (m = 0);
break;
case 35:
0 < l.Md() && (m = l.Md() - 1);
break;
case 34:
case 33:
0 < l.Md() && (e = 34 == (b.keyCode | 0), f = kB(g.j), c = lB(g.j), (m < f || m > c) && (m = e ? c : f), m += (1 > c - f - 1 ? 1 : c - f - 1) * (e ? 1 : -1), m = be(0, Nb(l.Md() - 1, m)));
break;
default:
break a;
}
l != g.c ? l == g.j.v.a ? m = g.d : l == g.j.v.j ? m = g.f : m = g.e : 0 > m ? (l = vB(g, l), l == g.c ? m = 0 : l == g.j.v.a ? m = lB(g.j) : m = l.Md() - 1) : m >= g.c.Md() && (l = wB(g, l), l == g.c ? m = g.c.Md() - 1 : l == g.j.v.a ? m = kB(g.j) : m = 0);
0 != l.Md() && (N.Bb(b), b.stopPropagation(), uB(g, m, d, l));
}
}
}
}
}
function xB(a) {
yB(a.v.f, a.A);
}
function zB(a) {
yB(a.v.j, a.D);
}
function yB(a, b) {
var c, d;
c = (b.e ? b.d.a.length : 0) - a.p;
0 < c ? (Mt(a, 0, c), Tx(a.c)) : 0 > c && (d = a.c.C.k, Ot(a, 0, -c), Tx(a.c), cv(a.c.C, d));
0 < a.p && Tt(a, 0, a.p);
}
function AB(a, b) {
var c;
c = zo(a.n, b);
eA(a.v.c, mu(kw(a), b), 1);
gA(a.v.c, oB(a));
BB(a.D, b);
BB(a.A, b);
cB(b, null);
Ju(a.n, c);
b.k && (c = a.j, CB(c.c.T.c, R(c.a, b)));
}
function Mw(a, b, c, d) {
var e;
e = a.v.a.p - 1;
if (0 > b)
throw new F('Row index (' + b + ') is below zero!').backingJsObject;
if (b > e)
throw new F('Row index (' + b + ') is above maximum (' + e + ')!').backingJsObject;
a = a.v;
Lg((Ig(), Jg), new Iy(a, c, d, b));
}
function Ww(a, b) {
if (A(a.S, 241))
a.S.we(b);
else if (A(a.S, 138))
a.S.se(hB(b));
else
throw new Lq('Unsupported selection model').backingJsObject;
}
function DB(a, b) {
var c, d, e, f, g, l;
e = a.Pe().c;
eA(e, 0, e.a.a.length);
l = new Rd();
a.R && Ud(l, a.R);
d = g = 0;
for (f = b.length; d < f; ++d)
if (c = b[d], -1 != zo(a.n, c))
l.a[l.a.length] = c, ++g;
else
throw new F('Given column at index ' + g + ' does not exist in Grid').backingJsObject;
if (a.n.a.length != l.a.length) {
c = a.n;
t(l);
for (c = new $k(c); c.a < c.c.a.length;)
d = al(c), -1 != zo(l, d) && EB(c);
FB(l, a.n);
}
a.n = l;
l = kw(a);
cA(e, 0, l.b.od());
gA(a.v.c, oB(a));
for (e = new $k(a.n); e.a < e.c.a.length;)
c = al(e), c.i && dB(c.i.a);
for (l = new $k(a.D.d); l.a < l.c.a.length;)
e = al(l), GB(e);
for (l = new $k(a.A.d); l.a < l.c.a.length;)
e = al(l), GB(e);
HB(a.j);
Jq(a, new tw());
}
function IB(a, b) {
var c;
if (!b)
throw new F('dataSource can\'t be null.').backingJsObject;
a.S.le();
a.q && St(a.q, null);
a.q = b;
St(b, new JB(a, b));
c = a.v.a.p;
0 != c && Ot(a.v.a, 0, c);
KB(a);
}
function Lt(a, b, c) {
var d, e;
(fw(), gw) != a.r && (e = G(b), d = Oq(a.W, G(b)), c && !d ? (MA(a.v.a.b, b, 50), Km(a.W, e)) : !c && d && (MA(a.v.a.b, b, -1), a.W.a.xf(e)));
}
function KB(a) {
var b, c;
c = (b = T(a.q.c.c, 'size'), X((Y(), Z), b, G(0), G(0)).a);
-1 == c && ur(a) && (b = a.Pe().a, b = w($wnd.Math.ceil(My(b) / b.i)) + 1, c = 0 > b ? 0 : b);
0 < c && Mt(a.v.a, 0, c);
}
function LB(a, b) {
if (-1 > b || b > a.n.a.length)
throw new F('count must be between -1 and the current number of columns (' + a.n.a.length + ')').backingJsObject;
a.B = b;
gA(a.v.c, oB(a));
}
function MB(a, b) {
a.S && a.S.me(null);
a.S = b;
b.me(a);
var c = a.S.je(), d;
if (a.Q != c) {
a.Q && (a.Q && (d = a.Q, d.d && ax(d)), d = a.R, a.R = null, AB(a, d), d = a.c, d.a = NB(d.a, -1));
if (a.Q = c) {
d = a.c;
d.a = NB(d.a, 1);
a.R = new OB(a, c);
$A(a, a.R, 0);
c = a.R;
PB(c, -1);
if (c.a)
throw new Uq('can\'t set the selection column editable').backingJsObject;
c.f = !1;
c.r && (c.r = !1, c.i && zB(c.i));
c.a = !0;
} else
a.R = null, Tt(a.v.a, 0, a.v.a.p);
gA(a.v.c, oB(a));
}
Tt(a.v.a, 0, a.v.a.p);
}
function QB(a, b) {
var c;
Fq((S(), a.ab), b);
gy(a.v, b);
c = a.t;
null != c.r && (lh(c.f, c.r), lh(c.d, c.r + '-cells'), lh(c.i, c.r + '-cells'), lh(c.k, c.r + '-footer'), lh(c.n, c.r + '-message'), lh(c.b, c.r + '-buttons'), Dq(c.p, c.r + '-save'), Dq(c.c, c.r + '-cancel'));
c.r = b + '-editor';
mh(c.f, c.r);
mh(c.d, c.r + '-cells');
mh(c.i, c.r + '-cells frozen');
mh(c.k, c.r + '-footer');
mh(c.n, c.r + '-message');
mh(c.b, c.r + '-buttons');
var d = c.p, e = c.r + '-save';
mh((S(), d.ab), e);
d = c.c;
c = c.r + '-cancel';
mh((S(), d.ab), c);
c = a.T;
d = b + '-sidebar';
Fq((S(), c.ab), d);
Fq(c.f.xc(), d);
e = d + '-content';
Fq(c.a.xc(), e);
d += '-button';
Fq(c.d.xc(), d);
c.f && c.f.w ? (xq(c.ab, 'open', !0), wq(c.f, 'open'), xq(c.ab, 'closed', !1), Dq(c.f, 'closed')) : (xq(c.ab, 'open', !1), Dq(c.f, 'open'), xq(c.ab, 'closed', !0), wq(c.f, 'closed'));
c = a.T;
xq((S(), c.ab), 'v-contextmenu', !0);
wq(c.f, 'v-contextmenu');
c = Aq(a.ab) + '-row';
a.L = c + '-has-data';
a.N = c + '-selected';
a.O = c + '-stripe';
a.d = Aq(a.ab) + '-cell-focused';
a.K = Aq(a.ab) + '-row-focused';
ur(a) && (yB(a.v.j, a.D), Tt(a.v.a, 0, a.v.a.p), yB(a.v.f, a.A));
}
function fB(a, b) {
var c, d, e, f;
c = 0;
for (f = b.Mc(); f.Xc();)
e = f.Yc(), d = pp((S(), e)), 0 > d ? Ap(a.ab, e) : c |= d;
0 < c && (-1 == a.Z ? Bp((S(), a.ab), c | (a.ab.__eventBits || 0)) : a.Z |= c);
}
function RB(a, b) {
vq();
var c;
c = hh(a, 'customStyle');
if (null == c ? null != b : c !== b)
null != c && 0 != (y(), c).length && lh(a, c), null != b && 0 != (y(), b).length && Zg(a, b), a.customStyle = b;
}
function jB(a, b) {
vq();
a.Jc(b);
}
r(264, 670, La);
_.Lc = function () {
throw new Uq('Cannot add widgets to Grid with this method').backingJsObject;
};
_.Cc = function () {
this.T._ == this && this.T.Fc();
};
_.Dc = function () {
this.T._ == this && this.T.Gc();
};
_.jd = function () {
(S(), this.ab).focus();
};
_.Pe = SB;
_.Mc = function () {
throw new Uq('Cannot iterate through widgets in Grid this way').backingJsObject;
};
_.Fc = function () {
vr(this);
0 == this.Pe().a.p && this.q && KB(this);
dB(this.a);
};
_.nc = function (a) {
sB(this, a);
};
_.Gc = function () {
var a, b, c;
a = new Kt(this.W);
for (a = (c = new Lm(a.a).a.uf().Mc(), new Mm(c)); a.a.Xc();)
c = (b = a.a.Yc(), b.Nf()).a, Lt(this, c, !1);
wr(this);
};
_.Qe = function () {
xB(this);
};
_.Re = function () {
zB(this);
};
_.Nc = wx;
_.Qc = function (a) {
a ? (S(), this.ab).focus() : (S(), this.ab).blur();
};
_.zc = function (a) {
dy(this.v, a);
};
_.Ac = function (a) {
iy(this.v, a);
};
_.k = !1;
_.p = !1;
_.u = !0;
_.B = 0;
_.Q = null;
var TB = C(264);
function UB(a, b) {
var c, d;
return 0 == a.p.w.e.d && a.p.T._ && !VB(a.p.T) && (c = b + ch(Q(a.p)), d = ch(Q(a.p.T)), c -= d, 0 < c) ? b - c : 1.7976931348623157e+308;
}
function Wv(a, b) {
b && (a.c = ($s(), $s(), -1 != Nc((M(), b).type, 'touch') ? fk(b.changedTouches[0]) : th(b.clientX || 0)), a.a = 0);
var c, d, e, f;
d = a.c - ch(a.n);
c = WB(FA(a.k));
e = a.k;
if (e.b) {
for (f = e.b; e = f.a[1];)
f = e;
e = f;
} else
e = null;
e = WB(e);
f = a.p.v.p.k;
d + f < (t(c), c) ? d = (t(c), c) - f + a.a : d + f > (t(e), e) && (d = (t(e), e) - f + a.a);
e = UB(a, d);
c = gt(a.p.v.B);
e = $wnd.Math.min(e, c);
c = w(Lv(a.p.b));
d = $wnd.Math.max(c, $wnd.Math.min(d, e));
d -= (a.e.clientWidth | 0) / 2 | 0;
a.e.style.left = d + (Fj(), 'px');
Xv(a, a.c);
}
function Xv(a, b) {
var c, d, e, f, g;
g = a.p.v.p.k;
e = b - ch(a.p.v.j.o);
d = (d = EA(a.k, e, !0)) ? new XB(d) : null;
a: {
var l;
f = null;
for (l = a.k.b; l;) {
c = YB(e, l.d);
if (0 == c) {
c = l;
break a;
}
0 >= c ? l = l.a[0] : (f = l, l = l.a[1]);
}
c = f;
}
c = c ? new XB(c) : null;
f = d ? H(d.d) - e : 1.7976931348623157e+308;
e = c ? e - H(c.d) : 1.7976931348623157e+308;
g = 0 - g;
f > e ? (a.j = c.e.a, g += H(c.d)) : (a.j = d.e.a, g += H(d.d));
g += a.a;
d = Lv(a.p.b);
e = UB(a, g);
c = kw(a.p).b.od();
a.j == c && e < g && g <= gt(a.p.v.B) ? g = e - a.g : (g < d || g > $wnd.Math.min(e, gt(a.p.v.B)) || 0 > g) && (g = -10000000);
a.f.style.left = g + (Fj(), 'px');
}
function ZB(a) {
this.p = a;
this.b = new $B(this);
this.k = new TA();
}
r(306, 1, {}, ZB);
_.zd = function () {
!this.d && (this.d = Dp(new aC(this)));
Pv(this.p.b);
};
_.Ad = function () {
Yg(this.n);
Yg(this.e);
lh(this.p.w.a, 'dragged');
};
_.Bd = function (a) {
a: {
var b, c, d, e, f, g, l, m, n, p, v, x, D, L, P;
n = this.k;
n.b = null;
n.c = 0;
m = this.p.w.c;
l = qB(this.p.D, this.p.w.e.d);
n = m + bB(l, this.p.w.b).a;
f = this.p.S.je() ? be(0, this.p.B) + 1 : be(0, this.p.B);
g = new qt(m, n);
n = -1;
x = this.p.n.a.length + 1;
P = new Yk();
c = new Rd();
FB(c, this.p.D.d);
FB(c, this.p.A.d);
for (L = new $k(c); L.a < L.c.a.length;)
if (D = al(L), 0 != qs(D.b))
for (v = D == l, c = f; c < this.p.n.a.length; c++)
if (b = bB(D, Mv(this.p, c)), e = b.a, !(1 >= e))
if (b = c + e, d = new qt(c, b), (p = g.b < d.a && d.b < g.a) && !v) {
if (!xt(d, g)) {
if (!xt(g, d))
break a;
c <= m && c > n && (n = c);
b < x && (x = b);
}
c = b - 1;
} else
for (; 1 < e;)
++c, --e, Km(P, G(c));
if (n != x - 1) {
l = Lv(this.p.b);
for (m = f; m < this.p.n.a.length; m++)
f = Mv(this.p, m), !Oq(P, G(m)) && !f.n && (-1 != n ? m >= n && m <= x && OA(this.k, l, G(m)) : OA(this.k, l, G(m))), l += lu(f);
-1 == n && OA(this.k, l, G(this.p.n.a.length));
}
}
if (0 == this.k.c)
return !1;
this.n || (this.o = (S(), Ch()), this.f = wh(), this.o.appendChild(this.f), this.n = Eh(), this.n.appendChild(this.o), this.n.className = 'header-drag-table');
mh(this.o, this.p.v.j.o.className || '');
mh(this.f, Aq(Q(this.p)) + '-drop-marker');
for (n = x = 0; n < this.p.w.e.d; n++)
x += (eh(lz(this.p.v.j, n)).offsetHeight || 0) | 0;
this.o.style.top = x + (Fj(), 'px');
Q(this.p).appendChild(this.n);
this.g = gt(this.f) / 2;
this.e = (S(), this.p.w.a.cloneNode(!0));
this.e.style.width = '';
this.f.style.height = Rh(this.e.style);
this.o.appendChild(this.e);
Zg(this.p.w.a, 'dragged');
Zg(this.e, 'dragged-column-header');
this.p.b.i = 60;
n = this.p.b;
x = (Sv(), Zv);
P = this.b;
n.j = x;
n.b = P;
Ov(n);
n.g = Dp(new aw(n));
var W, za;
x = n.j == (Sv(), Tv) ? bh((za = Nv(n), za ? za.tHead : null)) + 1 : ch(Nv(n));
n.j == Tv ? za = dh((W = Nv(n), W ? W.tFoot : null)) - 1 : (W = Nv(n), za = (M(), N).Cb(W) + ((W.offsetWidth || 0) | 0));
W = za;
x += Lv(n);
n.n = x + n.i;
n.c = W - n.i;
n.d = n.i;
50 > n.c - n.n && (W = 50 - (n.c - n.n), n.n -= W / 2, n.c = w(n.c + W / 2), n.d = w(n.d - W / 2));
n.f = Dp(n.k);
n.a = new Vv(n, w($wnd.Math.ceil(n.n)), n.c, n.d);
W = n.a;
W.i = !0;
W.i && 10 <= W.d && (W.e = (!Jd && (Jd = Kd() ? new Ld() : new Md()), Jd).kb(W, Q(W.p.e)));
(M(), N).Bb(a);
a.stopPropagation();
return !0;
};
_.Cd = function (a) {
Wv(this, a);
};
_.Dd = function () {
var a, b, c, d;
d = this.p.w.c;
b = bB(qB(this.p.D, this.p.w.e.d), this.p.w.b).a;
this.j != d && this.j != d + b && (c = nu(new Eo(this.p.n)), a = new Rd(), d < this.j ? (FB(a, new VA(c.a.Kf(0, d))), FB(a, bC(c, d + b, this.j)), FB(a, new VA(c.a.Kf(d, d + b))), FB(a, bC(c, this.j, c.b.od()))) : (FB(a, bC(c, 0, this.j)), FB(a, new VA(c.a.Kf(d, d + b))), FB(a, bC(c, this.j, d)), FB(a, bC(c, d + b, c.b.od()))), ae(a, this.p.R), b = tB(this.p.c), this.i = mu(nu(new Eo(this.p.n)), mB(this.p, b.a)), a = Zd(a, Ib(cC, {
651: 1,
3: 1,
4: 1
}, 81, a.a.length, 0)), DB(this.p, a), d = tB(this.p.c), c = d.a, a = d.c, b = this.p.w.c, d = Aw(this.p.v, d.b), this.i == b ? (b = this.j > b ? this.j - 1 : this.j, b = mu(kw(this.p), Mv(this.p, b)), uB(this.p.c, a, b, d)) : this.j <= this.i && b > this.i ? uB(this.p.c, a, c + 1, d) : this.j > this.i && b < this.i && uB(this.p.c, a, c - 1, d));
};
_.a = 0;
_.c = 0;
_.g = 0;
_.i = 0;
_.j = 0;
C(306);
function $B(a) {
this.a = a;
}
r(307, 1, {}, $B);
C(307);
function aC(a) {
this.a = a;
}
r(308, 1, Da, aC);
_.mc = function (a) {
1 == Cp(a.d) && (a.a = !0, Qh(a.d), fs(this.a.d.a), this.a.d = null);
};
C(308);
function dC(a) {
this.a = a;
}
r(309, 1, Ja, dC);
_.$d = function () {
Jq(this.a, new Bv());
};
C(309);
function eC(a) {
this.a = a;
}
r(310, 1, {
15: 1,
718: 1
}, eC);
C(310);
function fC(a) {
this.a = a;
}
r(311, 1, {
15: 1,
700: 1
}, fC);
_.pe = function () {
var a = this.a;
Tt(a.v.a, 0, a.v.a.p);
};
C(311);
function gC(a) {
this.a = a;
}
r(312, 1, Ma, gC);
_.ee = function (a) {
if (13 == Nh(a.d) && qB(this.a.D, a.c.e.d).a) {
var b = this.a.V, c = a.c.b;
a = a.d;
a = !!(M(), a).shiftKey;
rB(b, c, a);
}
};
C(312);
function hC(a) {
this.a = a;
}
r(313, 1, Ka, hC);
_.ce = function () {
this.a.p = !1;
};
C(313);
function yt(a, b, c) {
a.a.o = V(b, c);
Jq(a.a, new Rt(a.a.o));
}
function JB(a, b) {
this.a = a;
this.b = b;
}
r(314, 1, {}, JB);
C(314);
function gB(a, b) {
this.a = a;
this.b = b;
}
r(315, 1, {}, gB);
_.tb = function () {
this.a.p || this.b.ce(new Rt(this.a.o));
};
C(315);
function dB(a) {
!a.b && ur(a.d) && (a.b = !0, Qg((Ig(), Jg), a.a));
}
function iC(a) {
this.d = a;
this.a = new jC(this);
}
r(278, 1, {}, iC);
_.b = !1;
_.c = 0;
C(278);
function jC(a) {
this.a = a;
}
r(293, 1, {}, jC);
_.tb = function () {
if (this.a.b)
if (this.a.d.D.b || this.a.d.A.a)
10 > this.a.c ? (Qg((Ig(), Jg), this), ++this.a.c) : (this.a.c = 0, Lg((Ig(), Jg), this));
else if (this.a.d.p)
Lg((Ig(), Jg), this);
else {
var a = this.a;
a.b = !1;
a.c = 0;
var b, c, d;
d = gt(a.d.v.B);
for (c = new pu(kw(a.d).b.Mc()); c.b.Xc();)
b = c.b.Yc(), 0 <= b.t ? d -= b.t : 0 <= b.Ue() && (d -= b.Ue());
if (0 > d) {
var e, f, g, l, m, n, p;
l = new kC();
g = kw(a.d);
for (f = 0; f < g.b.od(); f++)
lC(l, G(f), g.a.Df(f).t);
by(a.d.v.c, l);
l = new kC();
for (m = 0; m < g.b.od(); m++)
if (f = g.a.Df(m), e = 0 > f.t)
e = lu(f), e < (p = f.Ue(), 0 <= p ? p : 5e-324) ? lC(l, G(m), f.Ue()) : e > (n = f.Te(), 0 <= n ? n : 1.7976931348623157e+308) && lC(l, G(m), f.Te());
by(a.d.v.c, l);
} else {
var v, x, D, L, P, W, za, cb, Yh, gE;
P = !0;
W = d = 0;
p = new Yk();
L = new Rd();
n = new zg();
b = kw(a.d);
for (D = new pu(b.b.Mc()); D.b.Xc();)
c = D.b.Yc(), v = c.t, x = 0 <= v, v = $wnd.Math.max($wnd.Math.min((cb = c.Te(), 0 <= cb ? cb : 1.7976931348623157e+308), v), c.Ue()), P = P && (-1 == c.Se() || c == a.d.R), x ? (hl(n, G(b.a.Ef(c)), v), W += v) : (L.a[L.a.length] = c, hl(n, G(b.a.Ef(c)), -1));
by(a.d.v.c, n);
for (x = new $k(L); x.a < x.c.a.length;) {
c = al(x);
f = P ? 1 : c.Se();
D = (cb = c.Te(), 0 <= cb ? cb : 1.7976931348623157e+308);
L = $wnd.Math.min(D, lu(c));
if (D = L < D && 0 < f && c != a.d.R)
d += f, p.a.wf(c, p);
W += L;
hl(n, G(b.a.Ef(c)), L);
}
L = gt(a.d.v.B) - W;
if (0 >= L || 0 >= d)
0 >= L && by(a.d.v.c, n);
else {
do
for (v = !1, gE = L / d, za = (e = new Lm(p.a).a.uf().Mc(), new Mm(e)); za.a.Xc();)
c = (g = za.a.Yc(), g.Nf()), W = (f = c.Se(), 0 < f ? f : 0 > f ? 1 : 0), P = b.a.Ef(c), x = H(R(n, G(P))), D = (cb = c.Te(), 0 <= cb ? cb : 1.7976931348623157e+308), c = x + gE * W, D <= c && (za.a.Zc(), d -= W, v = !0, L -= D - x, hl(n, G(P), D));
while (v);
if (!(0 >= d && 0 == p.a.od())) {
cb = 0;
Us((Ps(), !U && (U = new Rs()), Ps(), U)) || Vs((!U && (U = new Rs()), U)) || -1 != Nc(Xs(), 'PhantomJS') ? (D = w(L / d), cb = w(L - D * d)) : D = L / d;
for (L = (Yh = new Lm(p.a).a.uf().Mc(), new Mm(Yh)); L.a.Xc();)
c = (g = L.a.Yc(), g.Nf()), W = (f = c.Se(), 0 < f ? f : 0 > f ? 1 : 0), P = b.a.Ef(c), x = H(R(n, G(P))), c = x + D * W, 0 < cb && (c += 1, --cb), hl(n, G(P), c), d -= W;
do {
Yh = !1;
cb = 0;
for (d = new pu(b.b.Mc()); d.b.Xc();)
c = d.b.Yc(), x = (l = c.Ue(), 0 <= l ? l : 5e-324), P = b.a.Ef(c), W = H(R(n, G(P))), (D = 0 > c.t) && W < x && (hl(n, G(P), x), cb += x - W, Yh = !0, p.a.xf(c));
d = 0;
for (P = (e = new Lm(p.a).a.uf().Mc(), new Mm(e)); P.a.Xc();)
c = (g = P.a.Yc(), g.Nf()), d += (f = c.Se(), 0 < f ? f : 0 > f ? 1 : 0);
P = cb / d;
for (d = (m = new Lm(p.a).a.uf().Mc(), new Mm(m)); d.a.Xc();)
c = (g = d.a.Yc(), g.Nf()), cb = P * (f = c.Se(), 0 < f ? f : 0 > f ? 1 : 0), c = b.a.Ef(c), hl(n, G(c), H(R(n, G(c))) - cb);
} while (Yh);
}
by(a.d.v.c, n);
}
}
gt(a.d.v.B);
}
};
C(293);
function mC(a) {
this.a = a;
}
r(283, 1, {}, mC);
_.Ed = function (a, b) {
var c, d, e, f, g, l;
for (d = b.Mc(); d.Xc();)
if (c = d.Yc(), f = (e = mB(this.a, c.a), e.e), A(f, 65))
try {
l = f;
g = l.xd();
var m = (S(), g.ab);
c.c.appendChild(m);
jB(g, this.a);
} catch (n) {
if (n = ec(n), A(n, 10))
vq(), nc(TB);
else
throw n.backingJsObject;
}
};
_.Fd = function (a, b) {
var c, d, e, f, g;
d = this.a.M;
c = a.c;
d.d = a.d;
d.c = null;
d.a = c;
for (d = b.Mc(); d.Xc();)
if (c = d.Yc(), g = (f = mB(this.a, c.a), f.e), A(g, 52))
try {
e = mB(this.a, c.a);
var l = this.a.I, m = mu(nu(new Eo(this.a.n)), e);
g = e;
l.a = c;
bw(l, c.a, m, g);
} catch (n) {
if (n = ec(n), A(n, 10))
vq(), nc(TB);
else
throw n.backingJsObject;
}
};
_.Gd = function (a, b) {
var c, d, e, f, g;
d = a.d;
g = this.a.M;
c = Et(this.a.q, d);
var l = a.c;
g.d = d;
g.c = c;
g.a = l;
for (d = b.Mc(); d.Xc();)
if (c = d.Yc(), g = (f = mB(this.a, c.a), f.e), A(g, 52))
try {
e = mB(this.a, c.a);
var m = this.a.I, n = mu(nu(new Eo(this.a.n)), e), l = e;
m.a = c;
bw(m, c.a, n, l);
g.ud(this.a.I);
} catch (p) {
if (p = ec(p), A(p, 10))
vq(), nc(TB);
else
throw p.backingJsObject;
}
};
_.Hd = function (a, b) {
var c, d, e, f, g;
for (d = new Fu(new Gu(b.a.a, b.c, b.c + b.b), !0); d.c + d.d < d.a.a.length;)
if (c = Iu(d), f = (e = mB(this.a, c.a), e.e), A(f, 65))
try {
if (g = at(eh(c.c))) {
jB(g, null);
var l = (S(), g.ab);
c.c.removeChild(l);
}
} catch (m) {
if (m = ec(m), A(m, 10))
vq(), nc(TB);
else
throw m.backingJsObject;
}
};
_.Id = function (a, b) {
var c, d, e, f, g, l, m, n, p, v, x;
d = a.d;
c = a.c;
p = Et(this.a.q, d);
m = null != p;
v = kh(c, this.a.L);
v != m && xq(c, this.a.L, m);
xq(c, this.a.O, 0 != a.d % 2);
n = this.a.M;
n.d = d;
n.c = p;
n.a = c;
if (m)
if (xq(c, this.a.N, this.a.S.ke(p)), this.a.P)
try {
var D = this.a.P;
f = D.b(new nC(this.a.M, D.a.c));
RB(c, f);
} catch (za) {
if (za = ec(za), A(za, 10))
vq(), nc(TB);
else
throw za.backingJsObject;
}
else
RB(c, null);
else
v && (xq(c, this.a.N, !1), RB(c, null));
c = this.a.c;
if (c.g == a.d && c.c == c.j.v.a)
a.c != c.i && (c.i && xq(c.i, c.j.K, !1), c.i = a.c, xq(c.i, c.j.K, !0));
else if (c.i == a.c || c.c != c.j.v.a && c.i)
xq(c.i, c.j.K, !1), c.i = null;
for (d = b.Mc(); d.Xc();) {
c = d.Yc();
f = mB(this.a, c.a);
g = mu(nu(new Eo(this.a.n)), f);
oC(this.a.c, c, this.a.v.a);
if (m && this.a.g)
try {
bw(this.a.f, c.a, g, f);
var L = this.a.g;
l = L.b(new pC(this.a.f, L.a.c));
RB(c.c, l);
} catch (za) {
if (za = ec(za), A(za, 10))
vq(), nc(TB);
else
throw za.backingJsObject;
}
else
(m || v) && RB(c.c, null);
n = f.e;
try {
var P = this.a.I, D = c, W = f;
P.a = D;
bw(P, D.a, g, W);
A(n, 52) ? (e = n, m ? (v || $t(this.a.I, !0), x = f.Ve(p), e.wd(this.a.I, x)) : $t(this.a.I, !1)) : m ? (x = f.Ve(p), n.wd(this.a.I, x)) : Xg(c.c);
} catch (za) {
if (za = ec(za), A(za, 10))
vq(), nc(TB);
else
throw za.backingJsObject;
}
}
};
C(283);
function tB(a) {
return new ru(a.g, a.a.b, a.b);
}
function wB(a, b) {
if (b == a.j.v.j)
b = a.j.v.a;
else if (b == a.j.v.a)
b = a.j.v.f;
else
return b;
return 0 == b.Md() ? wB(a, b) : b;
}
function vB(a, b) {
if (b == a.j.v.f)
b = a.j.v.a;
else if (b == a.j.v.a)
b = a.j.v.j;
else
return b;
return 0 == b.Md() ? vB(a, b) : b;
}
function Nt(a, b) {
var c, d;
c = a.c == a.j.v.a;
d = b.b <= a.g;
c && d && (a.g += b.a - b.b, a.g = Nb(a.g, a.j.v.a.p - 1), a.c.Od(a.g));
}
function Pt(a, b) {
if (a.c == a.j.v.a) {
if (Dx(b, a.g))
a.c.Md() > b.a ? a.g = b.b : 0 < b.b ? a.g = b.b - 1 : 0 < a.j.v.j.p ? (a.g = Nb(a.f, a.j.v.j.p - 1), a.c = a.j.v.j) : 0 < a.j.v.f.p && (a.g = Nb(a.e, a.j.v.f.p - 1), a.c = a.j.v.f);
else {
if (b.b > a.g)
return;
a.g -= b.a - b.b;
}
a.c.Od(a.g);
}
}
function uB(a, b, c, d) {
var e, f, g, l;
if (b != a.g || !Dx(a.a, c) || d != a.c) {
l = a.g;
a.g = b;
b = a.a;
if (d == a.j.v.a)
Mw(a.j, a.g, (Kw(), Lw), 0), a.a = V(c, 1);
else {
g = 0;
e = eh(d.Nd(a.g));
do {
f = parseInt(e.colSpan) | 0;
f = V(g, f);
if (f.b <= c && c < f.a) {
a.a = f;
break;
}
e = rh((M(), e));
++g;
} while (e);
}
e = mu(nu(new Eo(a.j.n)), mB(a.j, c));
if (e >= a.j.v.c.b) {
g = a.j.v;
e = (Kw(), Lw);
uy(e, 10);
if (0 > c || c >= g.c.a.a.length)
throw new Dc('The given column index ' + c + ' does not exist.').backingJsObject;
if (c < g.c.b)
throw new F('The given column index ' + c + ' is frozen.').backingJsObject;
g = g.u;
var m, n;
m = bz(g.b.c, V(0, g.b.c.b));
f = bz(g.b.c, V(0, c)) - m;
c = f + Xy(Pr(g.b.c.a, c));
n = g.b.p.k;
m = n + gt(Q(g.b)) - m;
nv(g.b.C) && (m -= dt());
c = ty(e, f, c, n, m, 10);
cv(g.b.p, c);
}
a.c == d ? qC(b, a.a) && l != a.g ? a.c.Od(l) : (zB(a.j), xB(a.j)) : (c = a.c, a.c = d, c == a.j.v.a ? a.d = l : c == a.j.v.j ? a.f = l : a.e = l, qC(b, a.a) ? c.Od(l) : (zB(a.j), xB(a.j), c == a.j.v.a && c.Od(l)));
a.c.Od(a.g);
}
}
function oC(a, b, c) {
var d, e;
d = b.d.d;
e = rt(V(b.a, gh(b.c, 'colSpan')), a.a);
c == a.c && (d == a.g && e ? a.b != b.c && (a.b && xq(a.b, a.j.d, !1), a.b = b.c, xq(a.b, a.j.d, !0)) : a.b == b.c && (xq(a.b, a.j.d, !1), a.b = null));
}
function rC(a) {
this.j = a;
this.c = this.j.v.a;
this.a = V(0, 1);
fB(a, new $l(z(u(tb, 1), h, 2, 6, [
'keydown',
'click'
])));
}
r(275, 1, {}, rC);
_.b = null;
_.d = 0;
_.e = 0;
_.f = 0;
_.g = 0;
_.i = null;
C(275);
function lu(a) {
if (a.n)
a = 0;
else {
var b = mu(kw(a.i), a);
a = Xy(Pr(a.i.v.c.a, b));
}
return a;
}
function sC(a, b) {
a.g != b && (a.g = b, a.i && dB(a.i.a));
}
function cB(a, b) {
if (a.i && b)
throw new Lq('Column already is attached to a grid. Remove the column first from the grid and then add it. (in: ' + tC(a) + ')').backingJsObject;
a.i && dB(a.i.a);
a.i = b;
a.i && dB(a.i.a);
}
function uC(a, b) {
null == b && (b = '');
if (a.j !== b && (a.j = b, a.i)) {
var c;
if (c = a.i.D.a)
vC(bB(c, a), a.j), a.k && wC(a.i.j, a);
}
}
function xC(a, b) {
a.k != b && (a.k = b, eB(a.i.j, a));
}
function yC(a, b) {
var c, d, e;
a.n != b && (b ? (eA(a.i.v.c, mu(kw(a.i), a), 1), a.n = !0) : (a.n = !1, c = mu(kw(a.i), a), cA(a.i.v.c, c, 1), e = a.i.B, d = a.i.v.c.b, e > d && d == c && gA(a.i.v.c, ++d)), wC(a.i.j, a), zC(a.i.D), zC(a.i.A), a.i && dB(a.i.a), Jq(a.i, new yw()));
}
function AC(a, b) {
var c, d, e, f;
if (!b)
throw new F('Renderer cannot be null.').backingJsObject;
b != a.e && (c = !1, f = 0, d = null, e = 0, a.i && (A(a.e, 65) || A(b, 65)) && (e = mu(nu(new Eo(a.i.n)), a), d = a.i.v.c, f = (aA(d, e), Pr(d.a, e).b), eA(d, e, 1), c = !0), A(a.e, 52) && a.e.sd(), a.e = b, c && (cA(d, e, 1), by(d, cy(G(e), f))), a.i && (c = a.i, Tt(c.v.a, 0, c.v.a.p)));
}
function BC(a, b) {
a.s != b && (a.s = b, a.i && zB(a.i));
}
function CC(a, b) {
jt(a.t, b) || (a.t = b, a.n || a.i && dB(a.i.a));
return a;
}
function tC(a) {
var b, c;
b = '';
null != a.j && 0 != Rb(a.j).length ? b += 'header:"' + a.j + '" ' : b += 'header:empty ';
a.i ? (c = mu(nu(new Eo(a.i.n)), a), -1 != c ? b += 'attached:#' + c + ' ' : b += 'attached:unindexed ') : b += 'detached ';
b += 'sortable:' + a.s + ' ';
return qc(a.Vf) + '[' + Uc(b) + ']';
}
r(81, 1, { 81: 1 });
_.Se = jk;
_.Te = kz;
_.Ue = function () {
return this.q;
};
_.We = function (a) {
vC(a, this.j);
};
_.Xe = function (a) {
return CC(this, a);
};
_.eb = function () {
return tC(this);
};
_.f = !0;
_.g = -1;
_.j = '';
_.k = !1;
_.n = !1;
_.o = null;
_.p = -1;
_.q = 10;
_.r = !0;
_.s = !1;
_.t = -1;
var cC = C(81);
function DC(a) {
this.a = a;
}
r(282, 1, {}, DC);
_.wd = function (a, b) {
var c;
this.b || nb(b) || (vq(), nc(TB), tC(this.a), this.b = !0);
null == b ? c = '' : c = Ab(b);
nh(a.a.c, c);
};
_.b = !1;
C(282);
function EC(a) {
var b, c;
b = new FC();
b.a += '<span class="';
a.n ? b.a += 'v-off' : b.a += 'v-on';
b.a += '"><div>';
c = a.o;
null == c && (c = a.j);
b.a += '' + c;
b.a += '</div></span>';
return b.a;
}
function eB(a, b) {
var c, d;
b.k ? (c = R(a.a, b), !c && (c = (d = new Tr(EC(b), new GC(a, b)), xq((S(), d.ab), 'column-hiding-toggle', !0), hl(a.a, b, d), d)), zq(c, 'hidden', b.n)) : wp(a.a, b) && CB(a.c.T.c, gl(a.a, b));
HB(a);
}
function wC(a, b) {
var c;
if (b.k) {
c = R(a.a, b);
var d = EC(b);
(S(), c.ab).innerHTML = d || '';
zq(c, 'hidden', b.n);
}
}
function HB(a) {
var b, c, d;
if (!a.b)
for (d = 0, c = new pu(nu(new Eo(a.c.n)).b.Mc()); c.b.Xc();)
if (b = c.b.Yc(), b.k) {
b = R(a.a, b);
CB(a.c.T.c, b);
var e = a.c.T.c, f = b;
b = d++;
if (!e._) {
var g = e.a.a, l = g, m = e, g = (S(), g.ab), n = 0, p = l, v = m, x = void 0;
if (0 > n || n > p.b.c)
throw new Cc().backingJsObject;
v._ == p && (x = $q(p.b, v), x < n && --n);
pm(m);
cr(l.b, m, n);
p = (S(), m.ab);
S();
jp.rc(g, zp(p), n);
Pq(m, l);
HC(e.a);
}
m = l = void 0;
if (0 > b || b > e.b.a.length)
throw new Cc().backingJsObject;
Pz(e.b, b, f);
for (l = m = 0; l < b; l++)
A(Pr(e.b, l), 130) && ++m;
Pz(e.f, m, f);
g = e;
m = b;
l = (S(), f.ab);
b = void 0;
g.i ? (b = (S(), Dh()), g = g.d, n = b, S(), jp.rc(g, zp(n), m), l = zp(l), b.appendChild(l)) : (b = qp(g.d), S(), jp.rc(b, zp(l), m));
zq(f, Aq(f.ab) + '-selected', !1);
b = e;
e = f;
l = f = l = f = void 0;
b.i && (l = zo(b.b, e), -1 != l && (f = b.i ? b.d : qp(b.d), l = (S(), jp.oc(f, l)), f = jp.pc(l), 2 == f && l.removeChild(jp.oc(l, 1)), e.ab.colSpan = 2));
}
}
function IC(a) {
this.c = a;
this.a = new zg();
}
r(281, 1, {}, IC);
_.b = !1;
C(281);
function Qr(a) {
a.a.b = !0;
yC(a.b, !a.b.n);
a.a.b = !1;
}
function GC(a, b) {
this.a = a;
this.b = b;
}
r(301, 1, {}, GC);
_.tb = function () {
Qr(this);
};
C(301);
function JC() {
this.f = (S(), wh());
this.d = wh();
this.i = wh();
this.k = wh();
this.n = wh();
this.b = wh();
wh();
this.e = new zg();
new Rd();
this.q = new KC();
this.a = new LC();
new Yk();
var a = this.p = new lr();
nh((S(), a.ab), 'Save');
Hq(this.p, new MC(), (qk(), qk(), rk));
a = this.c = new lr();
nh((S(), a.ab), 'Cancel');
Hq(this.c, new NC(), rk);
}
r(274, 1, {}, JC);
_.g = -1;
_.o = -1;
_.r = null;
C(274);
r(285, 1, {}, function (a) {
this.b = a;
});
_.tb = function () {
var a;
a = ct();
if (a == Q(this.b.j) || a == $doc.body || 2 < this.a) {
a = this.b;
var b = this.b.g;
0 > b || b >= kw(a.j).b.od() || (b = mB(a.j, b), b = R(a.e, b), A(b, 652) ? b.jd() : A(b, 113) ? b.Qc(!0) : (a = a.j, (S(), a.ab).focus()));
} else
++this.a, Lg((Ig(), Jg), this);
};
_.a = 0;
C(285);
function KC() {
}
r(286, 50, {}, KC);
_.nb = OC;
C(286);
function LC() {
}
r(287, 50, {}, LC);
_.nb = OC;
C(287);
function MC() {
}
r(288, 1, Aa, MC);
_.Ub = function () {
throw new Lq('Cannot save: editor is not enabled').backingJsObject;
};
C(288);
function NC() {
}
r(289, 1, Aa, NC);
_.Ub = function () {
throw new Lq('Cannot cancel edit: editor is not enabled').backingJsObject;
};
C(289);
function aB(a, b) {
var c, d;
for (d = new $k(a.d); d.a < d.c.a.length;)
c = al(d), PC(c, b);
}
function QC(a, b) {
var c, d;
d = a.Ye();
d.d = a;
for (c = 0; c < a.c.n.a.length; ++c)
PC(d, Mv(a.c, c));
Pz(a.d, b, d);
a.Ze();
return d;
}
function qB(a, b) {
try {
return Pr(a.d, b);
} catch (c) {
c = ec(c);
if (A(c, 28))
throw new F('Row with index ' + b + ' does not exist').backingJsObject;
throw c.backingJsObject;
}
}
function BB(a, b) {
var c, d;
for (d = new $k(a.d); d.a < d.c.a.length;)
c = al(d), gl(c.c, b);
}
function RC(a, b) {
var c = Ju(a.d, b), d, e, f, g, l;
e = new Yk();
for (g = new pu(nu(new Eo(c.d.c.n)).b.Mc()); g.b.Xc();)
f = g.b.Yc(), Km(e, bB(c, f));
for (c = (d = new Lm(e.a).a.uf().Mc(), new Mm(d)); c.a.Xc();)
d = (l = c.a.Yc(), l.Nf()), A(d.b, 17) && iB(d.b);
a.Ze();
}
function zC(a) {
var b;
for (b = new $k(a.d); b.a < b.c.a.length;)
a = al(b), 0 != qs(a.b) && GB(a);
}
r(187, 1, {});
_.e = !0;
C(187);
function SC() {
this.d = new Rd();
}
r(272, 187, {}, SC);
_.Ye = function () {
return new TC();
};
_.Ze = function () {
this.a = !0;
Qg((Ig(), Jg), new UC(this));
};
_.a = !1;
C(272);
function UC(a) {
this.a = a;
}
r(284, 1, {}, UC);
_.tb = function () {
this.a.a && (this.a.a = !1, xB(this.a.c));
};
C(284);
function VC(a) {
if (a.e != (WC(), XC))
throw new Lq('Cannot fetch HTML from a cell with type ' + a.e).backingJsObject;
return a.b;
}
function YC(a) {
if (a.e != (WC(), ZC))
throw new Lq('Cannot fetch Text from a cell with type ' + a.e).backingJsObject;
return a.b;
}
function $C(a) {
if (a.e != (WC(), aD))
throw new Lq('Cannot fetch Widget from a cell with type ' + a.e).backingJsObject;
return a.b;
}
function bD(a, b) {
if (1 > b)
throw new F('Colspan cannot be less than 1').backingJsObject;
a.a = b;
a.c.Ze();
}
function cD(a, b) {
a.b = b;
a.e = (WC(), XC);
a.c.Ze();
}
function vC(a, b) {
a.b = b;
a.e = (WC(), ZC);
a.c.Ze();
}
function dD(a, b) {
sb(a.b) !== sb(b) && (A(a.b, 17) && iB(a.b), a.b = b, a.e = (WC(), aD), a.c.Ze());
}
r(92, 1, { 92: 1 });
_.a = 1;
_.b = null;
_.d = null;
C(92);
function eD() {
this.e = (WC(), ZC);
}
r(273, 92, { 92: 1 }, eD);
C(273);
function PC(a, b) {
var c;
c = a.$e();
c.c = a.d;
hl(a.c, b, c);
}
function GB(a) {
var b, c, d, e, f, g;
for (c = (b = new Xx(a.c).a.uf().Mc(), new Yx(b)); c.a.Xc();)
b = (f = c.a.Yc(), f.Of()), bD(b, 1);
for (c = (d = new Lm(a.b).a.uf().Mc(), new Mm(d)); c.a.Xc();)
if (g = (f = c.a.Yc(), f.Nf()), fD(a, g)) {
d = 0;
for (e = g.Mc(); e.Xc();)
b = e.Yc(), b.n || ++d;
bD(R(a.b, g), 1 > d ? 1 : d);
} else
bD(R(a.b, g), 1);
}
function fD(a, b) {
var c, d, e;
c = new Eo(nu(new Eo(a.d.c.n)));
if (!gD(c, b))
return !1;
for (d = 0; d < c.a.length; ++d)
if (b.nf((pd(d, c.a.length), c.a[d]))) {
for (e = 1; e < b.od(); ++e)
if (!b.nf((pd(d + e, c.a.length), c.a[d + e])))
return !1;
return !0;
}
return !1;
}
function bB(a, b) {
var c;
a: {
var d, e;
for (e = (d = new Lm(a.b).a.uf().Mc(), new Mm(d)); e.a.Xc();)
if (d = (c = e.a.Yc(), c.Nf()), d.nf(b)) {
c = d;
break a;
}
c = null;
}
return c ? R(a.b, c) : R(a.c, b);
}
r(93, 1, { 93: 1 });
_.e = null;
C(93);
function TC() {
this.c = new zg();
this.b = new zg();
}
r(143, 93, {
143: 1,
93: 1
}, TC);
_.$e = function () {
return new eD();
};
C(143);
function hD(a) {
this.b = a;
this.a = new zg();
}
r(279, 1, {}, hD);
_._d = function (a) {
var b;
b = a.g;
if (a = gl(this.a, fh((M(), b))))
jB(a, null), Xg(b);
};
_.ae = function (a) {
var b, c, d;
d = a.g;
1 == a.f % 2 ? Zg(Vg((M(), d)), 'stripe') : lh(Vg((M(), d)), 'stripe');
d = a.f;
b = null;
try {
b = this.b.r.de(d);
} catch (e) {
if (e = ec(e), A(e, 11))
vq(), nc(TB);
else
throw e.backingJsObject;
}
a = a.g;
b ? (c = (S(), b.ab), a.appendChild(c), jB(b, this.b), hl(this.a, c, b), b = ft(c), a = ($s(), bt(a, z(u(tb, 1), h, 2, 6, [
'borderTopWidth',
'borderBottomWidth'
]))), b += a) : (Xg(a), b = 50);
MA(this.b.v.a.b, d, b);
};
C(279);
function iD(a, b) {
var c;
c = qB(a, b);
RC(a, b);
c == a.a && jD(a, null);
}
function jD(a, b) {
if (b != a.a) {
if (b && -1 == zo(a.d, b))
throw new F('Cannot set a default row that does not exist in the container').backingJsObject;
a.a && kD(a.a, !1);
b && kD(b, !0);
a.a = b;
a.b = !0;
Qg((Ig(), Jg), new lD(a));
}
}
function mD() {
this.d = new Rd();
}
r(271, 187, {}, mD);
_.Ye = function () {
return new nD();
};
_.Ze = function () {
this.b = !0;
Qg((Ig(), Jg), new lD(this));
};
_.b = !1;
C(271);
function lD(a) {
this.a = a;
}
r(189, 1, {}, lD);
_.tb = function () {
this.a.b && (this.a.b = !1, zB(this.a.c));
};
C(189);
function oD() {
this.e = (WC(), ZC);
}
r(142, 92, {
142: 1,
92: 1
}, oD);
C(142);
function kD(a, b) {
var c, d;
if (a.a = b)
for (d = new pu(nu(new Eo(a.d.c.n)).b.Mc()); d.b.Xc();)
c = d.b.Yc(), c.We(bB(a, c));
}
function nD() {
this.c = new zg();
this.b = new zg();
}
r(94, 93, {
94: 1,
93: 1
}, nD);
_.$e = function () {
return new oD();
};
_.a = !1;
C(94);
function PB(a, b) {
if (b != a.t && a.a)
throw new Uq('The selection column cannot be modified after init').backingJsObject;
CC(a, b);
return a;
}
function OB(a, b) {
this.d = a;
AC(this, b);
this.c = this.a = !1;
}
r(276, 81, { 81: 1 }, OB);
_.Ve = function (a) {
return B(), this.d.S.ke(a) ? hc : gc;
};
_.Se = pD;
_.Te = qD;
_.Ue = qD;
_.We = function (a) {
var b, c;
b = this.d.S;
if (this.b)
for (c = new $k(this.d.D.d); c.a < c.c.a.length;)
b = al(c), bB(b, this).e == (WC(), aD) && vC(bB(b, this), '');
else
this.b = new or(), c = Aq(Q(this.d)) + '-select-all-checkbox', Fq(this.b.xc(), c), c = this.b, b = new rD(this, b), c.c || (Hq(c, new qr(c), (qk(), qk(), rk)), c.c = !0), Iq(c, b, (!Qk && (Qk = new vk()), Qk)), nr(this.b, (B(), this.c ? hc : gc), !1), b = this.d, Iq(b, new sD(this), b.i.a), Bx(this.d, new tD(this));
dD(a, this.b);
};
_.Xe = function (a) {
return PB(this, a);
};
_.a = !1;
_.c = !1;
C(276);
function rD(a, b) {
this.a = a;
this.b = b;
}
r(290, 1, Ea, rD);
_.Wb = function (a) {
yb(H(a.a)) ? (Jq(this.a.d, new Rw()), this.a.c = !0) : (this.b.re(), this.a.c = !1);
};
C(290);
function sD(a) {
this.a = a;
}
r(144, 1, {
15: 1,
702: 1,
703: 1,
144: 1
}, sD);
_.fe = function (a) {
var b;
b = a.c;
a = zo(this.a.d.D.d, this.a.d.D.a);
0 == b.c && b.e.d == a && nr(this.a.b, (B(), yb(H(mr(this.a.b))) ? gc : hc), !0);
};
C(144);
function tD(a) {
this.a = a;
}
r(291, 1, Ma, tD);
_.ee = function (a) {
var b;
32 == Nh(a.d) && (b = qB(this.a.d.D, a.c.e.d), b.a && a.c.b == this.a && nr(this.a.b, (B(), yb(H(mr(this.a.b))) ? gc : hc), !0));
};
C(291);
function uD() {
uD = k;
vD = new wD();
xD = new yD();
zD = new AD();
}
r(63, 5, Na);
var xD, zD, vD, BD = E(63, function () {
uD();
return z(u(BD, 1), h, 63, 0, [
vD,
xD,
zD
]);
});
function wD() {
O.call(this, 'SINGLE', 0);
}
r(302, 63, Na, wD);
E(302, null);
function yD() {
O.call(this, 'MULTI', 1);
}
r(303, 63, Na, yD);
E(303, null);
function AD() {
O.call(this, 'NONE', 2);
}
r(304, 63, Na, AD);
E(304, null);
function VB(a) {
return !!a.f && a.f.w;
}
function CD(a) {
var b;
b = a.b.v.j;
if (0 != b.p && lz(b, 0).hasChildNodes()) {
b = eh(lz(b, 0));
b = ft(b);
var c = (S(), a.ab);
$s();
var d, e, f, g;
(Ps(), !U && (U = new Rs()), Ps(), U).a.g ? (g = Sh(c.style, 'width'), e = Sh(c.style, 'height'), f = (c.offsetWidth || 0) | 0, d = (c.offsetHeight || 0) | 0, 1 > d && (d = 1), 1 > f && (f = 10), c.style.width = f + (Fj(), 'px'), c.style.height = d + 'px', d = ((c.offsetHeight || 0) | 0) - (parseInt(c.clientHeight) | 0), c.style.height = e, c.style.width = g) : d = ((c.offsetHeight || 0) | 0) - (parseInt(c.clientHeight) | 0);
Eq(a.d, b - (d / 2 | 0) + 'px');
} else
vq(), nc(TB), Eq(a.d, b.i + 'px');
}
function HC(a) {
var b, c;
b = 0 < a.a.b.c;
(c = !!a._) && !b ? (jB(a, null), Yg((S(), a.ab))) : !c && b && (Ak(a.f, !1), b = Q(a.b), c = (S(), a.ab), b.appendChild(c), jB(a, a.b), CD(a));
}
function DD(a) {
this.e = new ED(this);
this.b = a;
this.g = new xr();
rr(this, this.g);
this.d = new lr();
Hq(this.d, this.e, (qk(), qk(), rk));
br(this.g, this.d);
this.a = new FD(this);
this.f = new GD();
this.f.f = !0;
a = this.f;
zq(a, Aq((Bq(), Cq).dd(rp((S(), a.ab)))) + '-popup', !0);
zr(this.f, this.a);
a = Q(this.g);
this.f.a = a;
Iq(this.f, new HD(this), Kk ? Kk : Kk = new vk());
this.f.c = !0;
this.c = new ID(this);
a = new JD(this);
Hq(this.d, a, (xk(), xk(), yk));
Hq(this.c, a, yk);
}
r(280, 669, Ba, DD);
_.Fc = function () {
vr(this);
Lg((Ig(), Jg), new KD(this));
};
C(280);
function ED(a) {
this.a = a;
}
r(294, 1, Aa, ED);
_.Ub = function () {
if (VB(this.a))
Ak(this.a.f, !1);
else {
var a = this.a;
if ((!a.f || !a.f.w) && a._) {
xq((S(), a.ab), 'open', !0);
wq(a.f, 'open');
xq(a.ab, 'closed', !1);
Dq(a.f, 'closed');
var a = a.f, b = (S(), a.ab).style;
(M(), b).opacity = 0;
LD = a;
b = a.Y && a.w;
a.w || (a.Y && pm(a), Xr(a.v, !0, !1));
b || Us((Ps(), !U && (U = new Rs()), Ps(), U)) || Vs((Ps(), !U && (U = new Rs()), Ps(), U)) || ((S(), a.ab).style.visibility = 'hidden', a.e && (a.e.style.visibility = 'hidden'), zq(a, Aq(Cq.dd(rp(a.ab))) + '-animate-in', !0), b = new Zs(a.ab), b = Os(b), null == b && (b = ''), a.ab.style.visibility = 'visible', a.e && (a.e.style.visibility = 'visible'), -1 != (y(), b).indexOf('animate-in') ? (a.p = !1, a.b = Ms(a.ab, new MD(a))) : zq(a, Aq(Cq.dd(rp(a.ab))) + '-animate-in', !1));
a.p ? Ed(new ND(a), 200) : OD(a, 1);
LD = null;
var b = a.ab, c = a.a, d = b.getBoundingClientRect(), c = c.getBoundingClientRect();
b.style.left = c.right - d.left - d.width + 'px';
b.style.top = c.top - d.top + c.height + 'px';
a = a.ab.style;
(M(), a).opacity = 1;
}
}
};
C(294);
function FD(a) {
this.a = a;
xr.call(this);
}
r(295, 145, xa, FD);
_.Nc = function (a) {
(a = Zq(this, a)) && HC(this.a);
return a;
};
C(295);
function CB(a, b) {
a.g == b && pk(a, null);
var c;
var d;
d = zo(a.b, b);
if (-1 == d)
c = !1;
else {
c = a.i ? a.d : qp(a.d);
var e = (S(), jp.oc(c, d));
c.removeChild(e);
Ju(a.b, d);
c = !0;
}
c && ((S(), b.ab).colSpan = 1, ae(a.f, b));
0 == a.f.a.length && pm(a.a.c);
}
function ID(a) {
this.a = a;
this.b = new Rd();
this.f = new Rd();
a = (Sr(), vs(), !0);
var b, c;
c = (S(), Eh());
this.d = Ah();
b = zp(this.d);
c.appendChild(b);
a || (b = Dh(), b = zp(b), this.d.appendChild(b));
this.i = a;
b = (Dr(), Er)._c();
c = zp(c);
b.appendChild(c);
this.ab = b;
Xe();
this.ab.setAttribute('role', Bf.a);
-1 == this.Z ? Bp(this.ab, 2225 | (this.ab.__eventBits || 0)) : this.Z |= 2225;
this.ab.className = 'gwt-MenuBar';
a ? zq(this, Aq(this.ab) + '-vertical', !0) : zq(this, Aq(this.ab) + '-horizontal', !0);
this.ab.style.outline = '0px';
this.ab.setAttribute('hideFocus', 'true');
Hq(this, new Rr(this), (lk(), lk(), mk));
}
r(296, 191, wa, ID);
_.nc = function (a) {
var b;
S();
128 == pp((M(), a).type) && 13 == (a.keyCode | 0) ? (b = this.g, Kr(this, a), Lg((Ig(), Jg), new PD(this, b))) : Kr(this, a);
};
C(296);
function PD(a, b) {
this.a = a;
this.b = b;
}
r(297, 1, {}, PD);
_.tb = function () {
pk(this.a, this.b);
var a = this.a;
(Dr(), Er).ad((S(), a.ab));
};
C(297);
function JD(a) {
this.a = a;
}
r(298, 1, {
717: 1,
15: 1
}, JD);
C(298);
function HD(a) {
this.a = a;
}
r(299, 1, Ga, HD);
_.Vb = function () {
var a = this.a;
xq((S(), a.ab), 'open', !1);
Dq(a.f, 'open');
a = this.a;
xq((S(), a.ab), 'closed', !0);
wq(a.f, 'closed');
};
C(299);
function KD(a) {
this.a = a;
}
r(300, 1, {}, KD);
_.tb = function () {
CD(this.a);
};
C(300);
function QD(a, b, c) {
var d, e, f, g;
e = qB(a.b, b.d);
b = kw(a.c);
for (d = c.Mc(); d.Xc();)
if (c = d.Yc(), f = bB(e, b.a.Df(c.a)), (WC(), aD) == f.e && (g = $C(f)) && !g.Ec()) {
g = a.b.c;
f = $C(f);
var l = (S(), f.ab);
c.c.appendChild(l);
jB(f, g);
}
}
function RD(a, b, c) {
var d;
if (a.b.d.a.length > b.d)
for (b = qB(a.b, b.d), a = kw(a.c), c = c.Mc(); c.Xc();)
d = c.Yc(), d = bB(b, a.a.Df(d.a)), (WC(), aD) == d.e && $C(d) && $C(d).Ec() && iB($C(d));
}
function SD(a, b, c) {
this.c = a;
this.b = b;
this.a = c;
}
r(188, 1, {}, SD);
_.Ed = function (a, b) {
QD(this, a, b);
};
_.Fd = vu;
_.Gd = vu;
_.Hd = function (a, b) {
RD(this, a, b);
};
_.Id = function (a, b) {
var c, d, e, f, g, l, m;
l = qB(this.b, a.d);
f = kw(this.c);
RB(a.c, l.e);
for (d = b.Mc(); d.Xc();) {
c = d.Yc();
e = bB(l, f.a.Df(c.a));
if (A(l, 94)) {
var n = l, p = c, v = m = void 0, x = void 0, D = g = x = void 0, v = void 0;
m = p.c;
g = kh(m, 'sort-asc') || kh(m, 'sort-desc');
v = p.c;
v.removeAttribute('sort-order');
lh(v, 'sort-desc');
lh(v, 'sort-asc');
lh(v, 'sortable');
if (n.a) {
v = mB(this.c, p.a);
a: {
n = v;
x = p = void 0;
for (x = new pu(nu(this.c.U).b.Mc()); x.b.Xc();)
if (p = x.b.Yc(), p.a == n) {
D = p;
break a;
}
D = null;
}
(x = v.s) && Zg(m, 'sortable');
x && D && ((Kx(), Lx) == D.b ? Zg(m, 'sort-asc') : Zg(m, 'sort-desc'), x = mu(nu(this.c.U), D), -1 < x && 1 < nu(this.c.U).b.od() && (n = (y(), '' + (x + 1)), m.setAttribute('sort-order', n)), g || (m = v, v = g = void 0, g = mu(nu(new Eo(this.c.n)), m), v = ou(this.c.v.c, g), lu(m) < v && (by(this.c.v.c, cy(G(g), v)), Jq(this.c, new qu()))));
}
}
m = c;
g = e.a;
v = void 0;
if (1 > g)
throw new F('Number of cells should be more than 0').backingJsObject;
v = gh(m.c, 'colSpan');
if (1 != g || 1 != v) {
m.c.colSpan = g;
for (var n = m, L = D = x = p = void 0, p = Ku(n.b, g - 1).b, D = n.d.b[n.a], x = L = 0; x < p; x++)
L += n.d.b[n.a + x + 1];
n.c.style.width = D + L + (Fj(), 'px');
n = g;
x = p = void 0;
p = Ku(m.b, (v > n ? v : n) - 1);
if (v < n)
for (x = 0; x < p.b; x++)
(pd(v + x - 1, p.b), p.c.Df(p.a + (v + x - 1))).c.style.display = (ii(), 'none');
else if (v > n)
for (x = 0; x < p.b; x++)
(pd(n + x - 1, p.b), p.c.Df(p.a + (n + x - 1))).c.style.display = '';
m.b.d = g - 1;
}
m = c.c;
Xg(m);
RB(m, e.d);
e.e != (WC(), aD) ? (g = (S(), wh()), A(l, 94) ? (mh(g, Aq(Q(this.c)) + '-column-header-content'), l.a && mh(g, (g.className || '') + ' ' + Aq(Q(this.c)) + '-column-default-header-content')) : A(l, 143) ? mh(g, Aq(Q(this.c)) + '-column-footer-content') : (vq(), nc(TB), pc(l.Vf)), m.appendChild(g)) : g = m;
switch (e.e.g) {
case 0:
nh(g, YC(e));
break;
case 1:
e = VC(e);
g.innerHTML = e || '';
break;
case 2:
RD(this, a, new $l(z(u(yu, 1), h, 95, 0, [c]))), g.innerHTML = '', QD(this, a, new $l(z(u(yu, 1), h, 95, 0, [c])));
}
f.a.Df(c.a).r && A(l, 94) && l.a && (e = c.a, g = e = new iu(Aq(Q(this.c)) + '-column-resize-handle', new TD(this, e)), g.e && (g.e.removeChild(g.d), g.e = null), e.e = m, e.e.appendChild(e.d));
oC(this.c.c, c, this.a);
}
};
C(188);
function TD(a, b) {
this.d = a;
this.e = b;
this.a = mB(this.d.c, this.e);
}
r(305, 1, {}, TD);
_.b = 0;
_.c = 0;
_.e = 0;
C(305);
function rB(a, b, c) {
var d;
if (-1 == zo(a.c.n, b))
throw new F('Given column is not a column in this grid. ' + tC(b)).backingJsObject;
if (b.s) {
a: {
var e;
for (e = new pu(nu(a.c.U).b.Mc()); e.b.Xc();)
if (d = e.b.Yc(), d.a == b)
break a;
d = null;
}
c ? d ? (b = zo(a.c.U, d), Du(a.c.U, b, new Jx(d.a, d.b.ef()))) : Ud(a.c.U, new Ix(b)) : (c = a.c.U.a.length, a.c.U.a = Ib(I, h, 1, 0, 5), d && 1 == c ? Ud(a.c.U, new Jx(d.a, d.b.ef())) : Ud(a.c.U, new Ix(b)));
a = a.c;
yB(a.v.j, a.D);
Jq(a, new Gx(a, nu(a.U), !0));
}
}
function UD(a) {
this.c = a;
this.d = new VD(this);
}
r(277, 1, {}, UD);
_.b = !1;
C(277);
function VD(a) {
this.a = a;
}
r(292, 50, {}, VD);
_.nb = function () {
rB(this.a, this.a.a, this.a.b);
};
C(292);
function Ak(a, b) {
var c;
Us((Ps(), !U && (U = new Rs()), Ps(), U)) || Vs((!U && (U = new Rs()), U)) ? WD(a) : -1 != Nc(Cq.dd(rp((S(), a.ab))).className || '', 'animate-in') ? Ms(a.ab, new XD(a, b)) : (zq(a, Aq(Cq.dd(rp(a.ab))) + '-animate-out', !0), c = new Zs(a.ab), c = Os(c), null == c && (c = ''), -1 != (y(), c).indexOf('animate-out') ? (a.p = !1, Ms(a.ab, new YD(a, b)), a.u = !1) : (zq(a, Aq(Cq.dd(rp(a.ab))) + '-animate-out', !1), WD(a)));
}
function OD(a, b) {
var c, d, e;
if (a.Y) {
try {
var f = (S(), a.ab).style;
e = (M(), f).zIndex;
Ac(e);
} catch (n) {
if (n = ec(n), !A(n, 13))
throw n.backingJsObject;
}
(Ps(), !U && (U = new Rs()), Ps(), U).a.g && S();
e = (!U && (U = new Rs()), U);
if (e.a.g && Ts(e) && (e = new ZD((c = ch((S(), a.ab)), c -= Gh(), c -= (-1 == $D && ($D = aE('left')), $D), c), (d = dh(a.ab), d -= Hh(), d -= (-1 == bE && (bE = aE('top')), bE), d), gh(a.ab, 'offsetWidth'), gh(a.ab, 'offsetHeight')), e.b += w(e.d * (1 - b) / 2), e.c += w(e.a * (1 - b) / 2), e.d = w(e.d * b), e.a = w(e.a * b), c = Ug(a.ab), d = (!U && (U = new Rs()), U), d.a.g && Ts(d))) {
var g;
!a.e && (g = (Ps(), !U && (U = new Rs()), Ps(), U), g.a.g && Ts(g)) && (a.e = yh(), a.e.style.position = (fj(), 'absolute'), a.e.style.borderStyle = (Wh(), 'none'), a.e.tabIndex = -1, a.e.frameBorder = 0, a.e.marginHeight = 0);
g = a.e;
g.style.left = e.b + (Fj(), 'px');
g.style.top = e.c + 'px';
g.style.width = e.d + 'px';
g.style.height = e.a + 'px';
!Ug(a.e) && c.insertBefore(a.e, a.ab);
}
(g = Vs((!U && (U = new Rs()), U))) || (g = (!U && (U = new Rs()), U), g = g.a.g && 10 == g.a.a);
if (g) {
g = (S(), a.ab);
var l, m;
$s();
(Ps(), !U && (U = new Rs()), Ps(), U).a.g && (l = g.style, m = (M(), l).zoom, l.zoom = '1', l.zoom = m);
}
}
}
function WD(a) {
var b, c;
Wr(a);
for (c = new $k(a.d); c.a < c.c.a.length;)
b = al(c), b.tb();
a.d.a = Ib(I, h, 1, 0, 5);
}
function aE(a) {
try {
var b = $wnd.document.body, c = b.currentStyle ? b.currentStyle : getComputedStyle(b);
if (c && 'relative' == c.position)
return b.getBoundingClientRect()[a];
} catch (d) {
}
return 0;
}
r(267, 266, Oa);
_.Uc = function () {
Ak(this, !1);
};
_.Vc = function (a) {
Ak(this, a);
};
_.Fc = function () {
var a;
if (LD) {
a = Q((fp(), hs()));
var b = (S(), this.ab);
a.appendChild(b);
}
Kq(this);
};
_.Vb = au;
_.Gc = function () {
Nq(this);
this.e && Yg(this.e);
};
_.zc = function (a) {
Zr(this, a);
OD(this, 1);
};
_.Wc = function (a, b) {
var c, d, e;
this.c && (d = (Mp(), Kh()), e = Kh() + Jh(), c = gh((S(), this.ab), 'offsetWidth'), c = a + c - e, 0 < c && (a -= c, 0 > a && (this.B.Ac(e - d + 'px'), c = e - d - (gh(this.ab, 'offsetWidth') - (e - d)), c != e - d && this.B.Ac(c + 'px'), Ud(this.d, new cE(this)), a = 0)), e = Lh(), d = Lh() + Ih(), c = gh(this.ab, 'offsetHeight'), c = b + c - d, 0 < c && (b -= c, 0 > b && (this.B.zc(d - e + 'px'), c = d - e - (gh(this.ab, 'offsetHeight') - (d - e)), c != d - e && this.B.zc(c + 'px'), Ud(this.d, new dE(this)), b = 0)));
d = (S(), this.ab).style;
d.marginLeft = (-1 == $D && ($D = aE('left')), -$D + (Fj(), 'px'));
d.marginTop = (-1 == bE && (bE = aE('top')), -bE + 'px');
$r(this, a, b);
OD(this, this.p ? 0 : 1);
};
_.Ac = function (a) {
as(this, a);
OD(this, 1);
};
_.Kc = Sq;
_.c = !1;
var eE = 20000, LD, $D = -1, bE = -1;
C(267);
function cE(a) {
this.a = a;
}
r(343, 1, { 244: 1 }, cE);
_.tb = function () {
this.a.B.Ac('');
};
C(343);
function dE(a) {
this.a = a;
}
r(344, 1, { 244: 1 }, dE);
_.tb = function () {
this.a.B.zc('');
};
C(344);
function MD(a) {
this.a = a;
}
r(345, 1, {}, MD);
_.hd = function (a) {
a = Ns(a);
if (-1 != (y(), a).indexOf('animate-in')) {
a = Q(this.a);
var b = this.a.b;
Ks();
a.removeEventListener(Ls, b, !1);
yq(this.a, 'animate-in');
}
};
C(345);
function XD(a, b) {
this.a = a;
this.b = b;
}
r(346, 1, {}, XD);
_.hd = function (a) {
-1 != Nc(Ns(a), 'animate-in') && WD(this.a);
};
_.b = !1;
C(346);
function YD(a, b) {
this.a = a;
this.b = b;
}
r(347, 1, {}, YD);
_.hd = function (a) {
a = Ns(a);
if (-1 != (y(), a).indexOf('animate-out')) {
a = Q(this.a);
Ks();
if (a._vaadin_animationend_callbacks)
for (var b = a._vaadin_animationend_callbacks, c = 0; c < b.length; c++)
a.removeEventListener(Ls, b[c], !1);
yq(this.a, 'animate-in');
yq(this.a, 'animate-out');
WD(this.a);
}
};
_.b = !1;
C(347);
function ZD(a, b, c, d) {
this.b = a;
this.c = b;
a = c;
0 > a && (a = 0);
this.d = a;
0 > d && (d = 0);
this.a = d;
}
r(341, 1, {}, ZD);
_.a = 0;
_.b = 0;
_.c = 0;
_.d = 0;
C(341);
function ND(a) {
this.a = a;
Id.call(this);
}
r(342, 115, {}, ND);
_.ib = function (a) {
OD(this.a, a);
};
C(342);
function fE() {
fE = k;
hE = (Ll(), Ml).e || Ml.d && -1 != Nc(Rb($wnd.navigator.userAgent).toLowerCase(), 'trident');
}
function iE(a) {
fE();
var b = new Rd();
b.a = a;
return b;
}
function jE(a) {
fE();
return Error(a || '');
}
function kE(a) {
fE();
return Object(a) !== a;
}
function lE(a) {
fE();
return void 0 === a || null === a;
}
function mE(a) {
var b = nE;
fE();
b = b.lf() ? null : Za[b.j];
a.__proto__ && a.__proto__ !== b && (a.__proto__ = b, a.__reassignPending = !0);
return a;
}
function oE(a) {
fE();
if (a.__reassignPending) {
delete a.__reassignPending;
var b = a.__proto__, c;
for (c in a)
if (a.hasOwnProperty(c) && b.hasOwnProperty(c)) {
var d = a[c];
delete a[c];
a[c] = d;
}
}
}
var hE = !1;
function pE(a, b) {
var c;
io(a, 'splice', z(u(I, 1), h, 1, 5, [
G((c = H(io(a, 'indexOf', z(u(I, 1), h, 1, 5, [b]))), w(c))),
G(1)
]));
}
function qE() {
qE = k;
rE = new sE('Direction', 0, 'sort direction', (Kx(), z(u(tE, 1), h, 75, 0, [
Lx,
uE
])), 'asc', z(u(tb, 1), h, 2, 6, [
'asc',
'desc'
]));
vE = new sE('Selection', 1, 'selection mode', (wE(), z(u(xE, 1), h, 51, 0, [
yE,
zE,
AE,
BE
])), 'single', z(u(tb, 1), h, 2, 6, []));
}
function CE(a, b) {
var c, d;
for (d = a.d.Mc(); d.Xc();) {
c = d.Yc();
var e = Rb(null != b.f ? b.f : '' + b.g).toLowerCase(), f = (y(), c).toLowerCase();
if (Mc((y(), e).substr(0, f.length), f))
return c;
}
return a.a;
}
function DE(a, b) {
var c, d, e, f;
b = null == b || 0 == (y(), b).length ? a.a : (y(), b).toLowerCase();
if (!a.d.nf(b))
throw new Ub('Invalid ' + a.c + ', valid options are: ' + a.d).backingJsObject;
if (null != a.b)
for (d = a.b, e = 0, f = d.length; e < f; ++e)
if (c = d[e], Mc(CE(a, c), b))
return c;
return null;
}
function sE(a, b, c, d, e, f) {
O.call(this, a, b);
this.c = c;
this.b = d;
this.a = e;
if (0 == f.length) {
e = new Rd();
b = 0;
for (c = d.length; b < c; ++b)
a = d[b], Ud(e, Rb(null != a.f ? a.f : '' + a.g).toLowerCase());
this.d = e;
} else
this.d = new $l(f);
}
r(125, 5, {
125: 1,
3: 1,
6: 1,
5: 1
}, sE);
var rE, vE, EE = E(125, function () {
qE();
return z(u(EE, 1), h, 125, 0, [
rE,
vE
]);
});
function FE() {
var a = this.dfd = (Ll(), new Go());
!a.b && (a.b = new Jo(a));
this.a = a.b;
this['catch'] = this.fail;
}
function GE(a) {
this.a = a;
this['catch'] = this.fail;
}
r(204, 1, {}, FE, GE);
_.always = function (a) {
var b = this.a;
a = z(u(Jl, 1), h, 16, 0, [new em(a)]);
yo(b.a.d, a);
yo(b.a.c, a);
return this;
};
_.done = function (a) {
a = z(u(Jl, 1), h, 16, 0, [new em(a)]);
yo(this.a.a.d, a);
return this;
};
_.fail = function (a) {
a = z(u(Jl, 1), h, 16, 0, [new em(a)]);
yo(this.a.a.c, a);
return this;
};
_.state = function () {
return this.a.a.e;
};
_.then = function (a) {
var b;
b = this.a;
var c = z(u(Jl, 1), h, 16, 0, [new HE(a)]);
a = new Go();
var d = z(Zb(Jl), h, 16, 0, [new No(a, c, 0)]);
yo(b.a.d, d);
d = z(Zb(Jl), h, 16, 0, [new No(a, c, 1)]);
yo(b.a.c, d);
c = z(Zb(Jl), h, 16, 0, [new No(a, c, 2)]);
yo(b.a.a, c);
b = (!a.b && (a.b = new Jo(a)), a.b);
return new GE(b);
};
C(204);
function HE(a) {
this.a = a;
Il.call(this);
}
r(379, 16, qa, HE);
_.ec = function () {
return this.a(Hl(this));
};
C(379);
function Y() {
Y = k;
IE = new JE('String', 0, 'string value', '(.+)', tb, '', '');
KE = new JE('Pixel', 1, 'pixel value', '([\\d\\.]+)(px)?$', ub, null, null);
Z = new JE('Integer', 2, 'int value', '([+-]?\\d+)', Cd, G(0), G(0));
LE = new JE('Double', 3, 'double value', '([+-]?[\\d\\.]+)', ub, 0, 0);
ME = new JE('Boolean', 4, 'boolean value', '(|true|false)', vb, (B(), B(), hc), gc);
}
function NE(a, b, c, d, e) {
var f;
if (f = b)
f = (M(), b).hasAttribute(c);
b = f ? (M(), b).getAttribute(c) || '' : null;
return OE(a, b, d, e);
}
function PE(a, b, c) {
return NE(a, Hm(b, 0), c, a.a, a.b);
}
function X(a, b, c, d) {
b = lE(b) ? null : (y(), null == b ? 'null' : Ab(b));
return OE(a, b, c, d);
}
function OE(a, b, c, d) {
var e;
if (null == b || lE(b))
return d;
if (0 == Rb(Uc(b)).length)
return c;
c = a.d.exec(b);
if (!c || null == (e = c[1]))
throw new Ub('Invalid ' + a.c + '(' + b + '), valid format is ' + Cb(a.d)).backingJsObject;
try {
return a.e == tb ? e : a.e == Cd ? G(Ac(e)) : a.e == ub ? xc(e) : a.e == vb ? (B(), Wc('true', e) ? hc : gc) : e;
} catch (f) {
f = ec(f);
if (A(f, 13))
throw new Ub('Invalid ' + a.c + ', valid format is ' + Cb(a.d)).backingJsObject;
throw f.backingJsObject;
}
}
function JE(a, b, c, d, e, f, g) {
O.call(this, a, b);
this.c = c;
this.d = new RegExp('^' + d + '$', 'i');
this.e = e;
this.a = f;
this.b = g;
}
r(71, 5, {
71: 1,
3: 1,
6: 1,
5: 1
}, JE);
var ME, LE, Z, KE, IE, QE = E(71, function () {
Y();
return z(u(QE, 1), h, 71, 0, [
IE,
KE,
Z,
LE,
ME
]);
});
function RE(a, b) {
var c, d;
d = (y(), null == b ? 'null' : Ab(b));
if (kc(d, new $wnd.RegExp('^([+-]?\\d+)$'))) {
if (c = (Y(), Z), d = OE(c, d, c.a, c.b).a, 0 <= d && d <= a.b.length)
return d;
} else
for (c = 0; c < a.b.length; c++)
if (Mc(d, T(a.b, G(c)).c))
return c;
throw new F('Column not found.').backingJsObject;
}
function SE(a) {
var b;
b = nu(new Eo(a.d.n));
A(a.d.S, 138) && (b = b.Kf(1, b.od()));
return b;
}
function Sw(a) {
var b;
b = null;
A(a.d.S, 138) && (b = $C(bB(a.d.D.a, Mv(a.d, 0))));
return b;
}
function TE(a) {
var b;
if (!(b = !!a.d.q && !!a.d.q.i)) {
b = a.d;
var c = b.v;
(c = !!c.a.a.f || av(c.C) || av(c.p) || c.r || b.p || b.a.b) || (b = b.t, c = !!b.q.f || !!b.a.f);
b = c;
}
if (!(b = b || !!a.j.f)) {
var d, c = SE(a).od() != a.b.length;
if (!c)
for (b = SE(a).Mc(); b.Xc();)
d = b.Yc(), d = H(io(a.b, 'indexOf', z(Zb(I), h, 1, 5, [d.b]))), -1 == w(d) && (c = !0);
b = c;
}
return b;
}
function UE(a, b) {
return new Promise(function (a) {
this.onReady(a);
}.bind(a)).then(b);
}
function VE(a, b, c) {
0 < a.d.v.a.p && (null != c ? (a = a.d, c = (y(), c).toLocaleUpperCase(), Kw(), c = Vh((WE(), XE), c), Mw(a, b, c, (Kw(), 0))) : Mw(a.d, b, (Kw(), Lw), 0));
}
function YE(a, b) {
var c, d, e, f;
a.b = b;
c = new Rd();
for (e = SE(a).Mc(); e.Xc();)
d = e.Yc(), Ud(c, d.b);
for (d = iE(b).Mc(); d.Xc();)
if (e = d.Yc(), -1 == zo(c, e)) {
f = mE(e);
e = new ZE(f, a);
var g = a.d, l = e, m = kw(a.d).b.od();
if (l == g.R)
throw new F('The selection column many not be added manually').backingJsObject;
if (g.R && 0 == m)
throw new Lq('A column cannot be inserted before the selection column').backingJsObject;
$A(g, l, m);
g = a;
f.a = e;
f.b = g;
oE(f);
}
for (c = SE(a).Mc(); c.Xc();)
if (e = c.Yc(), d = H(io(b, 'indexOf', z(u(I, 1), h, 1, 5, [e.b]))), -1 == w(d)) {
d = a.d;
f = e;
g = e = void 0;
e = d.B;
g = d.n.a.length - 1;
A(d.S, 127) && --g;
g < e && LB(d, g);
try {
g = d;
if (f && f == g.R)
throw new F('The selection column may not be removed manually.').backingJsObject;
AB(g, f);
} catch (x) {
if (x = ec(x), A(x, 13))
LB(d, e);
else
throw x.backingJsObject;
}
}
c = SE(a).qf(Ib($E, {
651: 1,
710: 1,
3: 1,
4: 1
}, 141, 0, 0));
d = c.length;
e = new aF(b);
var n, p, v;
!e && (e = (bF(), bF(), cF));
f = d;
g = z(u(I, 1), h, 1, 5, [
G(0),
G(f)
]);
if (!(0 <= f))
throw new F(vd('%s > %s', g)).backingJsObject;
g = c.length;
f = f < g ? f : g;
sd(0, f, g);
f = (n = f - 0, p = (v = Array(d - 0), $b(v, c)), id(c, p, 0, n, !0), p);
dF(f, c, 0, d, -0, e);
0 < c.length && DB(a.d, c);
a.d.q && eF(a.d.q);
}
function fF(a, b) {
b ? Zg(Q(a.d), 'vaadin-grid-loading-data') : lh(Q(a.d), 'vaadin-grid-loading-data');
}
function Hx(a, b) {
var c, d;
if (b.c) {
c = a.c;
var e = b.b, f, g, l, m;
g = [];
g.length = 0;
f = SE(a);
for (l = new pu(e.b.Mc()); l.b.Xc();)
e = l.b.Yc(), m = (fE(), {}), m.column = f.Ef(e.a), m.direction = CE((qE(), rE), e.b), io(g, 'push', z(Zb(I), h, 1, 5, [m]));
c && km(c, 'sortOrder', g);
}
a.d.S.le();
(c = a.d.q) && (d = c.e, c.md(d.b, d.a - d.b, new gF(c, d)));
}
function hF(a, b) {
var c;
if (fE(), hE) {
c = new FE();
var d = fb(iF.prototype._e, new iF(c, b));
Tg((Ig(), new jF(a, d)));
return c;
}
return UE(a, b);
}
function kF(a, b) {
var c;
if (a.c) {
c = $doc;
c = (M(), N).vb(c, b);
var d = a.c;
(M(), N).wb(d, c);
}
}
function lF(a) {
var b, c;
a.updating || (dy(a.d.v, '100%'), 0 == (a.c.clientHeight | 0) && (0 < a.n ? mF(a.d, a.n) : (b = a.d.q) ? mF(a.d, Nb((c = T(b.c.c, 'size'), X((Y(), Z), c, G(0), G(0)).a), 10)) : mF(a.d, 0)), a.e && 0 < (a.e.clientHeight | 0) ? a.e.style.height = '' : a.e.style.height = (Fj(), '1.0px'));
}
function nF(a) {
var b, c, d, e, f, g, l;
if (b = Sw(a))
vm(wm(Wl(b))), a = a.d.S, Sm(Om(Wl(b), z(u(tb, 1), h, 2, 6, ['input'])), 'indeterminate', (B(), 0 < (a.d ? (d = T(a.b.q.c.c, 'size'), X((Y(), Z), d, G(0), G(0)).a - a.c.length) : a.c.length) && (a.d ? (e = T(a.b.q.c.c, 'size'), X((Y(), Z), e, G(0), G(0)).a - a.c.length) : a.c.length) != (f = T(a.b.q.c.c, 'size'), X((Y(), Z), f, G(0), G(0)).a) ? hc : gc)), nr(b, 0 < (a.d ? (g = T(a.b.q.c.c, 'size'), X((Y(), Z), g, G(0), G(0)).a - a.c.length) : a.c.length) && (a.d ? (l = T(a.b.q.c.c, 'size'), X((Y(), Z), l, G(0), G(0)).a - a.c.length) : a.c.length) == (c = T(a.b.q.c.c, 'size'), X((Y(), Z), c, G(0), G(0)).a) ? hc : gc, !1);
}
function oF(a) {
iy(a.d.v, '100%');
Lg((Ig(), Jg), new pF(a));
}
function qF() {
this.j = new rF(this);
this.d = new sF();
MB(this.d, new tF());
Iq(this.d, this, (ix(), ix(), jx));
Iq(this.d, this, (Ex(), Ex(), Fx));
Iq(this.d, this, (Pw(), Pw(), Qw));
Iq(this.d, this, (uF(), vF));
Q(this.d).style.height = (Fj(), '0.0px');
YE(this, (fE(), []));
this.k = new wF(this);
QB(this.d, 'vaadin-grid style-scope vaadin-grid');
}
r(667, 1, {
15: 1,
712: 1,
700: 1,
711: 1,
713: 1
}, qF);
_.addColumn = function (a, b) {
var c;
c = this.b.length;
null != b && (c = RE(this, b));
c = z(Zb(I), h, 1, 5, [
G(c),
G(0),
a
]);
jo(this.b, 'splice', xm([], c));
YE(this, this.b);
return a;
};
_.getCellClassGenerator = Hc;
_.getColumns = xF;
_.getContainer = tk;
_.getDataSource = function () {
return this.d.q;
};
_.getFrozenColumns = function () {
return this.d.B;
};
_.getGrid = yF;
_.getGridElement = function () {
return Q(this.d);
};
_.getItem = function (a, b, c) {
zF(this.d.q, a, b, c);
};
_.getRowClassGenerator = jk;
_.getRowDetailsGenerator = jz;
_.getScrollTop = function () {
return this.d.v.C.k;
};
_.getSelectionMode = function () {
return Rb(Uh(this.d.S.getMode())).toLowerCase();
};
_.getSelectionModel = function () {
return this.d.S;
};
_.getStaticSection = ux;
_.getVisibleRows = function () {
return this.n;
};
_.init = function (a, b, c) {
this.c || (this.c = a, this.e = c, a = Q(this.d), b.appendChild(a), ep(this.d, null));
this.updating = !1;
Qg((Ig(), Jg), new AF(this));
};
_.isDisabled = function () {
return !this.d.u;
};
_.isWorkPending = function () {
return TE(this);
};
_.onReady = function (a) {
Tg((Ig(), new jF(this, a)));
};
_.pe = function () {
nF(this);
this.updating || kF(this, 'selected-items-changed');
};
_.removeColumn = function (a) {
pE(this.b, T(this.b, G(RE(this, a))));
YE(this, this.b);
};
_.scrollToEnd = function () {
VE(this, this.d.v.a.p - 1, 'end');
};
_.scrollToRow = function (a, b) {
VE(this, a, b);
};
_.scrollToStart = function () {
if (0 < this.d.v.a.p) {
var a = (Kw(), Vh((WE(), XE), 'START'));
Mw(this.d, 0, a, (Kw(), 0));
}
};
_.setBodyHeight = function (a) {
gz(this.d.v.a, a);
};
_.setCellClassGenerator = function (a) {
var b = this.d, c = lE(a) ? null : new BF(this, a);
b.g = c;
Tt(b.v.a, 0, b.v.a.p);
this.a = a;
};
_.setColumns = function (a) {
YE(this, a);
};
_.setDataSource = function (a) {
if (A(this.d.q, 154)) {
var b = this.d.q;
sb(b.b) !== sb(a) && (b.b = a, a = b.e, CF(b, a.b, a.a - a.b, new gF(b, a)), b.c.d.S.le());
} else
IB(this.d, new DF(a, this));
lF(this);
};
_.setDisabled = function (a) {
var b = this.d;
a = !a;
if (a != b.u) {
b.u = a;
(S(), b.ab).tabIndex = a ? 0 : -1;
var c = b.T;
!a && c.f && c.f.w && Ak(c.f, !1);
c = c.d;
(S(), c.ab).disabled = !a;
fy(b.v, (sv(), tv), !a);
fy(b.v, vv, !a);
}
};
_.setFooterHeight = function (a) {
gz(this.d.v.f, a);
};
_.setFrozenColumns = function (a) {
LB(this.d, X((Y(), Z), G(a), G(0), G(0)).a);
};
_.setHeaderHeight = function (a) {
gz(this.d.v.j, a);
};
_.setHeight = function (a) {
dy(this.d.v, a);
};
_.setLightDomTable = function (a) {
var b, c;
new EF(a, this);
c = this.d.q;
!c && (c = (b = new FF(a, this), b));
c && (IB(this.d, c), this.d.S.le());
};
_.setRowClassGenerator = function (a) {
var b = this.d, c = lE(a) ? null : new GF(this, a);
b.P = c;
Tt(b.v.a, 0, b.v.a.p);
this.g = a;
};
_.setRowDetailsGenerator = function (a) {
var b = this.d, c = lE(a) ? (fw(), gw) : new HF(a), d, e, f;
if (!c)
throw new F('Details generator may not be null').backingJsObject;
for (f = (e = new Lm(b.W.a).a.uf().Mc(), new Mm(e)); f.a.Xc();)
e = (d = f.a.Yc(), d.Nf()), Lt(b, e.a, !1);
b.r = c;
QA(b.v.a.b, b.C);
this.i = a;
};
_.setRowDetailsVisible = function (a, b) {
hF(this, fb(IF.prototype._e, new IF(this, a, b)));
};
_.setSelectionMode = function (a) {
a = DE((qE(), vE), a);
this.d.S.getMode() != a && (this.d.S.supportsMode(a) ? (this.d.S.setMode(a), this.d.S.le()) : (MB(this.d, a.df()), iy(this.d.v, '100%'), Lg((Ig(), Jg), new pF(this)), kF(this, 'selection-mode-changed'), nF(this)));
};
_.setSortOrder = function (a) {
var b, c, d, e, f;
f = new Rd();
b = SE(this);
for (e = iE(a).Mc(); e.Xc();)
d = e.Yc(), a = b.Df(d.column), c = DE((qE(), rE), d.direction), d.direction = CE(rE, c), Ud(f, new Jx(a, c));
b = this.d;
f != b.U && (b.U.a = Ib(I, h, 1, 0, 5), FB(b.U, f));
yB(b.v.j, b.D);
Jq(b, new Gx(b, nu(b.U), !1));
};
_.setVisibleRows = function (a) {
this.n = X((Y(), Z), G(a), G(-1), G(-1)).a;
lF(this);
};
_.sizeChanged = function (a, b) {
var c;
if ((c = this.d.q) && 0 < b)
if (b < a) {
var d = a - b, e, f, g, l;
c.r += d;
if (b <= c.e.b)
for (g = c.e, c.e = NB(c.e, d), e = 1; e <= zt(c.e); e++)
l = g.a - e, f = c.e.a - e, Ht(c, l, f);
else if (Dx(c.e, b))
for (f = c.e.a, c.e = JF(c.e, b)[0], e = b; e < f; e++)
g = gl(c.k, G(e)), gl(c.n, g);
c.j && (e = c.j, Mt(e.a.v.a, b, d), d = V(b, d), Nt(e.a.c, d));
Bt(c);
} else if (b > a)
for (d = b - a; 0 < d;) {
g = 10 > d ? d : 10;
d -= g;
e = c;
f = a + d;
var m = l = void 0, n = l = void 0, n = void 0;
e.r -= g;
n = V(f, g);
tt(e, n);
for (l = be(f + g, e.e.b); l < e.e.a; l++)
Ht(e, l, l - g);
xt(e.e, n) ? e.e = V(0, 0) : rt(n, e.e) ? (m = At(e.e, n), l = m[0], n = NB(m[2], -(n.a - n.b)), e.e = Vt(l, n)) : n.a <= e.e.b && (e.e = NB(e.e, -(n.a - n.b)));
e.j && (l = e.j, n = void 0, Ot(l.a.v.a, f, g), n = V(f, g), Pt(l.a.c, n));
Bt(e);
}
0 == a ? Jq(this.d, new Rt(null)) : 0 == b && c && IB(this.d, c);
lF(this);
};
_.sort = function (a) {
Hx(this, a);
};
_.then = function (a) {
return hF(this, a);
};
_.updateSize = function () {
Vd(this.j, 50);
};
_.f = !1;
_.updating = !0;
_.n = -1;
C(667);
function rF(a) {
this.a = a;
}
r(250, 50, {}, rF);
_.nb = function () {
var a;
if (a = !this.a.f)
a = this.a, a = !!a.e && 0 < (a.e.clientHeight | 0);
a && (Zx(this.a.d.v), hF(this.a, fb(KF.prototype._e, new KF(this))), this.a.f = !0);
oF(this.a);
lF(this.a);
};
C(250);
function KF(a) {
this.a = a;
}
r(251, $wnd.Function, {}, KF);
gb();
_._e = function () {
return Zx(this.a.a.d.v), null;
};
C(251);
function jF(a, b) {
this.a = a;
this.b = b;
}
r(256, 1, {}, jF);
_.sb = function () {
return TE(this.a) ? !0 : (this.b(null), !1);
};
C(256);
function LF(a) {
vq();
this.ab = (S(), a);
}
r(258, 114, Ca, LF);
C(258);
function AF(a) {
this.a = a;
}
r(252, 1, {}, AF);
_.tb = function () {
lF(this.a);
};
C(252);
function aF(a) {
this.a = a;
}
r(253, 1, {}, aF);
_.bb = Db;
_.bf = function (a, b) {
var c = this.a, d, e;
return e = H(io(c, 'indexOf', z(Zb(I), h, 1, 5, [a.b]))), w(e) > (d = H(io(c, 'indexOf', z(Zb(I), h, 1, 5, [b.b]))), w(d)) ? 1 : -1;
};
C(253);
function GF(a, b) {
this.a = a;
this.b = b;
}
r(254, 1, ea, GF);
C(254);
function BF(a, b) {
this.a = a;
this.b = b;
}
r(255, 1, {}, BF);
C(255);
function pF(a) {
this.a = a;
}
r(186, 1, {}, pF);
_.tb = function () {
dB(this.a.d.a);
};
C(186);
function iF(a, b) {
this.b = a;
this.a = b;
}
r(257, $wnd.Function, {}, iF);
gb();
_._e = function () {
var a = this.b, b = this.a;
try {
var c = a.dfd, d = z(Zb(I), h, 1, 5, [b(null)]);
'pending' == c.e && Do(c.d, d);
} catch (e) {
if (e = ec(e), A(e, 100))
b = e, a = a.dfd, b = z(Zb(I), h, 1, 5, [b.rb()]), 'pending' == a.e && Do(a.c, b);
else
throw e.backingJsObject;
}
return null;
};
C(257);
function HF(a) {
this.a = a;
}
r(259, 1, {}, HF);
_.de = function (a) {
var b;
return b = this.a(a), lE(b) ? null : new LF(b);
};
C(259);
function IF(a, b, c) {
this.a = a;
this.b = b;
this.c = c;
}
r(260, $wnd.Function, {}, IF);
gb();
_._e = function () {
var a = this.a, b = this.b, c = this.c, b = X((Y(), Z), G(b), null, null), c = X(ME, c, (B(), B(), hc), hc);
(fw(), gw) != a.d.r && b && Lt(a.d, b.a, yb((t(c), c)));
return null;
};
_.b = 0;
C(260);
function MF() {
}
r(247, 1, {}, MF);
_.tb = function () {
fp();
Dq(hs(), Qs((Ps(), !U && (U = new Rs()), Ps(), U)));
};
C(247);
function NF(a, b) {
A(b, 142) ? a.Re() : a.Qe();
}
function mF(a, b) {
dy(a.v, a.v.j.i * (a.D.e ? a.D.d.a.length : 0) + a.v.a.i * b + a.v.f.i * (a.A.e ? a.A.d.a.length : 0) + 'px');
}
function sF() {
var a, b, c;
vq();
this.w = new nw(this);
this.G = new Hw(this, this.w);
this.H = new Ow(this, this.w);
new Nw(this, this.w);
this.i = new Dw(this, this.w);
new Ew(this, this.w);
this.v = new jy();
this.D = new mD();
this.A = new SC();
this.T = new DD(this);
this.n = new Rd();
this.o = V(0, 0);
this.U = new Rd();
this.V = new UD(this);
this.t = new JC();
this.a = new iC(this);
this.r = (fw(), gw);
this.C = new hD(this);
this.W = new Yk();
this.j = new IC(this);
this.s = new du();
this.b = new Qv(this);
this.F = new ZB(this);
this.M = new ow(this);
this.f = new cw(this.M);
this.I = new pw(this.M);
rr(this, this.v);
(S(), this.ab).tabIndex = 0;
this.c = new rC(this);
QB(this, 'v-grid');
hz(this.v.j, new SD(this, this.D, this.v.j));
hz(this.v.a, new mC(this));
hz(this.v.f, new SD(this, this.A, this.v.f));
this.D.c = this;
a = this.D;
a = QC(a, a.d.a.length);
jD(this.D, a);
this.A.c = this;
this.t.j = this;
MB((uD(), this), new zx());
QA(this.v.a.b, this.C);
Iq(this.v, new dC(this), (Uu(), Vu));
Iq(this.v, new eC(this), (Qu(), Ru));
Iq(this, new fC(this), (ix(), ix(), jx));
fB(this, new $l(z(u(tb, 1), h, 2, 6, [
'touchstart',
'touchmove',
'touchend',
'touchcancel',
'click'
])));
fB(this, new $l(z(u(tb, 1), h, 2, 6, 'keydown keyup keypress dblclick mousedown click'.split(' '))));
Bx(this, new gC(this));
Iw(this, new hC(this));
(Ps(), !U && (U = new Rs()), Ps(), U).a.c && (a = yh(), a.style.position = 'absolute', a.style.marginLeft = '-5000px', (fp(), $doc.body).appendChild(a), b = a.contentWindow.document, c = (M(), b).createElement('div'), c.style.width = '50px', c.style.height = '50px', c.style.overflow = 'scroll', b.body.appendChild(c), b = ((c.offsetWidth || 0) | 0) - (parseInt(c.clientWidth) | 0), $doc.body.removeChild(a), $s(), et = b);
if (0 == dt())
if ((!U && (U = new Rs()), U).a.o) {
a = Bm((Ll(), Xl('.vaadin-grid-scroller', this.ab)), 'position', 'relative');
b = Xl('<div style=\'position: absolute; z-index: 10\' />', Pl);
var d, e, f;
c = a.c;
e = 0;
for (f = c.length; e < f; ++e) {
d = c[e];
d = Wl(d);
var g = b, l = void 0, m = void 0, n = void 0, p = void 0, l = void 0;
if (0 != d.c.length) {
for (var v = l = p = n = m = void 0, m = void 0, v = [], n = g.c, p = 0, l = n.length; p < l; ++p)
m = n[p], bm(v, m.cloneNode(!0));
m = new cm(v);
m.a = g.a;
m.b = g.b;
if (Hm(d, 0).parentNode)
for (g = Wl(Hm(d, 0)), v = l = p = n = void 0, p = m.c, l = 0, v = p.length; l < v; ++l)
n = p[l], Gm(g, Wl(n), 2);
m = m.c;
n = 0;
for (p = m.length; n < p; ++n) {
for (l = m[n]; l.firstChild && 1 == l.firstChild.nodeType;)
l = l.firstChild;
Gm(Wl(l), d, 1);
}
}
}
Bm(Qm(Am(a, z(u(tb, 1), h, 2, 6, ['.vaadin-grid-scroller-vertical']))), 'right', '0');
Bm(Qm(Am(a, z(u(tb, 1), h, 2, 6, ['.vaadin-grid-scroller-horizontal']))), 'bottom', '0');
} else if ((!U && (U = new Rs()), U).a.c)
if (a = (Ll(), Xl('.vaadin-grid-scroller', this.ab)), b = (!bn && (bn = new An()), a), a = Wc('type', 'invisible') ? (Fn(), !In && (In = new Hn()), Fn(), In) : zn.test('invisible') ? (!En && (En = new Dn()), En) : (!Cn && (Cn = new Bn()), Cn), a.hc(''))
for (b = (!(Ll(), bn) && (bn = new An()), b).c, c = 0, e = b.length; c < e; ++c)
a = b[c], 1 == a.nodeType && (fm(a, 'invisible') && (zn.test('invisible') ? a.invisible = !1 : a.invisible = null), a.removeAttribute('invisible'));
else
for (c = b.c, e = 0, f = c.length; e < f; ++e)
b = c[e], d = b.nodeType, 3 != d && 8 != d && 2 != d && a.ic(b, 'invisible', '');
}
r(265, 264, La, sF);
_.Pe = SB;
_.nc = function (a) {
var b, c, d;
d = (M(), N).Ab(a);
if (d != (S(), this.ab))
if ('mousedown' === a.type && (fE(), hE) && (b = Rb(d.tagName).toLowerCase(), d.disabled || !(d.hasAttribute('tabindex') || kc(b, new $wnd.RegExp('^(button|input|select|textarea|object|iframe|label)$')) || kc(b, new $wnd.RegExp('^(a|area)$')) && d.hasAttribute('href'))))
d = Rm((c = Wl(d), c)), c = new OF(), c = eo((!sm && (sm = new tm()), d.d), c), c = Nm(d, c, d.b), c = Wl(Hm(c, -1)), Sm(c, 'disabled', (B(), B(), hc)), Lg((Ig(), Jg), new PF(c));
else if ('click' === a.type && (c = ct(), c != this.ab)) {
if (b = A(this.S, 128))
d = d.parentNode, b = this.ab, fE(), b = b.querySelector('.vaadin-grid-select-all-checkbox'), b = d == b;
if (b)
this.ab.focus();
else if (Wg(this.ab, c))
return;
}
sB(this, a);
};
C(265);
function OF() {
}
r(270, 67, sa, OF);
_.gc = function (a) {
var b;
return this.a = this.a && (b = Rb((M(), a).tagName).toLowerCase(), !(!a.disabled && (a.hasAttribute('tabindex') || kc(b, new $wnd.RegExp('^(button|input|select|textarea|object|iframe|label)$')) || kc(b, new $wnd.RegExp('^(a|area)$')) && a.hasAttribute('href'))));
};
_.a = !0;
C(270);
function GD() {
Bq();
var a = (S(), wh());
this.ab = (S(), a);
this.n = new bs();
this.p = !1;
this.r = -1;
this.v = new ks(this);
this.A = -1;
a = Cq.bd();
this.ab.appendChild(a);
this.Wc(0, 0);
Cq.dd(rp(this.ab)).className = 'gwt-PopupPanel';
Cq.cd(eh(this.ab)).className = 'popupContent';
this.d = new Rd();
this.c = !1;
a = eE;
(S(), this.ab).style.zIndex = a + '';
}
r(268, 267, Oa, GD);
C(268);
function PF(a) {
this.a = a;
}
r(269, 1, {}, PF);
_.tb = function () {
vq();
Sm(this.a, 'disabled', (B(), B(), gc));
};
C(269);
function pC(a, b) {
this.a = a;
this.b = new QF(this.a, b);
this.grid = b;
}
r(216, 1, {}, pC);
q({
columnName: {
get: function () {
return this.a.b.b.c;
}
}
});
q({
data: {
get: function () {
return this.a.b.Ve(this.a.e.c);
}
}
});
q({
element: {
get: function () {
return this.a.be();
}
}
});
q({ index: { get: qw } });
q({ row: { get: xF } });
C(216);
function RF(a, b) {
if (a.a.p != b) {
var c = a.a, d = lE(b) ? -1 : b, e;
e = c.q;
if (0 <= d && d < e && 0 <= e)
throw new F('New maximum width (' + d + ') was less than minimum width (' + e + ')').backingJsObject;
c.p != d && (c.p = d, c.i && dB(c.i.a));
oF(a.b);
}
}
function SF(a, b) {
if (a.a.q != b) {
var c = a.a, d = lE(b) ? 10 : b, e;
e = c.p;
if (0 <= d && d > e && 0 <= e)
throw new F('New minimum width (' + d + ') was greater than maximum width (' + e + ')').backingJsObject;
c.q != d && (c.q = d, c.i && dB(c.i.a));
oF(a.b);
}
}
function TF(a, b) {
a.a.t != b && (CC(a.a, lE(b) ? -1 : b), oF(a.b));
}
function UF() {
}
r(196, 1, { 196: 1 }, UF);
_.configure = function (a, b) {
this.a = b;
this.b = a;
oE(this);
};
q({
flex: {
get: function () {
return this.a.g;
}
}
});
q({
hidable: {
get: function () {
return this.a.k;
}
}
});
q({
hidden: {
get: function () {
return this.a.n;
}
}
});
q({
hidingToggleText: {
get: function () {
return this.a.o;
}
}
});
q({
maxWidth: {
get: function () {
return this.a.p;
}
}
});
q({
minWidth: {
get: function () {
return this.a.q;
}
}
});
q({ name: { get: tk } });
q({
readonly: {
get: function () {
return !this.a.f;
}
}
});
q({ renderer: { get: yF } });
q({
sortable: {
get: function () {
return this.a.s;
}
}
});
q({
width: {
get: function () {
return this.a.t;
}
}
});
q({
flex: {
set: function (a) {
sC(this.a, a);
}
}
});
q({
hidable: {
set: function (a) {
xC(this.a, a);
}
}
});
q({
hidden: {
set: function (a) {
yC(this.a, a);
oF(this.b);
}
}
});
q({
hidingToggleText: {
set: function (a) {
var b = this.a;
b.o = null == a ? null : a;
b.k && wC(b.i.j, b);
}
}
});
q({
maxWidth: {
set: function (a) {
RF(this, a);
}
}
});
q({
minWidth: {
set: function (a) {
SF(this, a);
}
}
});
q({
name: {
set: function (a) {
this.c = a;
VF(this.a);
}
}
});
q({
readonly: {
set: function (a) {
this.a.f = !a;
}
}
});
q({
renderer: {
set: function (a) {
this.d = a;
AC(this.a, new WF(this));
}
}
});
q({
sortable: {
set: function (a) {
BC(this.a, a);
}
}
});
q({
width: {
set: function (a) {
TF(this, a);
}
}
});
var nE = C(196);
function WF(a) {
this.a = a;
}
r(356, 1, {}, WF);
_.wd = function (a) {
var b = this.a;
b.d(new pC(a, b.b.c));
};
C(356);
function QF(a, b) {
this.b = null;
this.a = a;
this.grid = b;
}
function nC(a, b) {
this.b = a;
this.a = null;
this.grid = b;
}
r(218, 1, {}, QF, nC);
q({
data: {
get: function () {
return XF(this.a ? this.a.e.c : this.b.c);
}
}
});
q({
element: {
get: function () {
return this.a ? Ug(this.a.be()) : this.b.a;
}
}
});
q({
index: {
get: function () {
return this.a ? this.a.e.d : this.b.d;
}
}
});
C(218);
function YF(a, b) {
bD(a.a, b);
oF(a.c);
NF(a.c.d, a.a);
}
function ZF(a, b) {
var c;
a.b = b;
var d, e, f;
e = null;
for (d = SE(a.c).Mc(); d.Xc();)
if (c = d.Yc(), f = c.a.k, $F(f, aG(f), c) == a) {
e = c;
break;
}
c = e;
if (null == b) {
var g, l;
if (c) {
g = c.b.c;
g = Qc(null != g ? g : '', '.*\\.', '');
g = Oc(g, '[_+,;:-]', ' ');
f = new Or();
for (e = 0; e < (y(), g).length; e++)
d = g.charCodeAt(e), jc(Rb($wnd.String.fromCharCode(d)).toLocaleUpperCase(), 0) == d && kc($wnd.String.fromCharCode(d), /[A-Z]/i) && 0 != e && (!ic(g.charCodeAt(e - 1)) || e + 1 < g.length && !ic(g.charCodeAt(e + 1))) && (f.a += ' '), f.a += String.fromCharCode(d);
g = Rc(f.a, ' ');
for (d = 0; d < g.length; d++) {
e = g;
f = d;
var m = g[d];
if (null == m)
m = null;
else if (1 >= (y(), m).length)
m = m.toLocaleUpperCase();
else
var n = m.substr(0, 1), m = ((bG(), cG) == (bG(), bG(), dG) ? (y(), n).toLocaleUpperCase() : (y(), n).toUpperCase()) + ('' + m.substr(1, m.length - 1));
e[f] = m;
}
d = new Or();
for (e = 0; e < g.length; e++)
d.a += '' + g[e], d.a += ' ';
g = Rb(d.a).length - (y(), ' ').length;
g = Sc(d.a, 0, g);
uC(c, g);
cD(a.a, (l = Oc(Oc(g, '\\\\', '\\\\\\\\'), '\\$', '\\\\$'), Oc('<span style=\'overflow: hidden;text-overflow: ellipsis;\'>%CONTENT%</span>', '%CONTENT%', l)));
} else
cD(a.a, null);
} else
kE(b) || A(b, 83) ? (l = (y(), null == b ? 'null' : Ab(b)), c && uC(c, l), cD(a.a, (g = Oc(Oc(l, '\\\\', '\\\\\\\\'), '\\$', '\\\\$'), Oc('<span style=\'overflow: hidden;text-overflow: ellipsis;\'>%CONTENT%</span>', '%CONTENT%', g)))) : Zl(b) && (c && (l = c.b.c, null != l ? uC(c, l) : uC(c, (y(), b ? Cb(b) : 'null'))), dD(a.a, new eG(b)));
oF(a.c);
NF(a.c.d, a.a);
}
function fG(a, b) {
this.c = b;
this.a = a;
this.b = this.a.e == (WC(), XC) ? VC(this.a) : this.a.e == aD ? Q($C(this.a)) : Mc('', YC(this.a)) ? null : YC(this.a);
}
r(84, 1, { 84: 1 }, fG);
q({
className: {
get: function () {
return this.a.d;
}
}
});
q({
colspan: {
get: function () {
return this.a.a;
}
}
});
q({ content: { get: xF } });
q({
className: {
set: function (a) {
var b = this.a;
b.d = a;
b.c.Ze();
oF(this.c);
NF(this.c.d, this.a);
}
}
});
q({
colspan: {
set: function (a) {
YF(this, a);
}
}
});
q({
content: {
set: function (a) {
ZF(this, a);
}
}
});
C(84);
function eG(a) {
vq();
this.ab = (S(), a);
}
r(361, 114, Ca, eG);
C(361);
function gG(a) {
this.a = a;
}
r(156, 1, { 156: 1 }, gG);
C(156);
function zF(a, b, c, d) {
var e;
b = X((Y(), Z), b, G(-1), G(-1));
0 <= b.a && b.a < (e = T(a.c.c, 'size'), X(Z, e, G(0), G(0)).a) ? (e = Et(a, b.a), null != e ? c(null, XF(e)) : d ? c(jE('Unable to retrieve row #' + b + ', it has not been cached yet'), null) : (d = b.a, d = new qt(d, d + 1), a.md(d.b, d.a - d.b, new hG(a, d, c)))) : c(jE('Index value #' + b + ' is out of range'), null);
}
function eF(a) {
var b;
b = a.e;
a.md(b.b, b.a - b.b, new gF(a, b));
}
function iG(a, b) {
Jt(a, b);
a.c.d.S.dataSizeUpdated(b);
}
function jG(a, b) {
var c = a.c.c, d = G(b);
c && km(c, 'size', d);
}
function kG(a) {
this.q = new qt(0, 0);
this.e = new qt(0, 0);
this.k = new zg();
this.n = new zg();
this.d = new Zt();
this.g = new Xt(this);
this.o = new zg();
this.p = new zg();
this.c = a;
}
function XF(a) {
return A(a, 156) ? a.a : a;
}
r(209, 432, {}, kG);
_.getItem = function (a, b, c) {
zF(this, a, b, c);
};
_.getRowKey = Bs;
_.ld = function (a) {
return this.getRowKey(a);
};
_.cf = function () {
var a;
iG(this, (a = T(this.c.c, 'size'), X((Y(), Z), a, G(0), G(0)).a));
this.c.d.S.le();
};
_.refreshItems = function () {
eF(this);
};
_.nd = function (a) {
iG(this, a);
};
_.size = function () {
var a;
return a = T(this.c.c, 'size'), X((Y(), Z), a, G(0), G(0)).a;
};
_.od = function () {
return this.size();
};
C(209);
function gF(a, b) {
Ft.call(this, a, b);
}
r(118, 147, {}, gF);
C(118);
function hG(a, b, c) {
this.a = c;
Ft.call(this, a, b);
}
r(362, 147, {}, hG);
_.pd = function (a) {
this.a(null, a.Df(0));
};
C(362);
function FF(a, b) {
kG.call(this, b);
this.a = a;
jG(this, ((!this.b || 0 == this.b.c.length) && (this.b = zm(zm(Wl(this.a), z(u(tb, 1), h, 2, 6, ['tbody'])), z(u(tb, 1), h, 2, 6, ['tr:not([template])']))), this.b).c.length);
}
r(152, 209, { 152: 1 }, FF);
_.cf = function () {
var a;
this.b = null;
jG(this, ((!this.b || 0 == this.b.c.length) && (this.b = zm(zm(Wl(this.a), z(u(tb, 1), h, 2, 6, ['tbody'])), z(u(tb, 1), h, 2, 6, ['tr:not([template])']))), this.b).c.length);
iG(this, (a = T(this.c.c, 'size'), X((Y(), Z), a, G(0), G(0)).a));
this.c.d.S.le();
};
_.md = function (a, b) {
var c, d, e, f, g, l, m, n, p;
g = new Rd();
l = Tm(Tm(((!this.b || 0 == this.b.c.length) && (this.b = zm(zm(Wl(this.a), z(u(tb, 1), h, 2, 6, ['tbody'])), z(u(tb, 1), h, 2, 6, ['tr:not([template])']))), this.b), a - 1 + 1, -1), 0, b).c;
m = 0;
for (n = l.length; m < n; ++m) {
d = l[m];
p = [];
d = zm(Wl(d), z(u(tb, 1), h, 2, 6, ['td'])).c;
e = 0;
for (f = d.length; e < f; ++e)
c = d[e], c = Pm(Wl(c)), p[p.length] = c;
g.a[g.a.length] = p;
}
Ut(this, a, g);
};
C(152);
function lG(a, b, c) {
2 > c && (c = w(a.c.d.v.n));
a.q = V(b, c);
Bt(a);
}
function CF(a, b, c, d) {
var e;
e = (fE(), {});
e.index = b;
e.count = c;
e.sortOrder = T(a.c.c, 'sortOrder');
fF(a.c, !0);
a.b(e, fb(mG.prototype.af, new mG(a, d)));
}
function DF(a, b) {
kG.call(this, b);
this.b = a;
lG(this, 0, 0);
var c = new nG();
this.d != c && (this.d = c, nt(this));
hF(b, fb(oG.prototype._e, new oG(this)));
}
r(154, 209, { 154: 1 }, DF);
_.kd = function (a, b) {
lG(this, a, b);
};
_.md = function (a, b, c) {
CF(this, a, b, c);
};
_.a = !1;
C(154);
function nG() {
Zt.call(this);
}
r(466, 155, {}, nG);
_.qd = function (a, b, c) {
var d;
d = (a.a - a.b) * this.a;
return pt(new qt(a.b - (a.b > b.a ? d : be(d, a.b - b.b)), a.a + (a.a < b.b ? d : be(d, b.a - a.a))), c);
};
C(466);
function oG(a) {
this.a = a;
}
r(467, $wnd.Function, {}, oG);
gb();
_._e = function () {
var a = this.a, b, c;
c = T(a.c.c, 'size');
0 == X((Y(), Z), c, G(0), G(0)).a && (b = a.e, CF(a, b.b, b.a - b.b, new gF(a, b)));
return null;
};
C(467);
function mG(a, b) {
this.a = a;
this.b = b;
}
r(468, $wnd.Function, {}, mG);
gb();
_.af = function (a, b) {
var c = this.a, d = this.b, e, f, g;
f = iE(a);
for (e = 0; e < f.od(); e++)
kE(f.Df(e)) && f.Jf(e, new gG(f.Df(e)));
null != b && jG(c, w((t(b), b)));
d && d.pd(f, (g = T(c.c.c, 'size'), X((Y(), Z), g, G(0), G(0)).a));
fF(c.c, !1);
c.a || f.of() || (c.a = !0, oF(c.c));
};
C(468);
function wE() {
wE = k;
yE = new pG();
zE = new qG();
AE = new rG();
BE = new sG();
}
r(51, 5, Pa);
var AE, BE, zE, yE, xE = E(51, function () {
wE();
return z(u(xE, 1), h, 51, 0, [
yE,
zE,
AE,
BE
]);
});
function pG() {
O.call(this, 'SINGLE', 0);
}
r(469, 51, Pa, pG);
_.df = function () {
return new tF();
};
E(469, null);
function qG() {
O.call(this, 'MULTI', 1);
}
r(470, 51, Pa, qG);
_.df = function () {
return new tG(!1);
};
E(470, null);
function rG() {
O.call(this, 'ALL', 2);
}
r(471, 51, Pa, rG);
_.df = function () {
return new tG(!0);
};
E(471, null);
function sG() {
O.call(this, 'DISABLED', 3);
}
r(472, 51, Pa, sG);
_.df = function () {
return new uG();
};
E(472, null);
function uG() {
}
r(559, 697, { 656: 1 }, uG);
_.clear = Qq;
_.dataSizeUpdated = au;
_.deselect = dn;
_.deselected = vG;
_.getMode = function () {
return wE(), BE;
};
_.select = dn;
_.selectAll = Qq;
_.selected = vG;
_.setMode = au;
_.size = pD;
_.supportsMode = function (a) {
return a == (wE(), BE);
};
C(559);
function wG(a, b, c) {
var d, e, f, g, l, m;
return 0 <= b && (!a.a || b < (e = T(a.b.q.c.c, 'size'), X((Y(), Z), e, G(0), G(0)).a)) && (m = H(io(a.c, 'indexOf', z(u(I, 1), h, 1, 5, [b]))), -1 == w(m)) ? (io(a.c, 'push', z(u(I, 1), h, 1, 5, [b])), (c = yb(H(X((Y(), ME), (B(), c ? hc : gc), gc, gc)))) || Jq(a.b, new lx(a.b, null, null)), a.d && 0 == (a.d ? (f = T(a.b.q.c.c, 'size'), X(Z, f, G(0), G(0)).a - a.c.length) : a.c.length) ? (xG(a, (wE(), zE)), a.c.length = 0, Jq(a.b, new lx(a.b, null, null)), !1) : !a.d && 0 < (a.d ? (g = T(a.b.q.c.c, 'size'), X(Z, g, G(0), G(0)).a - a.c.length) : a.c.length) && (a.d ? (l = T(a.b.q.c.c, 'size'), X(Z, l, G(0), G(0)).a - a.c.length) : a.c.length) == (d = T(a.b.q.c.c, 'size'), X(Z, d, G(0), G(0)).a) ? (xG(a, (wE(), AE)), a.c.length = 0, Jq(a.b, new lx(a.b, null, null)), !1) : !0) : !1;
}
function yG(a, b, c) {
return a.d ? wG(a, b, c) : zG(a, b, c);
}
function AG(a, b, c, d) {
var e, f;
f = (fE(), []);
c = X((Y(), Z), c, G(0), G(0)).a;
c = Nb(c, a.c.length - 1);
e = a.c.length - 1;
d = X(Z, d, G(e), G(e)).a;
for (d = Nb(d, a.c.length - 1); c <= d; c++)
e = T(a.c, G(c)), null != e && (e = null == b ? e : b(G(w((t(e), e)))), null != e && io(f, 'push', z(u(I, 1), h, 1, 5, [e])));
return f;
}
function zG(a, b, c) {
var d;
d = H(io(a.c, 'indexOf', z(u(I, 1), h, 1, 5, [b])));
return -1 != w(d) ? (pE(a.c, b), (c = yb(H(X((Y(), ME), (B(), c ? hc : gc), gc, gc)))) || Jq(a.b, new lx(a.b, null, null)), !0) : !1;
}
function BG(a, b, c) {
return a.d ? zG(a, b, c) : wG(a, b, c);
}
function xG(a, b) {
(a.d ? (wE(), AE) : (wE(), zE)) != b && (a.d = b == (wE(), AE), Jq(a.b, new CG()));
}
function tG(a) {
this.o = new qx();
this.i = new qx();
this.k = this.j = null;
this.n = new qx();
this.c = (fE(), []);
this.d = a;
}
r(128, 127, {
138: 1,
245: 1,
127: 1,
656: 1,
128: 1
}, tG);
_.clear = function () {
xG(this, (wE(), zE));
this.c.length = 0;
Jq(this.b, new lx(this.b, null, null));
};
_.te = DG;
_.dataSizeUpdated = function (a) {
var b, c;
this.a = !0;
b = !1;
for (c = 0; c < this.c.length; c++)
H(T(this.c, G(c))) >= a && (pE(this.c, T(this.c, G(c--))), b = !0);
b && Jq(this.b, new lx(this.b, null, null));
};
_.deselect = function (a, b) {
return yG(this, a, b);
};
_.re = function () {
return xG(this, (wE(), zE)), this.c.length = 0, Jq(this.b, new lx(this.b, null, null)), !0;
};
_.xe = function (a) {
return yG(this, EG(this.b, a), !0);
};
_.deselected = function (a, b, c) {
return this.d ? AG(this, a, b, c) : (fE(), []);
};
_.getMode = function () {
return this.d ? (wE(), AE) : (wE(), zE);
};
_.je = Qb;
_.ke = function (a) {
var b, c;
return this.d ? (c = H(io(this.c, 'indexOf', z(u(I, 1), h, 1, 5, [Gt(this.b.q, a)]))), -1 == w(c)) : (b = H(io(this.c, 'indexOf', z(u(I, 1), h, 1, 5, [Gt(this.b.q, a)]))), -1 != w(b));
};
_.le = function () {
this.c.length = 0;
Jq(this.b, new lx(this.b, null, null));
};
_.select = function (a, b) {
return BG(this, a, b);
};
_.selectAll = function () {
xG(this, (wE(), AE));
this.c.length = 0;
Jq(this.b, new lx(this.b, null, null));
};
_.ye = function (a) {
return BG(this, EG(this.b, a), !0);
};
_.selected = function (a, b, c) {
if (this.d) {
var d, e, f, g, l;
l = (fE(), []);
d = this.d ? (e = T(this.b.q.c.c, 'size'), X((Y(), Z), e, G(0), G(0)).a - this.c.length) : this.c.length;
b = X((Y(), Z), b, G(0), G(0)).a;
b = (0 < b ? b : 0) < d - 1 ? 0 < b ? b : 0 : d - 1;
e = (this.d ? (f = T(this.b.q.c.c, 'size'), X(Z, f, G(0), G(0)).a - this.c.length) : this.c.length) - 1;
c = X(Z, c, G(e), G(e)).a;
c = ((0 < c ? c : 0) < d - 1 ? 0 < c ? c : 0 : d - 1) - b + 1;
for (d = e = f = 0; d < c;)
g = H(io(this.c, 'indexOf', z(Zb(I), h, 1, 5, [f]))), -1 == w(g) && e++ >= b && (++d, g = null == a ? G(f) : a(G(f)), null != g && io(l, 'push', z(Zb(I), h, 1, 5, [g]))), ++f;
a = l;
} else
a = AG(this, a, b, c);
return a;
};
_.me = function (a) {
ox(this, a);
this.b = a;
this.f = new FG(this, a);
};
_.setMode = function (a) {
xG(this, a);
};
_.size = function () {
var a;
return this.d ? (a = T(this.b.q.c.c, 'size'), X((Y(), Z), a, G(0), G(0)).a - this.c.length) : this.c.length;
};
_.ue = DG;
_.supportsMode = function (a) {
return a == (wE(), AE) || a == zE;
};
_.a = !1;
_.d = !1;
_.e = -1;
C(128);
function FG(a, b) {
this.a = a;
dx.call(this, b);
}
r(475, 217, Ia, FG);
_.ne = function () {
var a;
a = Xw(this);
a.a && (a.a.tabIndex = -1);
xq((S(), a.ab), 'vaadin-grid style-scope', !0);
vm(wm(Wl(a)));
return a;
};
_.oe = function (a, b) {
var c;
-1 == this.a.e && (c = Et(this.c.q, a), b ? Ww(this.c, c) : Vw(this.c, c), this.a.e = a);
};
C(475);
function GG(a, b, c) {
return a.c == b ? (a.c = -1, (c = yb(H(X((Y(), ME), (B(), c ? hc : gc), gc, gc)))) || Jq(a.b, new lx(a.b, null, null)), !0) : !1;
}
function HG(a, b, c) {
var d;
return 0 <= b && (!a.a || b < (d = T(a.b.q.c.c, 'size'), X((Y(), Z), d, G(0), G(0)).a)) ? (a.c = b, (c = yb(H(X((Y(), ME), (B(), c ? hc : gc), gc, gc)))) || Jq(a.b, new lx(a.b, null, null)), !0) : !1;
}
function tF() {
}
r(206, 205, {
241: 1,
656: 1
}, tF);
_.clear = function () {
GG(this, this.c, !1);
};
_.dataSizeUpdated = function (a) {
this.a = !0;
this.c >= a && (this.c = -1);
};
_.deselect = function (a, b) {
return GG(this, a, b);
};
_.ve = function (a) {
return GG(this, Gt(this.b.q, a), !1);
};
_.deselected = function () {
return fE(), fE(), [];
};
_.getMode = function () {
return wE(), yE;
};
_.ke = function (a) {
return this.c == Gt(this.b.q, a);
};
_.le = function () {
this.c = -1;
Jq(this.b, new lx(this.b, null, null));
};
_.select = function (a, b) {
return HG(this, a, b);
};
_.we = function (a) {
return HG(this, Gt(this.b.q, a), !1);
};
_.selectAll = Qq;
_.selected = function (a) {
var b;
b = (fE(), []);
-1 != this.c && (a = null == a ? G(this.c) : a(G(this.c)), null != a && io(b, 'push', z(u(I, 1), h, 1, 5, [a])));
return b;
};
_.me = function (a) {
this.b = a;
yx(this, a);
};
_.setMode = au;
_.size = function () {
return -1 == this.c ? 0 : 1;
};
_.supportsMode = function (a) {
return a == (wE(), yE);
};
_.a = !1;
_.c = -1;
C(206);
function uF() {
uF = k;
vF = new vk();
}
function CG() {
uF();
}
r(381, 672, {}, CG);
_.Pb = function (a) {
kF(a, 'selection-mode-changed');
nF(a);
};
_.Qb = function () {
return vF;
};
var vF;
C(381);
function EG(a, b) {
var c;
It(b.c, b);
c = Gt(a.q, b.b);
Wt(b.c, b);
return c;
}
function IG(a, b, c) {
var d;
d = null;
c.of() ? d = b : (fE(), 'object' === typeof b && null !== b) && (d = IG(a, T(b, c.Df(0)), c.Kf(1, c.od())));
return d;
}
function VF(a) {
var b;
a = (b = a.a.k, $F(b, aG(b), a));
Lg((Ig(), Jg), new JG(a));
}
function ZE(a, b) {
AC(this, new DC(this));
this.b = a;
this.a = b;
AC(this, new KG(b));
}
r(141, 81, {
81: 1,
141: 1
}, ZE);
_.Ve = function (a) {
var b, c, d;
a = XF(a);
b = null;
kE(a) ? (d = H(io(this.a.b, 'indexOf', z(u(I, 1), h, 1, 5, [this.b]))), 0 == w(d) && (b = a)) : gm(a) ? b = T(a, G((c = H(io(this.a.b, 'indexOf', z(u(I, 1), h, 1, 5, [this.b]))), w(c)))) : b = IG(this, a, new $l(Rc(this.b.c, '\\.')));
return b;
};
var $E = C(141);
function KG(a) {
this.a = a;
}
r(357, 1, {}, KG);
_.wd = function (a, b) {
var c = this.a, d, e;
e = a.a.c;
d = lE(b) ? '' : Ab(b);
A(c.d.q, 152) && eh(Q(new Gr(d))) ? e.innerHTML = d || '' : (c = fh((M(), e)), c && c.iswrapper || (c = (S(), zh()), c.style.overflow = (Wi(), 'hidden'), c.style.textOverflow = (zj(), 'ellipsis'), c.iswrapper = !0, Xg(e), e.appendChild(c)), N.Lb(c, d));
};
C(357);
function JG(a) {
this.a = a;
}
r(358, 1, {}, JG);
_.tb = function () {
var a = this.a;
ZF(a, a.b);
};
C(358);
function LG(a, b) {
var c, d, e, f, g, l, m, n, p, v, x;
l = b ? a.i.D.d.a.length : a.i.A.d.a.length;
v = b ? a.p : a.o;
c = b ? a.c : a.b;
if (l != v) {
for (e = v; e < l; e++)
b ? iD(a.i.D, e) : RC(a.i.A, e);
for (e = l; e < v; e++)
b ? QC(a.i.D, e) : QC(a.i.A, e);
}
for (m = 0; m < v; m++)
for (x = b ? qB(a.i.D, m) : qB(a.i.A, m), l = SE(a.j), d = Wl(Hm(c, m)), e = zm(d, z(u(tb, 1), h, 2, 6, ['th, td'])), f = PE((Y(), IE), d, 'class'), 0 == (y(), f).length || (x.e = f, x.d.Ze()), g = n = 0; n < e.c.length && n < a.n; n++) {
d = Wl(Hm(e, n));
f = bB(x, l.Df(g));
p = a.j.k;
wp(p.a, f) || hl(p.a, f, new fG(f, p.c));
p = R(p.a, f);
f = PE(IE, d, 'class');
if (0 != f.length) {
var D = p.a;
D.d = f;
D.c.Ze();
oF(p.c);
NF(p.c.d, p.a);
}
f = G(1);
D = G(1);
f = NE(Z, Hm(d, 0), 'colspan', f, D).a;
Vd(new MG(p, d, f), 0);
g += f;
}
b && (c = a.j.k, v = qB(c.b.D, a.g), jD(c.b.D, v), c.b.Re());
}
function dp(a) {
var b;
a.f = Om(a.d, z(u(tb, 1), h, 2, 6, ['thead']));
a.e = Om(a.d, z(u(tb, 1), h, 2, 6, ['tfoot']));
a.a = Om(a.d, z(u(tb, 1), h, 2, 6, ['colgroup']));
b = Um(a.f) + Um(a.a) + Um(a.e);
if (b !== a.k) {
a.k = b;
a.c = Om(a.f, z(u(tb, 1), h, 2, 6, ['tr']));
a.b = Om(a.e, z(u(tb, 1), h, 2, 6, ['tr']));
a.p = a.c.c.length;
a.o = a.b.c.length;
var c, d;
for (d = c = 0; c < a.p; c++)
b = zm(Wl(Hm(a.c, c)), z(Zb(tb), h, 2, 6, ['th, td'])), d = be(d, b.c.length), b.c.length != d && 0 == Am(b, z(Zb(tb), h, 2, 6, ['[sortable]'])).c.length || (a.g = c);
if (0 != a.a.c.length) {
b = zm(a.a, z(Zb(tb), h, 2, 6, ['col']));
var e, f, g, l, m;
c = a.j.b;
c.length = 0;
a.n = b.c.length;
d = (fE(), []);
for (l = 0; l < a.n; l++)
io(c, 'push', z(u(I, 1), h, 1, 5, [new UF()]));
YE(a.j, c);
for (l = 0; l < a.n; l++) {
e = Wl(Hm(b, l));
f = T(c, G(l));
g = yb(H(PE((Y(), ME), e, 'sortable')));
BC(f.a, g);
Lg((Ig(), Jg), new NG(f, e));
g = f;
m = yb(H(PE(ME, e, 'hidden')));
yC(g.a, m);
oF(g.b);
g = f;
m = G(1);
var n = G(-1);
m = NE(Z, Hm(e, 0), 'flex', m, n);
sC(g.a, m.a);
g = PE(KE, e, 'width');
null != g && TF(f, (t(g), g));
g = PE(KE, e, 'min-width');
null != g && SF(f, (t(g), g));
g = PE(KE, e, 'max-width');
null != g && RF(f, (t(g), g));
g = f;
m = PE(IE, e, 'name');
g.c = m;
VF(g.a);
g = PE(IE, e, 'sort-direction');
0 != (y(), g).length && (m = {}, m.direction = g, m.column = l, io(d, 'push', z(u(I, 1), h, 1, 5, [m])));
e = NE(IE, Hm(e, 0), 'hiding-toggle-text', null, null);
f = f.a;
f.o = null == e ? null : e;
f.k && wC(f.i.j, f);
}
YE(a.j, c);
0 == d.length || hF(a.j, fb(OG.prototype._e, new OG(a, d)));
}
0 < a.n && (0 < a.p && LG(a, !0), 0 < a.o && LG(a, !1));
}
Vd(new PG(a), 0);
Vd(a.j.j, 50);
}
function EF(a, b) {
this.j = b;
this.i = b.d;
this.d = Wl(a);
dp(this);
var c;
a: {
c = this.d;
var d = (Wo(), Zo), e;
if (d != cn) {
if ($m && (e = Rn($m, zb(d)))) {
c = e.lc(c);
break a;
}
throw new Ub((nc(d), 'No plugin registered for class ' + d.k)).backingJsObject;
}
}
d = c;
c = (!Kl && (Kl = new gn()), jn(tn));
c.a.attributes = !0;
c.a.childList = !0;
c.a.subtree = !0;
c = c.a;
var f, g;
if (fm((Ll(), Ul), 'MutationObserver'))
for (d = d.c, e = 0, g = d.length; e < g; ++e) {
f = d[e];
var l = c, m = void 0, n = void 0, p = void 0, p = R(Yo, f);
p || (p = new Rd(), hl(Yo, f, p));
p.nf(this) || (p.Cf(this), n = Zl(f), m = void 0, m = R(Xo, this), m || (m = cp(this, n), hl(Xo, this, m)), hl(Xo, this, m), n ? m.observe(f, l) : io(T((Ll(), Ul), gm(f) ? 'Array' : 'Object'), 'observe', z(u(I, 1), h, 1, 5, [
f,
m,
l
])), p.Cf(this));
}
else
c = xn(z(u(I, 1), h, 1, 5, ['ERROR: this browser does not support MutationObserver: ' + $wnd.navigator.userAgent])), $wnd.console.log.apply($wnd.console, c);
}
r(149, 1, {
721: 1,
149: 1
}, EF);
_.g = 0;
_.k = null;
_.n = 0;
_.o = 0;
_.p = 0;
C(149);
function PG(a) {
this.a = a;
}
r(364, 50, {}, PG);
_.nb = function () {
if (0 != this.a.f.c.length) {
var a = !yb(H(PE((Y(), ME), this.a.f, 'hidden'))), b = this.a.i.D;
b.e = a;
b.Ze();
}
0 != this.a.e.c.length && (a = !yb(H(PE((Y(), ME), this.a.e, 'hidden'))), b = this.a.i.A, b.e = a, b.Ze());
};
C(364);
function MG(a, b, c) {
this.c = a;
this.a = b;
this.b = c;
}
r(367, 50, {}, MG);
_.nb = function () {
ZF(this.c, Pm(this.a));
YF(this.c, this.b);
};
_.b = 0;
C(367);
function NG(a, b) {
this.b = a;
this.a = b;
}
r(365, 1, {}, NG);
_.tb = function () {
var a = this.a, a = yb(H(PE((Y(), ME), a, 'hidable')));
xC(this.b.a, a);
};
C(365);
function OG(a, b) {
this.a = a;
this.b = b;
}
r(366, $wnd.Function, {}, OG);
gb();
_._e = function () {
var a = this.a.j.c;
a && km(a, 'sortOrder', this.b);
return null;
};
C(366);
function aG(a) {
var b, c;
for (c = b = 0; c < a.b.D.d.a.length; c++)
if (qB(a.b.D, c).a) {
b = c;
break;
}
return b;
}
function $F(a, b, c) {
b = bB(qB(a.b.D, b), c);
return wp(a.a, b) || hl(a.a, b, new fG(b, a.c)), R(a.a, b);
}
function QG(a, b) {
return null != a ? Ac((y(), null == a ? 'null' : Ab(a))) : b;
}
function RG(a, b, c) {
var d, e, f;
e = SE(a.c);
for (f = 0; f < e.od(); f++)
d = e.Df(f), f < c.length && (d = bB(b, d), ZF((wp(a.a, d) || hl(a.a, d, new fG(d, a.c)), R(a.a, d)), T(c, G(f))));
}
function wF(a) {
this.a = new zg();
this.c = a;
this.b = a.d;
}
r(360, 1, {}, wF);
_.addFooter = function (a, b) {
var c;
c = QG(a, this.b.A.d.a.length);
c = QC(this.b.A, c);
b && RG(this, c, b);
this.b.Qe();
lF(this.c);
};
_.addHeader = function (a, b) {
var c;
c = QG(a, this.b.D.d.a.length);
c = QC(this.b.D, c);
b && RG(this, c, b);
this.b.Re();
lF(this.c);
};
_.getDefaultHeader = function () {
return aG(this);
};
_.getFooterCell = function (a, b) {
var c;
c = SE(this.c).Df(RE(this.c, b));
c = bB(qB(this.b.A, a), c);
return wp(this.a, c) || hl(this.a, c, new fG(c, this.c)), R(this.a, c);
};
_.getFooterRowCount = function () {
return this.b.A.d.a.length;
};
_.getHeaderCell = function (a, b) {
var c, d;
d = SE(this.c).Df(RE(this.c, b));
return c = bB(qB(this.b.D, a), d), wp(this.a, c) || hl(this.a, c, new fG(c, this.c)), R(this.a, c);
};
_.getHeaderRowCount = function () {
return this.b.D.d.a.length;
};
_.isFooterHidden = function () {
return !this.b.A.e;
};
_.isHeaderHidden = function () {
return !this.b.D.e;
};
_.removeFooter = function (a) {
RC(this.b.A, a);
this.b.Qe();
lF(this.c);
};
_.removeHeader = function (a) {
iD(this.b.D, a);
this.b.Re();
lF(this.c);
};
_.setDefaultHeader = function (a) {
a = qB(this.b.D, a);
jD(this.b.D, a);
this.b.Re();
};
_.setFooterHidden = function (a) {
var b = this.b.A;
b.e = !a;
b.Ze();
this.b.Qe();
lF(this.c);
};
_.setFooterRowClassName = function (a, b) {
var c = qB(this.b.A, a);
c.e = b;
c.d.Ze();
this.b.Qe();
};
_.setHeaderHidden = function (a) {
var b = this.b.D;
b.e = !a;
b.Ze();
this.b.Re();
lF(this.c);
};
_.setHeaderRowClassName = function (a, b) {
var c = qB(this.b.D, a);
c.e = b;
c.d.Ze();
this.b.Re();
};
C(360);
function SG(a, b) {
a.s = -1;
a.t = -1;
if (1 <= b.length)
try {
a.s = Ac(b[0]);
} catch (c) {
if (c = ec(c), !A(c, 13))
throw c.backingJsObject;
}
if (2 <= b.length) {
try {
a.t = Ac(b[1]);
} catch (c) {
if (c = ec(c), !A(c, 13))
throw c.backingJsObject;
}
if (-1 == a.t && -1 != (y(), b[1]).indexOf('-'))
try {
a.t = Ac(Sc(b[1], 0, Nc(b[1], Xc(45))));
} catch (c) {
if (c = ec(c), !A(c, 13))
throw c.backingJsObject;
}
}
}
function TG(a, b) {
var c, d;
c = Nc(b, Xc(46));
0 > c && (c = (y(), b).length);
a.a = Ac(UG(b, 0, c));
d = Xc(46);
var e = c + 1;
d = (y(), b).indexOf(d, e);
0 > d && (d = (y(), b).length);
try {
a.b = Ac(Oc(UG(b, c + 1, d), '[^0-9].*', ''));
} catch (f) {
if (f = ec(f), !A(f, 69))
throw f.backingJsObject;
}
}
function UG(a, b, c) {
0 > b && (b = 0);
(0 > c || c > (y(), a).length) && (c = (y(), a).length);
return (y(), a).substr(b, c - b);
}
function Ws(a) {
var b, c, d, e, f;
a = (y(), a).toLowerCase();
this.f = -1 != a.indexOf('gecko') && -1 == a.indexOf('webkit') && -1 == a.indexOf('trident/');
a.indexOf(' presto/');
this.p = -1 != a.indexOf('trident/');
this.q = !this.p && -1 != a.indexOf('applewebkit');
this.c = -1 != a.indexOf(' chrome/');
this.k = -1 != a.indexOf('opera');
this.g = (this.g = -1 != a.indexOf('msie') && !this.k && -1 == a.indexOf('webtv')) || this.p;
this.o = !this.c && !this.g && -1 != a.indexOf('safari');
this.e = -1 != a.indexOf(' firefox/');
this.n = -1 != a.indexOf('phantomjs/');
-1 != a.indexOf(' edge/') && (this.d = !0, this.f = this.q = this.e = this.o = this.g = this.k = this.c = !1);
a.indexOf('chromeframe');
try {
this.f ? (d = a.indexOf('rv:'), 0 <= d && (e = a.substr(d + 3, a.length - (d + 3)), e = Qc(e, '(\\.[0-9]+).+', '$1'), xc(e))) : this.q ? (e = Tc(a, a.indexOf('webkit/') + 7), e = Qc(e, '([0-9]+)[^0-9].+', '$1'), xc(e)) : this.g && (f = a.indexOf('trident/'), 0 <= f && (e = a.substr(f + 8, a.length - (f + 8)), e = Qc(e, '([0-9]+\\.[0-9]+).*', '$1'), xc(e)));
} catch (g) {
if (g = ec(g), A(g, 13))
Xm();
else
throw g.backingJsObject;
}
try {
this.g ? -1 == a.indexOf('msie') ? (d = a.indexOf('rv:'), 0 <= d && (e = a.substr(d + 3, a.length - (d + 3)), e = Qc(e, '(\\.[0-9]+).+', '$1'), TG(this, e))) : (c = Tc(a, a.indexOf('msie ') + 5), c = UG(c, 0, c.indexOf(';')), TG(this, c)) : this.e ? (b = a.indexOf(' firefox/') + 9, TG(this, UG(a, b, b + 5))) : this.c ? (b = a.indexOf(' chrome/') + 8, TG(this, UG(a, b, b + 5))) : this.o ? (b = a.indexOf(' version/') + 9, TG(this, UG(a, b, b + 5))) : this.k ? (b = a.indexOf(' version/'), -1 != b ? b += 9 : b = a.indexOf('opera/') + 6, TG(this, UG(a, b, b + 5))) : this.d && (b = a.indexOf(' edge/') + 6, TG(this, UG(a, b, b + 8)));
} catch (g) {
if (g = ec(g), A(g, 13))
Xm();
else
throw g.backingJsObject;
}
if (-1 != a.indexOf('windows '))
this.r = 1, a.indexOf('windows phone');
else if (-1 != a.indexOf('android'))
this.r = 5, -1 != (y(), a).indexOf('android') && (a = UG(a, a.indexOf('android ') + 8, a.length), a = UG(a, 0, a.indexOf(';')), a = Rc(a, '\\.'), SG(this, a));
else if (-1 != a.indexOf('linux'))
this.r = 3;
else if (-1 != a.indexOf('macintosh') || -1 != a.indexOf('mac osx') || -1 != a.indexOf('mac os x'))
this.i = -1 != a.indexOf('ipad'), this.j = -1 != a.indexOf('iphone'), this.i || -1 != a.indexOf('ipod') || this.j ? (this.r = 4, -1 != (y(), a).indexOf('os ') && -1 != a.indexOf(' like mac') && (a = UG(a, a.indexOf('os ') + 3, a.indexOf(' like mac')), a = Rc(a, '_'), SG(this, a))) : this.r = 2;
}
r(519, 1, ea, Ws);
_.a = -1;
_.b = -1;
_.c = !1;
_.d = !1;
_.e = !1;
_.f = !1;
_.g = !1;
_.i = !1;
_.j = !1;
_.k = !1;
_.n = !1;
_.o = !1;
_.p = !1;
_.q = !1;
_.r = 0;
_.s = -1;
_.t = -1;
C(519);
function Kx() {
Kx = k;
Lx = new VG();
uE = new WG();
}
r(75, 5, Qa);
var Lx, uE, tE = E(75, function () {
Kx();
return z(u(tE, 1), h, 75, 0, [
Lx,
uE
]);
});
function VG() {
O.call(this, 'ASCENDING', 0);
}
r(473, 75, Qa, VG);
_.ef = function () {
return uE;
};
E(473, null);
function WG() {
O.call(this, 'DESCENDING', 1);
}
r(474, 75, Qa, WG);
_.ef = function () {
return Lx;
};
E(474, null);
function lw() {
lw = k;
Cw = new XG('HEADER', 0);
mw = new XG('BODY', 1);
Bw = new XG('FOOTER', 2);
}
function XG(a, b) {
O.call(this, a, b);
}
r(108, 5, {
108: 1,
3: 1,
6: 1,
5: 1
}, XG);
var mw, Bw, Cw, YG = E(108, function () {
lw();
return z(u(YG, 1), h, 108, 0, [
Cw,
mw,
Bw
]);
});
function WC() {
WC = k;
ZC = new ZG('TEXT', 0);
XC = new ZG('HTML', 1);
aD = new ZG('WIDGET', 2);
}
function ZG(a, b) {
O.call(this, a, b);
}
r(101, 5, {
101: 1,
3: 1,
6: 1,
5: 1
}, ZG);
var XC, ZC, aD, $G = E(101, function () {
WC();
return z(u($G, 1), h, 101, 0, [
ZC,
XC,
aD
]);
});
function Vt(a, b) {
if (a.b > b.a || b.b > a.a)
throw new F('There is a gap between ' + a + ' and ' + b).backingJsObject;
return new qt(Nb(a.b, b.b), be(a.a, b.a));
}
function Dx(a, b) {
return a.b <= b && b < a.a;
}
function qC(a, b) {
return a === b ? !0 : null == b || aH != jb(b) || a.a != b.a || a.b != b.b ? !1 : !0;
}
function rt(a, b) {
return a.b < b.a && b.b < a.a;
}
function st(a) {
return a.b >= a.a;
}
function xt(a, b) {
return a.b >= a.a && b.b >= b.a ? !0 : b.b <= a.b && a.a <= b.a;
}
function zt(a) {
return a.a - a.b;
}
function NB(a, b) {
return 0 == b ? a : new qt(a.b + b, a.a + b);
}
function At(a, b) {
var c, d, e;
e = JF(a, b.b);
d = e[0];
c = JF(e[1], b.a);
e = c[0];
c = c[1];
return z(u(aH, 1), h, 18, 0, [
d,
e,
c
]);
}
function pt(a, b) {
var c, d, e;
e = Dx(b, a.b);
d = Dx(b, a.a);
c = a.b < b.b && a.a >= b.a;
return e ? d ? a : new qt(a.b, b.a) : d ? new qt(b.b, a.a) : c ? b : V(a.b, 0);
}
function JF(a, b) {
return b < a.b ? z(u(aH, 1), h, 18, 0, [
V(a.b, 0),
a
]) : b >= a.a ? z(u(aH, 1), h, 18, 0, [
a,
V(a.a, 0)
]) : z(u(aH, 1), h, 18, 0, [
new qt(a.b, b),
new qt(b, a.a)
]);
}
function qt(a, b) {
if (a > b)
throw new F('start must not be greater than end').backingJsObject;
this.b = a;
this.a = b;
}
function V(a, b) {
if (0 > b)
throw new F('length must not be negative').backingJsObject;
return new qt(a, a + b);
}
r(18, 1, {
18: 1,
3: 1
}, qt);
_.bb = function (a) {
return qC(this, a);
};
_.db = function () {
var a;
a = 31 + this.a;
return a = 31 * a + this.b;
};
_.eb = function () {
return nc(aH), aH.i + ' [' + this.b + '..' + this.a + '[' + (this.b >= this.a ? ' (empty)' : '');
};
_.a = 0;
_.b = 0;
var aH = C(18);
function Kw() {
Kw = k;
Lw = new bH('ANY', 0);
cH = new bH('START', 1);
vy = new bH('MIDDLE', 2);
dH = new bH('END', 3);
}
function bH(a, b) {
O.call(this, a, b);
}
r(72, 5, {
72: 1,
3: 1,
6: 1,
5: 1
}, bH);
var Lw, dH, vy, cH, eH = E(72, function () {
Kw();
return z(u(eH, 1), h, 72, 0, [
Lw,
cH,
vy,
dH
]);
});
function WE() {
WE = k;
var a = (Kw(), z(Zb(eH), h, 72, 0, [
Lw,
cH,
vy,
dH
])), b, c, d, e;
b = {};
d = 0;
for (e = a.length; d < e; ++d)
c = a[d], b[':' + (null != c.f ? c.f : '' + c.g)] = c;
XE = b;
}
var XE;
r(693, 1, {});
C(693);
r(694, 693, {});
C(694);
function fH() {
}
r(232, 694, {}, fH);
C(232);
r(117, 1, {});
_.eb = Hc;
C(117);
function ud() {
Fb();
Tb.call(this);
}
function Lq(a) {
Fb();
Ub.call(this, a);
}
r(26, 10, ca, ud, Lq);
C(26);
function Fc() {
Fc = k;
Gc = Ib(Cd, h, 97, 256, 0);
}
var Gc;
function qA(a) {
return 0 >= a ? 0 - a : a;
}
function hu(a) {
return 0 > a ? -a : a;
}
function be(a, b) {
return a > b ? a : b;
}
function Nb(a, b) {
return a < b ? a : b;
}
function FC() {
this.a = '';
}
r(351, 117, { 655: 1 }, FC);
_.eb = Hc;
C(351);
function SA(a, b) {
a.a += b;
return a;
}
function xd(a, b) {
a.a += '' + b;
return a;
}
function Or() {
this.a = '';
}
function wd() {
this.a = '';
}
function kl(a) {
this.a = a;
}
r(68, 117, { 655: 1 }, Or, wd, kl);
_.eb = Hc;
C(68);
function Xm() {
Xm = k;
Ym = new fH();
}
var Ym;
function gH() {
Fb();
Tb.call(this);
}
function Uq(a) {
Fb();
Ub.call(this, a);
}
r(30, 10, {
3: 1,
13: 1,
10: 1,
11: 1,
30: 1
}, gH, Uq);
C(30);
function tx(a, b) {
var c, d, e, f;
t(b);
c = !1;
for (e = b.Mc(); e.Xc();)
d = e.Yc(), c |= (f = a.a.wf(d, a), null == f);
}
function $z(a, b, c) {
var d;
for (d = a.Mc(); d.Xc();)
if (a = d.Yc(), sb(b) === sb(a) || null != b && mb(b, a))
return c && d.Zc(), !0;
return !1;
}
function gD(a, b) {
var c, d;
t(b);
for (d = b.Mc(); d.Xc();)
if (c = d.Yc(), !a.nf(c))
return !1;
return !0;
}
function hH(a, b) {
var c, d, e;
e = a.od();
b.length < e && (b = (c = Array(e), $b(c, b)));
d = a.Mc();
for (c = 0; c < e; ++c)
b[c] = d.Yc();
b.length > e && (b[e] = null);
return b;
}
function iH(a) {
var b, c, d;
d = new jH('[', ']');
for (c = a.Mc(); c.Xc();)
b = c.Yc(), kH(d, b === a ? '(this Collection)' : (y(), null == b ? 'null' : Ab(b)));
return d.a ? 0 == Rb(d.e).length ? d.a.a : d.a.a + ('' + d.e) : d.c;
}
r(676, 1, {});
_.bb = Db;
_.db = Eb;
_.nf = lH;
_.of = mH;
_.pf = nH;
_.qf = oH;
_.eb = function () {
return iH(this);
};
C(676);
function pH(a, b) {
var c, d, e;
c = b.Nf();
e = b.Of();
d = a.vf(c);
return !(sb(e) === sb(d) || null != e && mb(e, d)) || null == d && !a.sf(c) ? !1 : !0;
}
function qH(a, b) {
var c, d;
if (b === a)
return !0;
if (!A(b, 66) || a.od() != b.od())
return !1;
for (d = b.uf().Mc(); d.Xc();)
if (c = d.Yc(), !a.rf(c))
return !1;
return !0;
}
function rH(a, b, c) {
var d, e;
for (d = a.uf().Mc(); d.Xc();)
if (a = d.Yc(), e = a.Nf(), sb(b) === sb(e) || null != b && mb(b, e))
return c && (a = new sH(a.Nf(), a.Of()), d.Zc()), a;
return null;
}
function tH(a) {
var b, c, d;
d = new jH('{', '}');
for (c = a.uf().Mc(); c.Xc();)
b = c.Yc(), kH(d, uH(a, b.Nf()) + '=' + uH(a, b.Of()));
return d.a ? 0 == Rb(d.e).length ? d.a.a : d.a.a + ('' + d.e) : d.c;
}
function uH(a, b) {
return b === a ? '(this Map)' : (y(), null == b ? 'null' : Ab(b));
}
function vH(a) {
return a ? a.Of() : null;
}
r(675, 1, Ra);
_.rf = function (a) {
return pH(this, a);
};
_.sf = function (a) {
return !!rH(this, a, !1);
};
_.tf = function (a) {
var b, c;
for (c = this.uf().Mc(); c.Xc();)
if (b = c.Yc(), b = b.Of(), sb(a) === sb(b) || null != a && mb(a, b))
return !0;
return !1;
};
_.bb = function (a) {
return qH(this, a);
};
_.vf = function (a) {
return vH(rH(this, a, !1));
};
_.db = function () {
return wH(this.uf());
};
_.of = mH;
_.wf = function () {
throw new Uq('Put not supported on this map').backingJsObject;
};
_.xf = function (a) {
return vH(rH(this, a, !0));
};
_.od = function () {
return this.uf().od();
};
_.eb = function () {
return tH(this);
};
C(675);
function wp(a, b) {
return nb(b) ? null == b ? !!xH(a.d, null) : void 0 !== a.e.a.get(b) : !!xH(a.d, b);
}
function yH(a, b, c) {
var d;
for (d = c.Mc(); d.Xc();)
if (c = d.Yc(), a.zf(b, c.Of()))
return !0;
return !1;
}
function R(a, b) {
return nb(b) ? null == b ? vH(xH(a.d, null)) : a.e.a.get(b) : vH(xH(a.d, b));
}
function hl(a, b, c) {
return nb(b) ? K(a, b, c) : Ty(a.d, b, c);
}
function K(a, b, c) {
return null == b ? Ty(a.d, null, c) : zH(a.e, b, c);
}
function gl(a, b) {
return nb(b) ? null == b ? AH(a.d, null) : BH(a.e, b) : AH(a.d, b);
}
function ts(a) {
a.d = new CH(a);
a.e = new DH(a);
a._gwt_modCount = (a._gwt_modCount | 0) + 1;
}
function qs(a) {
return a.d.c + a.e.c;
}
r(121, 675, Ra);
_.yf = function () {
ts(this);
};
_.sf = function (a) {
return wp(this, a);
};
_.tf = function (a) {
return yH(this, a, this.e) || yH(this, a, this.d);
};
_.uf = function () {
return new EH(this);
};
_.vf = function (a) {
return R(this, a);
};
_.wf = function (a, b) {
return hl(this, a, b);
};
_.xf = function (a) {
return gl(this, a);
};
_.od = function () {
return qs(this);
};
C(121);
r(677, 676, Sa);
_.nf = lH;
_.of = mH;
_.pf = function () {
return hH(this, Ib(I, h, 1, this.od(), 5));
};
_.qf = oH;
_.bb = function (a) {
return a === this ? !0 : A(a, 55) && a.od() == this.od() ? gD(this, a) : !1;
};
_.db = function () {
return wH(this);
};
C(677);
function EH(a) {
this.a = a;
}
r(153, 677, Sa, EH);
_.nf = function (a) {
return A(a, 54) ? pH(this.a, a) : !1;
};
_.Mc = function () {
return new FH(this.a);
};
_.od = GH;
C(153);
function HH(a) {
if (a.a.Xc())
return !0;
if (a.a != a.d)
return !1;
a.a = new IH(a.e.d);
return a.a.Xc();
}
function FH(a) {
this.e = a;
this.a = this.d = new JH(this.e.e);
this.b = HH(this);
this._gwt_modCount = a._gwt_modCount;
}
r(464, 1, {}, FH);
_.Yc = function () {
var a;
return KH(this.e, this), nd(this.b), this.c = this.a, a = this.a.Yc(), this.b = HH(this), a;
};
_.Xc = xF;
_.Zc = function () {
td(!!this.c);
KH(this.e, this);
this.c.Zc();
this.c = null;
this.b = HH(this);
LH(this.e, this);
};
_.b = !1;
C(464);
function fA(a) {
var b = a.b, c;
c = new Qz(a, 0);
for (a = 0; a < b; ++a)
nd(c.b < c.d.od()), c.d.Df(c.c = c.b++), MH(c);
}
function vz(a, b) {
var c, d;
c = 0;
for (d = a.od(); c < d; ++c)
if (NH(b, a.Df(c)))
return c;
return -1;
}
r(679, 676, Ta);
_.nf = lH;
_.of = mH;
_.If = function (a) {
return $z(this, a, !0);
};
_.pf = nH;
_.qf = oH;
_.Bf = function () {
throw new Uq('Add not supported on this list').backingJsObject;
};
_.Cf = function (a) {
this.Bf(this.od(), a);
return !0;
};
_.bb = function (a) {
var b, c, d;
if (a === this)
return !0;
if (!A(a, 62) || this.od() != a.od())
return !1;
d = a.Mc();
for (b = this.Mc(); b.Xc();)
if (a = b.Yc(), c = d.Yc(), !(sb(a) === sb(c) || null != a && mb(a, c)))
return !1;
return !0;
};
_.db = function () {
il();
var a, b, c;
c = 1;
for (b = this.Mc(); b.Xc();)
a = b.Yc(), c = 31 * c + (null != a ? kb(a) : 0), c |= 0;
return c;
};
_.Ef = function (a) {
return vz(this, a);
};
_.Mc = function () {
return new am(this);
};
_.Ff = function () {
return this.Gf(0);
};
_.Gf = function (a) {
return new Qz(this, a);
};
_.Hf = function () {
throw new Uq('Remove not supported on this list').backingJsObject;
};
_.Jf = function () {
throw new Uq('Set not supported on this list').backingJsObject;
};
_.Kf = function (a, b) {
return new Gu(this, a, b);
};
C(679);
function MH(a) {
td(-1 != a.c);
a.d.Hf(a.c);
a.b = a.c;
a.c = -1;
}
function am(a) {
this.d = a;
}
r(123, 1, {}, am);
_.Xc = function () {
return this.b < this.d.od();
};
_.Yc = function () {
return nd(this.Xc()), this.d.Df(this.c = this.b++);
};
_.Zc = OH;
_.b = 0;
_.c = -1;
C(123);
function JA(a) {
return a.b < a.d.od();
}
function KA(a) {
return nd(a.b < a.d.od()), a.d.Df(a.c = a.b++);
}
function Qz(a, b) {
this.d = this.a = a;
rd(b, a.od());
this.b = b;
}
r(124, 123, {}, Qz);
_.Xc = function () {
return JA(this);
};
_.Yc = function () {
return KA(this);
};
_.Zc = OH;
_.Lf = function () {
return 0 < this.b;
};
_.Mf = function () {
return nd(0 < this.b), this.a.Df(this.c = --this.b);
};
C(124);
function Gu(a, b, c) {
sd(b, c, a.od());
this.c = a;
this.a = b;
this.b = c - b;
}
r(45, 679, Ta, Gu);
_.Bf = function (a, b) {
rd(a, this.b);
this.c.Bf(this.a + a, b);
++this.b;
};
_.Df = function (a) {
return pd(a, this.b), this.c.Df(this.a + a);
};
_.Hf = function (a) {
pd(a, this.b);
a = this.c.Hf(this.a + a);
--this.b;
return a;
};
_.Jf = function (a, b) {
pd(a, this.b);
return this.c.Jf(this.a + a, b);
};
_.od = xF;
_.a = 0;
_.b = 0;
C(45);
function Lm(a) {
this.a = a;
}
r(38, 677, Sa, Lm);
_.nf = function (a) {
return this.a.sf(a);
};
_.Mc = function () {
var a;
return a = this.a.uf().Mc(), new Mm(a);
};
_.od = GH;
C(38);
function Mm(a) {
this.a = a;
}
r(39, 1, {}, Mm);
_.Xc = PH;
_.Yc = function () {
var a;
return a = this.a.Yc(), a.Nf();
};
_.Zc = QH;
C(39);
function Xx(a) {
this.a = a;
}
r(35, 676, {}, Xx);
_.nf = function (a) {
return this.a.tf(a);
};
_.Mc = function () {
var a;
return a = this.a.uf().Mc(), new Yx(a);
};
_.od = GH;
C(35);
function Yx(a) {
this.a = a;
}
r(43, 1, {}, Yx);
_.Xc = PH;
_.Yc = function () {
var a;
return a = this.a.Yc(), a.Of();
};
_.Zc = QH;
C(43);
function RH(a, b) {
var c;
c = a.e;
a.e = b;
return c;
}
r(73, 1, Ua);
_.bb = function (a) {
return A(a, 54) ? NH(this.d, a.Nf()) && NH(this.e, a.Of()) : !1;
};
_.Nf = yF;
_.Of = function () {
return this.e;
};
_.db = function () {
return SH(this.d) ^ SH(this.e);
};
_.Pf = function (a) {
return RH(this, a);
};
_.eb = function () {
return this.d + '=' + this.e;
};
C(73);
function sH(a, b) {
this.d = a;
this.e = b;
}
r(74, 73, {
73: 1,
74: 1,
54: 1
}, sH);
C(74);
function XB(a) {
var b = a.e;
this.d = a.d;
this.e = b;
}
r(465, 73, Ua, XB);
_.Pf = Tab;
C(465);
r(683, 1, { 54: 1 });
_.bb = function (a) {
return A(a, 54) ? NH(this.b.value[0], a.Nf()) && NH(TH(this), a.Of()) : !1;
};
_.db = function () {
return SH(this.b.value[0]) ^ SH(TH(this));
};
_.eb = function () {
return this.b.value[0] + '=' + TH(this);
};
C(683);
function UH(a, b) {
var c;
c = b.Nf();
c = a.Rf(c);
return !!c && NH(c.e, b.Of());
}
function Ky(a, b) {
return vH(a.Rf(b));
}
function WB(a) {
if (!a)
throw new od().backingJsObject;
return a.d;
}
r(696, 675, Ra);
_.rf = function (a) {
return UH(this, a);
};
_.sf = function (a) {
return !!this.Rf(a);
};
_.uf = function () {
return new VH(this);
};
_.vf = function (a) {
return Ky(this, a);
};
C(696);
function VH(a) {
this.b = a;
}
r(170, 677, Sa, VH);
_.nf = function (a) {
return A(a, 54) && UH(this.b, a);
};
_.Mc = function () {
return this.b.Qf();
};
_.od = WH;
C(170);
function qz(a, b, c) {
t(c);
a = Ez(a, b);
for (b = new $k(c); b.a < b.c.a.length;)
c = al(b), XH(a, c);
}
function sz(a, b) {
var c;
c = Ez(a, b);
try {
return Fz(c);
} catch (d) {
d = ec(d);
if (A(d, 53))
throw new Dc('Can\'t get element ' + b).backingJsObject;
throw d.backingJsObject;
}
}
function Dz(a, b) {
var c, d;
c = Ez(a, b);
try {
return d = Fz(c), Sz(c), d;
} catch (e) {
e = ec(e);
if (A(e, 53))
throw new Dc('Can\'t remove element ' + b).backingJsObject;
throw e.backingJsObject;
}
}
r(692, 679, Ta);
_.Bf = function (a, b) {
var c;
c = Ez(this, a);
XH(c, b);
};
_.Df = function (a) {
return sz(this, a);
};
_.Mc = function () {
return Ez(this, 0);
};
_.Hf = function (a) {
return Dz(this, a);
};
_.Jf = function (a, b) {
var c, d;
c = Ez(this, a);
try {
return d = Fz(c), td(!!c.c), c.c.c = b, d;
} catch (e) {
e = ec(e);
if (A(e, 53))
throw new Dc('Can\'t set element ' + a).backingJsObject;
throw e.backingJsObject;
}
};
C(692);
function YH(a) {
a.a = Ib(I, h, 1, 0, 5);
}
function Pz(a, b, c) {
rd(b, a.a.length);
a.a.splice(b, 0, c);
}
function Ud(a, b) {
a.a[a.a.length] = b;
return !0;
}
function FB(a, b) {
var c;
c = b.pf();
0 != c.length && id(c, a.a, a.a.length, c.length, !1);
}
function Pr(a, b) {
pd(b, a.a.length);
return a.a[b];
}
function zo(a, b) {
for (var c = 0; c < a.a.length; ++c)
if (NH(b, a.a[c]))
return c;
return -1;
}
function Ju(a, b) {
var c;
c = (pd(b, a.a.length), a.a[b]);
a.a.splice(b, 1);
return c;
}
function ae(a, b) {
var c;
c = zo(a, b);
if (-1 == c)
return !1;
pd(c, a.a.length);
a.a.splice(c, 1);
return !0;
}
function Du(a, b, c) {
var d;
d = (pd(b, a.a.length), a.a[b]);
a.a[b] = c;
return d;
}
function Bo(a) {
var b = a.a;
a = b.slice(0, a.a.length);
return $b(a, b);
}
function Zd(a, b) {
var c, d;
d = a.a.length;
b.length < d && (b = (c = Array(d), $b(c, b)));
for (c = 0; c < d; ++c)
b[c] = a.a[c];
b.length > d && (b[d] = null);
return b;
}
function Rd() {
YH(this);
}
function nx(a) {
YH(this);
ad(0 <= a, 'Initial capacity must not be negative');
}
function Eo(a) {
YH(this);
a = a.pf();
id(a, this.a, 0, a.length, !1);
}
r(9, 679, Va, Rd, nx, Eo);
_.Bf = function (a, b) {
Pz(this, a, b);
};
_.Cf = function (a) {
return Ud(this, a);
};
_.nf = function (a) {
return -1 != zo(this, a);
};
_.Df = function (a) {
return Pr(this, a);
};
_.Ef = function (a) {
return zo(this, a);
};
_.of = function () {
return 0 == this.a.length;
};
_.Mc = function () {
return new $k(this);
};
_.Hf = function (a) {
return Ju(this, a);
};
_.If = function (a) {
return ae(this, a);
};
_.Jf = function (a, b) {
return Du(this, a, b);
};
_.od = ZH;
_.pf = function () {
return Bo(this);
};
_.qf = function (a) {
return Zd(this, a);
};
C(9);
function al(a) {
nd(a.a < a.c.a.length);
a.b = a.a++;
return a.c.a[a.b];
}
function EB(a) {
td(-1 != a.b);
Ju(a.c, a.a = a.b);
a.b = -1;
}
function $k(a) {
this.c = a;
}
r(31, 1, {}, $k);
_.Xc = function () {
return this.a < this.c.a.length;
};
_.Yc = function () {
return al(this);
};
_.Zc = function () {
EB(this);
};
_.a = 0;
_.b = -1;
C(31);
function dF(a, b, c, d, e, f) {
var g, l, m;
if (7 > d - c)
for (a = c, g = a + 1; g < d; ++g)
for (m = g; m > a && 0 < f.bf(b[m - 1], b[m]); --m)
c = b[m], b[m] = b[m - 1], b[m - 1] = c;
else if (l = c + e, g = d + e, m = l + (g - l >> 1), dF(b, a, l, m, -e, f), dF(b, a, m, g, -e, f), 0 >= f.bf(a[m - 1], a[m]))
for (; c < d;)
b[c++] = a[l++];
else
for (e = l, l = m; c < d;)
l >= g || e < m && 0 >= f.bf(a[e], a[l]) ? b[c++] = a[e++] : b[c++] = a[l++];
}
function $l(a) {
this.a = a;
}
r(47, 679, Va, $l);
_.nf = function (a) {
return -1 != vz(this, a);
};
_.Df = function (a) {
return pd(a, this.a.length), this.a[a];
};
_.Jf = function (a, b) {
var c;
c = (pd(a, this.a.length), this.a[a]);
this.a[a] = b;
return c;
};
_.od = ZH;
_.pf = function () {
return Zd(this, Ib(I, h, 1, this.a.length, 5));
};
_.qf = function (a) {
return Zd(this, a);
};
C(47);
function il() {
il = k;
jl = new $H();
Iz = new aI();
}
function wH(a) {
il();
var b, c;
c = 0;
for (b = a.Mc(); b.Xc();)
a = b.Yc(), c += null != a ? kb(a) : 0, c |= 0;
return c;
}
function hB(a) {
il();
var b;
b = new bI();
b.a.wf(a, b);
return new sx(b);
}
function cy(a, b) {
il();
var c;
c = new cI(1);
Ty(c.d, a, b);
return new dI(c);
}
function nu(a) {
il();
return A(a, 246) ? new nB(a) : new VA(a);
}
var jl, Iz;
function $H() {
}
r(501, 679, Va, $H);
_.nf = wx;
_.Df = function (a) {
pd(a, 0);
return null;
};
_.Mc = eI;
_.Ff = eI;
_.od = pD;
C(501);
function fI() {
fI = k;
gI = new hI();
}
function hI() {
}
r(502, 1, {}, hI);
_.Xc = Cl;
_.Lf = Cl;
_.Yc = iI;
_.Mf = iI;
_.Zc = function () {
throw new ud().backingJsObject;
};
var gI;
C(502);
r(504, 675, Wa, function () {
});
_.sf = wx;
_.tf = wx;
_.uf = function () {
return il(), Iz;
};
_.vf = iw;
_.od = pD;
C(504);
function aI() {
}
r(503, 677, Xa, aI);
_.nf = wx;
_.Mc = eI;
_.od = pD;
C(503);
r(220, 679, {
3: 1,
62: 1
}, function (a) {
this.a = a;
});
_.nf = function (a) {
return NH(this.a, a);
};
_.Df = function (a) {
pd(a, 1);
return this.a;
};
_.od = function () {
return 1;
};
C(220);
function jI() {
throw new gH().backingJsObject;
}
function pz(a) {
this.b = a;
}
r(102, 1, {}, pz);
_.bb = Db;
_.db = Eb;
_.nf = kI;
_.of = lI;
_.Mc = mI;
_.od = WH;
_.pf = nI;
_.qf = oI;
_.eb = function () {
return Ab(this.b);
};
C(102);
function pu(a) {
this.b = a;
}
r(40, 1, {}, pu);
_.Xc = pI;
_.Yc = qI;
_.Zc = rI;
C(40);
function mu(a, b) {
return a.a.Ef(b);
}
function bC(a, b, c) {
return new VA(a.a.Kf(b, c));
}
function VA(a) {
this.a = this.b = a;
}
r(77, 102, Ta, VA);
_.Cf = function () {
return jI();
};
_.nf = kI;
_.Mc = mI;
_.If = function () {
return jI();
};
_.od = WH;
_.pf = nI;
_.qf = oI;
_.bb = sI;
_.Df = function (a) {
return this.a.Df(a);
};
_.db = tI;
_.Ef = function (a) {
return mu(this, a);
};
_.of = function () {
return this.a.of();
};
_.Ff = function () {
return new uI(this.a.Gf(0));
};
_.Gf = function (a) {
return new uI(this.a.Gf(a));
};
_.Jf = vI;
_.Kf = function (a, b) {
return bC(this, a, b);
};
C(77);
function uI(a) {
this.a = this.b = a;
}
r(223, 40, {}, uI);
_.Xc = pI;
_.Yc = qI;
_.Zc = rI;
_.Lf = function () {
return this.a.Lf();
};
_.Mf = function () {
return this.a.Mf();
};
C(223);
function dI(a) {
this.b = a;
}
r(505, 1, Ra, dI);
_.uf = function () {
!this.a && (this.a = new wI(new EH(this.b)));
return this.a;
};
_.bb = function (a) {
return qH(this.b, a);
};
_.vf = function (a) {
return R(this.b, a);
};
_.db = function () {
return wH(new EH(this.b));
};
_.of = function () {
return 0 == qs(this.b);
};
_.wf = vI;
_.xf = Tab;
_.od = function () {
return qs(this.b);
};
_.eb = function () {
return tH(this.b);
};
C(505);
function sx(a) {
this.b = a;
}
r(160, 102, Sa, sx);
_.nf = kI;
_.of = lI;
_.Mc = mI;
_.od = WH;
_.pf = nI;
_.qf = oI;
_.bb = function (a) {
return this.b.bb(a);
};
_.db = function () {
return this.b.db();
};
C(160);
function xI(a, b) {
var c;
for (c = 0; c < b; ++c)
a[c] = new yI(a[c]);
}
function wI(a) {
this.b = a;
}
r(506, 160, Sa, wI);
_.nf = kI;
_.Mc = function () {
var a;
a = this.b.Mc();
return new zI(a);
};
_.pf = function () {
var a;
a = this.b.pf();
xI(a, a.length);
return a;
};
_.qf = function (a) {
a = this.b.qf(a);
xI(a, this.b.od());
return a;
};
C(506);
function zI(a) {
this.a = a;
}
r(507, 1, {}, zI);
_.Yc = function () {
return new yI(this.a.Yc());
};
_.Xc = PH;
_.Zc = Gq;
C(507);
function yI(a) {
this.a = a;
}
r(221, 1, { 54: 1 }, yI);
_.bb = sI;
_.Nf = function () {
return this.a.Nf();
};
_.Of = function () {
return this.a.Of();
};
_.db = tI;
_.Pf = Tab;
_.eb = function () {
return Ab(this.a);
};
C(221);
function nB(a) {
VA.call(this, a);
}
r(222, 77, Ta, nB);
C(222);
function bF() {
bF = k;
cF = new AI();
}
var cF;
function YB(a, b) {
bF();
var c = (t(a), a), d = (t(b), b);
B();
nb(c) ? d = Vc(c, d) : ob(c) ? (c = (t(c), c), d = (t(d), d), d = c < d ? -1 : c > d ? 1 : c == d ? 0 : isNaN(c) ? isNaN(d) ? 0 : 1 : -1) : pb(c) ? (c = yb((t(c), c)), d = yb((t(d), d)), B(), d = c == d ? 0 : c ? 1 : -1) : d = c.Ob(d);
return d;
}
function AI() {
}
r(537, 1, {}, AI);
_.bb = Db;
_.bf = function (a, b) {
return YB(a, b);
};
C(537);
function KH(a, b) {
if (b._gwt_modCount != a._gwt_modCount)
throw new BI().backingJsObject;
}
function LH(a, b) {
b._gwt_modCount = a._gwt_modCount;
}
function CI(a) {
a._gwt_modCount = (a._gwt_modCount | 0) + 1;
}
function BI() {
Fb();
Tb.call(this);
}
r(642, 10, ca, BI);
C(642);
function zg() {
ts(this);
}
function cI(a) {
ad(0 <= a, 'Negative initial capacity');
ad(!0, 'Non-positive load factor');
ts(this);
}
function Oz(a) {
ts(this);
var b;
t(a);
for (b = new DI(a).b.Qf(); JA(b.a);)
a = b.b = KA(b.a), this.wf(a.Nf(), a.Of());
}
r(22, 121, Wa, zg, cI, Oz);
_.zf = function (a, b) {
return sb(a) === sb(b) || null != a && mb(a, b);
};
_.Af = function (a) {
return kb(a) | 0;
};
C(22);
function Km(a, b) {
return null == a.a.wf(b, a);
}
function Oq(a, b) {
return a.a.sf(b);
}
function Yk() {
this.a = new zg();
}
function bI() {
this.a = new cI(1);
}
function Kt(a) {
this.a = new cI(a.a.od());
tx(this, a);
}
r(37, 677, Xa, Yk, bI, Kt);
_.nf = function (a) {
return Oq(this, a);
};
_.of = function () {
return 0 == this.a.od();
};
_.Mc = function () {
var a;
return a = new Lm(this.a).a.uf().Mc(), new Mm(a);
};
_.od = GH;
_.eb = function () {
return iH(new Lm(this.a));
};
C(37);
function EI(a, b, c) {
var d, e, f;
e = 0;
for (f = c.length; e < f; ++e)
if (d = c[e], a.b.zf(b, d.Nf()))
return d;
return null;
}
function xH(a, b) {
var c = null == b ? 0 : a.b.Af(b), c = a.a.get(c);
return EI(a, b, null == c ? [] : c);
}
function Ty(a, b, c) {
var d, e, f;
f = null == b ? 0 : a.b.Af(b);
e = (d = a.a.get(f), null == d ? [] : d);
if (0 == e.length)
a.a.set(f, e);
else if (d = EI(a, b, e))
return d.Pf(c);
e[e.length] = new sH(b, c);
++a.c;
CI(a.b);
return null;
}
function AH(a, b) {
var c, d, e, f;
e = null == b ? 0 : a.b.Af(b);
d = (c = a.a.get(e), null == c ? [] : c);
for (f = 0; f < d.length; f++)
if (c = d[f], a.b.zf(b, c.Nf()))
return 1 == d.length ? (d.length = 0, a.a['delete'](e)) : d.splice(f, 1), --a.c, CI(a.b), c.Of();
return null;
}
function CH(a) {
this.a = FI();
this.b = a;
}
r(536, 1, {}, CH);
_.Mc = function () {
return new IH(this);
};
_.c = 0;
C(536);
function IH(a) {
this.e = a;
this.b = this.e.a.entries();
this.a = [];
}
r(227, 1, {}, IH);
_.Yc = function () {
return this.d = this.a[this.c++], this.d;
};
_.Xc = function () {
var a;
if (this.c < this.a.length)
return !0;
a = this.b.next();
return a.done ? !1 : (this.a = a.value[1], this.c = 0, !0);
};
_.Zc = function () {
AH(this.e, this.d.Nf());
0 != this.c && --this.c;
};
_.c = 0;
_.d = null;
C(227);
function GI() {
GI = k;
var a;
if (a = 'function' === typeof Map && Map.prototype.entries)
try {
a = new Map().entries().next().done;
} catch (b) {
a = !1;
}
HI = a ? Map : II();
}
function JI() {
if (!Object.create || !Object.getOwnPropertyNames)
return !1;
var a = Object.create(null);
if (void 0 !== a.__proto__ || 0 != Object.getOwnPropertyNames(a).length)
return !1;
a.__proto__ = 42;
return 42 !== a.__proto__ || 0 == Object.getOwnPropertyNames(a).length ? !1 : !0;
}
function II() {
function a() {
this.obj = this.createObject();
}
a.prototype.createObject = function () {
return Object.create(null);
};
a.prototype.get = function (a) {
return this.obj[a];
};
a.prototype.set = function (a, c) {
this.obj[a] = c;
};
a.prototype['delete'] = function (a) {
delete this.obj[a];
};
a.prototype.keys = function () {
return Object.getOwnPropertyNames(this.obj);
};
a.prototype.entries = function () {
var a = this.keys(), c = this, d = 0;
return {
next: function () {
if (d >= a.length)
return { done: !0 };
var e = a[d++];
return {
value: [
e,
c.get(e)
],
done: !1
};
}
};
};
JI() || (a.prototype.createObject = function () {
return {};
}, a.prototype.get = function (a) {
return this.obj[':' + a];
}, a.prototype.set = function (a, c) {
this.obj[':' + a] = c;
}, a.prototype['delete'] = function (a) {
delete this.obj[':' + a];
}, a.prototype.keys = function () {
var a = [], c;
for (c in this.obj)
58 == c.charCodeAt(0) && a.push(c.substring(1));
return a;
});
return a;
}
function FI() {
GI();
return new HI();
}
var HI;
function zH(a, b, c) {
var d;
d = a.a.get(b);
a.a.set(b, void 0 === c ? null : c);
void 0 === d ? (++a.c, CI(a.b)) : ++a.d;
return d;
}
function BH(a, b) {
var c;
c = a.a.get(b);
void 0 === c ? ++a.d : (a.a['delete'](b), --a.c, CI(a.b));
return c;
}
function DH(a) {
this.a = FI();
this.b = a;
}
r(498, 1, {}, DH);
_.Mc = function () {
return new JH(this);
};
_.c = 0;
_.d = 0;
C(498);
function JH(a) {
this.d = a;
this.b = this.d.a.entries();
this.a = this.b.next();
}
r(219, 1, {}, JH);
_.Yc = function () {
return this.c = this.a, this.a = this.b.next(), new KI(this.d, this.c, this.d.d);
};
_.Xc = function () {
return !this.a.done;
};
_.Zc = function () {
BH(this.d, this.c.value[0]);
};
C(219);
function TH(a) {
return a.a.d != a.c ? a.a.a.get(a.b.value[0]) : a.b.value[1];
}
function KI(a, b, c) {
this.a = a;
this.b = b;
this.c = c;
}
r(499, 683, { 54: 1 }, KI);
_.Nf = function () {
return this.b.value[0];
};
_.Of = function () {
return TH(this);
};
_.Pf = function (a) {
return zH(this.a, this.b.value[0], a);
};
_.c = 0;
C(499);
function lC(a, b, c) {
var d;
if (d = R(a.c, b))
return b = RH(d, c), a.a && (LI(d), MI(d)), b;
d = new NI(a, b, c);
hl(a.c, b, d);
MI(d);
return null;
}
function kC() {
ts(this);
this.b = new OI(this);
this.c = new zg();
this.b.b = this.b;
this.b.a = this.b;
}
r(135, 22, Wa, kC);
_.yf = function () {
ts(this.c);
this.b.b = this.b;
this.b.a = this.b;
};
_.sf = function (a) {
return wp(this.c, a);
};
_.tf = function (a) {
var b;
for (b = this.b.a; b != this.b;) {
if (NH(b.e, a))
return !0;
b = b.a;
}
return !1;
};
_.uf = function () {
return new PI(this);
};
_.vf = function (a) {
return (a = R(this.c, a)) ? (this.a && (LI(a), MI(a)), a.e) : null;
};
_.wf = function (a, b) {
return lC(this, a, b);
};
_.xf = function (a) {
(a = gl(this.c, a)) ? (LI(a), a = a.e) : a = null;
return a;
};
_.od = function () {
return qs(this.c);
};
_.a = !1;
C(135);
function MI(a) {
var b;
b = a.c.b.b;
a.b = b;
a.a = a.c.b;
b.a = a.c.b.b = a;
}
function LI(a) {
a.a.b = a.b;
a.b.a = a.a;
a.a = a.b = null;
}
function OI(a) {
NI.call(this, a, null, null);
}
function NI(a, b, c) {
this.c = a;
this.d = b;
this.e = c;
}
r(136, 74, {
73: 1,
74: 1,
136: 1,
54: 1
}, OI, NI);
C(136);
function PI(a) {
this.a = a;
}
r(639, 677, Sa, PI);
_.nf = function (a) {
return A(a, 54) ? pH(this.a, a) : !1;
};
_.Mc = function () {
return new QI(this);
};
_.od = function () {
return qs(this.a.c);
};
C(639);
function QI(a) {
this.c = a;
this.b = a.a.b.a;
LH(a.a.c, this);
}
r(640, 1, {}, QI);
_.Yc = function () {
return KH(this.c.a.c, this), nd(this.b != this.c.a.b), this.a = this.b, this.b = this.b.a, this.a;
};
_.Xc = function () {
return this.b != this.c.a.b;
};
_.Zc = function () {
td(!!this.a);
KH(this.c.a.c, this);
LI(this.a);
gl(this.c.a.c, this.a.d);
LH(this.c.a.c, this);
this.a = null;
};
C(640);
function qx() {
this.a = new kC();
}
function rx(a) {
this.a = new kC();
tx(this, a);
}
r(78, 37, Xa, qx, rx);
C(78);
function Zz(a, b, c, d) {
var e;
e = new RI();
e.c = b;
e.b = c;
e.a = d;
d.b = c.a = e;
++a.b;
}
function Px(a) {
nd(0 != a.b);
return a.a.a.c;
}
function Qx(a) {
nd(0 != a.b);
return a.c.b.c;
}
function Ez(a, b) {
var c, d;
rd(b, a.b);
if (b >= a.b >> 1)
for (d = a.c, c = a.b; c > b; --c)
d = d.b;
else
for (d = a.a.a, c = 0; c < b; ++c)
d = d.a;
return new SI(a, b, d);
}
function Gy(a) {
a.a.a = a.c;
a.c.b = a.a;
a.a.b = a.c.a = null;
a.b = 0;
}
function Tz() {
this.a = new RI();
this.c = new RI();
Gy(this);
}
r(548, 692, {
3: 1,
62: 1
}, Tz);
_.Cf = function (a) {
Zz(this, a, this.c.b, this.c);
return !0;
};
_.Gf = function (a) {
return Ez(this, a);
};
_.od = xF;
_.b = 0;
C(548);
function XH(a, b) {
Zz(a.d, b, a.b.b, a.b);
++a.a;
a.c = null;
}
function Fz(a) {
nd(a.b != a.d.c);
a.c = a.b;
a.b = a.b.a;
++a.a;
return a.c.c;
}
function Rz(a) {
nd(a.b.b != a.d.a);
a.c = a.b = a.b.b;
--a.a;
return a.c.c;
}
function Sz(a) {
var b;
td(!!a.c);
b = a.c.a;
var c = a.d, d = a.c;
d.a.b = d.b;
d.b.a = d.a;
d.a = d.b = null;
d.c = null;
--c.b;
a.b == a.c ? a.b = b : --a.a;
a.c = null;
}
function SI(a, b, c) {
this.d = a;
this.b = c;
this.a = b;
}
r(549, 1, {}, SI);
_.Xc = function () {
return this.b != this.d.c;
};
_.Lf = function () {
return this.b.b != this.d.a;
};
_.Yc = function () {
return Fz(this);
};
_.Mf = function () {
return Rz(this);
};
_.Zc = function () {
Sz(this);
};
_.a = 0;
_.c = null;
C(549);
function RI() {
}
r(167, 1, {}, RI);
C(167);
function bG() {
bG = k;
cG = new TI();
dG = new UI();
}
r(673, 1, {});
var cG, dG;
C(673);
r(352, 673, {}, function () {
});
_.eb = function () {
return '';
};
C(352);
function TI() {
}
r(353, 673, {}, TI);
_.eb = function () {
return 'en';
};
C(353);
r(354, 673, {}, function () {
});
_.eb = function () {
return 'en_US';
};
C(354);
function UI() {
}
r(355, 673, {}, UI);
_.eb = function () {
return 'unknown';
};
C(355);
function od() {
Fb();
Tb.call(this);
}
r(53, 10, {
3: 1,
13: 1,
10: 1,
11: 1,
53: 1
}, od);
C(53);
function NH(a, b) {
return sb(a) === sb(b) || null != a && mb(a, b);
}
function SH(a) {
return null != a ? kb(a) : 0;
}
function kH(a, b) {
a.a ? xd(a.a, a.b) : a.a = new kl(a.d);
xd(a.a, b);
}
function jH(a, b) {
qd(', ', 'delimiter');
qd(a, 'prefix');
qd(b, 'suffix');
this.b = ', ';
this.d = a;
this.e = b;
this.c = this.d + ('' + this.e);
}
r(208, 1, {}, jH);
_.eb = function () {
return this.a ? 0 == Rb(this.e).length ? this.a.a : this.a.a + ('' + this.e) : this.c;
};
C(208);
function VI(a, b) {
var c, d;
for (d = a.b; d;) {
c = YB(b, d.d);
if (0 == c)
return d;
c = 0 > c ? 0 : 1;
d = d.a[c];
}
return null;
}
function FA(a) {
var b;
if (!a.b)
return null;
for (b = a.b; a = b.a[0];)
b = a;
return b;
}
function EA(a, b, c) {
var d, e;
d = null;
for (e = a.b; e;) {
a = YB(b, e.d);
if (c && 0 == a)
return e;
0 <= a ? e = e.a[1] : (d = e, e = e.a[0]);
}
return d;
}
function WI(a, b, c, d, e, f, g, l) {
var m;
d && ((m = d.a[0]) && WI(a, b, c, m, e, f, g, l), XI(c, d.d, e, f, g, l) && b.Cf(d), (d = d.a[1]) && WI(a, b, c, d, e, f, g, l));
}
function XI(a, b, c, d, e, f) {
var g, l;
return a.Sf() && (l = YB(b, c), 0 > l || !d && 0 == l) || a.Tf() && (g = YB(b, e), 0 < g || !f && 0 == g) ? !1 : !0;
}
function YI(a, b, c, d) {
var e;
if (b) {
e = YB(c.d, b.d);
if (0 == e)
return d.d = RH(b, c.e), d.b = !0, b;
e = 0 > e ? 0 : 1;
b.a[e] = YI(a, b.a[e], c, d);
ZI(b.a[e]) && (ZI(b.a[1 - e]) ? (b.b = !0, b.a[0].b = !1, b.a[1].b = !1) : ZI(b.a[e].a[e]) ? b = $I(b, 1 - e) : ZI(b.a[e].a[1 - e]) && (b = aJ(b, 1 - e)));
} else
return c;
return b;
}
function ZI(a) {
return !!a && a.b;
}
function OA(a, b, c) {
b = new bJ(b, c);
c = new cJ();
a.b = YI(a, a.b, b, c);
c.b || ++a.c;
a.b.b = !1;
return c.d;
}
function WA(a, b) {
var c;
c = new cJ();
dJ(a, b, c);
return c.d;
}
function dJ(a, b, c) {
var d, e, f, g, l, m, n, p, v;
if (a.b) {
p = f = null;
l = new bJ(null, null);
e = 1;
l.a[1] = a.b;
for (n = l; n.a[e];)
(m = e, g = p, p = n, n = n.a[e], d = YB(b, n.d), e = 0 > d ? 0 : 1, 0 != d || c.c && !NH(n.e, c.d) || (f = n), n && n.b || ZI(n.a[e])) || (ZI(n.a[1 - e]) ? p = p.a[m] = $I(n, e) : !ZI(n.a[1 - e]) && (v = p.a[1 - m]) && (ZI(v.a[1 - m]) || ZI(v.a[m]) ? (d = g.a[1] == p ? 1 : 0, ZI(v.a[m]) ? g.a[d] = aJ(p, m) : ZI(v.a[1 - m]) && (g.a[d] = $I(p, m)), n.b = g.a[d].b = !0, g.a[d].a[0].b = !1, g.a[d].a[1].b = !1) : (p.b = !1, v.b = !0, n.b = !0)));
if (f) {
c.b = !0;
c.d = f.e;
if (n != f) {
b = new bJ(n.d, n.e);
c = f;
g = l;
for (e = null == g.d || 0 < YB(c.d, g.d) ? 1 : 0; g.a[e] != c;)
g = g.a[e], e = 0 < YB(c.d, g.d) ? 1 : 0;
g.a[e] = b;
b.b = c.b;
b.a[0] = c.a[0];
b.a[1] = c.a[1];
c.a[0] = null;
c.a[1] = null;
p == f && (p = b);
}
p.a[p.a[1] == n ? 1 : 0] = n.a[n.a[0] ? 0 : 1];
--a.c;
}
a.b = l.a[1];
a.b && (a.b.b = !1);
}
}
function aJ(a, b) {
var c;
c = 1 - b;
a.a[c] = $I(a.a[c], c);
return $I(a, b);
}
function $I(a, b) {
var c, d;
c = 1 - b;
d = a.a[c];
a.a[c] = d.a[b];
d.a[b] = a;
a.b = !0;
d.b = !1;
return d;
}
function RA(a, b, c) {
return new AA(a, (BA(), eJ), b, c, null);
}
function TA() {
var a = null;
this.b = null;
!a && (a = (bF(), bF(), cF));
this.a = a;
}
r(169, 696, Wa, TA);
_.Qf = function () {
return new fJ(this);
};
_.uf = function () {
return new DI(this);
};
_.Rf = function (a) {
return VI(this, a);
};
_.wf = function (a, b) {
return OA(this, a, b);
};
_.xf = function (a) {
return WA(this, a);
};
_.od = tk;
_.c = 0;
C(169);
function LA(a) {
MH(a.a);
var b = a.c, c = a.b, d;
d = new cJ();
d.c = !0;
d.d = c.Of();
dJ(b, c.Nf(), d);
a.b = null;
}
function fJ(a) {
gJ.call(this, a, (BA(), hJ), null, !1, null, !1);
}
function gJ(a, b, c, d, e, f) {
var g;
this.c = a;
g = new Rd();
WI(a, g, b, a.b, c, d, e, f);
this.a = new Qz(g, 0);
}
r(132, 1, {}, fJ, gJ);
_.Yc = function () {
return this.b = KA(this.a);
};
_.Xc = function () {
return JA(this.a);
};
_.Zc = function () {
LA(this);
};
C(132);
function DI(a) {
this.b = a;
}
r(233, 170, Sa, DI);
C(233);
function bJ(a, b) {
this.d = a;
this.e = b;
this.a = Ib(iJ, h, 88, 2, 0);
this.b = !0;
}
r(88, 74, {
73: 1,
74: 1,
54: 1,
88: 1
}, bJ);
_.b = !1;
var iJ = C(88);
function cJ() {
}
r(171, 1, {}, cJ);
_.eb = function () {
return 'State: mv=' + this.c + ' value=' + this.d + ' done=' + this.a + ' found=' + this.b;
};
_.a = !1;
_.b = !1;
_.c = !1;
C(171);
function GA(a, b) {
return XI(a.f, b, a.b, a.a, a.e, a.d);
}
function jJ(a) {
var b;
return a.f.Sf() ? a.a ? b = EA(a.c, a.b, !0) : b = EA(a.c, a.b, !1) : b = FA(a.c), !(b && GA(a, b.d) && b);
}
function AA(a, b, c, d, e) {
this.c = a;
switch (b.g) {
case 2:
if (0 > YB(e, c))
throw new F('subMap: ' + e + ' less than ' + c).backingJsObject;
break;
case 1:
YB(e, e);
break;
case 3:
YB(c, c);
}
this.f = b;
this.b = c;
this.a = d;
this.e = e;
this.d = !1;
}
r(172, 696, Ra, AA);
_.Qf = function () {
return new gJ(this.c, this.f, this.b, this.a, this.e, this.d);
};
_.uf = function () {
return new IA(this, this);
};
_.Rf = function (a) {
return (a = VI(this.c, a)) && GA(this, a.d) ? a : null;
};
_.of = function () {
return jJ(this);
};
_.wf = function (a, b) {
if (!XI(this.f, a, this.b, this.a, this.e, this.d))
throw new F(a + ' outside the range ' + this.b + ' to ' + this.e).backingJsObject;
return OA(this.c, a, b);
};
_.xf = function (a) {
return XI(this.f, a, this.b, this.a, this.e, this.d) ? WA(this.c, a) : null;
};
_.od = function () {
var a, b;
a = 0;
for (b = new gJ(this.c, this.f, this.b, this.a, this.e, this.d); JA(b.a); b.b = KA(b.a))
++a;
return a;
};
_.a = !1;
_.d = !1;
C(172);
function IA(a, b) {
this.a = a;
this.b = b;
}
r(234, 170, Sa, IA);
_.of = function () {
return jJ(this.a);
};
C(234);
function BA() {
BA = k;
hJ = new kJ('All', 0);
CA = new lJ();
DA = new mJ();
eJ = new nJ();
}
function kJ(a, b) {
O.call(this, a, b);
}
r(61, 5, Ya, kJ);
_.Sf = Cl;
_.Tf = Cl;
var hJ, CA, DA, eJ, oJ = E(61, function () {
BA();
return z(u(oJ, 1), h, 61, 0, [
hJ,
CA,
DA,
eJ
]);
});
function lJ() {
O.call(this, 'Head', 1);
}
r(556, 61, Ya, lJ);
_.Tf = Dl;
E(556, null);
function mJ() {
O.call(this, 'Range', 2);
}
r(557, 61, Ya, mJ);
_.Sf = Dl;
_.Tf = Dl;
E(557, null);
function nJ() {
O.call(this, 'Tail', 3);
}
r(558, 61, Ya, nJ);
_.Sf = Dl;
E(558, null);
r(33, 1, {}, function () {
});
C(33);
var Jb = C(null), pJ = vc(), bA = wc('D'), ld = wc('C');
B();
_ = db('java.lang.Boolean');
_.$create__boolean = function (a) {
B();
return a;
};
_.$create__java_lang_String = function (a) {
B();
return Wc('true', a);
};
_.$isInstance = function (a) {
B();
return 'boolean' === typeof a;
};
_ = db('java.lang.Double');
_.$create__double = function (a) {
return a;
};
_.$create__java_lang_String = function (a) {
return xc(a);
};
_.$isInstance = function (a) {
return 'number' === typeof a;
};
_ = db('java.lang.Number');
_.$isInstance = function (a) {
return 'number' === typeof a || a instanceof Number;
};
y();
_ = db('java.lang.String');
_.$create = function () {
y();
return '';
};
_.$create__arrayOf_byte = function (a) {
y();
return Kc(a, 0, a.length, (bd(), ed));
};
_.$create__arrayOf_byte__int__int = function (a, b, c) {
y();
return Kc(a, b, c, (bd(), ed));
};
_.$create__arrayOf_byte__int__int__java_lang_String = function (a, b, c, d) {
y();
return Kc(a, b, c, Yc(d));
};
_.$create__arrayOf_byte__int__int__java_nio_charset_Charset = Kc;
_.$create__arrayOf_byte__java_lang_String = function (a, b) {
y();
return Kc(a, 0, a.length, Yc(b));
};
_.$create__arrayOf_byte__java_nio_charset_Charset = function (a, b) {
y();
return Kc(a, 0, a.length, Yc(b.a));
};
_.$create__arrayOf_char = function (a) {
y();
return Lc(a, 0, a.length);
};
_.$create__arrayOf_char__int__int = function (a, b, c) {
y();
return Lc(a, b, c);
};
_.$create__arrayOf_int__int__int = function (a, b, c) {
y();
var d, e;
e = Ib(ld, ea, 183, 2 * c, 15);
for (d = 0; 0 < c--;)
d += lc(a[b++], e, d);
return Lc(e, 0, d);
};
_.$create__java_lang_String = function (a) {
y();
return a;
};
_.$create__java_lang_StringBuffer = function (a) {
y();
return a ? a.a : 'null';
};
_.$create__java_lang_StringBuilder = function (a) {
y();
return a ? a.a : 'null';
};
_.$isInstance = function (a) {
y();
return 'string' === typeof a;
};
_ = db('vaadin.elements._api.GridDataSource', kG);
_.extractDataItem = XF;
_ = db('vaadin.elements._api.GridStaticSection', wF);
_ = db('vaadin.elements._api.JSColumn', UF);
_.promote = function (a) {
return mE(a);
};
_ = db('vaadin.elements.grid.GridElement', qF);
var Pd = (Cg(), function (a) {
Cg();
return function () {
var b;
a: {
var c = arguments, d;
0 != Fg && (d = Fd(), 2000 < d - Hg && (Hg = d, Gg = $wnd.setTimeout(Eg, 10)));
if (0 == Fg++) {
d = (Ig(), Jg);
var e, f;
if (d.b) {
f = null;
do
e = d.b, d.b = null, f = Sg(e, f);
while (d.b);
d.b = f;
}
d = !0;
} else
d = !1;
try {
b = a.apply(this, c);
break a;
} finally {
if (c = d)
if (d = (Ig(), Jg), d.c) {
f = null;
do
e = d.c, d.c = null, f = Sg(e, f);
while (d.c);
d.c = f;
}
--Fg;
c && -1 != Gg && ($wnd.clearTimeout(Gg), Gg = -1);
}
b = void 0;
}
return b;
};
}), gwtOnLoad = gwtOnLoad = function (a, b, c, d) {
function e() {
for (var a = 0; a < f.length; a++)
f[a]();
}
null == $a && ($a = []);
var f = $a;
$moduleName = b;
$moduleBase = c;
ab = d;
if (a)
try {
Pd(e)();
} catch (g) {
a(b, g);
}
else
Pd(e)();
};
(function () {
null == $a && ($a = []);
for (var a = $a, b = 0; b < arguments.length; b++)
a.push(arguments[b]);
}(function () {
$wnd.setTimeout(Pd(Fs));
var a, b, c;
b = $doc.compatMode;
a = z(Zb(tb), h, 2, 6, ['CSS1Compat']);
for (c = 0; c < a.length && a[c] !== b; c++);
zl();
Lg((Ig(), Jg), new MF());
delete $wnd.vaadin.elements._api;
}));
var qJ = [
[
[
'locale',
'default'
],
[
'user.agent',
'gecko1_8'
]
],
[
[
'locale',
'default'
],
[
'user.agent',
'safari'
]
]
];
'object' === typeof window && 'object' === typeof window.$gwt && (window.$gwt.permProps = qJ);
function Hc() {
return this.a;
}
function Db(a) {
return this === a;
}
function Eb() {
return zb(this);
}
function Cl() {
return !1;
}
function Dl() {
return !0;
}
function El() {
return 'Browser: webkit=' + this.g + ' mozilla=' + this.d + ' opera=' + this.f + ' msie=' + this.e + ' ie6=' + this.a + ' ie8=' + this.b + ' ie9=' + this.c;
}
function ko() {
if (this.a) {
var a = u(I, 1), b;
b = Hl(this);
b = go([this.a(b)]);
this.e = z(a, h, 1, 5, [b]);
}
}
function hd() {
return xb(this.a);
}
function Qq() {
}
function Rq() {
Nq(this);
}
function dn() {
return !1;
}
function au() {
}
function vu() {
}
function Nu(a) {
a.style.transform = '';
}
function jk() {
return this.g;
}
function zv() {
return Rh(this.n.style);
}
function yv() {
return Th(this.n.style);
}
function bq() {
null.Yf();
}
function Fw() {
lw();
}
function vx() {
return null;
}
function Wz() {
return 'td';
}
function wx() {
return !1;
}
function kz() {
return this.p;
}
function OC() {
vq();
nc(TB);
nc(pJ);
}
function qD() {
return -1;
}
function Sq(a) {
-1 == this.Z ? Bp((S(), this.ab), a | (this.ab.__eventBits || 0)) : this.Z |= a;
}
function tk() {
return this.c;
}
function jz() {
return this.i;
}
function ux() {
return this.k;
}
function SB() {
return this.v;
}
function qw() {
return this.a.c;
}
function xF() {
return this.b;
}
function yF() {
return this.d;
}
function Bs(a) {
return a;
}
function vG() {
return fE(), [];
}
function pD() {
return 0;
}
function Qb() {
return this.f;
}
function DG() {
this.e = -1;
}
function mH() {
return 0 == this.od();
}
function lH(a) {
return $z(this, a, !1);
}
function oH(a) {
return hH(this, a);
}
function nH() {
return this.qf(Ib(I, h, 1, this.od(), 5));
}
function OH() {
MH(this);
}
function GH() {
return this.a.od();
}
function PH() {
return this.a.Xc();
}
function QH() {
this.a.Zc();
}
function ZH() {
return this.a.length;
}
function eI() {
return il(), fI(), gI;
}
function iI() {
throw new od().backingJsObject;
}
function iw() {
return null;
}
function WH() {
return this.b.od();
}
function kI(a) {
return this.b.nf(a);
}
function mI() {
return new pu(this.b.Mc());
}
function nI() {
return this.b.pf();
}
function oI(a) {
return this.b.qf(a);
}
function pI() {
return this.b.Xc();
}
function qI() {
return this.b.Yc();
}
function rI() {
jI();
}
function vI() {
throw new gH().backingJsObject;
}
function Tab() {
throw new gH().backingJsObject;
}
function lI() {
return this.b.of();
}
function Gq() {
throw new gH().backingJsObject;
}
function sI(a) {
return this.a.bb(a);
}
function tI() {
return this.a.db();
}
;
window.gwtOnLoad = gwtOnLoad;
if (VaadinGridImport)
VaadinGridImport.onScriptLoad(gwtOnLoad);
}());
Polymer({
is: 'vaadin-grid',
_grid: undefined,
properties: {
cellClassGenerator: {
type: Function,
observer: '_cellClassGeneratorChanged'
},
disabled: {
type: Boolean,
observer: '_disabledChanged',
reflectToAttribute: true,
value: false
},
header: {
type: Object,
readOnly: true,
value: function () {
var _this = this;
return {
getCell: function (rowIndex, columnId) {
return _this._grid.getStaticSection().getHeaderCell(rowIndex, columnId);
},
addRow: function (rowIndex, cellContent) {
_this._grid.getStaticSection().addHeader(rowIndex, cellContent);
},
removeRow: function (rowIndex) {
_this._grid.getStaticSection().removeHeader(rowIndex || 0);
},
setRowClassName: function (rowIndex, className) {
_this._grid.getStaticSection().setHeaderRowClassName(rowIndex, className);
},
get defaultRow() {
return _this._grid.getStaticSection().getDefaultHeader();
},
set defaultRow(rowIndex) {
_this._grid.getStaticSection().setDefaultHeader(rowIndex);
},
get hidden() {
return _this._grid.getStaticSection().isHeaderHidden();
},
set hidden(hidden) {
_this._grid.getStaticSection().setHeaderHidden(hidden);
},
get rowCount() {
return _this._grid.getStaticSection().getHeaderRowCount();
}
};
}
},
footer: {
type: Object,
readOnly: true,
value: function () {
var _this = this;
return {
getCell: function (rowIndex, columnId) {
return _this._grid.getStaticSection().getFooterCell(rowIndex, columnId);
},
addRow: function (rowIndex, cellContent) {
_this._grid.getStaticSection().addFooter(rowIndex, cellContent);
},
removeRow: function (rowIndex) {
_this._grid.getStaticSection().removeFooter(rowIndex || 0);
},
setRowClassName: function (rowIndex, className) {
_this._grid.getStaticSection().setFooterRowClassName(rowIndex, className);
},
get hidden() {
return _this._grid.getStaticSection().isFooterHidden();
},
set hidden(hidden) {
_this._grid.getStaticSection().setFooterHidden(hidden);
},
get rowCount() {
return _this._grid.getStaticSection().getFooterRowCount();
}
};
}
},
frozenColumns: {
type: Number,
observer: '_applyFrozenColumns',
reflectToAttribute: true,
value: 0
},
items: { type: Object },
columns: {
type: Array,
notify: true
},
rowClassGenerator: {
type: Function,
observer: '_rowClassGeneratorChanged'
},
rowDetailsGenerator: {
type: Function,
observer: '_rowDetailsGeneratorChanged'
},
selection: {
type: Object,
readOnly: true,
value: function () {
var _this = this;
return {
select: function (index) {
_this._grid.getSelectionModel().select(index);
return _this;
},
deselect: function (index) {
_this._grid.getSelectionModel().deselect(index);
return _this;
},
clear: function () {
_this._grid.getSelectionModel().clear();
return _this;
},
selectAll: function () {
_this._grid.getSelectionModel().selectAll();
return _this;
},
selected: function (mapper, from, to) {
return _this._grid.getSelectionModel().selected(mapper, from, to);
},
deselected: function (mapper, from, to) {
return _this._grid.getSelectionModel().deselected(mapper, from, to);
},
get size() {
return _this._grid.getSelectionModel().size();
},
get mode() {
return _this._grid.getSelectionMode();
},
set mode(mode) {
_this._grid.setSelectionMode(mode);
}
};
}
},
sortOrder: {
type: Array,
notify: true,
observer: '_sortOrderChanged'
},
size: {
type: Number,
observer: '_sizeChanged'
},
visibleRows: {
type: Number,
reflectToAttribute: true,
observer: '_visibleRowsChanged'
},
_currentItems: { value: undefined }
},
attributeChanged: function (name, type, value) {
if (name === 'selection-mode' && this.selection.mode != value) {
this.selection.mode = value;
}
},
listeners: { 'selection-mode-changed': '_onSelectionModeChange' },
observers: [
'_columnsChanged(columns, columns.*)',
'_itemsChanged(items, items.*)'
],
_columnsChanged: function () {
this._grid.setColumns(this.columns);
this._applyFrozenColumns();
},
_itemsChanged: function (items) {
if (Array.isArray(items)) {
if (items != this._currentItems) {
this._currentItems = items;
this._grid.setDataSource(function (params, callback) {
var array = items.slice(params.index, params.index + params.count);
callback(array);
});
}
this.size = items.length;
this.refreshItems();
} else if (typeof items === 'function') {
this._grid.setDataSource(items);
} else {
throw new Error('Unknown items type: ' + items + '. Only arrays and functions are supported.');
}
},
_sizeChanged: function (size, oldSize) {
this._grid.sizeChanged(size, oldSize);
},
_onSelectionModeChange: function () {
this.serializeValueToAttribute(this.selection.mode, 'selection-mode');
},
_sortOrderChanged: function (sortOrder) {
this._grid.setSortOrder(sortOrder);
},
created: function () {
this._grid = new vaadin.elements.grid.GridElement();
},
ready: function () {
this.toggleClass('vaadin-grid-loading', true);
if (this.hasAttribute('selection-mode')) {
this.selection.mode = this.getAttribute('selection-mode');
}
this.columns = this._grid.getColumns();
this._grid.init(this, Polymer.dom(this.root), this.$.measureobject);
Polymer.dom(this).observeNodes(function (info) {
info.addedNodes.forEach(function (node) {
if (node.tagName === 'TABLE') {
var size = this.size;
this._grid.setLightDomTable(node);
if (size) {
this.size = size;
}
this._columnsChanged();
}
}.bind(this));
});
},
_bindResizeListener: function () {
var _this = this;
this.$.measureobject.addEventListener('load', function () {
var defaultView = this.contentDocument.defaultView;
var prevW = -1;
var prevH = -1;
defaultView.addEventListener('resize', function (e) {
var newW = defaultView.innerWidth;
var newH = defaultView.innerHeight;
if (newW != prevW || newH != prevH) {
prevW = newW;
prevH = newH;
_this._grid.updateSize();
}
}.bind(this));
_this._grid.updateSize();
});
this.$.measureobject.src = 'about:blank';
},
attached: function () {
this._grid.setHeaderHeight(parseFloat(this.getComputedStyleValue('--vaadin-grid-header-row-height')) || 56);
this._grid.setFooterHeight(parseFloat(this.getComputedStyleValue('--vaadin-grid-footer-row-height')) || 56);
this._grid.setBodyHeight(parseFloat(this.getComputedStyleValue('--vaadin-grid-row-height')) || 48);
this._bindResizeListener();
this.then(function () {
this.toggleClass('vaadin-grid-loading', false);
}.bind(this));
},
scrollToRow: function (index, scrollDestination) {
this._grid.scrollToRow(index, scrollDestination);
return this;
},
scrollToStart: function () {
this._grid.scrollToStart();
return this;
},
scrollToEnd: function () {
this._grid.scrollToEnd();
return this;
},
addColumn: function (column, beforeColumn) {
this._grid.addColumn(column, beforeColumn);
},
removeColumn: function (id) {
this._grid.removeColumn(id);
},
_rowClassGeneratorChanged: function (row) {
this._grid.setRowClassGenerator(row);
},
_cellClassGeneratorChanged: function (cell) {
this._grid.setCellClassGenerator(cell);
},
_disabledChanged: function (disabled) {
this._grid.setDisabled(disabled);
},
_applyFrozenColumns: function () {
if (this.columns && this.columns.length >= this.frozenColumns) {
this._grid.setFrozenColumns(this.frozenColumns);
}
},
_visibleRowsChanged: function (visibleRows) {
this._grid.setVisibleRows(visibleRows);
},
then: function (callback) {
return this._grid.then(callback);
},
_rowDetailsGeneratorChanged: function (rowDetailsGenerator) {
this._grid.setRowDetailsGenerator(rowDetailsGenerator);
},
setRowDetailsVisible: function (rowIndex, visible) {
this._grid.setRowDetailsVisible(rowIndex, visible);
},
refreshItems: function () {
this._grid.getDataSource().refreshItems();
},
getItem: function (rowIndex, callback, onlyCached) {
this._grid.getItem(rowIndex, callback, onlyCached);
}
});
(function () {
window.WebComponents = window.WebComponents || { flags: {} };
var file = 'webcomponents-lite.js';
var script = document.querySelector('script[src*="' + file + '"]');
var flags = {};
if (!flags.noOpts) {
location.search.slice(1).split('&').forEach(function (option) {
var parts = option.split('=');
var match;
if (parts[0] && (match = parts[0].match(/wc-(.+)/))) {
flags[match[1]] = parts[1] || true;
}
});
if (script) {
for (var i = 0, a; a = script.attributes[i]; i++) {
if (a.name !== 'src') {
flags[a.name] = a.value || true;
}
}
}
if (flags.log && flags.log.split) {
var parts = flags.log.split(',');
flags.log = {};
parts.forEach(function (f) {
flags.log[f] = true;
});
} else {
flags.log = {};
}
}
if (flags.register) {
window.CustomElements = window.CustomElements || { flags: {} };
window.CustomElements.flags.register = flags.register;
}
WebComponents.flags = flags;
}());
(function (scope) {
'use strict';
var hasWorkingUrl = false;
if (!scope.forceJURL) {
try {
var u = new URL('b', 'http://a');
u.pathname = 'c%20d';
hasWorkingUrl = u.href === 'http://a/c%20d';
} catch (e) {
}
}
if (hasWorkingUrl)
return;
var relative = Object.create(null);
relative['ftp'] = 21;
relative['file'] = 0;
relative['gopher'] = 70;
relative['http'] = 80;
relative['https'] = 443;
relative['ws'] = 80;
relative['wss'] = 443;
var relativePathDotMapping = Object.create(null);
relativePathDotMapping['%2e'] = '.';
relativePathDotMapping['.%2e'] = '..';
relativePathDotMapping['%2e.'] = '..';
relativePathDotMapping['%2e%2e'] = '..';
function isRelativeScheme(scheme) {
return relative[scheme] !== undefined;
}
function invalid() {
clear.call(this);
this._isInvalid = true;
}
function IDNAToASCII(h) {
if ('' == h) {
invalid.call(this);
}
return h.toLowerCase();
}
function percentEscape(c) {
var unicode = c.charCodeAt(0);
if (unicode > 32 && unicode < 127 && [
34,
35,
60,
62,
63,
96
].indexOf(unicode) == -1) {
return c;
}
return encodeURIComponent(c);
}
function percentEscapeQuery(c) {
var unicode = c.charCodeAt(0);
if (unicode > 32 && unicode < 127 && [
34,
35,
60,
62,
96
].indexOf(unicode) == -1) {
return c;
}
return encodeURIComponent(c);
}
var EOF = undefined, ALPHA = /[a-zA-Z]/, ALPHANUMERIC = /[a-zA-Z0-9\+\-\.]/;
function parse(input, stateOverride, base) {
function err(message) {
errors.push(message);
}
var state = stateOverride || 'scheme start', cursor = 0, buffer = '', seenAt = false, seenBracket = false, errors = [];
loop:
while ((input[cursor - 1] != EOF || cursor == 0) && !this._isInvalid) {
var c = input[cursor];
switch (state) {
case 'scheme start':
if (c && ALPHA.test(c)) {
buffer += c.toLowerCase();
state = 'scheme';
} else if (!stateOverride) {
buffer = '';
state = 'no scheme';
continue;
} else {
err('Invalid scheme.');
break loop;
}
break;
case 'scheme':
if (c && ALPHANUMERIC.test(c)) {
buffer += c.toLowerCase();
} else if (':' == c) {
this._scheme = buffer;
buffer = '';
if (stateOverride) {
break loop;
}
if (isRelativeScheme(this._scheme)) {
this._isRelative = true;
}
if ('file' == this._scheme) {
state = 'relative';
} else if (this._isRelative && base && base._scheme == this._scheme) {
state = 'relative or authority';
} else if (this._isRelative) {
state = 'authority first slash';
} else {
state = 'scheme data';
}
} else if (!stateOverride) {
buffer = '';
cursor = 0;
state = 'no scheme';
continue;
} else if (EOF == c) {
break loop;
} else {
err('Code point not allowed in scheme: ' + c);
break loop;
}
break;
case 'scheme data':
if ('?' == c) {
this._query = '?';
state = 'query';
} else if ('#' == c) {
this._fragment = '#';
state = 'fragment';
} else {
if (EOF != c && '\t' != c && '\n' != c && '\r' != c) {
this._schemeData += percentEscape(c);
}
}
break;
case 'no scheme':
if (!base || !isRelativeScheme(base._scheme)) {
err('Missing scheme.');
invalid.call(this);
} else {
state = 'relative';
continue;
}
break;
case 'relative or authority':
if ('/' == c && '/' == input[cursor + 1]) {
state = 'authority ignore slashes';
} else {
err('Expected /, got: ' + c);
state = 'relative';
continue;
}
break;
case 'relative':
this._isRelative = true;
if ('file' != this._scheme)
this._scheme = base._scheme;
if (EOF == c) {
this._host = base._host;
this._port = base._port;
this._path = base._path.slice();
this._query = base._query;
this._username = base._username;
this._password = base._password;
break loop;
} else if ('/' == c || '\\' == c) {
if ('\\' == c)
err('\\ is an invalid code point.');
state = 'relative slash';
} else if ('?' == c) {
this._host = base._host;
this._port = base._port;
this._path = base._path.slice();
this._query = '?';
this._username = base._username;
this._password = base._password;
state = 'query';
} else if ('#' == c) {
this._host = base._host;
this._port = base._port;
this._path = base._path.slice();
this._query = base._query;
this._fragment = '#';
this._username = base._username;
this._password = base._password;
state = 'fragment';
} else {
var nextC = input[cursor + 1];
var nextNextC = input[cursor + 2];
if ('file' != this._scheme || !ALPHA.test(c) || nextC != ':' && nextC != '|' || EOF != nextNextC && '/' != nextNextC && '\\' != nextNextC && '?' != nextNextC && '#' != nextNextC) {
this._host = base._host;
this._port = base._port;
this._username = base._username;
this._password = base._password;
this._path = base._path.slice();
this._path.pop();
}
state = 'relative path';
continue;
}
break;
case 'relative slash':
if ('/' == c || '\\' == c) {
if ('\\' == c) {
err('\\ is an invalid code point.');
}
if ('file' == this._scheme) {
state = 'file host';
} else {
state = 'authority ignore slashes';
}
} else {
if ('file' != this._scheme) {
this._host = base._host;
this._port = base._port;
this._username = base._username;
this._password = base._password;
}
state = 'relative path';
continue;
}
break;
case 'authority first slash':
if ('/' == c) {
state = 'authority second slash';
} else {
err('Expected \'/\', got: ' + c);
state = 'authority ignore slashes';
continue;
}
break;
case 'authority second slash':
state = 'authority ignore slashes';
if ('/' != c) {
err('Expected \'/\', got: ' + c);
continue;
}
break;
case 'authority ignore slashes':
if ('/' != c && '\\' != c) {
state = 'authority';
continue;
} else {
err('Expected authority, got: ' + c);
}
break;
case 'authority':
if ('@' == c) {
if (seenAt) {
err('@ already seen.');
buffer += '%40';
}
seenAt = true;
for (var i = 0; i < buffer.length; i++) {
var cp = buffer[i];
if ('\t' == cp || '\n' == cp || '\r' == cp) {
err('Invalid whitespace in authority.');
continue;
}
if (':' == cp && null === this._password) {
this._password = '';
continue;
}
var tempC = percentEscape(cp);
null !== this._password ? this._password += tempC : this._username += tempC;
}
buffer = '';
} else if (EOF == c || '/' == c || '\\' == c || '?' == c || '#' == c) {
cursor -= buffer.length;
buffer = '';
state = 'host';
continue;
} else {
buffer += c;
}
break;
case 'file host':
if (EOF == c || '/' == c || '\\' == c || '?' == c || '#' == c) {
if (buffer.length == 2 && ALPHA.test(buffer[0]) && (buffer[1] == ':' || buffer[1] == '|')) {
state = 'relative path';
} else if (buffer.length == 0) {
state = 'relative path start';
} else {
this._host = IDNAToASCII.call(this, buffer);
buffer = '';
state = 'relative path start';
}
continue;
} else if ('\t' == c || '\n' == c || '\r' == c) {
err('Invalid whitespace in file host.');
} else {
buffer += c;
}
break;
case 'host':
case 'hostname':
if (':' == c && !seenBracket) {
this._host = IDNAToASCII.call(this, buffer);
buffer = '';
state = 'port';
if ('hostname' == stateOverride) {
break loop;
}
} else if (EOF == c || '/' == c || '\\' == c || '?' == c || '#' == c) {
this._host = IDNAToASCII.call(this, buffer);
buffer = '';
state = 'relative path start';
if (stateOverride) {
break loop;
}
continue;
} else if ('\t' != c && '\n' != c && '\r' != c) {
if ('[' == c) {
seenBracket = true;
} else if (']' == c) {
seenBracket = false;
}
buffer += c;
} else {
err('Invalid code point in host/hostname: ' + c);
}
break;
case 'port':
if (/[0-9]/.test(c)) {
buffer += c;
} else if (EOF == c || '/' == c || '\\' == c || '?' == c || '#' == c || stateOverride) {
if ('' != buffer) {
var temp = parseInt(buffer, 10);
if (temp != relative[this._scheme]) {
this._port = temp + '';
}
buffer = '';
}
if (stateOverride) {
break loop;
}
state = 'relative path start';
continue;
} else if ('\t' == c || '\n' == c || '\r' == c) {
err('Invalid code point in port: ' + c);
} else {
invalid.call(this);
}
break;
case 'relative path start':
if ('\\' == c)
err('\'\\\' not allowed in path.');
state = 'relative path';
if ('/' != c && '\\' != c) {
continue;
}
break;
case 'relative path':
if (EOF == c || '/' == c || '\\' == c || !stateOverride && ('?' == c || '#' == c)) {
if ('\\' == c) {
err('\\ not allowed in relative path.');
}
var tmp;
if (tmp = relativePathDotMapping[buffer.toLowerCase()]) {
buffer = tmp;
}
if ('..' == buffer) {
this._path.pop();
if ('/' != c && '\\' != c) {
this._path.push('');
}
} else if ('.' == buffer && '/' != c && '\\' != c) {
this._path.push('');
} else if ('.' != buffer) {
if ('file' == this._scheme && this._path.length == 0 && buffer.length == 2 && ALPHA.test(buffer[0]) && buffer[1] == '|') {
buffer = buffer[0] + ':';
}
this._path.push(buffer);
}
buffer = '';
if ('?' == c) {
this._query = '?';
state = 'query';
} else if ('#' == c) {
this._fragment = '#';
state = 'fragment';
}
} else if ('\t' != c && '\n' != c && '\r' != c) {
buffer += percentEscape(c);
}
break;
case 'query':
if (!stateOverride && '#' == c) {
this._fragment = '#';
state = 'fragment';
} else if (EOF != c && '\t' != c && '\n' != c && '\r' != c) {
this._query += percentEscapeQuery(c);
}
break;
case 'fragment':
if (EOF != c && '\t' != c && '\n' != c && '\r' != c) {
this._fragment += c;
}
break;
}
cursor++;
}
}
function clear() {
this._scheme = '';
this._schemeData = '';
this._username = '';
this._password = null;
this._host = '';
this._port = '';
this._path = [];
this._query = '';
this._fragment = '';
this._isInvalid = false;
this._isRelative = false;
}
function jURL(url, base) {
if (base !== undefined && !(base instanceof jURL))
base = new jURL(String(base));
this._url = url;
clear.call(this);
var input = url.replace(/^[ \t\r\n\f]+|[ \t\r\n\f]+$/g, '');
parse.call(this, input, null, base);
}
jURL.prototype = {
toString: function () {
return this.href;
},
get href() {
if (this._isInvalid)
return this._url;
var authority = '';
if ('' != this._username || null != this._password) {
authority = this._username + (null != this._password ? ':' + this._password : '') + '@';
}
return this.protocol + (this._isRelative ? '//' + authority + this.host : '') + this.pathname + this._query + this._fragment;
},
set href(href) {
clear.call(this);
parse.call(this, href);
},
get protocol() {
return this._scheme + ':';
},
set protocol(protocol) {
if (this._isInvalid)
return;
parse.call(this, protocol + ':', 'scheme start');
},
get host() {
return this._isInvalid ? '' : this._port ? this._host + ':' + this._port : this._host;
},
set host(host) {
if (this._isInvalid || !this._isRelative)
return;
parse.call(this, host, 'host');
},
get hostname() {
return this._host;
},
set hostname(hostname) {
if (this._isInvalid || !this._isRelative)
return;
parse.call(this, hostname, 'hostname');
},
get port() {
return this._port;
},
set port(port) {
if (this._isInvalid || !this._isRelative)
return;
parse.call(this, port, 'port');
},
get pathname() {
return this._isInvalid ? '' : this._isRelative ? '/' + this._path.join('/') : this._schemeData;
},
set pathname(pathname) {
if (this._isInvalid || !this._isRelative)
return;
this._path = [];
parse.call(this, pathname, 'relative path start');
},
get search() {
return this._isInvalid || !this._query || '?' == this._query ? '' : this._query;
},
set search(search) {
if (this._isInvalid || !this._isRelative)
return;
this._query = '?';
if ('?' == search[0])
search = search.slice(1);
parse.call(this, search, 'query');
},
get hash() {
return this._isInvalid || !this._fragment || '#' == this._fragment ? '' : this._fragment;
},
set hash(hash) {
if (this._isInvalid)
return;
this._fragment = '#';
if ('#' == hash[0])
hash = hash.slice(1);
parse.call(this, hash, 'fragment');
},
get origin() {
var host;
if (this._isInvalid || !this._scheme) {
return '';
}
switch (this._scheme) {
case 'data':
case 'file':
case 'javascript':
case 'mailto':
return 'null';
}
host = this.host;
if (!host) {
return '';
}
return this._scheme + '://' + host;
}
};
var OriginalURL = scope.URL;
if (OriginalURL) {
jURL.createObjectURL = function (blob) {
return OriginalURL.createObjectURL.apply(OriginalURL, arguments);
};
jURL.revokeObjectURL = function (url) {
OriginalURL.revokeObjectURL(url);
};
}
scope.URL = jURL;
}(self));
if (typeof WeakMap === 'undefined') {
(function () {
var defineProperty = Object.defineProperty;
var counter = Date.now() % 1000000000;
var WeakMap = function () {
this.name = '__st' + (Math.random() * 1000000000 >>> 0) + (counter++ + '__');
};
WeakMap.prototype = {
set: function (key, value) {
var entry = key[this.name];
if (entry && entry[0] === key)
entry[1] = value;
else
defineProperty(key, this.name, {
value: [
key,
value
],
writable: true
});
return this;
},
get: function (key) {
var entry;
return (entry = key[this.name]) && entry[0] === key ? entry[1] : undefined;
},
'delete': function (key) {
var entry = key[this.name];
if (!entry || entry[0] !== key)
return false;
entry[0] = entry[1] = undefined;
return true;
},
has: function (key) {
var entry = key[this.name];
if (!entry)
return false;
return entry[0] === key;
}
};
window.WeakMap = WeakMap;
}());
}
(function (global) {
if (global.JsMutationObserver) {
return;
}
var registrationsTable = new WeakMap();
var setImmediate;
if (/Trident|Edge/.test(navigator.userAgent)) {
setImmediate = setTimeout;
} else if (window.setImmediate) {
setImmediate = window.setImmediate;
} else {
var setImmediateQueue = [];
var sentinel = String(Math.random());
window.addEventListener('message', function (e) {
if (e.data === sentinel) {
var queue = setImmediateQueue;
setImmediateQueue = [];
queue.forEach(function (func) {
func();
});
}
});
setImmediate = function (func) {
setImmediateQueue.push(func);
window.postMessage(sentinel, '*');
};
}
var isScheduled = false;
var scheduledObservers = [];
function scheduleCallback(observer) {
scheduledObservers.push(observer);
if (!isScheduled) {
isScheduled = true;
setImmediate(dispatchCallbacks);
}
}
function wrapIfNeeded(node) {
return window.ShadowDOMPolyfill && window.ShadowDOMPolyfill.wrapIfNeeded(node) || node;
}
function dispatchCallbacks() {
isScheduled = false;
var observers = scheduledObservers;
scheduledObservers = [];
observers.sort(function (o1, o2) {
return o1.uid_ - o2.uid_;
});
var anyNonEmpty = false;
observers.forEach(function (observer) {
var queue = observer.takeRecords();
removeTransientObserversFor(observer);
if (queue.length) {
observer.callback_(queue, observer);
anyNonEmpty = true;
}
});
if (anyNonEmpty)
dispatchCallbacks();
}
function removeTransientObserversFor(observer) {
observer.nodes_.forEach(function (node) {
var registrations = registrationsTable.get(node);
if (!registrations)
return;
registrations.forEach(function (registration) {
if (registration.observer === observer)
registration.removeTransientObservers();
});
});
}
function forEachAncestorAndObserverEnqueueRecord(target, callback) {
for (var node = target; node; node = node.parentNode) {
var registrations = registrationsTable.get(node);
if (registrations) {
for (var j = 0; j < registrations.length; j++) {
var registration = registrations[j];
var options = registration.options;
if (node !== target && !options.subtree)
continue;
var record = callback(options);
if (record)
registration.enqueue(record);
}
}
}
}
var uidCounter = 0;
function JsMutationObserver(callback) {
this.callback_ = callback;
this.nodes_ = [];
this.records_ = [];
this.uid_ = ++uidCounter;
}
JsMutationObserver.prototype = {
observe: function (target, options) {
target = wrapIfNeeded(target);
if (!options.childList && !options.attributes && !options.characterData || options.attributeOldValue && !options.attributes || options.attributeFilter && options.attributeFilter.length && !options.attributes || options.characterDataOldValue && !options.characterData) {
throw new SyntaxError();
}
var registrations = registrationsTable.get(target);
if (!registrations)
registrationsTable.set(target, registrations = []);
var registration;
for (var i = 0; i < registrations.length; i++) {
if (registrations[i].observer === this) {
registration = registrations[i];
registration.removeListeners();
registration.options = options;
break;
}
}
if (!registration) {
registration = new Registration(this, target, options);
registrations.push(registration);
this.nodes_.push(target);
}
registration.addListeners();
},
disconnect: function () {
this.nodes_.forEach(function (node) {
var registrations = registrationsTable.get(node);
for (var i = 0; i < registrations.length; i++) {
var registration = registrations[i];
if (registration.observer === this) {
registration.removeListeners();
registrations.splice(i, 1);
break;
}
}
}, this);
this.records_ = [];
},
takeRecords: function () {
var copyOfRecords = this.records_;
this.records_ = [];
return copyOfRecords;
}
};
function MutationRecord(type, target) {
this.type = type;
this.target = target;
this.addedNodes = [];
this.removedNodes = [];
this.previousSibling = null;
this.nextSibling = null;
this.attributeName = null;
this.attributeNamespace = null;
this.oldValue = null;
}
function copyMutationRecord(original) {
var record = new MutationRecord(original.type, original.target);
record.addedNodes = original.addedNodes.slice();
record.removedNodes = original.removedNodes.slice();
record.previousSibling = original.previousSibling;
record.nextSibling = original.nextSibling;
record.attributeName = original.attributeName;
record.attributeNamespace = original.attributeNamespace;
record.oldValue = original.oldValue;
return record;
}
var currentRecord, recordWithOldValue;
function getRecord(type, target) {
return currentRecord = new MutationRecord(type, target);
}
function getRecordWithOldValue(oldValue) {
if (recordWithOldValue)
return recordWithOldValue;
recordWithOldValue = copyMutationRecord(currentRecord);
recordWithOldValue.oldValue = oldValue;
return recordWithOldValue;
}
function clearRecords() {
currentRecord = recordWithOldValue = undefined;
}
function recordRepresentsCurrentMutation(record) {
return record === recordWithOldValue || record === currentRecord;
}
function selectRecord(lastRecord, newRecord) {
if (lastRecord === newRecord)
return lastRecord;
if (recordWithOldValue && recordRepresentsCurrentMutation(lastRecord))
return recordWithOldValue;
return null;
}
function Registration(observer, target, options) {
this.observer = observer;
this.target = target;
this.options = options;
this.transientObservedNodes = [];
}
Registration.prototype = {
enqueue: function (record) {
var records = this.observer.records_;
var length = records.length;
if (records.length > 0) {
var lastRecord = records[length - 1];
var recordToReplaceLast = selectRecord(lastRecord, record);
if (recordToReplaceLast) {
records[length - 1] = recordToReplaceLast;
return;
}
} else {
scheduleCallback(this.observer);
}
records[length] = record;
},
addListeners: function () {
this.addListeners_(this.target);
},
addListeners_: function (node) {
var options = this.options;
if (options.attributes)
node.addEventListener('DOMAttrModified', this, true);
if (options.characterData)
node.addEventListener('DOMCharacterDataModified', this, true);
if (options.childList)
node.addEventListener('DOMNodeInserted', this, true);
if (options.childList || options.subtree)
node.addEventListener('DOMNodeRemoved', this, true);
},
removeListeners: function () {
this.removeListeners_(this.target);
},
removeListeners_: function (node) {
var options = this.options;
if (options.attributes)
node.removeEventListener('DOMAttrModified', this, true);
if (options.characterData)
node.removeEventListener('DOMCharacterDataModified', this, true);
if (options.childList)
node.removeEventListener('DOMNodeInserted', this, true);
if (options.childList || options.subtree)
node.removeEventListener('DOMNodeRemoved', this, true);
},
addTransientObserver: function (node) {
if (node === this.target)
return;
this.addListeners_(node);
this.transientObservedNodes.push(node);
var registrations = registrationsTable.get(node);
if (!registrations)
registrationsTable.set(node, registrations = []);
registrations.push(this);
},
removeTransientObservers: function () {
var transientObservedNodes = this.transientObservedNodes;
this.transientObservedNodes = [];
transientObservedNodes.forEach(function (node) {
this.removeListeners_(node);
var registrations = registrationsTable.get(node);
for (var i = 0; i < registrations.length; i++) {
if (registrations[i] === this) {
registrations.splice(i, 1);
break;
}
}
}, this);
},
handleEvent: function (e) {
e.stopImmediatePropagation();
switch (e.type) {
case 'DOMAttrModified':
var name = e.attrName;
var namespace = e.relatedNode.namespaceURI;
var target = e.target;
var record = new getRecord('attributes', target);
record.attributeName = name;
record.attributeNamespace = namespace;
var oldValue = e.attrChange === MutationEvent.ADDITION ? null : e.prevValue;
forEachAncestorAndObserverEnqueueRecord(target, function (options) {
if (!options.attributes)
return;
if (options.attributeFilter && options.attributeFilter.length && options.attributeFilter.indexOf(name) === -1 && options.attributeFilter.indexOf(namespace) === -1) {
return;
}
if (options.attributeOldValue)
return getRecordWithOldValue(oldValue);
return record;
});
break;
case 'DOMCharacterDataModified':
var target = e.target;
var record = getRecord('characterData', target);
var oldValue = e.prevValue;
forEachAncestorAndObserverEnqueueRecord(target, function (options) {
if (!options.characterData)
return;
if (options.characterDataOldValue)
return getRecordWithOldValue(oldValue);
return record;
});
break;
case 'DOMNodeRemoved':
this.addTransientObserver(e.target);
case 'DOMNodeInserted':
var changedNode = e.target;
var addedNodes, removedNodes;
if (e.type === 'DOMNodeInserted') {
addedNodes = [changedNode];
removedNodes = [];
} else {
addedNodes = [];
removedNodes = [changedNode];
}
var previousSibling = changedNode.previousSibling;
var nextSibling = changedNode.nextSibling;
var record = getRecord('childList', e.target.parentNode);
record.addedNodes = addedNodes;
record.removedNodes = removedNodes;
record.previousSibling = previousSibling;
record.nextSibling = nextSibling;
forEachAncestorAndObserverEnqueueRecord(e.relatedNode, function (options) {
if (!options.childList)
return;
return record;
});
}
clearRecords();
}
};
global.JsMutationObserver = JsMutationObserver;
if (!global.MutationObserver) {
global.MutationObserver = JsMutationObserver;
JsMutationObserver._isPolyfilled = true;
}
}(self));
(function () {
var needsTemplate = typeof HTMLTemplateElement === 'undefined';
if (/Trident/.test(navigator.userAgent)) {
(function () {
var importNode = document.importNode;
document.importNode = function () {
var n = importNode.apply(document, arguments);
if (n.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
var f = document.createDocumentFragment();
f.appendChild(n);
return f;
} else {
return n;
}
};
}());
}
var needsCloning = function () {
if (!needsTemplate) {
var t = document.createElement('template');
var t2 = document.createElement('template');
t2.content.appendChild(document.createElement('div'));
t.content.appendChild(t2);
var clone = t.cloneNode(true);
return clone.content.childNodes.length === 0 || clone.content.firstChild.content.childNodes.length === 0;
}
}();
var TEMPLATE_TAG = 'template';
var TemplateImpl = function () {
};
if (needsTemplate) {
var contentDoc = document.implementation.createHTMLDocument('template');
var canDecorate = true;
var templateStyle = document.createElement('style');
templateStyle.textContent = TEMPLATE_TAG + '{display:none;}';
var head = document.head;
head.insertBefore(templateStyle, head.firstElementChild);
TemplateImpl.prototype = Object.create(HTMLElement.prototype);
TemplateImpl.decorate = function (template) {
if (template.content) {
return;
}
template.content = contentDoc.createDocumentFragment();
var child;
while (child = template.firstChild) {
template.content.appendChild(child);
}
template.cloneNode = function (deep) {
return TemplateImpl.cloneNode(this, deep);
};
if (canDecorate) {
try {
Object.defineProperty(template, 'innerHTML', {
get: function () {
var o = '';
for (var e = this.content.firstChild; e; e = e.nextSibling) {
o += e.outerHTML || escapeData(e.data);
}
return o;
},
set: function (text) {
contentDoc.body.innerHTML = text;
TemplateImpl.bootstrap(contentDoc);
while (this.content.firstChild) {
this.content.removeChild(this.content.firstChild);
}
while (contentDoc.body.firstChild) {
this.content.appendChild(contentDoc.body.firstChild);
}
},
configurable: true
});
} catch (err) {
canDecorate = false;
}
}
TemplateImpl.bootstrap(template.content);
};
TemplateImpl.bootstrap = function (doc) {
var templates = doc.querySelectorAll(TEMPLATE_TAG);
for (var i = 0, l = templates.length, t; i < l && (t = templates[i]); i++) {
TemplateImpl.decorate(t);
}
};
document.addEventListener('DOMContentLoaded', function () {
TemplateImpl.bootstrap(document);
});
var createElement = document.createElement;
document.createElement = function () {
'use strict';
var el = createElement.apply(document, arguments);
if (el.localName === 'template') {
TemplateImpl.decorate(el);
}
return el;
};
var escapeDataRegExp = /[&\u00A0<>]/g;
function escapeReplace(c) {
switch (c) {
case '&':
return '&amp;';
case '<':
return '&lt;';
case '>':
return '&gt;';
case '\xA0':
return '&nbsp;';
}
}
function escapeData(s) {
return s.replace(escapeDataRegExp, escapeReplace);
}
}
if (needsTemplate || needsCloning) {
var nativeCloneNode = Node.prototype.cloneNode;
TemplateImpl.cloneNode = function (template, deep) {
var clone = nativeCloneNode.call(template, false);
if (this.decorate) {
this.decorate(clone);
}
if (deep) {
clone.content.appendChild(nativeCloneNode.call(template.content, true));
this.fixClonedDom(clone.content, template.content);
}
return clone;
};
TemplateImpl.fixClonedDom = function (clone, source) {
if (!source.querySelectorAll)
return;
var s$ = source.querySelectorAll(TEMPLATE_TAG);
var t$ = clone.querySelectorAll(TEMPLATE_TAG);
for (var i = 0, l = t$.length, t, s; i < l; i++) {
s = s$[i];
t = t$[i];
if (this.decorate) {
this.decorate(s);
}
t.parentNode.replaceChild(s.cloneNode(true), t);
}
};
var originalImportNode = document.importNode;
Node.prototype.cloneNode = function (deep) {
var dom = nativeCloneNode.call(this, deep);
if (deep) {
TemplateImpl.fixClonedDom(dom, this);
}
return dom;
};
document.importNode = function (element, deep) {
if (element.localName === TEMPLATE_TAG) {
return TemplateImpl.cloneNode(element, deep);
} else {
var dom = originalImportNode.call(document, element, deep);
if (deep) {
TemplateImpl.fixClonedDom(dom, element);
}
return dom;
}
};
if (needsCloning) {
HTMLTemplateElement.prototype.cloneNode = function (deep) {
return TemplateImpl.cloneNode(this, deep);
};
}
}
if (needsTemplate) {
window.HTMLTemplateElement = TemplateImpl;
}
}());
(function (scope) {
'use strict';
if (!window.performance) {
var start = Date.now();
window.performance = {
now: function () {
return Date.now() - start;
}
};
}
if (!window.requestAnimationFrame) {
window.requestAnimationFrame = function () {
var nativeRaf = window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame;
return nativeRaf ? function (callback) {
return nativeRaf(function () {
callback(performance.now());
});
} : function (callback) {
return window.setTimeout(callback, 1000 / 60);
};
}();
}
if (!window.cancelAnimationFrame) {
window.cancelAnimationFrame = function () {
return window.webkitCancelAnimationFrame || window.mozCancelAnimationFrame || function (id) {
clearTimeout(id);
};
}();
}
var workingDefaultPrevented = function () {
var e = document.createEvent('Event');
e.initEvent('foo', true, true);
e.preventDefault();
return e.defaultPrevented;
}();
if (!workingDefaultPrevented) {
var origPreventDefault = Event.prototype.preventDefault;
Event.prototype.preventDefault = function () {
if (!this.cancelable) {
return;
}
origPreventDefault.call(this);
Object.defineProperty(this, 'defaultPrevented', {
get: function () {
return true;
},
configurable: true
});
};
}
var isIE = /Trident/.test(navigator.userAgent);
if (!window.CustomEvent || isIE && typeof window.CustomEvent !== 'function') {
window.CustomEvent = function (inType, params) {
params = params || {};
var e = document.createEvent('CustomEvent');
e.initCustomEvent(inType, Boolean(params.bubbles), Boolean(params.cancelable), params.detail);
return e;
};
window.CustomEvent.prototype = window.Event.prototype;
}
if (!window.Event || isIE && typeof window.Event !== 'function') {
var origEvent = window.Event;
window.Event = function (inType, params) {
params = params || {};
var e = document.createEvent('Event');
e.initEvent(inType, Boolean(params.bubbles), Boolean(params.cancelable));
return e;
};
window.Event.prototype = origEvent.prototype;
}
}(window.WebComponents));
window.HTMLImports = window.HTMLImports || { flags: {} };
(function (scope) {
var IMPORT_LINK_TYPE = 'import';
var useNative = Boolean(IMPORT_LINK_TYPE in document.createElement('link'));
var hasShadowDOMPolyfill = Boolean(window.ShadowDOMPolyfill);
var wrap = function (node) {
return hasShadowDOMPolyfill ? window.ShadowDOMPolyfill.wrapIfNeeded(node) : node;
};
var rootDocument = wrap(document);
var currentScriptDescriptor = {
get: function () {
var script = window.HTMLImports.currentScript || document.currentScript || (document.readyState !== 'complete' ? document.scripts[document.scripts.length - 1] : null);
return wrap(script);
},
configurable: true
};
Object.defineProperty(document, '_currentScript', currentScriptDescriptor);
Object.defineProperty(rootDocument, '_currentScript', currentScriptDescriptor);
var isIE = /Trident/.test(navigator.userAgent);
function whenReady(callback, doc) {
doc = doc || rootDocument;
whenDocumentReady(function () {
watchImportsLoad(callback, doc);
}, doc);
}
var requiredReadyState = isIE ? 'complete' : 'interactive';
var READY_EVENT = 'readystatechange';
function isDocumentReady(doc) {
return doc.readyState === 'complete' || doc.readyState === requiredReadyState;
}
function whenDocumentReady(callback, doc) {
if (!isDocumentReady(doc)) {
var checkReady = function () {
if (doc.readyState === 'complete' || doc.readyState === requiredReadyState) {
doc.removeEventListener(READY_EVENT, checkReady);
whenDocumentReady(callback, doc);
}
};
doc.addEventListener(READY_EVENT, checkReady);
} else if (callback) {
callback();
}
}
function markTargetLoaded(event) {
event.target.__loaded = true;
}
function watchImportsLoad(callback, doc) {
var imports = doc.querySelectorAll('link[rel=import]');
var parsedCount = 0, importCount = imports.length, newImports = [], errorImports = [];
function checkDone() {
if (parsedCount == importCount && callback) {
callback({
allImports: imports,
loadedImports: newImports,
errorImports: errorImports
});
}
}
function loadedImport(e) {
markTargetLoaded(e);
newImports.push(this);
parsedCount++;
checkDone();
}
function errorLoadingImport(e) {
errorImports.push(this);
parsedCount++;
checkDone();
}
if (importCount) {
for (var i = 0, imp; i < importCount && (imp = imports[i]); i++) {
if (isImportLoaded(imp)) {
newImports.push(this);
parsedCount++;
checkDone();
} else {
imp.addEventListener('load', loadedImport);
imp.addEventListener('error', errorLoadingImport);
}
}
} else {
checkDone();
}
}
function isImportLoaded(link) {
return useNative ? link.__loaded || link.import && link.import.readyState !== 'loading' : link.__importParsed;
}
if (useNative) {
new MutationObserver(function (mxns) {
for (var i = 0, l = mxns.length, m; i < l && (m = mxns[i]); i++) {
if (m.addedNodes) {
handleImports(m.addedNodes);
}
}
}).observe(document.head, { childList: true });
function handleImports(nodes) {
for (var i = 0, l = nodes.length, n; i < l && (n = nodes[i]); i++) {
if (isImport(n)) {
handleImport(n);
}
}
}
function isImport(element) {
return element.localName === 'link' && element.rel === 'import';
}
function handleImport(element) {
var loaded = element.import;
if (loaded) {
markTargetLoaded({ target: element });
} else {
element.addEventListener('load', markTargetLoaded);
element.addEventListener('error', markTargetLoaded);
}
}
(function () {
if (document.readyState === 'loading') {
var imports = document.querySelectorAll('link[rel=import]');
for (var i = 0, l = imports.length, imp; i < l && (imp = imports[i]); i++) {
handleImport(imp);
}
}
}());
}
whenReady(function (detail) {
window.HTMLImports.ready = true;
window.HTMLImports.readyTime = new Date().getTime();
var evt = rootDocument.createEvent('CustomEvent');
evt.initCustomEvent('HTMLImportsLoaded', true, true, detail);
rootDocument.dispatchEvent(evt);
});
scope.IMPORT_LINK_TYPE = IMPORT_LINK_TYPE;
scope.useNative = useNative;
scope.rootDocument = rootDocument;
scope.whenReady = whenReady;
scope.isIE = isIE;
}(window.HTMLImports));
(function (scope) {
var modules = [];
var addModule = function (module) {
modules.push(module);
};
var initializeModules = function () {
modules.forEach(function (module) {
module(scope);
});
};
scope.addModule = addModule;
scope.initializeModules = initializeModules;
}(window.HTMLImports));
window.HTMLImports.addModule(function (scope) {
var CSS_URL_REGEXP = /(url\()([^)]*)(\))/g;
var CSS_IMPORT_REGEXP = /(@import[\s]+(?!url\())([^;]*)(;)/g;
var path = {
resolveUrlsInStyle: function (style, linkUrl) {
var doc = style.ownerDocument;
var resolver = doc.createElement('a');
style.textContent = this.resolveUrlsInCssText(style.textContent, linkUrl, resolver);
return style;
},
resolveUrlsInCssText: function (cssText, linkUrl, urlObj) {
var r = this.replaceUrls(cssText, urlObj, linkUrl, CSS_URL_REGEXP);
r = this.replaceUrls(r, urlObj, linkUrl, CSS_IMPORT_REGEXP);
return r;
},
replaceUrls: function (text, urlObj, linkUrl, regexp) {
return text.replace(regexp, function (m, pre, url, post) {
var urlPath = url.replace(/["']/g, '');
if (linkUrl) {
urlPath = new URL(urlPath, linkUrl).href;
}
urlObj.href = urlPath;
urlPath = urlObj.href;
return pre + '\'' + urlPath + '\'' + post;
});
}
};
scope.path = path;
});
window.HTMLImports.addModule(function (scope) {
var xhr = {
async: true,
ok: function (request) {
return request.status >= 200 && request.status < 300 || request.status === 304 || request.status === 0;
},
load: function (url, next, nextContext) {
var request = new XMLHttpRequest();
if (scope.flags.debug || scope.flags.bust) {
url += '?' + Math.random();
}
request.open('GET', url, xhr.async);
request.addEventListener('readystatechange', function (e) {
if (request.readyState === 4) {
var redirectedUrl = null;
try {
var locationHeader = request.getResponseHeader('Location');
if (locationHeader) {
redirectedUrl = locationHeader.substr(0, 1) === '/' ? location.origin + locationHeader : locationHeader;
}
} catch (e) {
console.error(e.message);
}
next.call(nextContext, !xhr.ok(request) && request, request.response || request.responseText, redirectedUrl);
}
});
request.send();
return request;
},
loadDocument: function (url, next, nextContext) {
this.load(url, next, nextContext).responseType = 'document';
}
};
scope.xhr = xhr;
});
window.HTMLImports.addModule(function (scope) {
var xhr = scope.xhr;
var flags = scope.flags;
var Loader = function (onLoad, onComplete) {
this.cache = {};
this.onload = onLoad;
this.oncomplete = onComplete;
this.inflight = 0;
this.pending = {};
};
Loader.prototype = {
addNodes: function (nodes) {
this.inflight += nodes.length;
for (var i = 0, l = nodes.length, n; i < l && (n = nodes[i]); i++) {
this.require(n);
}
this.checkDone();
},
addNode: function (node) {
this.inflight++;
this.require(node);
this.checkDone();
},
require: function (elt) {
var url = elt.src || elt.href;
elt.__nodeUrl = url;
if (!this.dedupe(url, elt)) {
this.fetch(url, elt);
}
},
dedupe: function (url, elt) {
if (this.pending[url]) {
this.pending[url].push(elt);
return true;
}
var resource;
if (this.cache[url]) {
this.onload(url, elt, this.cache[url]);
this.tail();
return true;
}
this.pending[url] = [elt];
return false;
},
fetch: function (url, elt) {
flags.load && console.log('fetch', url, elt);
if (!url) {
setTimeout(function () {
this.receive(url, elt, { error: 'href must be specified' }, null);
}.bind(this), 0);
} else if (url.match(/^data:/)) {
var pieces = url.split(',');
var header = pieces[0];
var body = pieces[1];
if (header.indexOf(';base64') > -1) {
body = atob(body);
} else {
body = decodeURIComponent(body);
}
setTimeout(function () {
this.receive(url, elt, null, body);
}.bind(this), 0);
} else {
var receiveXhr = function (err, resource, redirectedUrl) {
this.receive(url, elt, err, resource, redirectedUrl);
}.bind(this);
xhr.load(url, receiveXhr);
}
},
receive: function (url, elt, err, resource, redirectedUrl) {
this.cache[url] = resource;
var $p = this.pending[url];
for (var i = 0, l = $p.length, p; i < l && (p = $p[i]); i++) {
this.onload(url, p, resource, err, redirectedUrl);
this.tail();
}
this.pending[url] = null;
},
tail: function () {
--this.inflight;
this.checkDone();
},
checkDone: function () {
if (!this.inflight) {
this.oncomplete();
}
}
};
scope.Loader = Loader;
});
window.HTMLImports.addModule(function (scope) {
var Observer = function (addCallback) {
this.addCallback = addCallback;
this.mo = new MutationObserver(this.handler.bind(this));
};
Observer.prototype = {
handler: function (mutations) {
for (var i = 0, l = mutations.length, m; i < l && (m = mutations[i]); i++) {
if (m.type === 'childList' && m.addedNodes.length) {
this.addedNodes(m.addedNodes);
}
}
},
addedNodes: function (nodes) {
if (this.addCallback) {
this.addCallback(nodes);
}
for (var i = 0, l = nodes.length, n, loading; i < l && (n = nodes[i]); i++) {
if (n.children && n.children.length) {
this.addedNodes(n.children);
}
}
},
observe: function (root) {
this.mo.observe(root, {
childList: true,
subtree: true
});
}
};
scope.Observer = Observer;
});
window.HTMLImports.addModule(function (scope) {
var path = scope.path;
var rootDocument = scope.rootDocument;
var flags = scope.flags;
var isIE = scope.isIE;
var IMPORT_LINK_TYPE = scope.IMPORT_LINK_TYPE;
var IMPORT_SELECTOR = 'link[rel=' + IMPORT_LINK_TYPE + ']';
var importParser = {
documentSelectors: IMPORT_SELECTOR,
importsSelectors: [
IMPORT_SELECTOR,
'link[rel=stylesheet]:not([type])',
'style:not([type])',
'script:not([type])',
'script[type="application/javascript"]',
'script[type="text/javascript"]'
].join(','),
map: {
link: 'parseLink',
script: 'parseScript',
style: 'parseStyle'
},
dynamicElements: [],
parseNext: function () {
var next = this.nextToParse();
if (next) {
this.parse(next);
}
},
parse: function (elt) {
if (this.isParsed(elt)) {
flags.parse && console.log('[%s] is already parsed', elt.localName);
return;
}
var fn = this[this.map[elt.localName]];
if (fn) {
this.markParsing(elt);
fn.call(this, elt);
}
},
parseDynamic: function (elt, quiet) {
this.dynamicElements.push(elt);
if (!quiet) {
this.parseNext();
}
},
markParsing: function (elt) {
flags.parse && console.log('parsing', elt);
this.parsingElement = elt;
},
markParsingComplete: function (elt) {
elt.__importParsed = true;
this.markDynamicParsingComplete(elt);
if (elt.__importElement) {
elt.__importElement.__importParsed = true;
this.markDynamicParsingComplete(elt.__importElement);
}
this.parsingElement = null;
flags.parse && console.log('completed', elt);
},
markDynamicParsingComplete: function (elt) {
var i = this.dynamicElements.indexOf(elt);
if (i >= 0) {
this.dynamicElements.splice(i, 1);
}
},
parseImport: function (elt) {
elt.import = elt.__doc;
if (window.HTMLImports.__importsParsingHook) {
window.HTMLImports.__importsParsingHook(elt);
}
if (elt.import) {
elt.import.__importParsed = true;
}
this.markParsingComplete(elt);
if (elt.__resource && !elt.__error) {
elt.dispatchEvent(new CustomEvent('load', { bubbles: false }));
} else {
elt.dispatchEvent(new CustomEvent('error', { bubbles: false }));
}
if (elt.__pending) {
var fn;
while (elt.__pending.length) {
fn = elt.__pending.shift();
if (fn) {
fn({ target: elt });
}
}
}
this.parseNext();
},
parseLink: function (linkElt) {
if (nodeIsImport(linkElt)) {
this.parseImport(linkElt);
} else {
linkElt.href = linkElt.href;
this.parseGeneric(linkElt);
}
},
parseStyle: function (elt) {
var src = elt;
elt = cloneStyle(elt);
src.__appliedElement = elt;
elt.__importElement = src;
this.parseGeneric(elt);
},
parseGeneric: function (elt) {
this.trackElement(elt);
this.addElementToDocument(elt);
},
rootImportForElement: function (elt) {
var n = elt;
while (n.ownerDocument.__importLink) {
n = n.ownerDocument.__importLink;
}
return n;
},
addElementToDocument: function (elt) {
var port = this.rootImportForElement(elt.__importElement || elt);
port.parentNode.insertBefore(elt, port);
},
trackElement: function (elt, callback) {
var self = this;
var done = function (e) {
elt.removeEventListener('load', done);
elt.removeEventListener('error', done);
if (callback) {
callback(e);
}
self.markParsingComplete(elt);
self.parseNext();
};
elt.addEventListener('load', done);
elt.addEventListener('error', done);
if (isIE && elt.localName === 'style') {
var fakeLoad = false;
if (elt.textContent.indexOf('@import') == -1) {
fakeLoad = true;
} else if (elt.sheet) {
fakeLoad = true;
var csr = elt.sheet.cssRules;
var len = csr ? csr.length : 0;
for (var i = 0, r; i < len && (r = csr[i]); i++) {
if (r.type === CSSRule.IMPORT_RULE) {
fakeLoad = fakeLoad && Boolean(r.styleSheet);
}
}
}
if (fakeLoad) {
setTimeout(function () {
elt.dispatchEvent(new CustomEvent('load', { bubbles: false }));
});
}
}
},
parseScript: function (scriptElt) {
var script = document.createElement('script');
script.__importElement = scriptElt;
script.src = scriptElt.src ? scriptElt.src : generateScriptDataUrl(scriptElt);
scope.currentScript = scriptElt;
this.trackElement(script, function (e) {
if (script.parentNode) {
script.parentNode.removeChild(script);
}
scope.currentScript = null;
});
this.addElementToDocument(script);
},
nextToParse: function () {
this._mayParse = [];
return !this.parsingElement && (this.nextToParseInDoc(rootDocument) || this.nextToParseDynamic());
},
nextToParseInDoc: function (doc, link) {
if (doc && this._mayParse.indexOf(doc) < 0) {
this._mayParse.push(doc);
var nodes = doc.querySelectorAll(this.parseSelectorsForNode(doc));
for (var i = 0, l = nodes.length, n; i < l && (n = nodes[i]); i++) {
if (!this.isParsed(n)) {
if (this.hasResource(n)) {
return nodeIsImport(n) ? this.nextToParseInDoc(n.__doc, n) : n;
} else {
return;
}
}
}
}
return link;
},
nextToParseDynamic: function () {
return this.dynamicElements[0];
},
parseSelectorsForNode: function (node) {
var doc = node.ownerDocument || node;
return doc === rootDocument ? this.documentSelectors : this.importsSelectors;
},
isParsed: function (node) {
return node.__importParsed;
},
needsDynamicParsing: function (elt) {
return this.dynamicElements.indexOf(elt) >= 0;
},
hasResource: function (node) {
if (nodeIsImport(node) && node.__doc === undefined) {
return false;
}
return true;
}
};
function nodeIsImport(elt) {
return elt.localName === 'link' && elt.rel === IMPORT_LINK_TYPE;
}
function generateScriptDataUrl(script) {
var scriptContent = generateScriptContent(script);
return 'data:text/javascript;charset=utf-8,' + encodeURIComponent(scriptContent);
}
function generateScriptContent(script) {
return script.textContent + generateSourceMapHint(script);
}
function generateSourceMapHint(script) {
var owner = script.ownerDocument;
owner.__importedScripts = owner.__importedScripts || 0;
var moniker = script.ownerDocument.baseURI;
var num = owner.__importedScripts ? '-' + owner.__importedScripts : '';
owner.__importedScripts++;
return '\n//# sourceURL=' + moniker + num + '.js\n';
}
function cloneStyle(style) {
var clone = style.ownerDocument.createElement('style');
clone.textContent = style.textContent;
path.resolveUrlsInStyle(clone);
return clone;
}
scope.parser = importParser;
scope.IMPORT_SELECTOR = IMPORT_SELECTOR;
});
window.HTMLImports.addModule(function (scope) {
var flags = scope.flags;
var IMPORT_LINK_TYPE = scope.IMPORT_LINK_TYPE;
var IMPORT_SELECTOR = scope.IMPORT_SELECTOR;
var rootDocument = scope.rootDocument;
var Loader = scope.Loader;
var Observer = scope.Observer;
var parser = scope.parser;
var importer = {
documents: {},
documentPreloadSelectors: IMPORT_SELECTOR,
importsPreloadSelectors: [IMPORT_SELECTOR].join(','),
loadNode: function (node) {
importLoader.addNode(node);
},
loadSubtree: function (parent) {
var nodes = this.marshalNodes(parent);
importLoader.addNodes(nodes);
},
marshalNodes: function (parent) {
return parent.querySelectorAll(this.loadSelectorsForNode(parent));
},
loadSelectorsForNode: function (node) {
var doc = node.ownerDocument || node;
return doc === rootDocument ? this.documentPreloadSelectors : this.importsPreloadSelectors;
},
loaded: function (url, elt, resource, err, redirectedUrl) {
flags.load && console.log('loaded', url, elt);
elt.__resource = resource;
elt.__error = err;
if (isImportLink(elt)) {
var doc = this.documents[url];
if (doc === undefined) {
doc = err ? null : makeDocument(resource, redirectedUrl || url);
if (doc) {
doc.__importLink = elt;
this.bootDocument(doc);
}
this.documents[url] = doc;
}
elt.__doc = doc;
}
parser.parseNext();
},
bootDocument: function (doc) {
this.loadSubtree(doc);
this.observer.observe(doc);
parser.parseNext();
},
loadedAll: function () {
parser.parseNext();
}
};
var importLoader = new Loader(importer.loaded.bind(importer), importer.loadedAll.bind(importer));
importer.observer = new Observer();
function isImportLink(elt) {
return isLinkRel(elt, IMPORT_LINK_TYPE);
}
function isLinkRel(elt, rel) {
return elt.localName === 'link' && elt.getAttribute('rel') === rel;
}
function hasBaseURIAccessor(doc) {
return !!Object.getOwnPropertyDescriptor(doc, 'baseURI');
}
function makeDocument(resource, url) {
var doc = document.implementation.createHTMLDocument(IMPORT_LINK_TYPE);
doc._URL = url;
var base = doc.createElement('base');
base.setAttribute('href', url);
if (!doc.baseURI && !hasBaseURIAccessor(doc)) {
Object.defineProperty(doc, 'baseURI', { value: url });
}
var meta = doc.createElement('meta');
meta.setAttribute('charset', 'utf-8');
doc.head.appendChild(meta);
doc.head.appendChild(base);
doc.body.innerHTML = resource;
if (window.HTMLTemplateElement && HTMLTemplateElement.bootstrap) {
HTMLTemplateElement.bootstrap(doc);
}
return doc;
}
if (!document.baseURI) {
var baseURIDescriptor = {
get: function () {
var base = document.querySelector('base');
return base ? base.href : window.location.href;
},
configurable: true
};
Object.defineProperty(document, 'baseURI', baseURIDescriptor);
Object.defineProperty(rootDocument, 'baseURI', baseURIDescriptor);
}
scope.importer = importer;
scope.importLoader = importLoader;
});
window.HTMLImports.addModule(function (scope) {
var parser = scope.parser;
var importer = scope.importer;
var dynamic = {
added: function (nodes) {
var owner, parsed, loading;
for (var i = 0, l = nodes.length, n; i < l && (n = nodes[i]); i++) {
if (!owner) {
owner = n.ownerDocument;
parsed = parser.isParsed(owner);
}
loading = this.shouldLoadNode(n);
if (loading) {
importer.loadNode(n);
}
if (this.shouldParseNode(n) && parsed) {
parser.parseDynamic(n, loading);
}
}
},
shouldLoadNode: function (node) {
return node.nodeType === 1 && matches.call(node, importer.loadSelectorsForNode(node));
},
shouldParseNode: function (node) {
return node.nodeType === 1 && matches.call(node, parser.parseSelectorsForNode(node));
}
};
importer.observer.addCallback = dynamic.added.bind(dynamic);
var matches = HTMLElement.prototype.matches || HTMLElement.prototype.matchesSelector || HTMLElement.prototype.webkitMatchesSelector || HTMLElement.prototype.mozMatchesSelector || HTMLElement.prototype.msMatchesSelector;
});
(function (scope) {
var initializeModules = scope.initializeModules;
var isIE = scope.isIE;
if (scope.useNative) {
return;
}
initializeModules();
var rootDocument = scope.rootDocument;
function bootstrap() {
window.HTMLImports.importer.bootDocument(rootDocument);
}
if (document.readyState === 'complete' || document.readyState === 'interactive' && !window.attachEvent) {
bootstrap();
} else {
document.addEventListener('DOMContentLoaded', bootstrap);
}
}(window.HTMLImports));
window.CustomElements = window.CustomElements || { flags: {} };
(function (scope) {
var flags = scope.flags;
var modules = [];
var addModule = function (module) {
modules.push(module);
};
var initializeModules = function () {
modules.forEach(function (module) {
module(scope);
});
};
scope.addModule = addModule;
scope.initializeModules = initializeModules;
scope.hasNative = Boolean(document.registerElement);
scope.isIE = /Trident/.test(navigator.userAgent);
scope.useNative = !flags.register && scope.hasNative && !window.ShadowDOMPolyfill && (!window.HTMLImports || window.HTMLImports.useNative);
}(window.CustomElements));
window.CustomElements.addModule(function (scope) {
var IMPORT_LINK_TYPE = window.HTMLImports ? window.HTMLImports.IMPORT_LINK_TYPE : 'none';
function forSubtree(node, cb) {
findAllElements(node, function (e) {
if (cb(e)) {
return true;
}
forRoots(e, cb);
});
forRoots(node, cb);
}
function findAllElements(node, find, data) {
var e = node.firstElementChild;
if (!e) {
e = node.firstChild;
while (e && e.nodeType !== Node.ELEMENT_NODE) {
e = e.nextSibling;
}
}
while (e) {
if (find(e, data) !== true) {
findAllElements(e, find, data);
}
e = e.nextElementSibling;
}
return null;
}
function forRoots(node, cb) {
var root = node.shadowRoot;
while (root) {
forSubtree(root, cb);
root = root.olderShadowRoot;
}
}
function forDocumentTree(doc, cb) {
_forDocumentTree(doc, cb, []);
}
function _forDocumentTree(doc, cb, processingDocuments) {
doc = window.wrap(doc);
if (processingDocuments.indexOf(doc) >= 0) {
return;
}
processingDocuments.push(doc);
var imports = doc.querySelectorAll('link[rel=' + IMPORT_LINK_TYPE + ']');
for (var i = 0, l = imports.length, n; i < l && (n = imports[i]); i++) {
if (n.import) {
_forDocumentTree(n.import, cb, processingDocuments);
}
}
cb(doc);
}
scope.forDocumentTree = forDocumentTree;
scope.forSubtree = forSubtree;
});
window.CustomElements.addModule(function (scope) {
var flags = scope.flags;
var forSubtree = scope.forSubtree;
var forDocumentTree = scope.forDocumentTree;
function addedNode(node, isAttached) {
return added(node, isAttached) || addedSubtree(node, isAttached);
}
function added(node, isAttached) {
if (scope.upgrade(node, isAttached)) {
return true;
}
if (isAttached) {
attached(node);
}
}
function addedSubtree(node, isAttached) {
forSubtree(node, function (e) {
if (added(e, isAttached)) {
return true;
}
});
}
var hasThrottledAttached = window.MutationObserver._isPolyfilled && flags['throttle-attached'];
scope.hasPolyfillMutations = hasThrottledAttached;
scope.hasThrottledAttached = hasThrottledAttached;
var isPendingMutations = false;
var pendingMutations = [];
function deferMutation(fn) {
pendingMutations.push(fn);
if (!isPendingMutations) {
isPendingMutations = true;
setTimeout(takeMutations);
}
}
function takeMutations() {
isPendingMutations = false;
var $p = pendingMutations;
for (var i = 0, l = $p.length, p; i < l && (p = $p[i]); i++) {
p();
}
pendingMutations = [];
}
function attached(element) {
if (hasThrottledAttached) {
deferMutation(function () {
_attached(element);
});
} else {
_attached(element);
}
}
function _attached(element) {
if (element.__upgraded__ && !element.__attached) {
element.__attached = true;
if (element.attachedCallback) {
element.attachedCallback();
}
}
}
function detachedNode(node) {
detached(node);
forSubtree(node, function (e) {
detached(e);
});
}
function detached(element) {
if (hasThrottledAttached) {
deferMutation(function () {
_detached(element);
});
} else {
_detached(element);
}
}
function _detached(element) {
if (element.__upgraded__ && element.__attached) {
element.__attached = false;
if (element.detachedCallback) {
element.detachedCallback();
}
}
}
function inDocument(element) {
var p = element;
var doc = window.wrap(document);
while (p) {
if (p == doc) {
return true;
}
p = p.parentNode || p.nodeType === Node.DOCUMENT_FRAGMENT_NODE && p.host;
}
}
function watchShadow(node) {
if (node.shadowRoot && !node.shadowRoot.__watched) {
flags.dom && console.log('watching shadow-root for: ', node.localName);
var root = node.shadowRoot;
while (root) {
observe(root);
root = root.olderShadowRoot;
}
}
}
function handler(root, mutations) {
if (flags.dom) {
var mx = mutations[0];
if (mx && mx.type === 'childList' && mx.addedNodes) {
if (mx.addedNodes) {
var d = mx.addedNodes[0];
while (d && d !== document && !d.host) {
d = d.parentNode;
}
var u = d && (d.URL || d._URL || d.host && d.host.localName) || '';
u = u.split('/?').shift().split('/').pop();
}
}
console.group('mutations (%d) [%s]', mutations.length, u || '');
}
var isAttached = inDocument(root);
mutations.forEach(function (mx) {
if (mx.type === 'childList') {
forEach(mx.addedNodes, function (n) {
if (!n.localName) {
return;
}
addedNode(n, isAttached);
});
forEach(mx.removedNodes, function (n) {
if (!n.localName) {
return;
}
detachedNode(n);
});
}
});
flags.dom && console.groupEnd();
}
function takeRecords(node) {
node = window.wrap(node);
if (!node) {
node = window.wrap(document);
}
while (node.parentNode) {
node = node.parentNode;
}
var observer = node.__observer;
if (observer) {
handler(node, observer.takeRecords());
takeMutations();
}
}
var forEach = Array.prototype.forEach.call.bind(Array.prototype.forEach);
function observe(inRoot) {
if (inRoot.__observer) {
return;
}
var observer = new MutationObserver(handler.bind(this, inRoot));
observer.observe(inRoot, {
childList: true,
subtree: true
});
inRoot.__observer = observer;
}
function upgradeDocument(doc) {
doc = window.wrap(doc);
flags.dom && console.group('upgradeDocument: ', doc.baseURI.split('/').pop());
var isMainDocument = doc === window.wrap(document);
addedNode(doc, isMainDocument);
observe(doc);
flags.dom && console.groupEnd();
}
function upgradeDocumentTree(doc) {
forDocumentTree(doc, upgradeDocument);
}
var originalCreateShadowRoot = Element.prototype.createShadowRoot;
if (originalCreateShadowRoot) {
Element.prototype.createShadowRoot = function () {
var root = originalCreateShadowRoot.call(this);
window.CustomElements.watchShadow(this);
return root;
};
}
scope.watchShadow = watchShadow;
scope.upgradeDocumentTree = upgradeDocumentTree;
scope.upgradeDocument = upgradeDocument;
scope.upgradeSubtree = addedSubtree;
scope.upgradeAll = addedNode;
scope.attached = attached;
scope.takeRecords = takeRecords;
});
window.CustomElements.addModule(function (scope) {
var flags = scope.flags;
function upgrade(node, isAttached) {
if (node.localName === 'template') {
if (window.HTMLTemplateElement && HTMLTemplateElement.decorate) {
HTMLTemplateElement.decorate(node);
}
}
if (!node.__upgraded__ && node.nodeType === Node.ELEMENT_NODE) {
var is = node.getAttribute('is');
var definition = scope.getRegisteredDefinition(node.localName) || scope.getRegisteredDefinition(is);
if (definition) {
if (is && definition.tag == node.localName || !is && !definition.extends) {
return upgradeWithDefinition(node, definition, isAttached);
}
}
}
}
function upgradeWithDefinition(element, definition, isAttached) {
flags.upgrade && console.group('upgrade:', element.localName);
if (definition.is) {
element.setAttribute('is', definition.is);
}
implementPrototype(element, definition);
element.__upgraded__ = true;
created(element);
if (isAttached) {
scope.attached(element);
}
scope.upgradeSubtree(element, isAttached);
flags.upgrade && console.groupEnd();
return element;
}
function implementPrototype(element, definition) {
if (Object.__proto__) {
element.__proto__ = definition.prototype;
} else {
customMixin(element, definition.prototype, definition.native);
element.__proto__ = definition.prototype;
}
}
function customMixin(inTarget, inSrc, inNative) {
var used = {};
var p = inSrc;
while (p !== inNative && p !== HTMLElement.prototype) {
var keys = Object.getOwnPropertyNames(p);
for (var i = 0, k; k = keys[i]; i++) {
if (!used[k]) {
Object.defineProperty(inTarget, k, Object.getOwnPropertyDescriptor(p, k));
used[k] = 1;
}
}
p = Object.getPrototypeOf(p);
}
}
function created(element) {
if (element.createdCallback) {
element.createdCallback();
}
}
scope.upgrade = upgrade;
scope.upgradeWithDefinition = upgradeWithDefinition;
scope.implementPrototype = implementPrototype;
});
window.CustomElements.addModule(function (scope) {
var isIE = scope.isIE;
var upgradeDocumentTree = scope.upgradeDocumentTree;
var upgradeAll = scope.upgradeAll;
var upgradeWithDefinition = scope.upgradeWithDefinition;
var implementPrototype = scope.implementPrototype;
var useNative = scope.useNative;
function register(name, options) {
var definition = options || {};
if (!name) {
throw new Error('document.registerElement: first argument `name` must not be empty');
}
if (name.indexOf('-') < 0) {
throw new Error('document.registerElement: first argument (\'name\') must contain a dash (\'-\'). Argument provided was \'' + String(name) + '\'.');
}
if (isReservedTag(name)) {
throw new Error('Failed to execute \'registerElement\' on \'Document\': Registration failed for type \'' + String(name) + '\'. The type name is invalid.');
}
if (getRegisteredDefinition(name)) {
throw new Error('DuplicateDefinitionError: a type with name \'' + String(name) + '\' is already registered');
}
if (!definition.prototype) {
definition.prototype = Object.create(HTMLElement.prototype);
}
definition.__name = name.toLowerCase();
if (definition.extends) {
definition.extends = definition.extends.toLowerCase();
}
definition.lifecycle = definition.lifecycle || {};
definition.ancestry = ancestry(definition.extends);
resolveTagName(definition);
resolvePrototypeChain(definition);
overrideAttributeApi(definition.prototype);
registerDefinition(definition.__name, definition);
definition.ctor = generateConstructor(definition);
definition.ctor.prototype = definition.prototype;
definition.prototype.constructor = definition.ctor;
if (scope.ready) {
upgradeDocumentTree(document);
}
return definition.ctor;
}
function overrideAttributeApi(prototype) {
if (prototype.setAttribute._polyfilled) {
return;
}
var setAttribute = prototype.setAttribute;
prototype.setAttribute = function (name, value) {
changeAttribute.call(this, name, value, setAttribute);
};
var removeAttribute = prototype.removeAttribute;
prototype.removeAttribute = function (name) {
changeAttribute.call(this, name, null, removeAttribute);
};
prototype.setAttribute._polyfilled = true;
}
function changeAttribute(name, value, operation) {
name = name.toLowerCase();
var oldValue = this.getAttribute(name);
operation.apply(this, arguments);
var newValue = this.getAttribute(name);
if (this.attributeChangedCallback && newValue !== oldValue) {
this.attributeChangedCallback(name, oldValue, newValue);
}
}
function isReservedTag(name) {
for (var i = 0; i < reservedTagList.length; i++) {
if (name === reservedTagList[i]) {
return true;
}
}
}
var reservedTagList = [
'annotation-xml',
'color-profile',
'font-face',
'font-face-src',
'font-face-uri',
'font-face-format',
'font-face-name',
'missing-glyph'
];
function ancestry(extnds) {
var extendee = getRegisteredDefinition(extnds);
if (extendee) {
return ancestry(extendee.extends).concat([extendee]);
}
return [];
}
function resolveTagName(definition) {
var baseTag = definition.extends;
for (var i = 0, a; a = definition.ancestry[i]; i++) {
baseTag = a.is && a.tag;
}
definition.tag = baseTag || definition.__name;
if (baseTag) {
definition.is = definition.__name;
}
}
function resolvePrototypeChain(definition) {
if (!Object.__proto__) {
var nativePrototype = HTMLElement.prototype;
if (definition.is) {
var inst = document.createElement(definition.tag);
nativePrototype = Object.getPrototypeOf(inst);
}
var proto = definition.prototype, ancestor;
var foundPrototype = false;
while (proto) {
if (proto == nativePrototype) {
foundPrototype = true;
}
ancestor = Object.getPrototypeOf(proto);
if (ancestor) {
proto.__proto__ = ancestor;
}
proto = ancestor;
}
if (!foundPrototype) {
console.warn(definition.tag + ' prototype not found in prototype chain for ' + definition.is);
}
definition.native = nativePrototype;
}
}
function instantiate(definition) {
return upgradeWithDefinition(domCreateElement(definition.tag), definition);
}
var registry = {};
function getRegisteredDefinition(name) {
if (name) {
return registry[name.toLowerCase()];
}
}
function registerDefinition(name, definition) {
registry[name] = definition;
}
function generateConstructor(definition) {
return function () {
return instantiate(definition);
};
}
var HTML_NAMESPACE = 'http://www.w3.org/1999/xhtml';
function createElementNS(namespace, tag, typeExtension) {
if (namespace === HTML_NAMESPACE) {
return createElement(tag, typeExtension);
} else {
return domCreateElementNS(namespace, tag);
}
}
function createElement(tag, typeExtension) {
if (tag) {
tag = tag.toLowerCase();
}
if (typeExtension) {
typeExtension = typeExtension.toLowerCase();
}
var definition = getRegisteredDefinition(typeExtension || tag);
if (definition) {
if (tag == definition.tag && typeExtension == definition.is) {
return new definition.ctor();
}
if (!typeExtension && !definition.is) {
return new definition.ctor();
}
}
var element;
if (typeExtension) {
element = createElement(tag);
element.setAttribute('is', typeExtension);
return element;
}
element = domCreateElement(tag);
if (tag.indexOf('-') >= 0) {
implementPrototype(element, HTMLElement);
}
return element;
}
var domCreateElement = document.createElement.bind(document);
var domCreateElementNS = document.createElementNS.bind(document);
var isInstance;
if (!Object.__proto__ && !useNative) {
isInstance = function (obj, ctor) {
if (obj instanceof ctor) {
return true;
}
var p = obj;
while (p) {
if (p === ctor.prototype) {
return true;
}
p = p.__proto__;
}
return false;
};
} else {
isInstance = function (obj, base) {
return obj instanceof base;
};
}
function wrapDomMethodToForceUpgrade(obj, methodName) {
var orig = obj[methodName];
obj[methodName] = function () {
var n = orig.apply(this, arguments);
upgradeAll(n);
return n;
};
}
wrapDomMethodToForceUpgrade(Node.prototype, 'cloneNode');
wrapDomMethodToForceUpgrade(document, 'importNode');
document.registerElement = register;
document.createElement = createElement;
document.createElementNS = createElementNS;
scope.registry = registry;
scope.instanceof = isInstance;
scope.reservedTagList = reservedTagList;
scope.getRegisteredDefinition = getRegisteredDefinition;
document.register = document.registerElement;
});
(function (scope) {
var useNative = scope.useNative;
var initializeModules = scope.initializeModules;
var isIE = scope.isIE;
if (useNative) {
var nop = function () {
};
scope.watchShadow = nop;
scope.upgrade = nop;
scope.upgradeAll = nop;
scope.upgradeDocumentTree = nop;
scope.upgradeSubtree = nop;
scope.takeRecords = nop;
scope.instanceof = function (obj, base) {
return obj instanceof base;
};
} else {
initializeModules();
}
var upgradeDocumentTree = scope.upgradeDocumentTree;
var upgradeDocument = scope.upgradeDocument;
if (!window.wrap) {
if (window.ShadowDOMPolyfill) {
window.wrap = window.ShadowDOMPolyfill.wrapIfNeeded;
window.unwrap = window.ShadowDOMPolyfill.unwrapIfNeeded;
} else {
window.wrap = window.unwrap = function (node) {
return node;
};
}
}
if (window.HTMLImports) {
window.HTMLImports.__importsParsingHook = function (elt) {
if (elt.import) {
upgradeDocument(wrap(elt.import));
}
};
}
function bootstrap() {
upgradeDocumentTree(window.wrap(document));
window.CustomElements.ready = true;
var requestAnimationFrame = window.requestAnimationFrame || function (f) {
setTimeout(f, 16);
};
requestAnimationFrame(function () {
setTimeout(function () {
window.CustomElements.readyTime = Date.now();
if (window.HTMLImports) {
window.CustomElements.elapsed = window.CustomElements.readyTime - window.HTMLImports.readyTime;
}
document.dispatchEvent(new CustomEvent('WebComponentsReady', { bubbles: true }));
});
});
}
if (document.readyState === 'complete' || scope.flags.eager) {
bootstrap();
} else if (document.readyState === 'interactive' && !window.attachEvent && (!window.HTMLImports || window.HTMLImports.ready)) {
bootstrap();
} else {
var loadEvent = window.HTMLImports && !window.HTMLImports.ready ? 'HTMLImportsLoaded' : 'DOMContentLoaded';
window.addEventListener(loadEvent, bootstrap);
}
}(window.CustomElements));
(function (scope) {
var style = document.createElement('style');
style.textContent = '' + 'body {' + 'transition: opacity ease-in 0.2s;' + ' } \n' + 'body[unresolved] {' + 'opacity: 0; display: block; overflow: hidden; position: relative;' + ' } \n';
var head = document.querySelector('head');
head.insertBefore(style, head.firstChild);
}(window.WebComponents));