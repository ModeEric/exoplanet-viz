const svg = d3.select("#chart");
const gRoot = svg.append("g");

const clip = gRoot.append("clipPath")
                  .attr("id","clipPlot")
                  .append("rect");

function updateClip() {
  clip.attr("width", width())
      .attr("height", height());
}

const color = d3.scaleOrdinal(d3.schemeTableau10);

const state = {
  scene: 0,
  yearFilter: [1995, 2024],
  methodFilter: new Set(),
  hoverPlanet: null
};

let exoplanets = [];
d3.csv("data/exoplanets.csv", d => ({
  name   : d.pl_name,
  year   : +d.disc_year,
  radius : +d.pl_rade,
  method : d.discoverymethod,
  distAU : +d.pl_orbsmax
})).then(rows => {
  exoplanets = rows.filter(d => d.radius && d.year);
  color.domain([...new Set(exoplanets.map(d => d.method))]);
  initScroll();
}).catch(error => {
  console.error("Error loading data:", error);
});

function width() { return +svg.attr("width"); }
function height() { return +svg.attr("height"); }

function initScroll() {
  const steps = d3.selectAll(".step");
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting && state.scene !== +e.target.dataset.scene) {
        state.scene = +e.target.dataset.scene;
        render();
      }
    });
  }, { threshold: 0.5 });
  steps.each(function () { io.observe(this); });

  window.addEventListener("keydown", e => {
    if (e.key === "ArrowDown") changeScene(+1);
    if (e.key === "ArrowUp")   changeScene(-1);
  });

  window.addEventListener("resize", resize);
  resize();
}

function changeScene(dir) {
  state.scene = Math.max(0, Math.min(4, state.scene + dir));
  document.querySelector(`[data-scene="${state.scene}"]`)
          .scrollIntoView({ behavior: "smooth" });
}

function render() {
  gRoot.selectAll("*").remove();
  
  if (state.scene !== 3 && state.scene !== 4) {
    d3.select("#legend").remove();
  }
  
  if (state.scene !== 4) {
    d3.select("#sliderContainer").remove();
  }

  switch (state.scene) {
    case 0: scene0(); break;
    case 1: scene1(); break;
    case 2: scene2(); break;
    case 3: scene3(); break;
    case 4: scene4(); break;
  }
  
  if (state.scene === 3 || state.scene === 4) {
    drawLegend();
  }
}

function scene0() {
  const w = width(), h = height();
  
  const g = gRoot.append("g")
                 .attr("transform", `translate(${w/2},${h/2})`);

  const circle1 = g.append("circle")
   .attr("r", 120)
   .attr("fill", "#00aaff")
   .attr("stroke", "#ffffff")
   .attr("stroke-width", 2);

  const circle2 = g.append("circle")
   .attr("cx", 170)
   .attr("r", 25)
   .attr("fill", "#ffff00")
   .attr("stroke", "#ffffff")
   .attr("stroke-width", 2);

  const text1 = g.append("text")
   .attr("y", -160)
   .attr("text-anchor", "middle")
   .attr("fill", "#fff")
   .style("font-size", "36px")
   .text("1995: 51 Peg b");

  const text2 = g.append("text")
   .attr("y", -120)
   .attr("text-anchor", "middle")
   .attr("fill", "#9fd3ff")
   .style("font-size", "16px")
   .text("≈ 1.9 × Jupiter radius – the first confirmed exoplanet");
}

