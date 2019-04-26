;;;;
var jyzy = window.jyzy || {};
jyzy.gis = {}
jyzy.gis.arcgis = {}

jyzy.gis.arcgis.defaultHighlightOption = {
	    lineColor: [255, 0, 0],//边框颜色
	    lineWidth: 3,//边框宽度
	    fillColor: [125, 125, 125],//填充颜色
	    fillAlhpaValue: 0.35//填充alpha通道颜色
	};
jyzy.gis.arcgis._selectable = false;
jyzy.gis.arcgis._graphic = null;
jyzy.gis.arcgis._highlightSymbol = null;
jyzy.gis.arcgis._layerList = null;
jyzy.gis.arcgis._map = null;
jyzy.gis.arcgis._workLayer = null;
jyzy.gis.arcgis._mapView = null;
jyzy.gis.arcgis._selectedFeatures = [];
jyzy.gis.arcgis._mapClickEvent = null;
jyzy.gis.arcgis._clickEvent = null;

jyzy.gis.arcgis.draw=null;

jyzy.gis.arcgis.open = function(param,selectable = false){
	jyzy.gis.arcgis.openMap(param);
	if(selectable){
		jyzy.gis.arcgis.setSelectable(selectable);
	}
}

/**
 * 打开地图
 * param 参数
 * baseUrl : 基地址
 * layerLists ：数组，图层列表
 * containerId : 图上div容器的id
 * zoom:地图显示等级
 * defaultFeature : 当前默认要素类型 building，land
 * highlightOption ： 高亮选中参数
 * showMenuContext:鼠标右键单击显示上下文菜单
 * */
jyzy.gis.arcgis.openMap = function (param) {
	var highlightOption = param.highlightOption ? param.highlightOption : jyzy.gis.arcgis.defaultHighlightOption;
	
	var defaultFeature = param.defaultFeature ? param.defaultFeature : 'building';
	
	jyzy.gis.arcgis._selectable = false;
	
	require([
	    'esri/views/MapView',
	    'esri/Map',
	    'esri/layers/MapImageLayer',
	    'esri/layers/FeatureLayer',
	    'esri/widgets/LayerList',
	    'esri/Graphic',
	    'esri/geometry/Geometry',
	    'esri/geometry/Extent',
		'esri/widgets/ScaleBar',
		'esri/PopupTemplate',
		"esri/views/2d/draw/Draw",
	    "esri/geometry/geometryEngine"
	], function (MapView, Map, MapImageLayer, FeatureLayer, LayerList, Graphic, Geometry, Extent,ScaleBar,PopupTemplate,Draw,geometryEngine){
		jyzy.gis.arcgis._graphic = Graphic;
		
		highlightOption.fillColor.push(highlightOption.fillAlhpaValue);
		jyzy.gis.arcgis._highlightSymbol = {
		  type: 'simple-fill',  // autocasts as new SimpleFillSymbol()
		  color: [ 51,51, 204, 0.4 ],
		  style: 'solid',
		  outline: {  // autocasts as new SimpleLineSymbol()
		    color: 'red',
		    width: 1
		  }
		};
	    jyzy.gis.arcgis._layerList = param.layerLists;
	    jyzy.gis.arcgis._map = new Map();
	    	
	    let popupTemplate = {
	    	//let popupTemplate = new PopupTemplate({
	    	title :"Title", 
	    	actions: [{
	            id: "find-brewery",
	            image: "beer.png",
	            title: "Brewery Info"
	          }],
	    	content :"content:"
	    };
	    let popupEnabled = false;
	    
	    jyzy.gis.arcgis.mapAddLayer(jyzy.gis.arcgis._layerList,param.baseUrl,FeatureLayer,MapImageLayer,popupTemplate,popupEnabled,defaultFeature);
	    
	    let view = new MapView({
	    	container: param.containerId,
	        map: jyzy.gis.arcgis._map
	        //center
	    });
	    view.scale = 30000;
	    
	    jyzy.gis.arcgis._mapView = view;
	    
	    view.when(function() {
	    	//show layer
	    	const layerList = new LayerList({
	            view: view
	        });
	        view.ui.add(layerList, 'top-right');
	        
	        //显示比例尺
	        const scaleBar = new ScaleBar({
	        	view: view,
	        });
	        view.ui.add(scaleBar,'bottom-left');
	        
	        //popupTemplate
	        view.popup.watch("selectedFeature", function(graphic) {
	            if (graphic) {
	              let graphicTemplate = graphic.getEffectivePopupTemplate();
	              graphicTemplate.actions.items[0].visible = true;
	            }
	          });
	        let popup = view.popup;
	        popup.viewModel.on("trigger-action", function(event) {
	          if (event.action.id === "find-brewery") {
	            const attributes = popup.viewModel.selectedFeature.attributes;
	            const info = attributes.website;
	            if (info) {
	              window.open(info.trim());
	            }
	          }
	        });
	        
	    },function(error){
	    	console.log("The view's resources failed to load: ", error);
	    });
	    
	    
	    jyzy.gis.arcgis._workLayer.mapLayer.when(function () {
	        view.whenLayerView(jyzy.gis.arcgis._workLayer.mapLayer).then(function (layerView) {
	        	jyzy.gis.arcgis._workLayer.view = layerView;
	        });
	    });
	
	    view.on('click', function (e) {
	    	if(e.button != 0) return;
	    	
			jyzy.gis.arcgis._clickEventParam = e;
			const geometry = new Extent({
				xmax : e.mapPoint.x ,
				ymax : e.mapPoint.y ,
				xmin : e.mapPoint.x ,
				ymin : e.mapPoint.y
			});
			const append = e.native.ctrlKey;
			jyzy.gis.arcgis.selectFeatureOnMap(geometry, append);
	    });
	
	});
}
/**
 * map增加图层
 */
