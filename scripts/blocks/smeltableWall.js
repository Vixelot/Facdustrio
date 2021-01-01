const FuncLib = require("facdustrio/funcs");

const blockSmeltTimeMultiplier = 60;
//these blocks can be smelted in-place then deconstructed.
function addWallProps(block){
	block.destructible = true;
	block.solid=true;
	block.canOverdrive=false;
	block.buildCostMultiplier=2;
	block.update=true;
}
var WallBlock = {
	_smeltResult: "copper-wall",
	getSmeltResult(){return this._smeltResult;},
	setSmeltResult(s){this._smeltResult=s;},
	_smeltBlock: null,
	getSmeltBlock(){return this._smeltBlock;},
	init(){
        this.super$init();
		this._smeltBlock = Vars.content.getByName(ContentType.block,this.getSmeltResult());
    }
}
var WallBuild = {
	smelted:0, // 0 -> 1 
	heat:0, //acts like a short delay to prevent poorly fuelled furnces from smelting, but mostly for visuals.
	///if heat> 1 it starts smelting.
	
	//the base item to look up on the smelting table.
	getSmeltItem(){
		return this.block.requirements[0];
	},
	getHeatAm(){return this.heat},
	setHeatAm(s){this.heat=s},
	increaseHeatAm(s){this.heat+=s},
	updateTile(){
		if(this.heat>1){
			this.smelted+=Time.delta*(this.heat-1.0)/blockSmeltTimeMultiplier;
		}
		this.heat=Math.max(0,this.heat-Time.delta*0.02);
		if(this.smelted>=1){
			this.smeltBlock(); //byeee
		}
	},
	smeltBlock(){
		Fx.producesmoke.at(this);
		this.tile.setBlock(this.block.getSmeltBlock(),this.team,this.rotation);
	},
	draw(){
		Draw.rect(this.block.region,this.x,this.y);
		if(this.smelted>0){ //fade in the smelted block
			Draw.alpha(this.smelted);
			Draw.rect(this.block.getSmeltBlock().region,this.x,this.y);
		}
		if(this.heat>0){ //red and glowy c:
			Draw.blend(Blending.additive);
			Draw.color(Pal.turretHeat);
			Draw.alpha(this.heat)
			Fill.rect(this.x,this.y,this.block.size*8,this.block.size*8);
			Draw.blend();
		}
	}
}


const copperOreWall = extend(Block,"copper-ore-wall",FuncLib.deepCopy(WallBlock));
copperOreWall.buildType = ()=> extendContent(Building, FuncLib.deepCopy(WallBuild));
addWallProps(copperOreWall);
copperOreWall.setSmeltResult("copper-wall");