function scene1() {
  const margin = {top:40,right:20,bottom:50,left:60};
  const w = width()  - margin.left - margin.right;
  const h = height() - margin.top  - margin.bottom;
  const g = gRoot.append("g").attr("transform",`translate(${margin.left},${margin.top})`);

  const yearly = d3.rollups(
    exoplanets,
    v => d3.mean(v, d => d.radius),
    d => d.year
  ).map(([year, avg]) => ({year, avg}))
   .sort((a,b)=>a.year-b.year);

  const x = d3.scaleLinear()
              .domain(d3.extent(yearly, d=>d.year))
              .range([0,w]);
  const y = d3.scaleLinear()
              .domain([0, d3.max(yearly,d=>d.avg) * 1.2]).nice()
              .range([h,0]);

  const line = d3.line()
                 .x(d=>x(d.year))
                 .y(d=>y(d.avg))
                 .curve(d3.curveMonotoneX);

  g.append("path")
   .datum(yearly)
   .attr("fill","none")
   .attr("stroke","#00ffff")
   .attr("stroke-width",4)
   .attr("d",line);

  g.append("g").attr("transform",`translate(0,${h})`)
    .call(d3.axisBottom(x).ticks(6).tickFormat(d3.format("d")))
    .style("color", "#ffffff")
    .style("stroke", "#ffffff");
  g.append("g").call(d3.axisLeft(y))
    .style("color", "#ffffff")
    .style("stroke", "#ffffff");

  g.append("text").attr("x",w/2).attr("y",h+40)
    .attr("text-anchor","middle").attr("fill","#ccc").text("Discovery Year");
  g.append("text").attr("x",-h/2).attr("y",-45).attr("transform","rotate(-90)")
    .attr("text-anchor","middle").attr("fill","#ccc").text("Average Planet Radius (Earth radii)");

  const first = yearly[0], last = yearly[yearly.length-1];
  [first,last].forEach(pt=>{
    g.append("circle").attr("cx",x(pt.year)).attr("cy",y(pt.avg))
      .attr("r",6).attr("fill","#fff").attr("stroke","#ffda79").attr("stroke-width",2);
  });

  addAnn(g, [
    annSpec(x(first.year), y(first.avg), -80, -40,
            `Avg: ${first.avg.toFixed(1)} R⊕`, `${first.year}`),
    annSpec(x(last.year),  y(last.avg),  30, -50,
            `Avg: ${last.avg.toFixed(1)} R⊕`,  `${last.year}`)
  ]);
}

function scene2() {
  const margin = { top: 30, right: 20, bottom: 30, left: 60 };
  const w = width()  - margin.left - margin.right;
  const h = height() - margin.top  - margin.bottom;
  const g = gRoot.append("g")
                 .attr("transform", `translate(${margin.left},${margin.top})`);

  const bins = d3.groups(exoplanets, d => Math.floor(d.year / 5) * 5)
                 .sort(([a], [b]) => a - b)
                 .slice(0, 6);

  const yBand = d3.scaleBand()
                  .domain(bins.map(([y]) => y))
                  .range([0, h])
                  .padding(0.4);

  const x = d3.scaleLinear()
              .domain([0, d3.quantile(exoplanets, 0.95, d => d.radius) * 1.1])
              .nice()
              .range([0, w]);

  const binMaker = d3.bin()
                     .value(d => d.radius)
                     .domain(x.domain())
                     .thresholds(25);

  bins.forEach(([yr, rows], i) => {
    const gRow = g.append("g").attr("opacity", 0);
    const hist  = binMaker(rows);

    const maxCount = d3.max(hist, d => d.length);
    const heightScale = d3.scaleLinear()
                          .domain([0, maxCount])
                          .range([0, yBand.bandwidth() - 14]);

    const baseY = yBand(yr) + yBand.bandwidth();

    const area = d3.area()
                   .curve(d3.curveBasis)
                   .x(d => x((d.x0 + d.x1) / 2))
                   .y0(baseY)
                   .y1(d => baseY - heightScale(d.length));

    gRow.append("path")
        .datum(hist)
        .attr("fill", "#00aaff")
        .attr("opacity", 0.7)
        .attr("clip-path", "url(#clipPlot)")
        .attr("d", area);

    gRow.append("text")
        .attr("x", 0)
        .attr("y", yBand(yr) - 6)
        .attr("fill", "#fff")
        .text(yr);

    gRow.transition()
        .delay(i * 250)
        .attr("opacity", 1);
  });

  g.append("g")
   .attr("transform", `translate(0,${h})`)
   .call(d3.axisBottom(x))
   .style("color", "#ffffff");

  g.append("text")
   .attr("x", w / 2)
   .attr("y", h + 28)
   .attr("text-anchor", "middle")
   .attr("fill", "#ccc")
   .text("Planet Radius (Earth radii)");
}

