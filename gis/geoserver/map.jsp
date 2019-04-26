<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c" %>

<% String path = request.getContextPath(); %>
<link rel="stylesheet" href="${url }/openlayers3/ol.css" type="text/css"/>
<script src='${url }/openlayers3/ol.js' type="text/javascript"></script>

<script src='<%=path %>/resources/frame/jquery-1.11.1.min.js' type="text/javascript"></script>
<script src='<%=path %>/resources/js/jyzy/gis/jyzy.gis.geoserver.js' type="text/javascript"></script>
<script src="<%=path %>/resources/js/geoserver/FileSaver.min.js"></script>

<style>
#map{
	clear: both;
	background:#ffff;

}
.ol-zoomslider{
	border:1px solid #7b98bc;
}
.ol-control button{
	cursor: pointer;
}
.ol-scale-line{
	left:200px;
	background:none;
}
.ol-scale-line-inner {
    border-bottom: 2px solid #000;
    border-left: 1px solid #000;
    border-right: 1px solid #000;
    color:#000;
}
</style>
<body>
	<div id ="map"></div>
</body>


<script type="text/javascript">
	var layers = ${layers};
	jyzy.gis.geoserver.initMap({
		url:'${url}',
		layers:layers,
		targetId:'map',
		select:'${select}',
		fid:'${fids}'
	});
</script>
