require("facdustrio/blocks/inserterlib");
require("facdustrio/blocks/inserter");

Events.on(EventType.ClientLoadEvent, 
cons(e => {
	Blocks.blockForge.buildVisibility = BuildVisibility.shown
}));