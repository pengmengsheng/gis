
var gis = window.gis||{};
gis.geoserver = window.gis.geoserver||{};

gis.geoserver._map = null;
gis.geoserver._layerList;
gis.geoserver.baseUrl;
gis.geoserver.vectorSource;
gis.geoserver._select = null;
gis.geoserver._selectable = false; 
gis.geoserver.selectLayer = null;
gis.geoserver.selectLayerTypeName = null;
gis.geoserver.selectedStyle = null;
gis.geoserver._selectedFeature =[];
gis.geoserver.resourceFid = null;

/**
 * @param param.url:url,
 * @param param.layers:layers 图层列表,
 * @param param.zoom,
 * @param param.center:[],
 * @param param.targetId:divId,
 * @param param.select:true/false
 */
gis.geoserver.initMap = function(param){
	let bounds = [41551533.95276423,4540086.920647428,41576729.93486762,4598724.84263349];
	let layers = gis.geoserver._initMapLayers(param);
	let view = gis.geoserver._initMapView(param);
	let controls = gis.geoserver._controls();
	
	gis.geoserver.resourceFid = param.fid;
	
	let map = new ol.Map({
		controls: controls,
		layers:layers,
		target:param.targetId,
		view:view
		});
	
	gis.geoserver._map = map;
	gis.geoserver._layerList = param.layers;
	gis.geoserver.baseUrl = param.url;
	
	let style = new ol.style.Style({
		//fill:new ol.style.Fill({color:'#f50a0a66'}),
		stroke:new ol.style.Stroke({
			color:'red',
			width:5
		})
	});
	
	gis.geoserver.selectedStyle = style;
	
	let selectSingleClick = new ol.interaction.Select({style:style,condition:ol.events.condition.click});
	
	let selectCtrlClick = new ol.interaction.Select({
		style:style,
		condition: function(mapBrowserEvent) {
	          return click(mapBrowserEvent) && altKeyOnly(mapBrowserEvent);
	        }
      })
	
	document.onkeydown = function(ev) {
		if(!gis.geoserver._selectable) return;
		
	    var ev = ev || event;
	    var select = ev.ctrlKey == true?selectCtrlClick:selectSingleClick;
	    gis.geoserver._addSelectInteraction(select);
	    
	}
	
	gis.geoserver._selectable = param.select;
	if(param.select){
		gis.geoserver._addSelectInteraction(selectSingleClick);
		gis.geoserver._select.on('select', function(e) {
			gis.geoserver._selected(e);
		});
	}
	
/*	parent.document.getElementById('exportMap').addEventListener('click', function() {
        map.once('postcompose', function(event) {
          var canvas = event.context.canvas;
          if (navigator.msSaveBlob) {
            navigator.msSaveBlob(canvas.msToBlob(), 'map.png');
          } else {
            canvas.toBlob(function(blob) {
              saveAs(blob, 'map.png');
            });
          }
        });
        map.renderSync();
      });*/
} 

/**
 * map controls
 */
gis.geoserver._controls = function(){
	return new ol.control.defaults().extend([
        new ol.control.FullScreen({tipLabel:'全屏'}),//全屏控件
        //new ol.control.MousePosition(),//鼠标位置控件
        new ol.control.OverviewMap({tipLabel:'缩略图'}),//缩略图控件
        new ol.control.ScaleLine({minWidth:80}),//比例尺
        //new ol.control.ZoomSlider(),//滚动条控件
        new ol.control.ZoomToExtent(),//缩放到范围控件
        new ol.control.Zoom({zoomInTipLabel:'放大',zoomOutTipLabel:'缩小'}),//缩放控件
        //new ol.control.Attribution()//属性控件
    ])
};

gis.geoserver._initMapView = function(param){
	let projection = new ol.proj.Projection({
        code: 'EPSG:2365',
        units:  'm',
        //修改坐标系和单位时以下必填否则导致比例尺错误
        getPointResolution: function(resolution) {
            return resolution;
          },
        axisOrientation: 'neu',
        global: true
    });
	let view = new ol.View({
		projection:projection,
		center:[41571533.95276423,4542086.920647428],
		zoom:10,
		});
	
	return view;
};


