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
GIGO.after_N = 1;
GIGO.counter = 0;
GIGO.base_host = "ds.test-ipv6.com";
GIGO.base_uri = "/ip/?callback=?";
GIGO.timeout = 7000;
GIGO.max_background_minutes = 60 * 3; // 3 hours
GIGO.last_reset=0;

$(window).on("blur", function(e) {
  GIGO.run_until = GIGO.getms() + 1000 * GIGO.max_background_minutes;
});

  
$(window).on("focus", function(e) {
  delete GIGO.run_until;
});

GIGO.getms = function() {
  var d = new Date();
  return d.getTime();
}




GIGO.getms = function () {
    // Helper function to get the current date/time as milliseconds.
    var d = new Date();
    return d.getTime();
};


GIGO.reset = function() {
  GIGO.counter = 0;
  GIGO.tries = {};
  GIGO.tries.ipv4 = 0;
  GIGO.tries.ipv6 = 0;
  GIGO.tries.error = 0;
  GIGO.tries.timeout = 0;
  GIGO.display_stats();
  GIGO.last_reset = GIGO.getms();
  $("#query_log").html("");
};

GIGO.use_stop = function() {
 GIGO.stop();
 GIGO.inactivate_selections();
 $("#use_stop").attr("class","active");
}

GIGO.inactivate_selections = function() {
  $("#n_1").attr("class","inactive");
  $("#n_10").attr("class","inactive");
  $("#n_100000").attr("class","inactive");
  $("#use_stop").attr("class","inactive");
}

GIGO.random_after_N = function(i) {
  GIGO.after_N = i;
  GIGO.reset();
  GIGO.stop();
  GIGO.start();
  GIGO.inactivate_selections();
  $("#n_" + i).attr("class","active");
};

GIGO.stop = function() {
  GIGO.run = 0;
};

GIGO.start = function() {
  GIGO.run = 1;
};


GIGO.display_stats = function() {
  var total;
  
  $("td#ipv4").text(GIGO.tries.ipv4.toString());
  $("td#ipv6").text(GIGO.tries.ipv6.toString());
  $("td#error").text(GIGO.tries.error.toString());
  $("td#timeout").text(GIGO.tries.timeout.toString());
  
  total =  GIGO.tries.ipv4 +  GIGO.tries.ipv6 +  GIGO.tries.error + GIGO.tries.timeout;
  if (total < 1) {
    total = 1;
  }
  
  $("td#percent_ipv4").text((GIGO.tries.ipv4 * 100 / total ).toFixed(2));
  $("td#percent_ipv6").text((GIGO.tries.ipv6 * 100 / total ).toFixed(2));
  $("td#percent_error").text((GIGO.tries.error * 100 / total ).toFixed(2));
  $("td#percent_timeout").text((GIGO.tries.timeout * 100 / total ).toFixed(2));
  
};

GIGO.gen_random = function() {
  var length = 6;
      return "HE-" + Math.round((Math.pow(36, length + 1) - Math.random() * Math.pow(36, length))).toString(36).slice(1);
      // http://stackoverflow.com/questions/10726909/random-alpha-numeric-string-in-javascript
      
//  return Math.floor(1000000 * Math.random()).toString();
}

GIGO.get_url = function() { 
  var r1, r2;
  if ((GIGO.counter % GIGO.after_N) == 0)  {
    r1 = GIGO.gen_random();
    r2 = r1;
    GIGO.last_random = r1;
  } else {
    r1 = GIGO.last_random;
    r2 = GIGO.gen_random();
  }
  GIGO.counter = GIGO.counter + 1;
  return "http://" + r1 + "." + GIGO.base_host + GIGO.base_uri + "&testname=he&random=" + r2;
};

GIGO.test_json = function() {
  var url, start_date, start_time, delta, status, active_reset;
  url  = GIGO.get_url();
  start_time = GIGO.getms();
  status = "in progress";  
  active_reset = GIGO.last_reset;
  
  
  jQuery.jsonp({
    "url": url,
    "cache": true,
    "pageCache":false,
    "timeout": GIGO.timeout + 100,
    "success": function(ipinfo) {
      delta = GIGO.getms() - start_time;
      if (ipinfo.type === "ipv6") {
        status="ipv6";
      } else {
        status="ipv4";
      }
    },
    "error": function(d, msg) {
      delta = GIGO.getms() - start_time;
      if (delta > GIGO.timeout) {
        status="timeout";
      } else {
        status="error";
      }
    },
    "complete": function() {
      var $div, ts, delta_s;
      if (active_reset == GIGO.last_reset) {
        ts = new Date(start_time).toTimeString();
        delta_s = delta / 1000;
        delta_s = delta_s.toFixed(3);
        GIGO.tries[status] = GIGO.tries[status] + 1;
        GIGO.display_stats();
        $div = $("<div>", {class: "log"} );
        $div.addClass(status);
        
        $div.text(ts  + " " + status + " " + delta_s + " " + url);
        $("#query_log").prepend($div);
      }
    }
  });
  
};

GIGO.maybe_run_one_test = function() {
  if (GIGO.run) {
    if (GIGO.run_until) {
      if (GIGO.run_until > GIGO.getms()) {
        GIGO.test_json();
      }
    } else {
      GIGO.test_json();
    }
  }
};


GIGO.start_happy_eyeballs_test = function() {
  GIGO.random_after_N(1);
  setInterval(GIGO.maybe_run_one_test, 1000);
};

