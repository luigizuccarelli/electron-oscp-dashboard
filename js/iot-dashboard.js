/**
 * A simple and easy to debug javascript file that handles the front end interface.
 *
 * I make no use of angular,react or even jQuery its pure old school javascript
 *
 * LMZ Feb 2017
 *
 * /

/* TODO add templating files for embedded html */

/**
 * @description Generic handler for sidebar (menu) selection
 *
 * @param id - server id (from config.json)
 * @param type - either node,project,pod
 * @param optional - only used to pass the project name if type is project
 * @returns void
 */
function pageSelector(id, type, optional) {
  let el = document.getElementById('header-title');
  if (optional) {
    el.innerHTML = " IOT DASHBOARD <span style=\"color:white;padding-left:30px\">[ " + type + " " + optional + " ]</span>";
  } else {
    el.innerHTML = " IOT DASHBOARD <span style=\"color:white;padding-left:30px\">[ " + type + " ]</span>";
  }
  let nodes = document.getElementsByClassName("pageshow");
  for (let x = 0; x < nodes.length; x++) {
    nodes[x].className = "pageshow fade";
  }

  let page = document.getElementById(type + "-" + id + (optional ? '-' + optional : ''));
  // we check if the element exists
  if (page) {
    page.className = "pageshow";
  } else {
    let container = document.getElementById('main-container');
    let newDiv = document.createElement('div');
    newDiv.setAttribute("id", type + "-" + id + (optional ? '-' + optional : ''));
    newDiv.setAttribute("class", "pageshow");
    if (type === 'overview') {
      newDiv.innerHTML = buildOverview(id);
      container.appendChild(newDiv);
    } else {
      newDiv.innerHTML = buildChannelView(id,optional);
      // this seems awkward to repeat but it allows the getting the canvas id to build the bar graph
      container.appendChild(newDiv);
      buildSingleBarGraph(iotdata.channels[0],100,optional);
    }
  }
  window.scrollTo(0, 0);
  currentPage = id;
  timerList = [];
  if (timer) clearInterval(timer);
}

/* Simple html include  - really do we need more commenting ? */
function includeHtml() {
  let contents = fs.readFileSync('header.html').toString();
  let header = document.getElementById('header');
  header.innerHTML = contents;
}


/* Build sidebar menu */

/**
 * @description Dynamic menu builder from config.json and cached files
 *
 */

function buildMenu() {
  let items = config.sites.length;
  let sHtml = "";
  let count = 1;
  for (let i = 0; i < items; i++) {
    sHtml += "  <li class=\"sub-menu\" id=\"site" + i + "\">" +
      "    <a href=\"javascript:pageSelector('" + i + "','overview');\">" +
      "      <i class=\"fa fa-tablet\"></i>" +
      "      <span>" + config.sites[i].name + "</span>" +
      "    </a></li>" ;

    let boards = config.sites[i].boards.length;
    for (let board = 0 ; board < boards; board++) {
      let inputs = config.sites[i].boards[board].inputs.length;
      for (let x = 0; x < inputs; x++) {
        sHtml += "<li class=\"sub-menu\" id=\"site" + i + "\">" +
          "        <a href=\"javascript:pageSelector(" + count + ",'channel','" + board + "-" + x + "');\">" +
          "          <i class=\"fa fa-cogs\"></i>" +
          "          <span>" + config.sites[i].boards[board].inputs[x].name +"</span>" +
          "        </a>" +
          "      </li>";
        count++;
      }
    }
    sHtml +=    "</ul> </li>";
  }

  sMenu = "<ul class=\"sidebar-menu\" id=\"nav-accordion\">" + sHtml + "</ul>";
  let el = document.getElementById('sidebar');
  el.innerHTML = sMenu;
}


/**
 * @description Simple menu toggle (expand and close)
 *
 * @param id - the element to check (clicked)
 * @return void
 *
 */