gis.geoserver._initMapLayers = function(param){
	let ls = [];
	let layers = param.layers;
	for(let l of layers){
		ls.push(gis.geoserver._setLayer(param.url,l));
	}
	return ls;
}

/**
 * add map Layer
 */
gis.geoserver._setLayer = function(baseUrl,layer){
	baseUrl += '/'+layer.WORKSPACE;
	let format = 'image/'+layer.FORMAT;
	let typeName = layer.WORKSPACE+':'+layer.LAYER;
	
	let isTiled = layer.IS_TILED == '1' ? true:false;
	let visible = layer.visible == '1' ? true:false;
	
	let param = {
			zIndex:layer.ZINDEX,
			visible:visible,
			format:format,
			typeName:typeName,
			tiled: isTiled,
			version:layer.VERSION,
			tilesOrigin: layer.TILESORIGIN
			
	}
	if(layer.CATEGORY == 'tile'){
		baseUrl += "/wms";
		param.url = baseUrl;
		return gis.geoserver._setTileLayer(param);
	}else if(layer.CATEGORY == 'image') {
		baseUrl += "/wms";
		param.url = baseUrl;
		return gis.geoserver._setImageLayer(param);
	}else{
		param.url = baseUrl;
		let vectorLayer = gis.geoserver._setVectorLayer(param);
		gis.geoserver.selectLayer = vectorLayer;
		return vectorLayer;
	}
	return null;
}


/**
 * add TileLayer
 */
gis.geoserver._setTileLayer = function(param){
	return new ol.layer.Tile({
		visible: param.visible,
		source: new ol.source.TileWMS({
			url: param.url,
			params: {
				'FORMAT': param.format, 
				'VERSION': param.version,
				tiled: param.tiled,
				'LAYERS': param.typeName,
				'exceptions': 'application/vnd.ogc.se_inimage'
			},
			crossOrigin: 'anonymous'
		})
	});
};


/**
 * add ImageLayer
 */
gis.geoserver._setImageLayer = function(param){
	return new ol.layer.Image({
		source: new ol.source.ImageWMS({
			ratio: 1,
			url: param.url,
			params: {
				//'STYLE':'',
				'FORMAT': param.format,
				'VERSION': param.version,  
				'LAYERS': param.typeName,
				'exceptions': 'application/vnd.ogc.se_inimage',
			},
			//serverType: 'geoserver',
            projection: "EPSG:2365",
			crossOrigin: 'anonymous'
		})
	});
		
};

/**
 * add VectorLayer
 */
gis.geoserver._setVectorLayer = function(param){
	gis.geoserver.selectLayerTypeName = param.typeName;
	
	let wfsParams = {    
			service : 'WFS',    
			version : param.version,    
			request : 'GetFeature',    
			typeName : param.typeName,     
			outputFormat : 'text/javascript',
			format_options : 'callback:loadFeatures'  //回调函数声明  
	};
	let vectorSource = new ol.source.Vector({
		  format: new ol.format.GeoJSON(),
		  loader: function(extent, resolution, projection) {
		     let proj = projection.getCode();
		     let url = param.url+'/ows';
		     //application/json
	         $.ajax({    
                 url: url,    
                 data : $.param(wfsParams),
                 type : 'GET',    
                 dataType: 'jsonp',   //解决跨域 
                 jsonpCallback:'loadFeatures' 
                     
             });  
		   },
		   strategy: ol.loadingstrategy.bbox
		 });
	  //回调函数使用  
    window.loadFeatures = function(response) {    
        vectorSource.addFeatures((new ol.format.GeoJSON()).readFeatures(response));  //载入要素  
        let fid = gis.geoserver.resourceFid;
        gis.geoserver.locationByFeatureId(fid);
        gis.geoserver.resourceFid = null;
            
    };
    gis.geoserver.vectorSource = vectorSource;
	return new ol.layer.Vector({
		source: vectorSource,
		visible:param.visible,
	});
}
/**
 * @description 设置选中图层
 * @param param.resource 资源 building/land
 * @param param.category 资源状态 working/current/history
 */
