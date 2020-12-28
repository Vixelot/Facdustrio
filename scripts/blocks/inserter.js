const inserterLib = require("facdustrio/blocks/inserterlib");

const inserter = extend(Block,"inserter",(inserterLib.block()));
inserter.buildType = ()=> extendContent(Building, (inserterLib.build()));
inserter.update = true;
inserter.hasPower = true;
inserter.rotate=true;
inserter.consumes.power(0.1);
