geoserver
1、resolve map loading cros-origin
2、resolve map export cros-origin

in geoserver project web.xml add parameters
  <context-param>
    <param-name>ENABLE_JSONP</param-name>
    <param-value>true</param-value>
  </context-param>

	<filter>
		<filter-name>CorsFilter</filter-name>
		<filter-class>org.apache.catalina.filters.CorsFilter</filter-class>
	</filter>
	<filter-mapping>
		<filter-name>CorsFilter</filter-name>
		<url-pattern>/*</url-pattern>
	</filter-mapping>
