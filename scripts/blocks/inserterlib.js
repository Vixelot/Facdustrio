
//i dont wish to rewrite the same code over and over, so these are template objects for all inserters.

const dirs = [{x: 1,y: 0},{x: 0,y: 1},{x: -1,y: 0},{x: 0,y: -1}]; // directions for rotations
function deepCopy(obj) {
	var clone = {};
	for (var i in obj) {
		if (Array.isArray(obj[i])) {
			clone[i] = [];
			for (var z in obj[i]) {
				if (typeof(obj[i][z]) == "object" && obj[i][z] != null) {
					clone[i][z] = deepCopy(obj[i][z]);
				} else {
					clone[i][z] = obj[i][z];
				}
			}
		} else if (typeof(obj[i]) == "object" && obj[i] != null)
			clone[i] = deepCopy(obj[i]);
		else
			clone[i] = obj[i];
	}
	return clone;
}

function isPayloadBlock(build){
	return build.block instanceof PayloadConveyor || build.block instanceof PayloadAcceptor;
}
var inserterBlock = {
	_moveDelay:10.0,
	_grabSize: 1, //1 - items only, anything .>=64 will do payloads 
	_stackSize: 1, // for stack inserters
	_grabFrom: 1,//minimum grabbing range
	_grabTo: 1,//maximum grabbing range
	_baseSprite: null,
	_armSprite: null,
	_clawSprites: [],
	load(){
		this.super$load();
		this._baseSprite = Core.atlas.find(this.name + "-base");
		this._armSprite = Core.atlas.find(this.name + "-arm");
		this._clawSprites = [Core.atlas.find(this.name + "-claw1"),Core.atlas.find(this.name + "-claw2")];
	},
	getBaseSprite(){return this._baseSprite;},
	getArmSprite(){return this._armSprite;},
	getClawSprites(){return this._clawSprites;},
	
	getMoveDelay(){return this._moveDelay}, // bunch of getters and setters. 
	setMoveDelay(n){this._moveDelay=n},
	getGrabSize(){return this._grabSize},
	setGrabSize(n){this._grabSize=n},
	getStackSize(){return this._stackSize},
	setStackSize(n){this._stackSize=n},
	getGrabFrom(){return this._grabFrom},
	setGrabFrom(n){this._grabFrom=n},
	getGrabTo(){return this._grabTo},
	setGrabTo(n){this._grabTo=n},
	
}

const maxWait = 20;

