
var jyzy = window.jyzy || {};
jyzy.gis = window.jyzy.gis||{};
jyzy.gis.geoserver = window.jyzy.gis.geoserver||{};

jyzy.gis.geoserver._map = null;
jyzy.gis.geoserver._layerList;
jyzy.gis.geoserver.baseUrl;
jyzy.gis.geoserver.vectorSource;
jyzy.gis.geoserver._select = null;
jyzy.gis.geoserver._selectable = false; 
jyzy.gis.geoserver.selectLayer = null;
jyzy.gis.geoserver.selectLayerTypeName = null;
jyzy.gis.geoserver.selectedStyle = null;
jyzy.gis.geoserver._selectedId =[];
jyzy.gis.geoserver.resourceFid = null;

/**
 * @param param.url:url,
 * @param param.layers:layers 图层列表,
 * @param param.zoom,
 * @param param.center:[],
 * @param param.targetId:divId,
 * @param param.select:true/false
 */
jyzy.gis.geoserver.initMap = function(param){
	let bounds = [41557768.720,4569866.496,41571916.443,4577111.040];
	let layers = jyzy.gis.geoserver._initMapLayers(param);
	let view = jyzy.gis.geoserver._initMapView(param);
	let controls = jyzy.gis.geoserver._controls();
	
	jyzy.gis.geoserver.resourceFid = param.fid;
	
	let map = new ol.Map({
		controls: controls,
		target:param.targetId,
		layers:layers,
		view:view
		});
	
	jyzy.gis.geoserver._map = map;
	jyzy.gis.geoserver._layerList = param.layers;
	jyzy.gis.geoserver.baseUrl = param.url;
	
	
	map.getView().fit(bounds,map.getSize());
	
	let style = new ol.style.Style({
		fill:new ol.style.Fill({color:'#f50a0a66'}),
		stroke:new ol.style.Stroke({
			color:'blue',
			width:3
		})
	});
	
	jyzy.gis.geoserver.selectedStyle = style;
	
	let selectSingleClick = new ol.interaction.Select({style:style,condition:ol.events.condition.click});
	
	let selectCtrlClick = new ol.interaction.Select({
		style:style,
		condition: function(mapBrowserEvent) {
	          return click(mapBrowserEvent) && altKeyOnly(mapBrowserEvent);
	        }
      })
	
	document.onkeydown = function(ev) {
		if(!jyzy.gis.geoserver._selectable) return;
		
	    var ev = ev || event;
	    var select = ev.ctrlKey == true?selectCtrlClick:selectSingleClick;
	    jyzy.gis.geoserver._addSelectInteraction(select);
	    
	}
	
	jyzy.gis.geoserver._selectable = param.select;
	if(param.select){
		jyzy.gis.geoserver._addSelectInteraction(selectSingleClick);
		jyzy.gis.geoserver._select.on('select', function(e) {
			jyzy.gis.geoserver._selected(e);
		});
	}
	
	parent.document.getElementById('exportMap').addEventListener('click', function() {
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
      });
} 


jyzy.gis.geoserver._initMapView = function(param){
	let projection = new ol.proj.Projection({
        //code: 'EPSG:4610',
        units: 'degrees',
        axisOrientation: 'neu',
        global: true
    });
	let view = new ol.View({
		projection:projection,
		});
	
	if(param.zoom) view.zoom = param.zoom;
	if(param.center) view.center = param.center;
	
	return view;
};


jyzy.gis.geoserver._initMapLayers = function(param){
	let ls = [];
	let layers = param.layers;
	for(let l of layers){
		ls.push(jyzy.gis.geoserver._setLayer(param.url,l));
	}
	return ls;
}
/**
 * map controls
 */
jyzy.gis.geoserver._controls = function(){
	return new ol.control.defaults({
		attribution: false,
		zoom:false
	}).extend([
        new ol.control.FullScreen({tipLabel:'全屏'}),//全屏控件
        //new ol.control.MousePosition(),//鼠标位置控件
        new ol.control.OverviewMap({tipLabel:'缩略图'}),//缩略图控件
        new ol.control.ScaleLine({minWidth:80}),//比例尺
        //new ol.control.ZoomSlider(),//滚动条控件
        //new ol.control.ZoomToExtent(),//缩放到范围控件
        new ol.control.Zoom({zoomInTipLabel:'放大',zoomOutTipLabel:'缩小'}),//缩放控件
        //new ol.control.Attribution()//属性控件
    ])
};
/**
 * add map Layer
 */
jyzy.gis.geoserver._setLayer = function(baseUrl,layer){
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
		return jyzy.gis.geoserver._setTileLayer(param);
	}else if(layer.CATEGORY == 'image') {
		baseUrl += "/wms";
		param.url = baseUrl;
		return jyzy.gis.geoserver._setImageLayer(param);
	}else{
		param.url = baseUrl;
		let vectorLayer = jyzy.gis.geoserver._setVectorLayer(param);
		jyzy.gis.geoserver.selectLayer = vectorLayer;
		return vectorLayer;
	}
	return null;
}