jyzy.gis.arcgis.mapAddLayer = function(layers,baseUrl,FeatureLayer,MapImageLayer,popupTemplate,popupEnabled=false,defaultResourceName){
	for (let layer of layers) {
		let category = layer['CATEGORY'].toLowerCase();
		let resourceName = layer['FEATURE_ID'];
		let title = layer['TITLE'];
		let _layer;
		var url = baseUrl +'/rest/services/'+layer['URL']+'/MapServer';
		if ('feature' == category) {
			url += '/'+layer['LAYER_INDEX'];
			let featureLayerId = layer['ID'];
			_layer = new FeatureLayer({
				url: url,
				title: title,
				//popupTemplate:popupTemplate,
				resourceName: resourceName,
				featureLayerId:featureLayerId,
				renderer: {
					type: 'simple',
					symbol: {
						type: 'simple-fill',  // autocasts as new SimpleFillSymbol()
						color: layer['FILL_COLOR'],
						style: 'solid',
						outline: {  // autocasts as new SimpleLineSymbol()
							color: layer['LINE_COLOR'],
							width: layer['LINE_WIDTH']
						}
					}
				}
			
			});
		}
		else if('map' == category){
			_layer = new MapImageLayer({
				url: url,
				title: title
			});
		}
		_layer.url = url;
		jyzy.gis.arcgis._map.add(_layer);
		layer.mapLayer = _layer;
		if (defaultResourceName == resourceName) {
			jyzy.gis.arcgis._workLayer = layer;
		}
	}
	
}
/**
 * 在图面上根据几何区域选中要素
 * geometry：几何区域，必须是extent类型
 * append:是否启用增量选择
 */
jyzy.gis.arcgis.selectFeatureOnMap = function (geometry, append) {
	var query = {
		geometry : geometry,
		spatialRelationship : 'intersects'
	};
	if(append != undefined && !append){
		jyzy.gis.arcgis.clearSelectFeature();
	}
	jyzy.gis.arcgis._workLayer.view.queryFeatures(query).then(function(result){
		var features = result.features;
		//选中要素执行函数
		if(typeof(jyzy.gis.arcgis._mapClickEvent) == 'function'){
			let p = {
				e : jyzy.gis.arcgis._clickEvent,
				features : features
			}
			jyzy.gis.arcgis._mapClickEvent(p);
		}
		if(jyzy.gis.arcgis._selectable){
			for(let i = 0 ; i < features.length ; i++){
				let fea = features[i];
				let fid = fea.attributes[jyzy.gis.arcgis._workLayer.mapLayer.objectIdField];
				if(jyzy.gis.arcgis._featureSelected(fid)){
					jyzy.gis.arcgis.unSelectFeature(fid);
				}
				else{
					jyzy.gis.arcgis.selectFeature(fea);
				}
			}
		}
	}).catch(function(e){
		console.log(e);
	});	
	
}

/**
 * 取消图层选择要素
 */
jyzy.gis.arcgis.clearSelectFeature = function(){
	jyzy.gis.arcgis._mapView.graphics.removeAll();
	jyzy.gis.arcgis._selectedFeatures = [];
	
}
/**
 * 设置是否启动选择
 */
jyzy.gis.arcgis.setSelectable = function(selectable){
	jyzy.gis.arcgis._selectable = selectable;
}

/**
 * 判断要素是否被选中
 */
jyzy.gis.arcgis._featureSelected = function(fid){
	for(let i = 0 ; i < jyzy.gis.arcgis._selectedFeatures.length;i++){
		let s = jyzy.gis.arcgis._selectedFeatures[i];
		if(s.fid == fid) return true;
	}
	return false;
}
/**
 * 根据要素ID，取消要素在图面上的选中状态
 */
jyzy.gis.arcgis.unSelectFeature = function(fid){
	let gid;
	let idx = -1;
	for(let feature of jyzy.gis.arcgis._selectedFeatures){
		if(feature.fid == fid) {
			idx = i;
			gid = feature.gid;
			break;
		}
	}
	if(idx >= 0){
		jyzy.gis.arcgis._selectedFeatures.splice(idx,1);
		for(let item of jyzy.gis.arcgis._mapView.graphics.items.length){
			if(item.uid == gid){
				jyzy.gis.arcgis._mapView.graphics.remove(item);
				break;
			}
		}
	}
}

/**
 * 根据要素设置要素被选中，添加到选中列表，并高亮显示
 */