function toggleMenu(id) {
  let parent = document.getElementById('site'+id);
  let el = document.getElementById('sub-board'+id);
  if (parent.className.indexOf('active') >= 0) {
    el.style.display = "none";
    parent.className = "sub-menu";
  } else {
    el.style.display = "block";
    parent.className = "sub-menu active";
  }
}


/* Chart selector */

/**
 * @description Chart selector and timer enabler for individual chart update
 * @param name - chart name
 * @param id - server id
 * @returns void
 */
function selectChart(name, project, id) {
  // name and id and lbl - unique dom id
  let el = document.getElementById(name + '-' + id + '-lbl');
  // mouse button select
  if (event.button == 0) {
    if (!el.style.color || el.style.color === "white") {
      el.style.color = "#36a2eb";
      timerList.push(name + '-' + id);
    } else {
      el.style.color = "white";
      let index = timerList.indexOf(name + '-' + id);
      timerList.splice(index, 1);
    }
  }
  if (event.button) {
    let el = document.getElementById('header-title');
    if (timer) {
      clearInterval(timer);
    }
    notie.input({
      type: 'text',
      placeholder: 'Time in milliseconds',
      prefilledValue: '10000'
    }, 'Please enter the time interval to refresh charts:', 'Submit', 'Cancel', function (valueEntered) {
      if (isNaN(valueEntered)) {
        timer = setInterval(updateCharts,1000,id,project);
      } else {
        timer = setInterval(updateCharts,valueEntered,id,project);
      }
      el.innerHTML = " IOT DASHBOARD <span style=\"color:white;padding-left:30px\">[ " + config.servers[id].name + " " + project + " ]</span><span style=\"width:30px;padding-left:40px;font-size:16px;\"><i class=\"fa fa-clock-o\"></i><span>";
    }, function (valueEntered) {
      notie.alert(3, 'Timer stopped', 2);
      timerList = [];
      el.innerHTML = " IOT DASHBOARD <span style=\"color:white;padding-left:30px\">[ " + config.servers[id].name + " " + project + " ]</span>";
    })
  }
}

/* Node (Server) stats */

/**
 * @description Generic handler to get nodes per server called from sidebar menu
 *
 * @param id - server id (from config.json)
 * @returns void
 */
function buildBarGraphs(iotdata,yMax) {
  let xcoords = [ 0,8,16,24,32,40,48,56,64,72,80,88 ];
  let xStep = 5;
  //let yMax = 25;
  let count = 0;

  if (iotdata.values.length != 12) {
    console.log("Input param error iot-data length != 12");
    return false;
  }

  count = 0;
  boards = config.sites[0].boards.length;
  for (board = 0 ; board < boards; board++) {
    let inputs = config.sites[0].boards[board].inputs.length;
    for (let x = 0; x < inputs; x++) {
      canvas.push(document.getElementById("canvas-" + count));
      let ctx = canvas[count].getContext("2d");

      ctx.fillStyle = '#3cf';
      for (let i = 0; i < 12; i++) {
        ctx.fillRect(xcoords[i],  (yMax-iotvalues[count][i]), xStep, iotvalues[count][i]);
      }
      // add canvas event listener
      canvas[count].addEventListener('mousemove', function(evt) {
        let ctx = this.getContext("2d");
        ctx.font = '9pt Calibri';
        let rect = this.getBoundingClientRect();
        let x = evt.clientX - rect.left;
        let y = evt.clientY - rect.top;
        let id = this.id.split('-')[1];
        for (let i = 0; i < 12; i++) {
          if (x > xcoords[i] && x < xcoords[i] + 6) {
            ctx.fillStyle = '#38c';
            ctx.fillRect(xcoords[i], 25-iotvalues[id][i] , 5, iotvalues[id][i]);
            ctx.fillStyle = '#3cf';
            ctx.clearRect(105, 0, 125, 25);
            ctx.fillText(iotvalues[id][i], 105, 25);
          } else {
            ctx.fillStyle = '#3cf';
            ctx.fillRect(xcoords[i], 25-iotvalues[id][i] , 5, iotvalues[id][i]);
          }
        }
      }, false);
      count++;
    }
  }

  //let el = document.getElementById("update-0");
  //el.addEventListener('click', function(evt) {
  //  getCloudData();
    //let ctx = canvas[0].getContext("2d");
    //iotvalues[0] = [ 3,6,9,12,15,7,25,24,3,18,20,22 ];
    //ctx.clearRect(0, 0, 125, 25);
    //ctx.fillStyle = '#3cf';
    //for (let i = 0; i < 12; i++) {
    //  ctx.fillRect(xcoords[i],  (yMax-iotvalues[0][i]), xStep, iotvalues[0][i]);
    //}
  //}, false);
}


