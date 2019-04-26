<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c" %>
<%-- <jsp:include page="/include/header.jsp" />  --%>
<link rel="stylesheet" href="<%=request.getContextPath()%>/resources/frame/dojo/esri/css/main.css">

<style>
#jyzy_gis_map {
	padding: 0;
	margin: 0;
	height: 100%;
	width: 100%;
}
.layer_list{
    right: 0px;
    float: right;
    padding: 5px;
    cursor: pointer;
    z-index: 9999;
    position: absolute;
    background: #428bca;
    color: #fff;
    width: 100px;
}
</style>

<script>
var layers = ${layers };
var param = {
		baseUrl : '${baseUrl}',
		layerLists : layers,
		containerId : 'jyzy_gis_map',
		defaultFeature : '${resourceName}'
	};
jyzy.gis.arcgis.open(param,'${canedit}');

$(window).load(function() {
	var fids = '${fid}';
	jyzy.gis.arcgis.LocationFeatureByIds(fids);
	
});

</script>

<div id="jyzy_gis_map" >
</div>

<%-- <jsp:include page="/include/floor.jsp" /> --%>