function scene3() {
  const margin = {top:40,right:20,bottom:50,left:60};
  const w = width()-margin.left-margin.right;
  const h = height()-margin.top-margin.bottom;
  const g = gRoot.append("g").attr("transform",`translate(${margin.left},${margin.top})`);

  const x = d3.scaleLinear()
              .domain(d3.extent(exoplanets,d=>d.year))
              .range([0,w]);
  const y = d3.scaleLog()
              .domain([0.5, d3.max(exoplanets, d=> d.radius) * 1.1]).nice()
              .range([h,0]);

  const rows = state.methodFilter.size ?
        exoplanets.filter(d=>state.methodFilter.has(d.method)) : exoplanets;

  g.selectAll("circle")
   .data(rows)
   .join("circle")
     .attr("cx",d=>x(d.year))
     .attr("cy",d=>y(d.radius))
     .attr("r",3)
     .attr("fill",d=>color(d.method))
     .attr("opacity",0.7)
     .attr("clip-path", "url(#clipPlot)")
     .on("mouseover",(e,d)=> showTooltip(
        `<strong>${d.name}</strong><br>${d.radius} R⊕<br>${d.method}`, d3.pointer(e)))
     .on("mouseout", hideTooltip);

  g.append("g").attr("transform",`translate(0,${h})`)
    .call(d3.axisBottom(x).ticks(6).tickFormat(d3.format("d")))
    .style("color", "#ffffff")
    .style("stroke", "#ffffff");
  g.append("g").call(d3.axisLeft(y).ticks(6,"~s"))
    .style("color", "#ffffff")
    .style("stroke", "#ffffff");

  g.append("text").attr("x",w/2).attr("y",h+40).attr("text-anchor","middle")
   .attr("fill","#ccc").text("Discovery Year");
  g.append("text").attr("x",-h/2).attr("y",-45).attr("transform","rotate(-90)")
   .attr("text-anchor","middle").attr("fill","#ccc").text("Planet Radius (Earth radii, log scale)");

  addAnn(g, [annSpec(x(2009),y(20), 40,-60,
           "Kepler Mission", "Launched in 2009, revolutionized exoplanet discovery with transit photometry")]);
}

function scene4() {
  if (!document.getElementById("yearRange")){
    const sliderContainer = d3.select("#graphic").append("div")
      .attr("id","sliderContainer")
      .style("position","absolute")
      .style("bottom","120px")
      .style("right","20px")
      .style("text-align","left")
      .style("color","#9fd3ff")
      .style("font-size","14px");
    
    sliderContainer.append("div")
      .style("margin-bottom","8px")
      .text("Filter by Discovery Year");
    
    sliderContainer.append("input")
      .attr("type","range")
      .attr("id","yearRange")
      .attr("min",1995)
      .attr("max",2024)
      .attr("value",state.yearFilter[1])
      .style("width","200px")
      .style("margin","0 10px")
      .on("input", function(){ 
        state.yearFilter[1]=+this.value; 
        render(); 
      });
    
    sliderContainer.append("div")
      .attr("id","yearRangeLabel")
      .style("margin-top","8px")
      .style("font-weight","bold")
      .text(`Showing planets discovered up to ${state.yearFilter[1]}`);
  }

  const margin = {top:40,right:20,bottom:60,left:60};
  const w = width()-margin.left-margin.right;
  const h = height()-margin.top-margin.bottom;
  const g = gRoot.append("g").attr("transform",`translate(${margin.left},${margin.top})`);

  const validDistances = exoplanets.filter(d => d.distAU > 0);
  const x = d3.scaleLog()
              .domain([d3.min(validDistances, d => d.distAU) * 0.8, 
                       d3.max(validDistances, d => d.distAU) * 1.2])
              .range([0,w]);
  const y = d3.scaleLog().domain([d3.min(exoplanets,d=>d.radius) * 0.8, d3.max(exoplanets,d=>d.radius) * 1.1]).range([h,0]);

  let rows = exoplanets.filter(d=>d.year<=state.yearFilter[1]);
  if (state.methodFilter.size)
    rows = rows.filter(d=>state.methodFilter.has(d.method));

  g.selectAll("circle")
   .data(rows, d=>d.name)
   .join(
     enter => enter.append("circle")
                   .attr("cx",d=>x(d.distAU>0 ? d.distAU
                                               : (d3.min(validDistances, d => d.distAU) * 0.8 + (Math.random()*0.1))))
                   .attr("cy",d=>y(d.radius))
                   .attr("r",3).attr("fill",d=>color(d.method))
                   .attr("opacity",0).transition().attr("opacity",0.7),
     update => update.transition()
                     .attr("cx",d=>x(d.distAU>0 ? d.distAU
                                               : (d3.min(validDistances, d => d.distAU) * 0.8 + (Math.random()*0.1))))
                     .attr("cy",d=>y(d.radius)),
     exit   => exit.transition().attr("opacity",0).remove()
   )
   .attr("clip-path", "url(#clipPlot)")
   .on("mouseover",(e,d)=> showTooltip(
        `<strong>${d.name}</strong><br>${d.radius} R⊕<br>${d.year}<br>${d.method}`, d3.pointer(e)))
   .on("mouseout",hideTooltip);

  g.append("g").attr("transform",`translate(0,${h})`)
    .call(d3.axisBottom(x).ticks(5).tickFormat(d=>d+" AU"))
    .style("color", "#ffffff")
    .style("stroke", "#ffffff");
  g.append("g").call(d3.axisLeft(y).ticks(6,"~s"))
    .style("color", "#ffffff")
    .style("stroke", "#ffffff");

  g.append("text").attr("x",w/2).attr("y",h+45).attr("text-anchor","middle")
   .attr("fill","#ccc").text("Orbital Distance (Astronomical Units)");
  g.append("text").attr("x",-h/2).attr("y",-45).attr("transform","rotate(-90)")
   .attr("text-anchor","middle").attr("fill","#ccc").text("Planet Radius (Earth radii, log scale)");

  d3.select("#yearRangeLabel").text(`Showing planets discovered up to ${state.yearFilter[1]}`);
}

