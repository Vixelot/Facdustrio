
//deep copys an object. weooooww, copied object does not share memeory references to original object as opposed to shallow copy.
function _deepCopy(obj) {
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
const dirs = [{x: 1,y: 0},{x: 0,y: 1},{x: -1,y: 0},{x: 0,y: -1}]; 
const origins = [];

for(let size = 1;size<=16;size++){
	var originx = 0;
	var originy = 0;
	originx += Mathf.floor(size / 2);
	originy += Mathf.floor(size / 2);
	originy -= (size - 1);
	for(let side = 0;side<4;side++){
		let ogx = originx;
		let ogy = originy;
		if(side!=0&&size>1){
			for (let i = 1; i <= side; i++) {
				ogx += dirs[i].x * (size - 1);
				ogy += dirs[i].y * (size - 1);
			}
		}
		if(!origins[size-1]){
			origins[size-1] = [];
		}
		origins[size-1][side] = {x:ogx,y:ogy};
		print(ogx+","+ogy);
	}
}

//returns whether a building is allowed to be pushed.
function pushable(build){
	return !(
		build.block instanceof CoreBlock||
		build.dead
	);
}

//returns whether a block is allowed to be on this tile, disregarding existing pushable buildings and team circles
function tileAvalibleTo(tile, block){
	if(!tile){
		return false;
	}
	if(tile.build){
		return pushable(tile.build);
	}
	if(
		tile.solid() ||
		!tile.floor().placeableOn ||
		(block.requiresWater && tile.floor().liquidDrop != Liquids.water)||
		(tile.floor().isDeep() && !block.floating && !block.requiresWater && !block.placeableLiquid)
		
	  )
    {
	  return false;
	}
	return true;
	
}
//returns whether a tile can be pushed in this direction, disregarding buildings.
function canPush(build, direction){
	if(!pushable(build)){return false;}
	let tangent = dirs[(direction + 1) % 4];
	let o = origins[build.block.size-1][direction];
	for(let i=0;i<build.block.size;i++){ // iterate over forward edge.
		let t = build.tile.nearby(o.x + tangent.x *i + dirs[direction].x,o.y + tangent.y *i+ dirs[direction].y);
		if(!tileAvalibleTo(t,build.block)){
			return false;
		}
	}
	let next = build.tile.nearby(dirs[direction].x,dirs[direction].y);
	if(!build.block.canPlaceOn(next, build.team)){
		return false;
	}
	return true;
}

//pushes a single building.  
//if obstructed does not push multiple tiles.
//returns false if its blocked, otherwise true.
//used as a subtorutine for the function that actually does push all obstructed tiles.
/*
	params:
	build - the building to be pushed. DO NOT CALL FROM WITHIN THE BUILDING.
	direction - number from 0-4 same direction as the block rotation to push the building in.
*/

/*algorithm:
	scan forward tiles for blockage
	return false if a block exists in forward tiles or tile isnt allowed forward space
	remove building
	readd building.
*/
function _pushSingle(build, direction){
	direction = direction%4;
	//dont move the core. >:(  BAD BAD BAD BAD
	if(build.block instanceof CoreBlock){return false;}
	var bx = build.tile.x;
	var by = build.tile.y;
	build.tile.remove();
	//scan forward tiles for blockage
	if(!Build.validPlace(build.block, build.team, bx+dirs[direction].x, by+dirs[direction].y, build.rotation, false)){
		Vars.world.tile(bx,by).setBlock(build.block, build.team, build.rotation, () => build);
		return false;
	}
	
	Vars.world.tile(bx+dirs[direction].x, by+dirs[direction].y).setBlock(build.block, build.team, build.rotation, () => build);
	return true;
}
//projection of the block's leading edge along a direction.
function project(build,direction){
	return (origins[build.block.size-1][direction].x+build.tile.x)* dirs[direction].x + (origins[build.block.size-1][direction].y+build.tile.y)* dirs[direction].y;
}

///gets all buildings connected to each other in the push direction sorted
//if group cannot be pushed because its too large or an unpushable block exists it returns null.
/*
	params:
	root - the building to be scanned from
	direction - number from 0-4 same direction as the block rotation to push the building in.
	max - max number of blocks to scan
	bool - boolf consumer as a custom selection criteria.
*/
//usage:
//this.global.facdustrio.functions.getAllContacted(Vars.world.tile(197,212).build,0,99,null)
//this.global.facdustrio.functions.getAllContacted(Vars.world.tile(197,212).build,0,99,null).each(b=>{print(b.block.name)})
//this.global.facdustrio.functions.getAllContacted(Vars.world.tile(197,212).build,0,99,null).each(b=>{print(b.x/8+","+b.y/8)})
function _getAllContacted(root, direction,max,bool){
	var queue = new java.util.PriorityQueue(10,(a,b)=>{//require ordering to be projection of the block's leading edge along  push direction.
		return new java.lang.Integer(Math.round(project(a,direction)-project(b,direction)));
	});
	queue.add(root);
	var contacts = null;
	while(!queue.isEmpty() && (!contacts||contacts.size<=max)){
		let next = queue.poll();
		if(!contacts){
			contacts=Seq.with(next);
		}else{
			contacts.add(next);
		}
		let tangent = dirs[(direction + 1) % 4];
		let o = origins[next.block.size-1][direction];
		for(let i=0;i<next.block.size;i++){ // iterate over forward edge.
			let t = next.tile.nearby(o.x + tangent.x *i + dirs[direction].x,o.y + tangent.y *i+ dirs[direction].y);
			let b = t.build;
			if(!b || queue.contains(b)|| contacts.contains(b)){continue;}
			if(!pushable(b) || (bool && !bool.get(b))){
				return null; // if a single block cannot be pushed then the entire group cannot be pushed from the root.
			}
			queue.add(b);
		}
	}
	if(contacts.size<=max){
		return contacts;
	}else{
		return null;
	}
}	

//pushes a single building and pushes all blocks behind the pushed block., unlike the previous.	
//usage: this.global.facdustrio.functions.pushBlock(Vars.world.tile(203,208).build,0,99)
function _pushBlock(build,direction, maxBlocks){
	var pushing = _getAllContacted(build,direction,maxBlocks,null);
	if(!pushing){
		return;
	}
	//scan in reverse
	for(var i = pushing.size-1;i>=0;i--){
		if(!canPush(pushing.get(i),direction)){
			return;
		}
	}
	for(var i = pushing.size-1;i>=0;i--){
		_pushSingle(pushing.get(i),direction);
	}
}


var currentlyPushing = new Seq();

function _onUpdate(){
	
}
function _onMapLoad(){
	
}
function _onMapUnload(){
	
}



module.exports = {
	deepCopy:_deepCopy,
	pushSingle:_pushSingle,
	pushBlock:_pushBlock,
	getAllContacted:_getAllContacted
}