/**
 * add TileLayer
 */
jyzy.gis.geoserver._setTileLayer = function(param){
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
jyzy.gis.geoserver._setImageLayer = function(param){
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
			crossOrigin: 'anonymous'
		})
	});
		
};

/**
 * add VectorLayer
 */
jyzy.gis.geoserver._setVectorLayer = function(param){
	jyzy.gis.geoserver.selectLayerTypeName = param.typeName;
	
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
        let fid = jyzy.gis.geoserver.resourceFid;
        jyzy.gis.geoserver.locationByFeatureId(fid);
        jyzy.gis.geoserver.resourceFid = null;
            
    };
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
jyzy.gis.geoserver.setSelectLayer = function(param){
	jyzy.gis.geoserver.clearMapViewFitByFeature();
	for(let l of jyzy.gis.geoserver._layerList){
		if(l.FEATURE_ID != param.resource || l.FEATURE_CATEGORY != param.category) continue;
		
		let typeName = l.WORKSPACE + ':' + l.LAYER;
		if(typeName == jyzy.gis.geoserver.selectLayerTypeName) continue;
		
		let layer = jyzy.gis.geoserver._setVectorLayer({url:jyzy.gis.geoserver.baseUrl,version:l.VERSION,typeName:typeName});
		
		let selectLayer = jyzy.gis.geoserver.selectLayer;
		if(layer == selectLayer) break;
		
		if(selectLayer) jyzy.gis.geoserver._map.removeLayer(selectLayer);
		
		jyzy.gis.geoserver._map.addLayer(layer);
		jyzy.gis.geoserver.selectLayer = layer;
		
		break;
	}
}
/**
 * 改变select对象
 */
jyzy.gis.geoserver._addSelectInteraction = function(select){
	if(jyzy.gis.geoserver._select == select) return;
	
	jyzy.gis.geoserver._select = select;
	
	jyzy.gis.geoserver._map.removeInteraction(select);
	jyzy.gis.geoserver._map.addInteraction(select);
	
}
/**
 * 设置要素是否可选
 */
jyzy.gis.geoserver.setSelectable = function(boolean){
	jyzy.gis.geoserver._selectable = boolean;
	let select = jyzy.gis.geoserver._select;
	if(!boolean && select != null) jyzy.gis.geoserver._map.removeInteraction(select);
}
/**
 * 选中要素函数
 */
jyzy.gis.geoserver._selected = function(e){
	let selected = e.selected;
	if(!event.shiftKey) {
		jyzy.gis.geoserver.clearMapViewFitByFeature();
		
	}
	for(let select of selected){
		let id = select.i;
		if(!jyzy.gis.geoserver._selectedId.includes(id)){
			let feature = jyzy.gis.geoserver.getFeatureById(id);
			
			jyzy.gis.geoserver._selectedId.push(id);
			jyzy.gis.geoserver.mapViewFitByFeature();
		}
	}
}

jyzy.gis.geoserver.clearMapViewFitByFeature = function(){
	for(let fid of jyzy.gis.geoserver._selectedId){
		let feature = jyzy.gis.geoserver.getFeatureById(fid);
		if (feature==null) continue;
		feature.setStyle(null);
	}
	jyzy.gis.geoserver._selectedId = [];
}


/**
 * 获取选中图层要素Id数组
 */
jyzy.gis.geoserver.getSelectedFeatureId = function(){
	return jyzy.gis.geoserver._selectedId;
}
/**
 * 通过id获取Feature
 */
jyzy.gis.geoserver.getFeatureById = function(id){
	if(id=='') return null;
	return jyzy.gis.geoserver.selectLayer.getSource().getFeatureById(id);
}

/**
 * 通过要素Id定位地图
 */
jyzy.gis.geoserver.locationByFeatureId = function(fid){
	if(fid == ''|| fid == null) return;
	let fs = fid.split(',');
	jyzy.gis.geoserver._selectedId=[];
	
	for(let id of fs){
		var feature = jyzy.gis.geoserver.getFeatureById(id);
		if(feature == null) continue;
		
		jyzy.gis.geoserver._selectedId.push(id);
	}
    jyzy.gis.geoserver.mapViewFitByFeature();
	
}

/**
 * 移动feature到屏幕中央
 */
jyzy.gis.geoserver.mapViewFitByFeature = function(){
	let fids = jyzy.gis.geoserver._selectedId.toString();
	let feature = jyzy.gis.geoserver.getFeatureById(fids);
	if(feature == null) return;
	let map = jyzy.gis.geoserver._map;
	let option = {
			duration:10,//ms
			maxZoom:2
			};
	feature.setStyle(jyzy.gis.geoserver.selectedStyle);
	map.getView().fit(feature.getGeometry(),map.getSize(),option);
}
jyzy.gis.geoserver.exportMap = function(){
	let map = jyzy.gis.geoserver._map;
	map.once('rendercomplete', function(event) {
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
}
