


var _itemBlockConvert={
		"facdustrio-copper-ore":{
			convert: "facdustrio-copper-ore-wall"
		},
		"copper":{
			convert: "copper-wall"
		},
	};
	
function _onLoad(){
	for(var ib in _itemBlockConvert){
		let block = _itemBlockConvert[ib].convert;
	    _itemBlockConvert[ib].block = Vars.content.getByName(ContentType.block,block);
		_itemBlockConvert[ib].amount = _itemBlockConvert[ib].block.requirements[0].amount;
	}
}

module.exports = {
	onLoad:_onLoad,
	itemBlockConvert:_itemBlockConvert
}