jyzy.gis.arcgis.selectFeature = function(feature){
	let highlightGraphic = new jyzy.gis.arcgis._graphic(feature.geometry, jyzy.gis.arcgis._highlightSymbol);
	//添加一个高亮对象到地图
	jyzy.gis.arcgis._mapView.graphics.add(highlightGraphic);
	
	let s = {
		fid : feature.attributes[jyzy.gis.arcgis._workLayer.mapLayer.objectIdField],
		gid : highlightGraphic.uid
	};
	jyzy.gis.arcgis._selectedFeatures.push(s);
}

/**
 * 设置地图点击回调事件
 * 回调参数：
 *    e : 地图点击事件,
 *    feature : 当前资源层中被选中的要素，为空代表没有任何选中
 * 
 */
jyzy.gis.arcgis.setClickEvent = function(c){
	jyzy.gis.arcgis._mapClickEvent = c;
}


/**
 * 设置当前操作资源图层
 */
jyzy.gis.arcgis.changeResourceWorkLayer = function (resourceName) {
	if(jyzy.gis.arcgis._workLayer.FEATURE_ID == resourceName) return;
	
	for (let layer of jyzy.gis.arcgis._layerList) {
        if (layer['FEATURE_ID'] == resourceName) {
            jyzy.gis.arcgis._workLayer = layer;
			break;
        }
    }
	
	for (let item of jyzy.gis.arcgis._mapView.layerViews.items) {
		let layer = item.layer;
		if(layer.resourceName == jyzy.gis.arcgis._workLayer['FEATURE_ID']){
			jyzy.gis.arcgis._workLayer.view = item;
			break;
		}
	}
	
}

/**
 * 根据元素ID定位元素：
 * ids:元素id列表，单个数字或者数字数组
 */
jyzy.gis.arcgis.LocationFeatureByIds = function (fids,scale=2000) {
	jyzy.gis.arcgis.clearSelectFeature();
	if(fids == '') return;
	let fidList = fids;
	
	if(fidList instanceof Array){
		fidList = fids.join();	
	}
	let layer = jyzy.gis.arcgis._workLayer.mapLayer;
	let query = layer.createQuery();
	//query.where = 'FID IN (' + fidList + ')';
	query.objectIds = fidList;
	query.outFields = [ '*' ];
	query.f = 'pjson';
    
	layer.queryFeatures(query).then(function(results) {
		  let features = results.features;
		  jyzy.gis.arcgis.mapViewGoTo({features:features,scale:scale});
		  for(let feature of features){
			feature.attributes[layer.objectIdField];
			jyzy.gis.arcgis.selectFeature(feature);
		  }
	 });
	
}

jyzy.gis.arcgis._mapClickEvent = function(param){
	if(param.scale == undefined){
		param.scale=2000;
	}
	jyzy.gis.arcgis.mapViewGoTo(param);
}
/**
 * 根据选中要素移动图层
 */
jyzy.gis.arcgis.mapViewGoTo = function(param){
	if(param == undefined || param == 'undefined') return;
	var fs = param.features
	if(fs.length == 0) return;
	jyzy.gis.arcgis._mapView.goTo({target:fs,scale:param.scale});
}

/**
 * 获取当前图面上选中的要素ID列表
 */
jyzy.gis.arcgis.getSelectedFeatureIds = function(){
	var ids = [];
	for(let feature of jyzy.gis.arcgis._selectedFeatures){
		ids.push(feature.fid);
	}
	return ids;
}

/**
 * 选择要素查询该要素在其他图层位置
 * 默认查询楼栋图层（land）
 */
jyzy.gis.arcgis.queryFeatureByFeature = function(feature,index=1){
	let geoExtent = feature.geometry.extent;
	let extent = {
			xmin: geoExtent.xmin,
			ymin: geoExtent.ymin,
			xmax: geoExtent.xmax,
			ymax: geoExtent.ymax,
	};
	let geo = JSON.stringify(extent);
	let url = feature.layer.url;
	url += '/'+index+'/query?geometry='+geo+'&geometryType=esriGeometryEnvelope&outFields=*&returnGeometry=false&f=pjson';
	let fids = [];
	$.post(url,function(r){
		var data = JSON.parse(r);
		var features = data.features;
		for(let f of features){
			let objectId = f.attributes.OBJECTID;
			fids.push(objectId);
		}
		console.log(fids);
	})
}

jyzy.gis.arcgis.locationResource = function(gucode,resourceName){
	const layer = jyzy.gis.arcgis._workLayer.mapLayer;
	if(layer.resourceName != resourceName){
		jyzy.gis.arcgis.changeResourceWorkLayer(resourceName);
	}
	const url = curpath +'/jyzy/dataobject/data/dataname-jyzy_gis_feature_relation';
	$.get(url,{resourceGucode:gucode,resourceName:resourceName},function(d){
		d = JSON.parse(d);
		let fid = '';
		for(let f of d.rows){
			fid += f.FID +',';
		}
		fid = fid.substring(0,fid.length-1)
		jyzy.gis.arcgis.LocationFeatureByIds(fid);
	});
}