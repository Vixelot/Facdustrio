const FuncLib = require("facdustrio/funcs");


function addProps(block){
	block.destructible = true;
	block.update=true;
	block.rotate=true;
	block.outputsPayload=true;
}
var BeltBlock = {
	_beltSpeed: 2,
	getBeltSpeed(){return this._beltSpeed;},
	setBeltSpeed(s){this._beltSpeed=s;},
	_payloadLimit: 1.5,
	getPayloadLimit(){return this._payloadLimit;},
	setPayloadLimit(s){this._payloadLimit=s;},
	_pushForce:4,
	getPushForce(){return this._pushForce;},
	setPushForce(s){this._pushForce=s;},
	_baseRegion:null,
	getBaseRegion(){return this._baseRegion;},
	_arrowRegion:null,
	getArrowRegion(){return this._arrowRegion;},
	init(){
        this.super$init();
		this._arrowRegion = Core.atlas.find(this.name+"-arrow");
		this._baseRegion = Core.atlas.find(this.name+"-base");
    }
}
var BeltBuild = {
	item:null,
	progress:0,
	ox:0,
	oy:0,
	alpha:0.2,
	isPayloadAcceptor(){
		return true;
	},
	takePayload(){
		var t = this.item;
		this.item = null;
		return t;
	},
	getPayload(){
		return this.item;
	},
	acceptPayload(source, payload){
		return (!this.item) && payload.fits(this.block.getPayloadLimit());
	},
	handlePayload(source, payload){
		this.item = payload;
		if(payload instanceof BuildPayload){
			this.ox=payload.build.x;
			this.oy=payload.build.y;
		}else{
			this.ox=payload.unit.x;
			this.oy=payload.unit.y;
		}
		this.progress=1-(Mathf.dst(this.ox,this.oy,this.x,this.y)/8.0);
	},
	updateTile(){
		if(!this.item){
			this.alpha = Mathf.lerpDelta(this.alpha,0.2,0.1);
			return;
		}
		this.alpha = Mathf.lerpDelta(this.alpha,0.8,0.1);
		this.progress += this.block.getBeltSpeed()/60.0;
		if(this.progress>=1){
			var npos = FuncLib.getNearbyPosition(this.block,this.rotation,Math.floor(this.block.size/2));
			var outtile = Vars.world.tile(npos.x+this.tile.x,npos.y+this.tile.y);
			if(this.item instanceof BuildPayload){
				var result = 
				FuncLib.pushOut(
					this.item.build,
					outtile.x,
					outtile.y,
					this.rotation,
					this.block.getBeltSpeed(),
					this.block.getPushForce(), 
					boolf((b)=>{
						return b.block.size<2;
					}),
					true);
				if(result==2){
					this.item=null;
					
				}
			}
			this.progress=1;
		}else{
			this.item.set(Mathf.lerp(this.ox,this.x,this.progress),Mathf.lerp(this.oy,this.y,this.progress),0);
		}
	},

	draw(){
		//temp
		Draw.z(Layer.block-0.1);
		Draw.rect(this.block.getBaseRegion(),this.x,this.y,this.rotdeg());
		Draw.z(Layer.block);
		if(this.item){
			this.item.draw();
		}
		var rotdir = Geometry.d4[this.rotation];
		var ox = rotdir.x * this.block.size * 8;
		var oy = rotdir.y * this.block.size * 8;
		var arrow= this.block.getArrowRegion();
		Draw.z(Layer.block+0.1);
		Draw.alpha(this.alpha);
		FuncLib.drawClippedRegion(this.block.getArrowRegion(), 0,Math.max(0,1-this.progress) ,this.x+ox*this.progress    ,this.y+oy*this.progress    ,arrow.width/4,arrow.height/4,this.rotdeg());
		FuncLib.drawClippedRegion(this.block.getArrowRegion(), Math.min(1,1-this.progress),1   ,this.x+ox*(this.progress-1),this.y+oy*(this.progress-1),arrow.width/4,arrow.height/4,this.rotdeg());
		
	},
	write(write){
		this.super$write(write);
		write.f(this.progress);
		Payload.write(this.item, write);
	},
	read(read, revision){
		this.super$read(read, revision);
		this.progress = read.f(); 
		this.item = Payload.read(read);
	}
}


const payloadBelt = extend(Block,"payload-belt",FuncLib.deepCopy(BeltBlock));
payloadBelt.buildType = ()=> extendContent(Building, FuncLib.deepCopy(BeltBuild));
addProps(payloadBelt);