var inserterBuild = {
	armRotate:0, 
	armExtend:0,
	pickingup:true, //if true, the inserter is empty and is waiting for an item
	progress: 0,//keeping track of the delay between picking up and droppign off,
	timeoutWait: 0, //keep track of time waited.
	
	grabbed: null, //what its grabbing
	grabbedAmount:0, // how much its grabbing.
	
	targetin: null,
	targetout: null,
	targetitem: null,
	targetpayload: false,
	foundtarget: false,
	
	targetArmRotate:0,
	targetArmExtend:1,
	
	prevRotation:0,
	
	create( block,  team) {
		this.super$create(block,team);
		this.targetArmRotate=this.rotdeg(); 
		this.armRotate=this.rotdeg(); 
		return this;
	},
	canGrabBuilding(thing){
		return this.block.getGrabSize()+0.01>= Vars.tilePayload * thing.block.size * thing.block.size;
	},
	
	findValidTransaction(frombuild,tobuild){
		if(!frombuild.items || frombuild.items.empty()){return false;}
		frombuild.items.each((item, amount) =>{
			if(tobuild.acceptItem(this,item) && (!tobuild.items || tobuild.items.get(item) < tobuild.block.itemCapacity) ){
				this.targetout = tobuild;
				this.targetin = frombuild;
				this.targetitem = item;
				this.foundtarget = true;
				return true;
			}
		});
		return false;
	},
	
	
	//uh yeh find a way.
	findValidPayloadTransaction(fromtile,totile){
		var frombuild = fromtile.build;
		if(!frombuild){return false;}
		if(isPayloadBlock(frombuild)){
			let contained = frombuild.getPayload();
			let px=0;
			let py=0;
			if(!contained){
				return false;
			}
			if(contained instanceof UnitPayload){
				px = contained.unit.x;
				py = contained.unit.y;
			}else{
				px = contained.build.x;
				py = contained.build.y;
			}
			if(Mathf.dst(fromtile.getX(),fromtile.getY(), px, py)<8){
				// grab payload.
				this.targetpayload = true;
			}else {
				return false;
			}
		}else{
			this.targetpayload = false;
		} 
		if(!this.canGrabBuilding(frombuild) && !this.targetpayload){
			return false;
		}
		//t
		let payload = new BuildPayload(frombuild);
		if(this.targetpayload){
			payload = frombuild.getPayload();
		}
		//moving to empty space
		if(totile.build ==null){
			if(payload instanceof UnitPayload || (payload instanceof BuildPayload && Build.validPlace(payload.build.block, payload.build.team, totile.x, totile.y, payload.build.rotation, false ))){
				this.targetout = totile;
				this.targetin = fromtile;
				this.foundtarget = true;
				return true;
			}
		}else if(isPayloadBlock(totile.build) && totile.build.acceptPayload(this,payload)){
			this.targetout = totile;
			this.targetin = fromtile;
			this.foundtarget = true;
			return true;
		}
		return false;
		//moving payload
	},
	
	resetToPickup(){
		this.targetArmRotate=this.rotdeg();
		this.progress=0;
		this.pickingup = true; 
		this.targetout = null;
		this.targetin=null;
		this.grabbed = null;
		this.foundtarget = false;
		this.grabbedAmount = 0;
		this.timeoutWait =0;
	},
	grabAndDrop(grab, am){
		this.grabbedAmount = am;
		this.grabbed = grab;
		this.pickingup = false; 
		this.targetArmRotate=this.rotdeg()+180.0;
		this.progress=0;	
		this.timeoutWait=0;
	},
	
	updateTile(){
		if(this.prevRotation!=this.rotation){
			this.targetArmRotate=this.rotdeg(); 
			this.armRotate=this.rotdeg(); 
			this.progress=0;
			this.pickingup = true; 
			this.targetout = null;
			this.grabbed = null;
			this.grabbedAmount=0;
			this.prevRotation=this.rotation;
		}
		
		this.progress += this.edelta();
		
		let movesped = (1.0/this.block.getMoveDelay())*this.edelta();
		this.armExtend += (this.targetArmExtend - this.armExtend)*movesped;
		this.armRotate = Angles.moveToward(this.armRotate,this.targetArmRotate,180.0*movesped);
		
		if(this.progress<this.block.getMoveDelay()){
			this.timeoutWait=0;
			return;
		}
		
		var toRot = (this.rotation+2)%4; // the other 'side'
		this.timeoutWait += Time.delta;
		//not done
		if(this.block.getGrabSize()>1){
			if(this.pickingup){
				if(this.foundtarget){ 
					if(!this.findValidPayloadTransaction(this.targetin,this.targetout)){
						this.foundtarget=false;
						this.targetin=null;
						return;
					}
					if(!this.targetpayload){
						this.grabAndDrop(new BuildPayload(this.targetin.build),1);
						this.targetin.remove();
						return;
					}else{
						this.grabAndDrop(this.targetin.build.takePayload(),1);
						return;
					}
				}
				for(var k = this.block.getGrabFrom();k<=this.block.getGrabTo();k++){
					var totile = this.tile.nearby(dirs[toRot].x * k, dirs[toRot].y * k);
					if(totile.build && !isPayloadBlock(totile.build)){
						
						continue;
					}
					if(this.targetin==null){
						for(var i = this.block.getGrabFrom();i<=this.block.getGrabTo();i++){
							var fromtile = this.tile.nearby(dirs[this.rotation].x * i, dirs[this.rotation].y * i);
							if(!fromtile){continue;}
							if(!fromtile.build){continue;}
							this.findValidPayloadTransaction(fromtile,totile);
							if(this.targetin){
								this.targetArmExtend = i;
								if(Math.abs(this.armExtend-this.targetArmExtend)>0.1){
									this.progress = 0;
								}
								break;
							}
						}
					}
				}
				
			}else{
				if(this.targetout.build && isPayloadBlock(this.targetout.build)){ // place on the payload
					if(this.targetout.build.acceptPayload(this,this.grabbed)){
						this.targetout.build.handlePayload(this,this.grabbed);
						this.resetToPickup();
						return;
					}
					if(this.timeoutWait<50.0){ // wait a bit, if it doesnt wanna accpet the payload then just dump it on the ground.
						return;
					}
				}
				if(this.grabbed instanceof BuildPayload){
					if(Build.validPlace(this.grabbed.block(), this.grabbed.build.team, this.targetout.x, this.targetout.y, this.grabbed.build.rotation, false )){ // place on the ground
						this.grabbed.place(this.targetout, this.grabbed.build.rotation);
						Fx.placeBlock.at(this.targetout.drawx(), this.targetout.drawy(), this.targetout.block().size);
						this.resetToPickup();
					}
				}else{//its a unit
					this.grabbed.set(this.targetout.getX(), this.targetout.getY(), this.grabbed.unit.rotation);
					if(this.grabbed.dump()){
						Fx.unitDrop.at(this.targetout);
						this.resetToPickup();
					}
				}
			}
			
		}else{
			if(this.pickingup){
				/*
					1. search through list of output blocks
					2. search through list of input blocks
					3. find first pair of valid input -> output item insertions
					4. Attempt grab and insert
					4. repeat.
				*/
				
				if(this.targetout){ // there was a detected valid transaction so were gonna try extracting items.
					var itemsavail = this.targetin.items.get(this.targetitem);
					if(itemsavail==0){
						if(this.timeoutWait>maxWait){
							if(this.grabbedAmount==0){
								this.targetout=null; //waited for a while and got nothing, gonna try another input.
								this.timeoutWait=0;
							}else{
								this.pickingup = false; // waited for a while, got stuff but wasnt full, oh well, continue on.
								this.targetArmRotate=this.rotdeg()+180.0;
								this.progress=0;	
								this.timeoutWait=0;
							}
						}
						return;
					}
					var takeam = Math.min(itemsavail,this.block.getStackSize());
					this.targetin.removeStack(this.targetitem,takeam);
					this.grabbedAmount+=takeam;
					this.grabbed = this.targetitem;
					this.timeoutWait=0;
					if(this.grabbedAmount == this.block.getStackSize()){ //its full we're ready to deliver :D
						this.targetArmRotate=this.rotdeg()+180.0;
						this.progress=0;
						this.pickingup = false; 
					}
					return;
				}
				
				for(var k = this.block.getGrabFrom();k<=this.block.getGrabTo();k++){
					var tobuild = this.nearby(dirs[toRot].x * k, dirs[toRot].y * k);
					if(!tobuild){continue;}
					
					if(this.timeoutWait>maxWait){
						this.targetin=null;
					}
					if(this.targetin==null){
						for(var i = this.block.getGrabFrom();i<=this.block.getGrabTo();i++){
							var frombuild = this.nearby(dirs[this.rotation].x * i, dirs[this.rotation].y * i);
							if(!frombuild){continue;}
							this.findValidTransaction(frombuild,tobuild);
							if(this.targetin){
								this.targetArmExtend = i;
								if(Math.abs(this.armExtend-this.targetArmExtend)>0.1){
									this.progress = 0;
								}
								break;
							}
						}
					}else{
						this.findValidTransaction(this.targetin,tobuild);
					}
					
					if(this.targetout!=null){
						this.timeoutWait = 0;
						
						break;
					}
				}
			}else{
				if(this.targetout){
					if(this.targetout.acceptItem(this,this.grabbed)){ //deposit item
						this.targetout.handleItem(this,this.grabbed);
						this.grabbedAmount--;
						this.timeoutWait =0;
					}
					if(this.grabbedAmount==0){ //arm has no more items, pickup mode again
						this.resetToPickup();
					}
				}else{
					if(this.grabbedAmount==0){ //edge case where the arm might start in output mode
						this.resetToPickup();
					}
					
				}
				// todo: 
				// - timeout for outputs.
				// - sprite outlines.
				// - saving/loading state
				// - payload
				
			}
		}
	},
	draw(){
		Draw.rect(this.block.getBaseSprite(),this.x,this.y,0);
		
		var armx = Mathf.cosDeg(this.armRotate) * this.armExtend * Vars.tilesize;
		var army = Mathf.sinDeg(this.armRotate) * this.armExtend * Vars.tilesize;
		var graboffset = (this.armExtend * Vars.tilesize + 3)/(this.armExtend * Vars.tilesize);
		Lines.stroke(4);
		Draw.z(Layer.turret);
		Draw.color(Pal.shadow);
		Lines.line(this.block.getArmSprite(), this.x, this.y,     this.x+armx-(this.block.size*2), this.y+army-(this.block.size*2), false);
		Draw.rect(this.block.getClawSprites()[this.pickingup?0:1],this.x+armx-(this.block.size*2), this.y+army-(this.block.size*2), this.armRotate);
		Draw.color();
		Lines.line(this.block.getArmSprite(), this.x,this.y, this.x+armx, this.y+army, false);
		Draw.rect(this.block.getClawSprites()[this.pickingup?0:1],this.x+armx,this.y+army,this.armRotate);
		if(this.grabbed){
			if(this.grabbed instanceof Item){
				Draw.rect(this.grabbed.icon(Cicon.small),this.x+armx*graboffset,this.y+army*graboffset,this.armRotate);
			}else if(this.grabbed instanceof Payload){
				this.grabbed.set(this.x+armx*graboffset,this.y+army*graboffset, this.armRotate);
				this.grabbed.draw();
			}
		}
	}
	
}

/*
when you require("some script"), itll return whatevers in its module.exports.
*/
module.exports = {
	block:function(){return deepCopy(inserterBlock);},
	build:function(){return deepCopy(inserterBuild);}
}