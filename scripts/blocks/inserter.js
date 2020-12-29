const inserterLib = require("facdustrio/blocks/inserterlib");

const inserter = extend(Block,"inserter",(inserterLib.block()));
inserter.buildType = ()=> extendContent(Building, (inserterLib.build()));
inserter.update = true;
inserter.hasPower = true;
inserter.rotate=true;
inserter.consumes.power(0.2);


const heavyInserter = extend(Block,"heavy-inserter",(inserterLib.block()));
heavyInserter.buildType = ()=> extendContent(Building, (inserterLib.build()));
heavyInserter.update = true;
heavyInserter.hasPower = true;
heavyInserter.rotate=true;
heavyInserter.setGrabSize(Vars.tilePayload);
heavyInserter.setMoveDelay(40);
heavyInserter.consumes.power(1.0);