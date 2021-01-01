global.facdustrio = {};

var functions = require("facdustrio/funcs");
require("facdustrio/blocks/inserterlib");
require("facdustrio/blocks/inserter");
require("facdustrio/blocks/smeltableWall");

global.facdustrio.functions = functions;

Events.on(EventType.ClientLoadEvent, 
cons(e => {
	Blocks.blockForge.buildVisibility = BuildVisibility.shown
}));