gis.geoserver.setSelectLayer = function(param){
	gis.geoserver.clearMapViewFitByFeature();
	for(let l of gis.geoserver._layerList){
		if(l.FEATURE_ID != param.resource || l.FEATURE_CATEGORY != param.category) continue;
		
		let typeName = l.WORKSPACE + ':' + l.LAYER;
		if(typeName == gis.geoserver.selectLayerTypeName) continue;
		
		let layer = gis.geoserver._setVectorLayer({url:gis.geoserver.baseUrl,version:l.VERSION,typeName:typeName});
		
		let selectLayer = gis.geoserver.selectLayer;
		if(layer == selectLayer) break;
		
		if(selectLayer) gis.geoserver._map.removeLayer(selectLayer);
		
		gis.geoserver._map.addLayer(layer);
		gis.geoserver.selectLayer = layer;
		
		break;
	}
}
/**
 * 改变select对象
 */
gis.geoserver._addSelectInteraction = function(select){
	if(gis.geoserver._select == select) return;
	
	gis.geoserver._select = select;
	
	gis.geoserver._map.removeInteraction(select);
	gis.geoserver._map.addInteraction(select);
	
}
/**
 * 设置要素是否可选
 */
gis.geoserver.setSelectable = function(boolean){
	gis.geoserver._selectable = boolean;
	let select = gis.geoserver._select;
	if(!boolean && select != null) gis.geoserver._map.removeInteraction(select);
}
/**
 * 选中要素函数
 */
gis.geoserver._selected = function(e){
	let selected = e.selected;
	if(!event.shiftKey) {
		gis.geoserver.clearMapViewFitByFeature();
		
	}
	for(let select of selected){
		let id = select.i;
		let extent = select.U.geometry.A;
		let feature = {
				fid:id,
				extent:extent
		};
		if(!gis.geoserver._selectedFeature.includes(feature)){
			
			gis.geoserver._selectedFeature.push(feature);
			gis.geoserver.mapViewFitByFeature();
		}
	}
}

gis.geoserver.clearMapViewFitByFeature = function(){
	
	for(let f of gis.geoserver._selectedFeature){
		let feature = gis.geoserver.getFeatureById(f.fid);
		if (feature==null) continue;
		feature.setStyle(null);
	}
	gis.geoserver._selectedFeature = [];
}


/**
 * 获取选中图层要素Id数组
 */
gis.geoserver.getSelectedFeature = function(){
	return gis.geoserver._selectedFeature;
}
/**
 * 通过id获取Feature
 */
gis.geoserver.getFeatureById = function(id){
	if(id=='') return null;
	return gis.geoserver.selectLayer.getSource().getFeatureById(id);
}

/**
 * 通过要素Id定位地图
 */
gis.geoserver.locationByFeatureId = function(fid){
	if(fid == ''|| fid == null) return;
	let fs = fid.split(',');
	gis.geoserver._selectedFeature=[];
	
	for(let id of fs){
		var feature = gis.geoserver.getFeatureById(id);
		if(feature == null) continue;
		let f = {
				fid:id,
				extent:[]
		};
		gis.geoserver._selectedFeature.push(f);
	}
    gis.geoserver.mapViewFitByFeature();
	
}

/**
 * 移动feature到屏幕中央
 */
gis.geoserver.mapViewFitByFeature = function(){
	for(let f of gis.geoserver._selectedFeature){
		let fids = f.fid;
		let feature = gis.geoserver.getFeatureById(fids);
		if(feature == null) return;
		let map = gis.geoserver._map;
		let option = {
				duration:10,//ms
				maxZoom:2
		};
		feature.setStyle(gis.geoserver.selectedStyle);
		map.getView().fit(feature.getGeometry(),map.getSize(),option);
	}
		
}

gis.geoserver.locationResource = function(gucode,resourceName,category,curpath){
	gis.geoserver.setSelectLayer({resource:resourceName,category:category});
	
	const url = curpath +'/jyzy/dataobject/data/dataname-jyzy_common_geoserver_feature_resource';
	$.get(url,{resourceGucode:gucode,resourceName:resourceName},function(d){
		d = JSON.parse(d);
		for(let f of d.rows){
			gis.geoserver.locationByFeatureId(f.FID );
		}
	});
}