/**
 * @description Generic handler to get nodes per server called from sidebar menu
 *
 * @param id - server id (from config.json)
 * @returns void
 */
function buildSingleBarGraph(iotdata,yMax,optional) {
  let xcoords = [ 0,8,16,24,32,40,48,56,64,72,80,88 ];
  let xStep = 25;
  //let yMax = 25;
  let count = 0;

  if (iotdata.values.length != 12) {
    console.log("Input param error iot-data length != 12");
    return false;
  }

  let canvas = document.getElementById("canvas-" + optional);
  canvas.style.width ='100%';
  canvas.style.height='100%';
  canvas.width  = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
  let cntx = canvas.getContext("2d");

  cntx.fillStyle = '#ff6c60';
  for (let i = 0; i < 12; i++) {
      cntx.fillRect(xcoords[i]*5 + 150,  390 - (iotdata.values[i]*15), xStep, iotdata.values[i]*15);
      canvas.addEventListener('mousemove', function(evt) {
        let ctx = this.getContext("2d");
        ctx.font = '9pt Calibri';
        let rect = this.getBoundingClientRect();
        let x = evt.clientX - rect.left;
        let y = evt.clientY - rect.top;

        for (let i = 0; i < 12; i++) {
          if (x > (xcoords[i]*5 + 150) && x < (xcoords[i]*5 + 150) + xStep) {
            ctx.fillStyle = '#ff494d';
            ctx.fillRect(xcoords[i]*5 + 150, 390-(iotdata.values[i]*15) , xStep, iotdata.values[i]*15);
            ctx.fillStyle = '#ffffff';
            ctx.clearRect(60, 0, 100, 25);
            ctx.fillText((5*i) + 5 + " min : " + iotdata.values[i] + " C", 60, 25);
          } else {
            ctx.fillStyle = '#ff6c60';
            ctx.fillRect(xcoords[i]*5 + 150, 390-(iotdata.values[i]*15) , xStep, iotdata.values[i]*15);
          }
        }
      }, false);
  }
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getCloudData() {
  // for now we similate a cloud call
  let values = [];
  let channels = [];
  let data = {};

  let count = 0;
  let boards = config.sites[0].boards.length;
  for (board = 0 ; board < boards; board++) {
    let inputs = config.sites[0].boards[board].inputs.length;
    for (let x = 0; x < inputs; x++) {
      for (let i = 0; i < 12; i++) {
        let rnd = getRandomInt(0,25);
        values.push(rnd);
      }
      channels.push({ "name": config.sites[0].boards[board].inputs[x].name, "id": count , "values": values});
      data[count] = channels;
      iotvalues[count] = values;
      values = [];
      channels = [];
      count++;
    }
  }
  console.log(JSON.stringify(data));
  updateBarGraphs(data); 
}


function updateBarGraphs(indata) {
  let xcoords = [ 0,8,16,24,32,40,48,56,64,72,80,88 ];
  let xStep = 5;
  let yMax = 25;

  let count = 0;
  let boards = config.sites[0].boards.length;
  for (board = 0 ; board < boards; board++) {
    let inputs = config.sites[0].boards[board].inputs.length;
    for (let x = 0; x < inputs; x++) {
      let ctx = canvas[count].getContext("2d");
      ctx.clearRect(0, 0, 125, 25);
      ctx.fillStyle = '#3cf';
      for (let i = 0; i < 12; i++) {
        ctx.fillRect(xcoords[i],  (yMax-indata[count][0].values[i]), xStep, indata[count][0].values[i]);
      }
      count++;
    }
  }
}

function buildOverview(id) {
  let count = 0;
  let sHtml = "<section class=\"panel\">" +
    "<div class=\"panel-body progress-panel\">" +
    "  <div class=\"task-progress\">" +
    "    <h1>IOT Channel Status</h1>" +
    "    <p>Temperature Celcius</p>" +
    "  </div>" +
    "  <table class=\"table table-hover personal-task\">" +
    "  <tbody>" ;

    let boards = config.sites[id].boards.length;
    for (let board = 0 ; board < boards; board++) {
      let inputs = config.sites[id].boards[board].inputs.length;
      for (let x = 0; x < inputs; x++) {
        sHtml += "<tr><td>" + config.sites[id].boards[board].inputs[x].name + "</td><td><span class=\"badge bg-info\">75&deg;</span></td><td><span class=\"badge bg-primary\">34&deg;</span></td><td><span id=\"update-" + count + "\" class=\"badge bg-important\">&nbsp;off&nbsp;</span></td>" +
                 "<td>" +
                 "<div id=\"work-progress5\">" +
                 "<canvas id=\"canvas-" + count + "\" style=\"display: inline-block; width: 120px; height: 25px; vertical-align: top;\" width=\"120\" height=\"25\" ></canvas>" +
                 "</div></td></tr>";
        count++;
      }
    }
    sHtml += "</tbody></table></section>";
    return sHtml;
}

function buildChannelView(channel, optional) {
  let sHtml = "";
  let board = optional.split("-")[0];
  let id = optional.split("-")[1];
  sHtml += "<section class=\"panel\">" +
           "  <div class=\"revenue-head\">" +
           "                   <span>"+
           "                     <i class=\"fa fa-bar-chart-o\"></i>" +
           "                   </span>" +
           "                   <h3 style=\"font-weight: normal\">" +  config.sites[0].boards[board].inputs[id].name  +"</h3>" +
           "                   <span class=\"rev-combo pull-right\">" +
           "                      Hour" +
           "                   </span>" +
           "  </div>" +
           "               <div class=\"panel-body\">" +
           "                   <div class=\"row\">" +
           //"                       <div class=\"col-lg-6 col-sm-6 text-center\">" +
           "                               <div style=\"margin-left: 15px; margin-right: 15px; width: auto; height: 400px; background-color: #4f4f4f; border-radius: 4px; -webkit-border-radius: 4px; \" ><canvas id=\"canvas-" + optional + "\" ></canvas></div>" +
           //"                       </div>" +
           //"                       <div class=\"col-lg-6 col-sm-6\">" +
           //"                           <div class=\"chart-info chart-position\">" +
           //"                               <span class=\"increase\"></span>" +
           //"                               <span>Revenue Increase</span>" +
           //"                           </div>" +
           //"                           <div class=\"chart-info\">" +
           //"                               <span class=\"decrease\"></span>" +
           //"                               <span>Revenue Decrease</span>" +
           //"                           </div>" +
           //"                       </div>" +
           "                   </div>" +
           "               </div>" +
           "               <div class=\"panel-footer revenue-foot\">" +
           "                   <ul>" +
           "                       <li class=\"first active\">" +
           "                           <a href=\"javascript:;\">" +
           "                               <i class=\"fa fa-th-large\"></i>" +
           "                               Hour" +
           "                           </a>" +
           "                       </li>" +
           "                       <li>" +
           "                           <a href=\"javascript:;\">" +
           "                               <i class=\"fa fa-th-large\"></i>" +
           "                               Day" +
           "                           </a>" +
           "                       </li>" +
           "                       <li class=\"last\">" +
           "                           <a href=\"javascript:;\">" +
           "                               <i class=\" fa fa-th-large\"></i>" +
           "                               Week" +
           "                           </a>" +
           "                       </li>" +
           "                   </ul>" +
           "               </div>" +
           "           </section>";
  return sHtml;
}
