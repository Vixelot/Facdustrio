global.facdustrio = {};

var functions = require("facdustrio/funcs");
var recipes = require("facdustrio/recipes");

global.facdustrio.functions = functions;
global.facdustrio.recipes = recipes;

require("facdustrio/blocks/inserterlib");
require("facdustrio/blocks/inserter");
require("facdustrio/blocks/smeltableWall");
require("facdustrio/blocks/packingDrill");
require("facdustrio/blocks/payloadBelt");



Events.on(EventType.ClientLoadEvent, 
cons(e => {
	Blocks.blockForge.buildVisibility = BuildVisibility.shown
	recipes.onLoad();
	
	Vars.mods.getScripts().runConsole("this.debug = function(d){log(\"debug\",d)}");
	Vars.mods.getScripts().runConsole("this.facdustrio = global.facdustrio.functions");
}));

Events.run(Trigger.update, () => {
	functions.onUpdate();
});

Events.on(EventType.WorldLoadEvent, e => {
	functions.onMapLoad();
});
