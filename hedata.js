/*global GIGO, MirrorConfig, jQuery,  window,  alert,  Browser */
/*jslint browser: true */
/*jslint regexp: true */


/*
  TODO:  Detect if window is backgrounded and hidden.
  If so, limit how many more times we run (say, to 1000 or 10000, or to 1 hour).
  If brought to foreground, unblock.
  http://stackoverflow.com/questions/1760250/how-to-tell-if-browser-tab-is-active
  */
  

var GIGO = {}; // We will use this as a name space.



// https://github.com/benjamingr/RegExp.escape/blob/master/polyfill.js
if(!RegExp.escape){
  RegExp.escape = function(s){
    return String(s).replace(/[\\^$*+?.()|[\]{}]/g, '\\$&');
  };
}
              

GIGO.getms = function() {
  var d = new Date();
  return d.getTime();
}


maketd = function(t) {
  var text1 = document.createTextNode(t);
  var td1 = document.createElement('td');
  td1.appendChild(text1);
  return td1;
}

maketh = function(t) {
  var text1 = document.createTextNode(t);
  var th1 = document.createElement('th');
  th1.appendChild(text1);
  return th1;
}


var last_re;
var last_min;

last_re = "";
last_min = 0;

check_changed = function() {
  var min, re;

  if (check_changed.busy) {
    return;
  }
  check_changed.busy = 1;
  

  try { 
    min = parseInt($("#min").val());
  } catch(err) {
    min=0
  }
  
  try {
    var user_re = $("#regex").val();
    re = new RegExp(user_re, "i");
  } catch(err) {
    $("#content").html("bad regexp entered");
    re = "undefined bad regexp";
  }
  
  if ((String(last_re) !== String(re))  || (last_min !== min)) {
    dosearch(min,re);
    last_re = re;
    last_min = min;
  }
  
  check_changed.busy = 0;
}

make_happy_color = function(happy) {
     /* Make a color */
     var red = Math.floor(.75*(100 - happy));
     var green = Math.floor(.75*(happy));
     var blue = 0;
     var color = 'rgb(' + red + '%,' + green + '%,' + blue + '%)';
     return color;
}

use_my_ua = function() {
  var ua = String(navigator.userAgent);
  var uae = RegExp.escape(ua);
  uae = '^'  + uae + '$';
  $("#regex").val(uae);
}


dosearch = function(min, re) {
  /* replace <div id=content> */
  
  var ipv4;
  var ipv6;
  var total;
  var i;
  
  if (! re) {
    return;
  }


 /* Okay, we know what we're searching for now. */  
 ipv4 = 0;
 ipv6 = 0;
 total = 0;
 var i;
 
 var table = document.createElement('table');
 
 var heading_tr = document.createElement('tr');
  table.appendChild(heading_tr);
  heading_tr.appendChild(maketh("IPv6"));
  heading_tr.appendChild(maketh("Total"));
  heading_tr.appendChild(maketh("User Agent"));
   
 
 var top_tr = document.createElement('tr');
 table.appendChild(top_tr);
 
 
 for ( var i = 0 ; i < hedata.length ; i++ ) { 
   var ref = hedata[i];
   if ((ref.total >= min)  && (ref.ua.match(re))) {
     /* We do want it. */
     ipv4 = ipv4 + ref.ipv4;
     ipv6 = ipv6 + ref.ipv6;
     total = total + ref.total;
     
     if (!ipv4) {
       ipv4 = 0;
     }
     if (!ipv6) {
       ipv6 = 0;
     }
     
     
     /* We also need to build a presentation up. */
     var tr = document.createElement('tr');
     tr.appendChild(maketd(ref.happy.toFixed(2) + '%'));
     tr.appendChild(maketd(ref.total))
     tr.appendChild(maketd(ref.ua));
     tr.style.color = make_happy_color(ref.happy);
     
     
     
     
     table.appendChild(tr);
   }
 }
 
 /* Total stats */
 var happy = 100 * ipv6 / total;
  top_tr.appendChild(maketd(happy.toFixed(2) + '%'));
  top_tr.appendChild(maketd(total));
  top_tr.appendChild(maketd("TOTAL"));
  top_tr.style.color = make_happy_color(happy);
 
 $("#content").html("");
 $("#content").append(table); 
}


