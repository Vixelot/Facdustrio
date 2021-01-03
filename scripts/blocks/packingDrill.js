const FuncLib = require("facdustrio/funcs");
const recipes = this.global.facdustrio.recipes;



var PackDrillBlock = {
	_pushSpeed:0.03,
	getPushSpeed(){return this._pushSpeed;},
	setPushSpeed(s){this._pushSpeed=s;},	
	_pushForce:8,
	getPushForce(){return this._pushForce;},
	setPushForce(s){this._pushForce=s;},	
	canMine(tile){
        var f = tile.drop();
		if(!f||!recipes.itemBlockConvert[f.name]){
			return false;
		}
		return this.super$canMine(tile);
    },
	
	_bottomRegion:null,
	getBottomRegion(){return this._bottomRegion;},
	_baseRegion:null,
	getBaseRegion(){return this._baseRegion;},
	load(){
		this.super$load();
		this._bottomRegion = Core.atlas.find(this.name+"-bottom");
		this._baseRegion = [Core.atlas.find(this.name+"-base1"),Core.atlas.find(this.name+"-base2"),Core.atlas.find(this.name+"-base3"),Core.atlas.find(this.name+"-base4")];
	}
	
}
var PackDrillBuild = {
	amountMined:0,
	pushedBlock:false,
	pushBlockOffset:0,
	pushing:null,
	pushingToPayload: false,
	shouldConsume(){
		return this.amountMined < recipes.itemBlockConvert[this.dominantItem.name].amount && this.enabled;
	},
	updateTile(){
		var pushtimer = this.timer.get(this.block.timerDump, this.block.dumpTime*3);
		if(!this.dominantItem){
			return;
		}
		this.timeDrilled += this.warmup * this.delta();
		
		var rec = recipes.itemBlockConvert[this.dominantItem.name];
		if(!rec.block){
			return;
		}
		if(this.amountMined<rec.amount){
			//vanilla drill speed code
			var speed = 1.0;
			if(this.cons.optionalValid()){
				speed = this.block.liquidBoostIntensity;
			}

			speed *= this.efficiency(); // Drill slower when not at full power

			this.lastDrillSpeed = (speed * this.dominantItems * this.warmup) / (this.block.drillTime + this.block.hardnessDrillMultiplier * this.dominantItem.hardness);
			this.warmup = Mathf.lerpDelta(this.warmup, speed, this.block.warmupSpeed);
			this.progress += this.delta() * this.dominantItems * speed * this.warmup;

			if(Mathf.chanceDelta(this.block.updateEffectChance * this.warmup))
				this.block.updateEffect.at(this.x + Mathf.range(this.block.size * 2), this.y + Mathf.range(this.block.size * 2));
		}else{
			if(this.pushedBlock==false){//spawn a blocc
				this.pushedBlock = true;
				this.amountMined-=rec.amount;
				this.pushBlockOffset=0;
				this.pushing = rec.block.newBuilding().create(rec.block, this.team);
				this.pushtimer = true;
			}else{
				this.lastDrillSpeed = 0;
                this.warmup = Mathf.lerpDelta(this.warmup, 0, this.block.warmupSpeed);
			}
		}
		var delay = this.block.drillTime + this.block.hardnessDrillMultiplier * this.dominantItem.hardness;

		if(this.dominantItems > 0 && this.progress >= delay && this.amountMined<rec.amount){
			this.index ++;
			this.amountMined ++;
			this.progress %= delay;

			this.block.drillEffect.at(this.x + Mathf.range(this.block.size), this.y + Mathf.range(this.block.size), this.dominantItem.color);
		}
		
		
		
		if(this.pushedBlock){
			var end = this.block.size*0.5-0.5;
			var prev = this.pushBlockOffset;
			this.pushBlockOffset += this.block.getPushSpeed()*this.edelta();
			this.pushBlockOffset = Math.min(this.pushBlockOffset,end);
			if(this.pushBlockOffset>=end && (pushtimer || prev<end || this.pushingToPayload) ){
				var npos = FuncLib.getNearbyPosition(this.block,this.rotation,Math.floor(this.block.size/2));
				//eject the block!!!
				var result = 
				FuncLib.pushOut(
					this.pushing,
					npos.x+this.tile.x,
					npos.y+this.tile.y,
					this.rotation,
					this.block.getPushSpeed()*60.0,
					this.block.getPushForce(), 
					boolf((b)=>{
						return b.block.size<2;
					}),
					true);
				if(result == 2){
					this.pushedBlock = false;
					this.pushing = null;
					this.pushingToPayload = false;
				}else if(result==1){
					this.pushingToPayload=true;
				}
			}
		}
	},
	draw(){
		var rec = recipes.itemBlockConvert[this.dominantItem.name];
		Draw.rect(this.block.getBottomRegion(), this.x, this.y,this.rotdeg());
		
		if(this.amountMined>0){
			Draw.rect(rec.block.icon(Cicon.full), this.x, this.y, 8*this.amountMined/rec.amount, 8*this.amountMined/rec.amount);
		}
		if(this.pushedBlock){
			var moved  = this.pushBlockOffset*8.0;
			Draw.rect(rec.block.icon(Cicon.full), this.x+Geometry.d4[this.rotation].x*moved, this.y+Geometry.d4[this.rotation].y*moved);
		}
		
		Draw.rect(this.block.getBaseRegion()[this.rotation], this.x, this.y);
		Draw.rect(this.block.rotatorRegion, this.x, this.y, this.timeDrilled * this.block.rotateSpeed);
	}
}


const electricDrill = extend(Drill,"electric-packing-drill",FuncLib.deepCopy(PackDrillBlock));
electricDrill.buildType = ()=> extendContent(Drill.DrillBuild, electricDrill, FuncLib.deepCopy(PackDrillBuild));
electricDrill.hasPower = true;
electricDrill.rotate=true;
electricDrill.outputsPayload=true;
electricDrill.solid=true;
electricDrill.tier = 3;
electricDrill.drillTime = 500;
electricDrill.consumes.power(1.5);