function drawLegend(){
  d3.select("#legend").remove();

  const legend = d3.select("#graphic")
                   .append("svg")
                   .attr("id","legend")
                   .style("position","absolute")
                   .style("top","20px")
                   .style("right","20px")
                   .attr("width",200)
                   .attr("height",color.domain().length*22 + 60);
                   
  legend.append("text")
    .attr("x", 0)
    .attr("y", 15)
    .attr("fill", "#fff")
    .style("font-size", "14px")
    .style("font-weight", "bold")
    .text("Discovery Methods");
    
  legend.append("text")
    .attr("x", 0)
    .attr("y", 30)
    .attr("fill", "#9fd3ff")
    .style("font-size", "11px")
    .text("Click to filter by method");
  const methods = color.domain();
  const size = 14, padding = 6;

  legend.selectAll("rect")
    .data(methods)
    .join("rect")
      .attr("x",0).attr("y",(d,i)=>i*(size+padding) + 45)
      .attr("width",size).attr("height",size)
      .attr("fill",color)
      .attr("stroke",d=> state.methodFilter.size && !state.methodFilter.has(d) ? "#444":"#fff")
      .attr("stroke-width",2)
      .style("cursor","pointer")
      .on("click",(_,m)=>{
        state.methodFilter.has(m) ? state.methodFilter.delete(m) : state.methodFilter.add(m);
        render();
      });

  legend.selectAll("text")
    .data(methods)
    .join("text")
      .attr("x",size+5).attr("y",(d,i)=>i*(size+padding)+size-2 + 45)
      .attr("fill","#eee").style("font-size","12px").text(d=>d)
      .style("cursor","pointer")
      .on("click", (_,m)=>{ d3.selectAll("rect").filter(d=>d===m).dispatch("click"); });
}

const tooltip = d3.select("#tooltip");
function showTooltip(html,[x,y]){
  tooltip.html(html)
         .style("left",`${x+15}px`)
         .style("top", `${y+15}px`)
         .attr("hidden",null);
}
function hideTooltip(){ tooltip.attr("hidden",true); }

function addAnn(sel, specs){
  const make = d3.annotation().annotations(specs);
  sel.call(make);
}
function annSpec(x,y,dx,dy,title,label){
  return { x,y,dx,dy,
           note:{ title, label, align:"middle" },
           subject:{ radius:4 } };
}
function resize() {
  let w = document.getElementById("graphic").clientWidth;
  let h = document.getElementById("graphic").clientHeight;

  if (w === 0 || h === 0) {
    w = Math.round(window.innerWidth  * 0.60);
    h = Math.round(window.innerHeight * 0.90);
  }

  svg.attr("width",  w)
     .attr("height", h);

  updateClip();
  render();
}