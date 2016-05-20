/*! modernizr 3.2.0 (Custom Build) | MIT *
 * http://modernizr.com/download/?-csstransforms-csstransforms3d-csstransitions-framed-ie8compat-prefixed-prefixedcss-prefixes !*/
!function(e,n,t){function r(e){var n=w.className,t=Modernizr._config.classPrefix||"";if(_&&(n=n.baseVal),Modernizr._config.enableJSClass){var r=new RegExp("(^|\\s)"+t+"no-js(\\s|$)");n=n.replace(r,"$1"+t+"js$2")}Modernizr._config.enableClasses&&(n+=" "+t+e.join(" "+t),_?w.className.baseVal=n:w.className=n)}function s(e,n){return typeof e===n}function o(){var e,n,t,r,o,i,a;for(var f in C)if(C.hasOwnProperty(f)){if(e=[],n=C[f],n.name&&(e.push(n.name.toLowerCase()),n.options&&n.options.aliases&&n.options.aliases.length))for(t=0;t<n.options.aliases.length;t++)e.push(n.options.aliases[t].toLowerCase());for(r=s(n.fn,"function")?n.fn():n.fn,o=0;o<e.length;o++)i=e[o],a=i.split("."),1===a.length?Modernizr[a[0]]=r:(!Modernizr[a[0]]||Modernizr[a[0]]instanceof Boolean||(Modernizr[a[0]]=new Boolean(Modernizr[a[0]])),Modernizr[a[0]][a[1]]=r),y.push((r?"":"no-")+a.join("-"))}}function i(e){return e.replace(/([a-z])-([a-z])/g,function(e,n,t){return n+t.toUpperCase()}).replace(/^-/,"")}function a(e){return e.replace(/([A-Z])/g,function(e,n){return"-"+n.toLowerCase()}).replace(/^ms-/,"-ms-")}function f(e,n){return!!~(""+e).indexOf(n)}function u(){return"function"!=typeof n.createElement?n.createElement(arguments[0]):_?n.createElementNS.call(n,"http://www.w3.org/2000/svg",arguments[0]):n.createElement.apply(n,arguments)}function l(e,n){return function(){return e.apply(n,arguments)}}function d(e,n,t){var r;for(var o in e)if(e[o]in n)return t===!1?e[o]:(r=n[e[o]],s(r,"function")?l(r,t||n):r);return!1}function p(){var e=n.body;return e||(e=u(_?"svg":"body"),e.fake=!0),e}function c(e,t,r,s){var o,i,a,f,l="modernizr",d=u("div"),c=p();if(parseInt(r,10))for(;r--;)a=u("div"),a.id=s?s[r]:l+(r+1),d.appendChild(a);return o=u("style"),o.type="text/css",o.id="s"+l,(c.fake?c:d).appendChild(o),c.appendChild(d),o.styleSheet?o.styleSheet.cssText=e:o.appendChild(n.createTextNode(e)),d.id=l,c.fake&&(c.style.background="",c.style.overflow="hidden",f=w.style.overflow,w.style.overflow="hidden",w.appendChild(c)),i=t(d,e),c.fake?(c.parentNode.removeChild(c),w.style.overflow=f,w.offsetHeight):d.parentNode.removeChild(d),!!i}function m(n,r){var s=n.length;if("CSS"in e&&"supports"in e.CSS){for(;s--;)if(e.CSS.supports(a(n[s]),r))return!0;return!1}if("CSSSupportsRule"in e){for(var o=[];s--;)o.push("("+a(n[s])+":"+r+")");return o=o.join(" or "),c("@supports ("+o+") { #modernizr { position: absolute; } }",function(e){return"absolute"==getComputedStyle(e,null).position})}return t}function v(e,n,r,o){function a(){d&&(delete L.style,delete L.modElem)}if(o=s(o,"undefined")?!1:o,!s(r,"undefined")){var l=m(e,r);if(!s(l,"undefined"))return l}for(var d,p,c,v,h,g=["modernizr","tspan"];!L.style;)d=!0,L.modElem=u(g.shift()),L.style=L.modElem.style;for(c=e.length,p=0;c>p;p++)if(v=e[p],h=L.style[v],f(v,"-")&&(v=i(v)),L.style[v]!==t){if(o||s(r,"undefined"))return a(),"pfx"==n?v:!0;try{L.style[v]=r}catch(y){}if(L.style[v]!=h)return a(),"pfx"==n?v:!0}return a(),!1}function h(e,n,t,r,o){var i=e.charAt(0).toUpperCase()+e.slice(1),a=(e+" "+z.join(i+" ")+i).split(" ");return s(n,"string")||s(n,"undefined")?v(a,n,r,o):(a=(e+" "+k.join(i+" ")+i).split(" "),d(a,n,t))}function g(e,n,r){return h(e,t,t,n,r)}var y=[],C=[],x={_version:"3.2.0",_config:{classPrefix:"",enableClasses:!0,enableJSClass:!0,usePrefixes:!0},_q:[],on:function(e,n){var t=this;setTimeout(function(){n(t[e])},0)},addTest:function(e,n,t){C.push({name:e,fn:n,options:t})},addAsyncTest:function(e){C.push({name:null,fn:e})}},Modernizr=function(){};Modernizr.prototype=x,Modernizr=new Modernizr,Modernizr.addTest("ie8compat",!e.addEventListener&&!!n.documentMode&&7===n.documentMode),Modernizr.addTest("framed",e.location!=top.location);var S=x._config.usePrefixes?" -webkit- -moz- -o- -ms- ".split(" "):[];x._prefixes=S;var w=n.documentElement,_="svg"===w.nodeName.toLowerCase(),b="CSS"in e&&"supports"in e.CSS,P="supportsCSS"in e;Modernizr.addTest("supports",b||P);var T="Moz O ms Webkit",z=x._config.usePrefixes?T.split(" "):[];x._cssomPrefixes=z;var E=function(n){var r,s=S.length,o=e.CSSRule;if("undefined"==typeof o)return t;if(!n)return!1;if(n=n.replace(/^@/,""),r=n.replace(/-/g,"_").toUpperCase()+"_RULE",r in o)return"@"+n;for(var i=0;s>i;i++){var a=S[i],f=a.toUpperCase()+"_"+r;if(f in o)return"@-"+a.toLowerCase()+"-"+n}return!1};x.atRule=E;var k=x._config.usePrefixes?T.toLowerCase().split(" "):[];x._domPrefixes=k;var N=x.testStyles=c,A={elem:u("modernizr")};Modernizr._q.push(function(){delete A.elem});var L={style:A.elem.style};Modernizr._q.unshift(function(){delete L.style}),x.testAllProps=h;var j=x.prefixed=function(e,n,t){return 0===e.indexOf("@")?E(e):(-1!=e.indexOf("-")&&(e=i(e)),n?h(e,n,t):h(e,"pfx"))};x.prefixedCSS=function(e){var n=j(e);return n&&a(n)};x.testAllProps=g,Modernizr.addTest("csstransforms3d",function(){var e=!!g("perspective","1px",!0),n=Modernizr._config.usePrefixes;if(e&&(!n||"webkitPerspective"in w.style)){var t,r="#modernizr{width:0;height:0}";Modernizr.supports?t="@supports (perspective: 1px)":(t="@media (transform-3d)",n&&(t+=",(-webkit-transform-3d)")),t+="{#modernizr{width:7px;height:18px;margin:0;padding:0;border:0}}",N(r+t,function(n){e=7===n.offsetWidth&&18===n.offsetHeight})}return e}),Modernizr.addTest("csstransforms",function(){return-1===navigator.userAgent.indexOf("Android 2.")&&g("transform","scale(1)",!0)}),Modernizr.addTest("csstransitions",g("transition","all",!0)),o(),r(y),delete x.addTest,delete x.addAsyncTest;for(var O=0;O<Modernizr._q.length;O++)Modernizr._q[O]();e.Modernizr=Modernizr}(window,document);